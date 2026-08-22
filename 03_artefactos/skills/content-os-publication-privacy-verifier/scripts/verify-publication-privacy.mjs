#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

import {assertSensitiveSignalInventory} from '../../content-os-sensitive-signal-detector/scripts/detect-sensitive-signals.mjs';
import {assertMinimalRedactionExecution, assertMinimalRedactionRequest} from '../../content-os-minimal-redaction/scripts/execute-minimal-redaction.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const digest = (value) => sha(JSON.stringify(stable(value)));
const same = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
const expect = (condition, code) => { if (!condition) throw new Error(code); };
const keys = (value, expected, code) => expect(value && typeof value === 'object' && !Array.isArray(value) && same(Object.keys(value).sort(), [...expected].sort()), code);
const unique = (values, code) => expect(new Set(values).size === values.length, code);
const hashPattern = /^[a-f0-9]{64}$/u;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const refPattern = /^(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*(?:^|\/)\.[^/])(?!.*\\)[a-z0-9](?:[a-z0-9._/-]*[a-z0-9])?$/u;
const nested = (parent, candidate) => { const delta = relative(parent, candidate); return delta !== '' && delta !== '..' && !delta.startsWith(`..${sep}`) && !isAbsolute(delta); };
const overlaps = (a, b) => a.start <= b.end && b.start <= a.end;
const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const normalize = (value) => String(value).normalize('NFKC').toLocaleLowerCase('en-US').trim();

const physical = (value, code) => {
  keys(value, ['ref', 'sha256', 'bytes', 'content_base64'], code);
  expect(refPattern.test(value.ref) && hashPattern.test(value.sha256) && Number.isSafeInteger(value.bytes) && value.bytes > 0 && typeof value.content_base64 === 'string', code);
  const bytes = Buffer.from(value.content_base64, 'base64');
  expect(bytes.toString('base64') === value.content_base64 && bytes.length === value.bytes && sha(bytes) === value.sha256, `${code}-DRIFT`);
  const parsed = JSON.parse(bytes.toString('utf8'));
  expect(bytes.equals(Buffer.from(JSON.stringify(stable(parsed)))), `${code}-CANONICAL`);
  return parsed;
};

const command = (tool, args, encoding = 'utf8') => {
  const result = spawnSync(tool, args, {encoding, maxBuffer: 256 * 1024 * 1024});
  expect(result.status === 0, `PUBLICATION-TOOL-FAILED:${result.stderr?.toString().slice(-2000) ?? ''}`);
  return result.stdout;
};

const frameDigests = (path, operations, ffmpeg) => {
  const masks = operations.filter(({type}) => type === 'LOCAL_BLUR').map(({frame_span: span, authorized_effect_roi: roi}) => `drawbox=x=${roi.x}:y=${roi.y}:w=${roi.width}:h=${roi.height}:color=black:t=fill:enable='between(n\\,${span.start}\\,${span.end})'`);
  const filter = [...masks, 'format=rgb24'].join(',');
  const output = command(ffmpeg, ['-v', 'error', '-i', path, '-map', '0:v:0', '-vf', filter, '-f', 'framemd5', '-']);
  return output.split('\n').filter((line) => line && !line.startsWith('#')).map((line) => line.split(',').map((item) => item.trim()).at(-1));
};

