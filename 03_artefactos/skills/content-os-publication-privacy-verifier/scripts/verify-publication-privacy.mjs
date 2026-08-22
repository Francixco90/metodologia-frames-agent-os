#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';

import {assertSensitiveSignalInventory} from '../../content-os-sensitive-signal-detector/scripts/detect-sensitive-signals.mjs';
import {assertMinimalRedactionExecution, assertMinimalRedactionRequest} from '../../content-os-minimal-redaction/scripts/execute-minimal-redaction.mjs';
import {assertDisclosureCurtain, disclosureLinesFor, verifyDisclosureMedia} from './verify-disclosure-media.mjs';

export {assertDisclosureCurtain, disclosureLinesFor};

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

const verifyExecutionInScratch = (executionReceipt, executionRequest, roots) => {
  const scratch = mkdtempSync(resolve(tmpdir(), 'publication-execution-')); const source = resolve(scratch, 'source'); const output = resolve(scratch, 'output'); mkdirSync(source); mkdirSync(output);
  const copy = (fromRoot, ref, toRoot) => { const from = resolve(fromRoot, ref); expect(lstatSync(from).isFile(), 'PUBLICATION-MEDIA-TYPE'); const to = resolve(toRoot, ref); mkdirSync(dirname(to), {recursive: true}); copyFileSync(from, to); };
  try { copy(roots.source_root, executionRequest.source.ref, source); copy(roots.output_root, executionRequest.output_ref, output); copy(roots.output_root, executionRequest.receipt_ref, output); if (executionReceipt.captions) copy(roots.output_root, executionRequest.caption_output_ref, output); else expect(!existsSync(resolve(roots.output_root, executionRequest.caption_output_ref)), 'PUBLICATION-CAPTION-UNDECLARED'); assertMinimalRedactionExecution(executionReceipt, executionRequest, {source_root: source, output_root: output}); } finally { rmSync(scratch, {recursive: true, force: true}); }
};