const audioShape = (path, ffprobe) => {
  const raw = JSON.parse(command(ffprobe, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels', '-of', 'json', path]));
  const streams = raw.streams ?? [];
  return streams.length ? {sample_rate: Number(streams[0].sample_rate), channels: Number(streams[0].channels)} : null;
};

const pcm = (path, ffmpeg, shape, startSample = null, endSample = null) => {
  const filters = [];
  if (startSample !== null || endSample !== null) filters.push(`atrim=${startSample === null ? '' : `start_sample=${startSample}`}${startSample !== null && endSample !== null ? ':' : ''}${endSample === null ? '' : `end_sample=${endSample}`}`, 'asetpts=PTS-STARTPTS');
  const args = ['-v', 'error', '-i', path, '-map', '0:a:0'];
  if (filters.length) args.push('-af', filters.join(','));
  args.push('-f', 's32le', '-acodec', 'pcm_s32le', '-ac', String(shape.channels), '-ar', String(shape.sample_rate), '-');
  return command(ffmpeg, args, null);
};

const changedSamples = (left, right) => {
  const maximum = Math.max(left.length, right.length); let changed = 0;
  for (let offset = 0; offset < maximum; offset += 4) if (!left.subarray(offset, offset + 4).equals(right.subarray(offset, offset + 4))) changed += 1;
  return changed;
};

const mergeSpans = (operations, sampleRate) => {
  const spans = operations.filter(({type}) => type === 'AUDIO_SILENCE').map(({time_span_ms: span}) => ({start: Math.round(span.start * sampleRate / 1000), end: Math.round(span.end * sampleRate / 1000)})).sort((a, b) => a.start - b.start);
  const merged = [];
  for (const span of spans) { const last = merged.at(-1); if (last && span.start <= last.end) last.end = Math.max(last.end, span.end); else merged.push({...span}); }
  return merged;
};

const contrast = (foreground, background) => {
  const luminance = (hex) => { const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4); return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]; };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a); return Number(((values[0] + 0.05) / (values[1] + 0.05)).toFixed(4));
};

export const assertDisclosureCurtain = (curtain) => {
  keys(curtain, ['schema_version', 'curtain_id', 'case_id', 'privacy_report_id', 'kind', 'orientation', 'text_lines', 'foreground_rgb', 'background_rgb', 'contrast_ratio', 'placement', 'text_height_ratio', 'duration_ms', 'persistent_watermark', 'autonomous_clip_ids', 'canonical_sha256'], 'DISCLOSURE-CURTAIN-KEYS');
  expect(curtain.schema_version === 'disclosure-curtain-v2' && idPattern.test(curtain.curtain_id) && idPattern.test(curtain.case_id) && idPattern.test(curtain.privacy_report_id) && ['INTRO', 'CHAPTER', 'OUTRO'].includes(curtain.kind) && ['VERTICAL', 'WIDE'].includes(curtain.orientation), 'DISCLOSURE-CURTAIN-IDENTITY');
  expect(Array.isArray(curtain.text_lines) && curtain.text_lines.length >= 1 && curtain.text_lines.length <= 2 && curtain.text_lines.every((item) => typeof item === 'string' && item.length > 0), 'DISCLOSURE-CURTAIN-TEXT');
  expect(/^#[A-F0-9]{6}$/u.test(curtain.foreground_rgb) && /^#[A-F0-9]{6}$/u.test(curtain.background_rgb) && typeof curtain.contrast_ratio === 'number' && Number.isFinite(curtain.contrast_ratio) && typeof curtain.placement === 'string' && typeof curtain.text_height_ratio === 'number' && Number.isFinite(curtain.text_height_ratio) && Number.isSafeInteger(curtain.duration_ms) && curtain.duration_ms > 0 && typeof curtain.persistent_watermark === 'boolean' && Array.isArray(curtain.autonomous_clip_ids) && curtain.autonomous_clip_ids.every((id) => idPattern.test(id)), 'DISCLOSURE-CURTAIN-VALUES');
  unique(curtain.autonomous_clip_ids, 'DISCLOSURE-CURTAIN-CLIP-DUPLICATE');
  expect(hashPattern.test(curtain.canonical_sha256) && digest(Object.fromEntries(Object.entries(curtain).filter(([key]) => key !== 'canonical_sha256'))) === curtain.canonical_sha256, 'DISCLOSURE-CURTAIN-HASH');
  return curtain;
};

const curtainFindings = (curtain, expected) => {
  const codes = [];
  if (!same(curtain.text_lines, expected.lines)) codes.push('TEXT');
  const derivedContrast = contrast(curtain.foreground_rgb, curtain.background_rgb); if (curtain.contrast_ratio !== derivedContrast || derivedContrast < 4.5 || derivedContrast > 21) codes.push('CONTRAST');
  if (curtain.placement !== 'LOWER_SAFE_ZONE_CURTAIN_ONLY') codes.push('PLACEMENT');
  if (curtain.text_height_ratio < 0.022 || curtain.text_height_ratio > 0.2) codes.push('TEXT_SIZE');
  if (curtain.duration_ms < 1800 || curtain.duration_ms > 30000) codes.push('READ_TIME');
  if (curtain.persistent_watermark !== false) codes.push('WATERMARK');
  if (curtain.case_id !== expected.case_id || curtain.privacy_report_id !== expected.report_id) codes.push('REPORT_LINK');
  return codes;
};

export const disclosureLinesFor = (hasRedaction) => hasRedaction ? ['EDITADO CON IA', 'MEMORIA DE CLASE AUTORIZADA'] : ['EDITADO CON IA'];

const protectedResiduals = (rules, postInventory) => {
  const protectedRules = rules.filter(({rule}) => ['PROTECT', 'AUDIO_SILENCE'].includes(rule));
  const residuals = [];
  const structured = new Set(['URL', 'EMAIL', 'FILE_PATH', 'NAME', 'FACE']);
  for (const signal of postInventory.signals) {
    const hit = protectedRules.find((rule) => normalize(rule.identity) === normalize(signal.identity.canonical) && (rule.rule === 'AUDIO_SILENCE' ? signal.kind === 'SPOKEN_BRAND' : signal.kind !== 'SPOKEN_BRAND' && (!structured.has(rule.kind) || rule.kind === signal.kind)));
    if (hit) residuals.push({sequence: residuals.length, signal_id: signal.signal_id, kind: signal.kind, identity: signal.identity.canonical, modality: signal.modality, confidence_status: signal.confidence.status});
  }
  return {protectedRules, residuals};
};

const verifyDetectionBundle = (bundle, code) => {
  keys(bundle, ['request_material', 'inventory_material'], `${code}-KEYS`);
  const detectorRequest = physical(bundle.request_material, `${code}-REQUEST`);
  const inventory = physical(bundle.inventory_material, `${code}-INVENTORY`);
  assertSensitiveSignalInventory(inventory, detectorRequest);
  const expectedAudio = detectorRequest.source.has_audio ? 'COMPLETE' : 'NOT_PRESENT';
  expect(detectorRequest.coverage.visual_text === 'COMPLETE' && detectorRequest.coverage.visual_templates === 'COMPLETE' && detectorRequest.coverage.faces === 'COMPLETE' && detectorRequest.coverage.audio_transcript === expectedAudio && !Object.values(detectorRequest.coverage).includes('UNKNOWN') && !inventory.signals.some(({confidence}) => confidence.status === 'UNKNOWN'), `${code}-COVERAGE-INCOMPLETE`);
  return {detectorRequest, inventory};
};

const deriveReport = (request, options) => {
  keys(request, ['schema_version', 'case_id', 'participant_id', 'actor_id', 'execution_request_material', 'execution_receipt_material', 'pre_detection', 'post_detection', 'disclosure_curtains', 'autonomous_clips'], 'PUBLICATION-REQUEST-KEYS');
  expect(request.schema_version === 'publication-privacy-verification-request-v1' && idPattern.test(request.case_id) && idPattern.test(request.participant_id) && request.actor_id === 'RT-09-H03-PUBLICATION-PRIVACY-VERIFIER', 'PUBLICATION-REQUEST-IDENTITY');
  keys(options, ['source_root', 'output_root'], 'PUBLICATION-OPTIONS-KEYS');
  const sourceRoot = realpathSync(options.source_root); const outputRoot = realpathSync(options.output_root);
  expect(lstatSync(sourceRoot).isDirectory() && lstatSync(outputRoot).isDirectory() && sourceRoot !== outputRoot && !nested(sourceRoot, outputRoot) && !nested(outputRoot, sourceRoot), 'PUBLICATION-ROOT-REUSE');
  const materials = [request.execution_request_material, request.execution_receipt_material, request.pre_detection.request_material, request.pre_detection.inventory_material, request.post_detection.request_material, request.post_detection.inventory_material];
  unique(materials.map(({ref}) => ref), 'PUBLICATION-MATERIAL-REF-DUPLICATE');
  const executionRequest = physical(request.execution_request_material, 'PUBLICATION-EXECUTION-REQUEST');
  const executionReceipt = physical(request.execution_receipt_material, 'PUBLICATION-EXECUTION-RECEIPT');
  const {policy, valuePlan, plan, metadata} = assertMinimalRedactionRequest(executionRequest);
  expect(executionRequest.case_id === request.case_id && executionRequest.participant_id === request.participant_id && executionRequest.actor_id !== request.actor_id, 'PUBLICATION-EXECUTOR-SEPARATION');
  assertMinimalRedactionExecution(executionReceipt, executionRequest, {source_root: sourceRoot, output_root: outputRoot});
  const pre = verifyDetectionBundle(request.pre_detection, 'PUBLICATION-PRE-DETECTION'); const post = verifyDetectionBundle(request.post_detection, 'PUBLICATION-POST-DETECTION');
  const inventoryRef = {ref: request.pre_detection.inventory_material.ref, sha256: request.pre_detection.inventory_material.sha256, bytes: request.pre_detection.inventory_material.bytes};
  expect(same(policy.inventory, inventoryRef) && same(pre.inventory.source, executionRequest.source) && pre.detectorRequest.source.sha256 === executionRequest.source.sha256 && pre.detectorRequest.source.bytes === executionRequest.source.bytes, 'PUBLICATION-PRE-BINDING');
  const outputPath = resolve(outputRoot, executionReceipt.output.ref); const sourcePath = resolve(sourceRoot, executionRequest.source.ref);
  expect(lstatSync(sourcePath).isFile() && lstatSync(outputPath).isFile(), 'PUBLICATION-MEDIA-TYPE');
  const outputBytes = readFileSync(outputPath);
  expect(post.detectorRequest.source.ref === executionReceipt.output.ref && post.detectorRequest.source.sha256 === executionReceipt.output.sha256 && post.detectorRequest.source.bytes === executionReceipt.output.bytes && post.detectorRequest.source.content_base64 === outputBytes.toString('base64') && same(post.inventory.source, executionReceipt.output), 'PUBLICATION-POST-BINDING');
  const ffmpeg = realpathSync(executionRequest.media_tool_authority.ffmpeg_path); const ffprobe = realpathSync(executionRequest.media_tool_authority.ffprobe_path);
  expect(sha(readFileSync(ffmpeg)) === executionRequest.media_tool_authority.ffmpeg_sha256 && sha(readFileSync(ffprobe)) === executionRequest.media_tool_authority.ffprobe_sha256, 'PUBLICATION-TOOL-DRIFT');

  const {protectedRules, residuals} = protectedResiduals(policy.rules, post.inventory);
  const sourceFrames = frameDigests(sourcePath, plan.operations, ffmpeg); const outputFrames = frameDigests(outputPath, plan.operations, ffmpeg);
  expect(sourceFrames.length === metadata.frame_count && outputFrames.length === metadata.frame_count, 'PUBLICATION-FRAME-COUNT');
  const rgbMismatches = sourceFrames.flatMap((hash, index) => hash === outputFrames[index] ? [] : [index]);
  const events = new Map();
  for (const operation of plan.operations.filter(({type}) => type === 'LOCAL_BLUR')) { const ratio = operation.authorized_effect_roi.width * operation.authorized_effect_roi.height / (metadata.frame_width * metadata.frame_height); events.set(operation.frame_span.start, (events.get(operation.frame_span.start) ?? 0) + ratio); events.set(operation.frame_span.end + 1, (events.get(operation.frame_span.end + 1) ?? 0) - ratio); }
  let active = 0; let maximumMask = 0; for (const frame of [...events.keys()].sort((a, b) => a - b)) { active += events.get(frame); maximumMask = Math.max(maximumMask, active); } maximumMask = Number(maximumMask.toFixed(8));
  const occlusions = [];
  for (const operation of plan.operations.filter(({type}) => type === 'LOCAL_BLUR')) for (const zone of valuePlan.zones) if (overlaps(operation.frame_span, zone.frame_span) && intersects(operation.authorized_effect_roi, zone.geometry)) occlusions.push({sequence: occlusions.length, zone_id: zone.zone_id, signal_id: operation.signal_id, operation_id: operation.operation_id});

  const shape = audioShape(sourcePath, ffprobe); const outputShape = audioShape(outputPath, ffprobe); expect(same(shape, outputShape) && Boolean(shape) === metadata.has_audio, 'PUBLICATION-AUDIO-SHAPE');
  let changedOutside = 0; const silences = [];
  const audioOps = plan.operations.filter(({type}) => type === 'AUDIO_SILENCE');
  if (shape) {
    const spans = mergeSpans(audioOps, shape.sample_rate); let cursor = 0;
    const intervals = spans.map(({start, end}) => { const interval = {start: cursor, end: start}; cursor = end; return interval; }); intervals.push({start: cursor, end: null});
    for (const interval of intervals) { if (interval.end !== null && interval.start === interval.end) continue; changedOutside += changedSamples(pcm(sourcePath, ffmpeg, shape, interval.start || null, interval.end), pcm(outputPath, ffmpeg, shape, interval.start || null, interval.end)); }
    for (const operation of audioOps) { const start = Math.round((operation.time_span_ms.start + operation.fade_ms) * shape.sample_rate / 1000); const end = Math.round((operation.time_span_ms.end - operation.fade_ms) * shape.sample_rate / 1000); const center = pcm(outputPath, ffmpeg, shape, start, end); silences.push({sequence: silences.length, signal_id: operation.signal_id, start_ms: operation.time_span_ms.start, end_ms: operation.time_span_ms.end, fade_ms: operation.fade_ms, center_silent: center.every((byte) => byte === 0), outside_unchanged: changedOutside === 0}); }
  }

  expect(Array.isArray(request.disclosure_curtains) && request.disclosure_curtains.length > 0 && request.disclosure_curtains.length <= 256, 'PUBLICATION-CURTAINS');
  const reportId = `REPORT:${digest({case_id: request.case_id, execution_id: executionReceipt.execution_id}).slice(0, 24)}`;
  const requiredLines = disclosureLinesFor(plan.operations.length > 0);
  const curtains = request.disclosure_curtains.map(assertDisclosureCurtain); unique(curtains.map(({curtain_id}) => curtain_id), 'PUBLICATION-CURTAIN-ID-DUPLICATE'); unique(curtains.map(({canonical_sha256}) => canonical_sha256), 'PUBLICATION-CURTAIN-HASH-DUPLICATE');
  const findings = []; for (const curtain of curtains) for (const code of curtainFindings(curtain, {case_id: request.case_id, report_id: reportId, lines: requiredLines})) findings.push({sequence: findings.length, curtain_id: curtain.curtain_id, code});
  expect(Array.isArray(request.autonomous_clips) && request.autonomous_clips.length <= 256, 'PUBLICATION-CLIPS');
  const clips = request.autonomous_clips.map((clip, sequence) => { keys(clip, ['sequence', 'clip_id', 'curtain_ids'], 'PUBLICATION-CLIP-KEYS'); expect(clip.sequence === sequence && idPattern.test(clip.clip_id) && Array.isArray(clip.curtain_ids) && clip.curtain_ids.every((id) => idPattern.test(id)), 'PUBLICATION-CLIP'); unique(clip.curtain_ids, 'PUBLICATION-CLIP-CURTAIN-DUPLICATE'); return clip; }); unique(clips.map(({clip_id}) => clip_id), 'PUBLICATION-CLIP-ID-DUPLICATE');
  const curtainMap = new Map(curtains.map((curtain) => [curtain.curtain_id, curtain]));
  const clipsWithoutCurtain = clips.filter((clip) => clip.curtain_ids.length === 0 || !clip.curtain_ids.some((id) => curtainMap.get(id)?.autonomous_clip_ids.includes(clip.clip_id))).map(({clip_id}) => clip_id);
  for (const curtain of curtains) for (const clipId of curtain.autonomous_clip_ids) expect(clips.some(({clip_id}) => clip_id === clipId), 'PUBLICATION-CURTAIN-UNKNOWN-CLIP');
  const reportLinked = curtains.every((curtain) => curtain.privacy_report_id === reportId && curtain.case_id === request.case_id);
  const blocked = residuals.length > 0 || rgbMismatches.length > 0 || maximumMask > 0.05 || occlusions.length > 0 || changedOutside > 0 || silences.some(({center_silent}) => !center_silent) || findings.length > 0 || clipsWithoutCurtain.length > 0 || !reportLinked;
  const base = {
    schema_version: 'publication-privacy-report-v1', report_id: reportId, case_id: request.case_id, participant_id: request.participant_id, actor_id: request.actor_id, source: executionReceipt.source, output: executionReceipt.output,
    bindings: {execution_request_material_sha256: request.execution_request_material.sha256, execution_receipt_material_sha256: request.execution_receipt_material.sha256, pre_detection_request_material_sha256: request.pre_detection.request_material.sha256, pre_inventory_material_sha256: request.pre_detection.inventory_material.sha256, post_detection_request_material_sha256: request.post_detection.request_material.sha256, post_inventory_material_sha256: request.post_detection.inventory_material.sha256},
    detection: {pre_inventory_id: pre.inventory.inventory_id, post_inventory_id: post.inventory.inventory_id, coverage_complete: true, protected_signal_count: protectedRules.length}, residuals,
    visual_integrity: {compared_frames: metadata.frame_count, outside_mask_rgb_mismatch_frames: rgbMismatches, zero_unexplained_pixels: rgbMismatches.length === 0, maximum_mask_ratio: maximumMask, review_target_ratio: 0.05, hard_limit_ratio: 0.1},
    value_preservation: {zone_count: valuePlan.zones.length, occlusions}, audio_integrity: {has_audio: metadata.has_audio, outside_span_changed_samples: changedOutside, silences},
    disclosure: {state: plan.operations.length ? 'AI_EDITED_AND_CLASS_MEMORY_AUTHORIZED' : 'AI_EDITED', required_lines: requiredLines, curtains: curtains.map(({curtain_id, canonical_sha256}) => ({curtain_id, canonical_sha256})), curtain_findings: findings, autonomous_clip_ids: clips.map(({clip_id}) => clip_id), autonomous_clips_sha256: digest(clips), clips_without_curtain: clipsWithoutCurtain, report_linked: reportLinked},
    maximum_state: 'RENDERED_DRAFT', publication_authority: false, status: blocked ? 'BLOCKED_PRIVACY_FINDINGS' : 'VERIFIED_FOR_HUMAN_PLAYBACK',
  };
  return {...base, canonical_sha256: digest(base)};
};

export const verifyPublicationPrivacy = (request, options) => deriveReport(request, options);

export const assertPublicationPrivacyReport = (report, request, options) => {
  keys(report, ['schema_version', 'report_id', 'case_id', 'participant_id', 'actor_id', 'source', 'output', 'bindings', 'detection', 'residuals', 'visual_integrity', 'value_preservation', 'audio_integrity', 'disclosure', 'maximum_state', 'publication_authority', 'status', 'canonical_sha256'], 'PUBLICATION-REPORT-KEYS');
  expect(report.schema_version === 'publication-privacy-report-v1' && report.actor_id === 'RT-09-H03-PUBLICATION-PRIVACY-VERIFIER' && report.maximum_state === 'RENDERED_DRAFT' && report.publication_authority === false && hashPattern.test(report.canonical_sha256), 'PUBLICATION-REPORT-STATE');
  expect(digest(Object.fromEntries(Object.entries(report).filter(([key]) => key !== 'canonical_sha256'))) === report.canonical_sha256, 'PUBLICATION-REPORT-HASH');
  expect(same(report, deriveReport(request, options)), 'PUBLICATION-REPORT-AUTHORITY-DRIFT');
  return report;
};

if (process.argv[1]?.endsWith('verify-publication-privacy.mjs') && process.argv.length >= 5) {
  const request = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(`${JSON.stringify(stable(verifyPublicationPrivacy(request, {source_root: process.argv[3], output_root: process.argv[4]})), null, 2)}\n`);
}