const deriveReport = (request, options) => {
  keys(request, ['schema_version', 'case_id', 'participant_id', 'actor_id', 'execution_request_material', 'execution_receipt_material', 'pre_detection', 'post_detection', 'post_rescan_receipt', 'class_memory_authorization_material', 'authorization_freshness_receipt', 'disclosure_curtains', 'disclosure_export_manifest_material', 'export_set_verification_receipt'], 'PUBLICATION-REQUEST-KEYS');
  expect(request.schema_version === 'publication-privacy-verification-request-v1' && idPattern.test(request.case_id) && idPattern.test(request.participant_id) && request.actor_id === 'RT-09-H03-PUBLICATION-PRIVACY-VERIFIER', 'PUBLICATION-REQUEST-IDENTITY');
  keys(options, ['source_root', 'output_root', 'disclosure_root'], 'PUBLICATION-OPTIONS-KEYS');
  const sourceRoot = realpathSync(options.source_root); const outputRoot = realpathSync(options.output_root); const disclosureRoot = realpathSync(options.disclosure_root); const roots = [sourceRoot, outputRoot, disclosureRoot];
  expect(roots.every((root) => lstatSync(root).isDirectory()) && new Set(roots).size === 3 && roots.every((root, index) => roots.every((other, otherIndex) => index === otherIndex || !nested(root, other))), 'PUBLICATION-ROOT-REUSE');
  const materials = [request.execution_request_material, request.execution_receipt_material, request.pre_detection.request_material, request.pre_detection.inventory_material, request.post_detection.request_material, request.post_detection.inventory_material, request.post_rescan_receipt, request.class_memory_authorization_material, request.authorization_freshness_receipt, request.disclosure_export_manifest_material, request.export_set_verification_receipt];
  unique(materials.map(({ref}) => ref), 'PUBLICATION-MATERIAL-REF-DUPLICATE');
  const executionRequest = physical(request.execution_request_material, 'PUBLICATION-EXECUTION-REQUEST');
  const executionReceipt = physical(request.execution_receipt_material, 'PUBLICATION-EXECUTION-RECEIPT');
  const {policy, valuePlan, plan, metadata} = assertMinimalRedactionRequest(executionRequest);
  expect(executionRequest.case_id === request.case_id && executionRequest.participant_id === request.participant_id && executionRequest.actor_id !== request.actor_id, 'PUBLICATION-EXECUTOR-SEPARATION');
  verifyExecutionInScratch(executionReceipt, executionRequest, {source_root: sourceRoot, output_root: outputRoot});
  const pre = verifyDetectionBundle(request.pre_detection, 'PUBLICATION-PRE-DETECTION'); const post = verifyDetectionBundle(request.post_detection, 'PUBLICATION-POST-DETECTION');
  const inventoryRef = {ref: request.pre_detection.inventory_material.ref, sha256: request.pre_detection.inventory_material.sha256, bytes: request.pre_detection.inventory_material.bytes};
  expect(pre.detectorRequest.case_id === request.case_id && post.detectorRequest.case_id === request.case_id && same(policy.inventory, inventoryRef) && same(pre.inventory.source, executionRequest.source) && pre.detectorRequest.source.sha256 === executionRequest.source.sha256 && pre.detectorRequest.source.bytes === executionRequest.source.bytes && pre.detectorRequest.aliases_sha256 === post.detectorRequest.aliases_sha256 && pre.detectorRequest.templates_sha256 === post.detectorRequest.templates_sha256 && same(pre.detectorRequest.aliases, post.detectorRequest.aliases) && same(pre.detectorRequest.templates, post.detectorRequest.templates), 'PUBLICATION-DETECTOR-CONFIG-DRIFT');
  const outputPath = resolve(outputRoot, executionReceipt.output.ref); const sourcePath = resolve(sourceRoot, executionRequest.source.ref);
  expect(lstatSync(sourcePath).isFile() && lstatSync(outputPath).isFile(), 'PUBLICATION-MEDIA-TYPE');
  const outputBytes = readFileSync(outputPath);
  expect(post.detectorRequest.source.ref === executionReceipt.output.ref && post.detectorRequest.source.sha256 === executionReceipt.output.sha256 && post.detectorRequest.source.bytes === executionReceipt.output.bytes && post.detectorRequest.source.content_base64 === outputBytes.toString('base64') && same(post.inventory.source, executionReceipt.output), 'PUBLICATION-POST-BINDING');
  const rescan = physical(request.post_rescan_receipt, 'PUBLICATION-POST-RESCAN'); keys(rescan, ['schema_version', 'actor_id', 'case_id', 'source_sha256', 'aliases_sha256', 'templates_sha256', 'detector_request_material_sha256', 'inventory_material_sha256', 'coverage_sha256', 'status'], 'PUBLICATION-POST-RESCAN-KEYS'); expect(rescan.schema_version === 'publication-sensitive-rescan-verification-v1' && rescan.actor_id === 'RT-09-H03-PUBLICATION-RESCAN-VERIFIER' && rescan.case_id === request.case_id && rescan.source_sha256 === executionReceipt.output.sha256 && rescan.aliases_sha256 === pre.detectorRequest.aliases_sha256 && rescan.templates_sha256 === pre.detectorRequest.templates_sha256 && rescan.detector_request_material_sha256 === request.post_detection.request_material.sha256 && rescan.inventory_material_sha256 === request.post_detection.inventory_material.sha256 && rescan.coverage_sha256 === digest(post.detectorRequest.coverage) && rescan.status === 'VERIFIED_COMPLETE_PUBLICATION_RESCAN', 'PUBLICATION-POST-RESCAN-DRIFT');
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
  for (const operation of plan.operations.filter(({type}) => type === 'LOCAL_BLUR')) for (const zone of valuePlan.zones) if (overlaps(operation.frame_span, zone.frame_span) && intersects(operation.authorized_effect_roi, zone.geometry) && !zone.authorized_redaction_signal_ids.includes(operation.signal_id)) occlusions.push({sequence: occlusions.length, zone_id: zone.zone_id, signal_id: operation.signal_id, operation_id: operation.operation_id});

  const shape = audioShape(sourcePath, ffprobe); const outputShape = audioShape(outputPath, ffprobe); expect(same(shape, outputShape) && Boolean(shape) === metadata.has_audio, 'PUBLICATION-AUDIO-SHAPE');
  let changedOutside = 0; const silences = [];
  const audioOps = plan.operations.filter(({type}) => type === 'AUDIO_SILENCE');
  if (shape) {
    const spans = mergeSpans(audioOps, shape.sample_rate); let cursor = 0;
    const intervals = spans.map(({start, end}) => { const interval = {start: cursor, end: start}; cursor = end; return interval; }); intervals.push({start: cursor, end: null});
    for (const interval of intervals) { if (interval.end !== null && interval.start === interval.end) continue; changedOutside += changedSamples(pcm(sourcePath, ffmpeg, shape, interval.start || null, interval.end), pcm(outputPath, ffmpeg, shape, interval.start || null, interval.end)); }
    for (const operation of audioOps) { const start = Math.round((operation.time_span_ms.start + operation.fade_ms) * shape.sample_rate / 1000); const end = Math.round((operation.time_span_ms.end - operation.fade_ms) * shape.sample_rate / 1000); const center = pcm(outputPath, ffmpeg, shape, start, end); silences.push({sequence: silences.length, signal_id: operation.signal_id, start_ms: operation.time_span_ms.start, end_ms: operation.time_span_ms.end, fade_ms: operation.fade_ms, center_silent: center.every((byte) => byte === 0), outside_unchanged: changedOutside === 0}); }
  }

  const reportId = `REPORT:${digest({case_id: request.case_id, execution_id: executionReceipt.execution_id}).slice(0, 24)}`;
  const disclosure = verifyDisclosureMedia(request, {case_id: request.case_id, participant_id: request.participant_id, report_id: reportId, has_redaction: plan.operations.length > 0, source: executionReceipt.source, privacy_policy_sha256: policy.canonical_sha256, execution_id: executionReceipt.execution_id, execution_receipt_material_sha256: request.execution_receipt_material.sha256, execution_output: executionReceipt.output, execution_output_path: outputPath, execution_frame_count: metadata.frame_count, audio_shape: shape, ffmpeg, ffprobe, disclosure_root: disclosureRoot});
  const blocked = residuals.length > 0 || rgbMismatches.length > 0 || maximumMask > 0.05 || occlusions.length > 0 || changedOutside > 0 || silences.some(({center_silent}) => !center_silent) || disclosure.exports_without_curtain.length > 0 || disclosure.curtain_render_mismatches.length > 0 || disclosure.body_rgb_mismatches.length > 0 || disclosure.body_audio_changed_samples > 0 || disclosure.curtain_audio_nonzero_bytes > 0 || !disclosure.report_linked;
  const base = {
    schema_version: 'publication-privacy-report-v1', report_id: reportId, case_id: request.case_id, participant_id: request.participant_id, actor_id: request.actor_id, source: executionReceipt.source, output: executionReceipt.output,
    bindings: {execution_request_material_sha256: request.execution_request_material.sha256, execution_receipt_material_sha256: request.execution_receipt_material.sha256, pre_detection_request_material_sha256: request.pre_detection.request_material.sha256, pre_inventory_material_sha256: request.pre_detection.inventory_material.sha256, post_detection_request_material_sha256: request.post_detection.request_material.sha256, post_inventory_material_sha256: request.post_detection.inventory_material.sha256, post_rescan_receipt_sha256: request.post_rescan_receipt.sha256},
    detection: {pre_inventory_id: pre.inventory.inventory_id, post_inventory_id: post.inventory.inventory_id, coverage_complete: true, protected_signal_count: protectedRules.length}, residuals,
    visual_integrity: {compared_frames: metadata.frame_count, outside_mask_rgb_mismatch_frames: rgbMismatches, zero_unexplained_pixels: rgbMismatches.length === 0, maximum_mask_ratio: maximumMask, review_target_ratio: 0.05, hard_limit_ratio: 0.1},
    value_preservation: {zone_count: valuePlan.zones.length, occlusions}, audio_integrity: {has_audio: metadata.has_audio, outside_span_changed_samples: changedOutside, silences},
    disclosure,
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

if (process.argv[1]?.endsWith('verify-publication-privacy.mjs') && process.argv.length >= 6) {
  const request = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(`${JSON.stringify(stable(verifyPublicationPrivacy(request, {source_root: process.argv[3], output_root: process.argv[4], disclosure_root: process.argv[5]})), null, 2)}\n`);
}
