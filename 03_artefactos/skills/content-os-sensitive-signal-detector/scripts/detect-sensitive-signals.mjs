#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(resolve(here, '../schemas/sensitive-signal-inventory-v1.schema.json'), 'utf8'));
const validateInventory = new Ajv2020({allErrors: true, strict: false}).compile(schema);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const digest = (value) => sha(JSON.stringify(stable(value)));
const exact = (value, keys, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}-OBJECT`);
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) throw new Error(`${label}-KEYS`);
};
const isId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value);
const REF_PATTERN = /^(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*(?:^|\/)\.[^/])(?!.*\\)[a-z0-9](?:[a-z0-9._/-]*[a-z0-9])?$/u;
const physical = (value, label) => {
  exact(value, ['ref', 'sha256', 'bytes', 'content_base64'], label);
  if (!REF_PATTERN.test(value.ref) || !/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isInteger(value.bytes) || value.bytes < 1) throw new Error(`${label}-BINDING`);
  const bytes = Buffer.from(value.content_base64, 'base64');
  if (bytes.toString('base64') !== value.content_base64) throw new Error(`${label}-BASE64-CANONICAL`);
  if (bytes.length !== value.bytes || sha(bytes) !== value.sha256) throw new Error(`${label}-PHYSICAL-DRIFT`);
  return bytes;
};
const receipt = (value, keys, label) => {
  const bytes = physical(value, label);
  let parsed;
  try { parsed = JSON.parse(bytes.toString('utf8')); } catch { throw new Error(`${label}-JSON`); }
  exact(parsed, keys, `${label}-RECEIPT`);
  if (bytes.toString('utf8') !== JSON.stringify(stable(parsed))) throw new Error(`${label}-CANONICAL`);
  return parsed;
};
const span = (value, label) => {
  if (value === null) return;
  exact(value, ['start', 'end'], label);
  if (!Number.isInteger(value.start) || !Number.isInteger(value.end) || value.start < 0 || value.end < value.start) throw new Error(`${label}-RANGE`);
};
const normalized = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US');
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const aliasMatches = (text, aliases) => {
  const raw = String(text); const haystack = normalized(raw); const tokens = [...raw.matchAll(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu)]; const found = [];
  for (const entry of aliases) {
    const seen = new Set();
    for (const variant of [entry.canonical, ...entry.variants]) {
      const needle = normalized(variant); if (seen.has(needle)) continue; seen.add(needle);
      const exactMatch = new RegExp(`(?<![\\p{L}\\p{N}])${escape(needle)}(?![\\p{L}\\p{N}])`, 'iu').exec(haystack);
      if (exactMatch) { found.push({entry, partial: false, matched: raw.slice(exactMatch.index, exactMatch.index + exactMatch[0].length).trim()}); continue; }
      if (needle.length < 4) continue;
      for (const token of tokens) { const observed = normalized(token[0]); if (observed.length >= 4 && (needle.startsWith(observed) || observed.startsWith(needle))) found.push({entry, partial: true, matched: token[0]}); }
    }
  }
  const owners = new Map();
  for (const item of found) { const key = normalized(item.matched); const owner = owners.get(key); if (owner && owner !== item.entry.canonical) throw new Error('DETECTOR-ALIAS-MATCH-AMBIGUOUS'); owners.set(key, item.entry.canonical); }
  return found.filter((item, index) => found.findIndex((candidate) => candidate.entry.canonical === item.entry.canonical && normalized(candidate.matched) === normalized(item.matched)) === index);
};
const confidence = (score) => ({score, status: score >= 0.9 ? 'CONFIRMED' : score >= 0.5 ? 'REVIEW_REQUIRED' : 'UNKNOWN'});
const signalFingerprint = ({signal_id: _id, sequence: _sequence, ...signal}) => digest(signal);

const assertInventoryShape = (inventory) => {
  if (!validateInventory(inventory)) throw new Error(`DETECTOR-INVENTORY-SCHEMA ${new Ajv2020().errorsText(validateInventory.errors)}`);
  if (inventory.signals.some((signal, index) => signal.sequence !== index)) throw new Error('DETECTOR-INVENTORY-SEQUENCE');
  if (new Set(inventory.signals.map(({signal_id}) => signal_id)).size !== inventory.signals.length) throw new Error('DETECTOR-INVENTORY-SIGNAL-ID');
  if (new Set(inventory.signals.map(signalFingerprint)).size !== inventory.signals.length) throw new Error('DETECTOR-INVENTORY-SIGNAL-DUPLICATE');
  const {canonical_sha256: claimed, ...unsigned} = inventory;
  if (claimed !== digest(unsigned)) throw new Error('DETECTOR-INVENTORY-HASH');
  return inventory;
};

const deriveSensitiveSignals = (request) => {
  exact(request, ['schema_version', 'case_id', 'source', 'source_probe_receipt', 'actor_id', 'aliases', 'aliases_sha256', 'templates', 'templates_sha256', 'coverage', 'coverage_receipt', 'observations'], 'DETECTOR-REQUEST');
  if (request.schema_version !== 'sensitive-signal-detector-request-v1' || !isId(request.case_id) || request.actor_id !== 'RT-07-H03-PRIVACY-DETECTOR-PRODUCER') throw new Error('DETECTOR-REQUEST-IDENTITY');
  const materialRefs = new Set();
  const claimRef = (value) => { if (materialRefs.has(value)) throw new Error('DETECTOR-MATERIAL-REF-DUPLICATE'); materialRefs.add(value); };
  exact(request.source, ['ref', 'sha256', 'bytes', 'content_base64', 'frame_width', 'frame_height', 'frame_count', 'duration_ms', 'has_audio'], 'DETECTOR-SOURCE');
  physical({ref: request.source.ref, sha256: request.source.sha256, bytes: request.source.bytes, content_base64: request.source.content_base64}, 'DETECTOR-SOURCE');
  claimRef(request.source.ref);
  if (![request.source.frame_width, request.source.frame_height, request.source.frame_count, request.source.duration_ms].every((value) => Number.isInteger(value) && value > 0) || typeof request.source.has_audio !== 'boolean') throw new Error('DETECTOR-SOURCE-METADATA');
  const sourceMetadata = {frame_width: request.source.frame_width, frame_height: request.source.frame_height, frame_count: request.source.frame_count, duration_ms: request.source.duration_ms, has_audio: request.source.has_audio};
  const sourceMetadataSha256 = digest(sourceMetadata);
  const sourceProbe = receipt(request.source_probe_receipt, ['schema_version', 'actor_id', 'case_id', 'source_sha256', 'source_bytes', 'source_metadata_sha256', 'source_metadata'], 'DETECTOR-SOURCE-PROBE');
  claimRef(request.source_probe_receipt.ref);
  if (sourceProbe.schema_version !== 'sensitive-signal-source-probe-v1' || sourceProbe.actor_id !== 'RT-09-PRIVACY-SOURCE-PROBE-VERIFIER' || sourceProbe.case_id !== request.case_id || sourceProbe.source_sha256 !== request.source.sha256 || sourceProbe.source_bytes !== request.source.bytes || sourceProbe.source_metadata_sha256 !== sourceMetadataSha256 || digest(sourceProbe.source_metadata) !== sourceMetadataSha256) throw new Error('DETECTOR-SOURCE-PROBE-DRIFT');
  exact(request.coverage, ['visual_text', 'visual_templates', 'faces', 'audio_transcript'], 'DETECTOR-COVERAGE');
  const coverageStates = Object.values(request.coverage);
  if (!coverageStates.every((item) => ['COMPLETE', 'NOT_PRESENT', 'UNKNOWN'].includes(item))) throw new Error('DETECTOR-COVERAGE-STATE');
  const coverageReceipt = receipt(request.coverage_receipt, ['schema_version', 'actor_id', 'case_id', 'source_sha256', 'source_metadata_sha256', 'coverage'], 'DETECTOR-COVERAGE');
  claimRef(request.coverage_receipt.ref);
  if (coverageReceipt.schema_version !== 'sensitive-signal-coverage-receipt-v1' || coverageReceipt.actor_id !== 'RT-09-PRIVACY-COVERAGE-VERIFIER' || coverageReceipt.case_id !== request.case_id || coverageReceipt.source_sha256 !== request.source.sha256 || coverageReceipt.source_metadata_sha256 !== sourceMetadataSha256 || digest(coverageReceipt.coverage) !== digest(request.coverage)) throw new Error('DETECTOR-COVERAGE-DRIFT');
  if (request.coverage.audio_transcript === 'NOT_PRESENT' && request.source.has_audio) throw new Error('DETECTOR-COVERAGE-AUDIO-CONTRADICTION');
  if (['visual_text', 'visual_templates', 'faces'].some((key) => request.coverage[key] === 'NOT_PRESENT')) throw new Error('DETECTOR-COVERAGE-NOT-PRESENT-UNACCREDITED');
  const aliasIds = new Set(); const aliasVariants = new Map(); const aliasCanonicals = new Set();
  for (const entry of request.aliases) {
    exact(entry, ['alias_id', 'kind', 'canonical', 'variants'], 'DETECTOR-ALIAS');
    const canonicalKey = typeof entry.canonical === 'string' ? normalized(entry.canonical.trim()) : '';
    if (!isId(entry.alias_id) || aliasIds.has(entry.alias_id) || !['NAME', 'BRAND_TEXT'].includes(entry.kind) || typeof entry.canonical !== 'string' || !entry.canonical.trim() || aliasCanonicals.has(canonicalKey) || !Array.isArray(entry.variants) || entry.variants.length < 1 || !entry.variants.every((variant) => typeof variant === 'string' && variant.trim())) throw new Error('DETECTOR-ALIAS-INVALID');
    aliasIds.add(entry.alias_id); aliasCanonicals.add(canonicalKey);
    for (const variant of [entry.canonical, ...entry.variants]) { const key = normalized(variant); const owner = aliasVariants.get(key); if (owner && owner !== entry.canonical) throw new Error('DETECTOR-ALIAS-AMBIGUOUS'); aliasVariants.set(key, entry.canonical); }
  }
  if (digest(request.aliases) !== request.aliases_sha256) throw new Error('DETECTOR-ALIASES-DRIFT');
  const templates = new Map();
  for (const item of request.templates) {
    exact(item, ['template_id', 'kind', 'identity', 'content_base64', 'sha256', 'bytes'], 'DETECTOR-TEMPLATE');
    if (!isId(item.template_id) || templates.has(item.template_id) || !['LOGO', 'AVATAR', 'TOOL_CHROME'].includes(item.kind) || !item.identity) throw new Error('DETECTOR-TEMPLATE-INVALID');
    const templateRef = `templates/${item.template_id.toLowerCase()}.bin`; physical({ref: templateRef, sha256: item.sha256, bytes: item.bytes, content_base64: item.content_base64}, 'DETECTOR-TEMPLATE'); claimRef(templateRef); templates.set(item.template_id, item);
  }
  if (digest(request.templates) !== request.templates_sha256) throw new Error('DETECTOR-TEMPLATES-DRIFT');
  const evidenceActors = {OCR_TSV: 'RT-09-PRIVACY-OCR-VERIFIER', TEMPLATE: 'RT-09-PRIVACY-TEMPLATE-VERIFIER', FACE_MANUAL: 'RT-11-PRIVACY-GUARDIAN', AUDIO_TRANSCRIPT: 'RT-09-PRIVACY-AUDIO-VERIFIER'};
  const observationIds = new Set(); const observationFingerprints = new Set(); const modalityCounts = {OCR_TSV: 0, TEMPLATE: 0, FACE_MANUAL: 0, AUDIO_TRANSCRIPT: 0}; const signals = [];
  const push = (observation, kind, identity, matchedAlias = null, score = observation.confidence) => {
    const projection = {observation_id: observation.observation_id, kind, identity, matchedAlias};
    signals.push({sequence: signals.length, signal_id: `SIG-${sha(JSON.stringify(projection)).slice(0, 16)}`, kind, identity: {canonical: identity, matched_alias: matchedAlias}, modality: {OCR_TSV: 'VISUAL_TEXT', TEMPLATE: 'VISUAL_TEMPLATE', FACE_MANUAL: 'VISUAL_MANUAL', AUDIO_TRANSCRIPT: 'AUDIO_TRANSCRIPT'}[observation.modality], frame_span: observation.frame_span, time_span_ms: observation.time_span_ms, geometry: observation.geometry, confidence: confidence(score), evidence: {observation_id: observation.observation_id, material: {ref: observation.evidence.ref, sha256: observation.evidence.sha256, bytes: observation.evidence.bytes}}});
  };
  for (const observation of request.observations) {
    exact(observation, ['observation_id', 'modality', 'text', 'template_id', 'identity', 'frame_span', 'time_span_ms', 'geometry', 'confidence', 'evidence'], 'DETECTOR-OBSERVATION');
    if (!isId(observation.observation_id) || observationIds.has(observation.observation_id) || !Object.hasOwn(evidenceActors, observation.modality)) throw new Error('DETECTOR-OBSERVATION-INVALID');
    const {observation_id: _observationId, evidence: _evidence, ...semanticObservation} = observation; const fingerprint = digest(semanticObservation);
    if (observationFingerprints.has(fingerprint)) throw new Error('DETECTOR-OBSERVATION-DUPLICATE'); observationFingerprints.add(fingerprint); observationIds.add(observation.observation_id); modalityCounts[observation.modality] += 1;
    const evidenceReceipt = receipt(observation.evidence, ['schema_version', 'actor_id', 'case_id', 'source_sha256', 'source_metadata_sha256', 'observation_id', 'modality', 'observation_sha256'], 'DETECTOR-EVIDENCE');
    claimRef(observation.evidence.ref);
    if (evidenceReceipt.schema_version !== 'sensitive-signal-observation-evidence-v1' || evidenceReceipt.actor_id !== evidenceActors[observation.modality] || evidenceReceipt.case_id !== request.case_id || evidenceReceipt.source_sha256 !== request.source.sha256 || evidenceReceipt.source_metadata_sha256 !== sourceMetadataSha256 || evidenceReceipt.observation_id !== observation.observation_id || evidenceReceipt.modality !== observation.modality || evidenceReceipt.observation_sha256 !== digest(semanticObservation)) throw new Error('DETECTOR-EVIDENCE-DRIFT');
    span(observation.frame_span, 'DETECTOR-FRAME-SPAN'); span(observation.time_span_ms, 'DETECTOR-TIME-SPAN');
    if (observation.geometry !== null) { exact(observation.geometry, ['x', 'y', 'width', 'height'], 'DETECTOR-GEOMETRY'); const {x, y, width, height} = observation.geometry; if (![x, y].every((value) => Number.isInteger(value) && value >= 0) || ![width, height].every((value) => Number.isInteger(value) && value > 0) || x + width > request.source.frame_width || y + height > request.source.frame_height) throw new Error('DETECTOR-GEOMETRY-RANGE'); }
    if (typeof observation.confidence !== 'number' || observation.confidence < 0 || observation.confidence > 1) throw new Error('DETECTOR-CONFIDENCE');
    const audio = observation.modality === 'AUDIO_TRANSCRIPT';
    if (audio ? !request.source.has_audio || observation.frame_span !== null || observation.geometry !== null || observation.time_span_ms === null || observation.time_span_ms.end > request.source.duration_ms : observation.frame_span === null || observation.frame_span.end >= request.source.frame_count || observation.geometry === null || observation.time_span_ms !== null) throw new Error('DETECTOR-MODALITY-SPAN');
    if (observation.modality === 'TEMPLATE' ? observation.text !== null || observation.identity !== null || !isId(observation.template_id) : observation.modality === 'FACE_MANUAL' ? observation.text !== null || observation.template_id !== null || !observation.identity : observation.template_id !== null || observation.identity !== null) throw new Error('DETECTOR-MODALITY-FIELDS');
    if (observation.modality === 'TEMPLATE') { const template = templates.get(observation.template_id); if (!template) throw new Error('DETECTOR-TEMPLATE-UNKNOWN'); push(observation, template.kind, template.identity, null, Math.min(observation.confidence, 0.89)); }
    else if (observation.modality === 'FACE_MANUAL') { if (!observation.identity) throw new Error('DETECTOR-FACE-AUTHORITY'); push(observation, 'FACE', observation.identity, null, Math.min(observation.confidence, 0.89)); }
    else {
      if (typeof observation.text !== 'string' || observation.text.length === 0) throw new Error('DETECTOR-TEXT-MISSING');
      for (const match of aliasMatches(observation.text, request.aliases)) if (observation.modality !== 'AUDIO_TRANSCRIPT' || match.entry.kind === 'BRAND_TEXT') push(observation, observation.modality === 'AUDIO_TRANSCRIPT' ? 'SPOKEN_BRAND' : match.entry.kind, match.entry.canonical, match.matched, match.partial ? Math.min(observation.confidence, 0.89) : observation.confidence);
      if (observation.modality === 'OCR_TSV') {
        const urlPattern = /https?:\/\/[^\s]+/giu; const emailPattern = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu;
        for (const raw of observation.text.match(urlPattern) ?? []) { let value = raw.replace(/[.,;]+$/gu, ''); for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) while (value.endsWith(close) && [...value].filter((item) => item === close).length > [...value].filter((item) => item === open).length) value = value.slice(0, -1); if (value) push(observation, 'URL', value); }
        const withoutUrls = observation.text.replace(urlPattern, ' '); for (const value of withoutUrls.match(emailPattern) ?? []) push(observation, 'EMAIL', value);
        const withoutStructured = withoutUrls.replace(emailPattern, ' '); const paths = [...withoutStructured.match(/\/?(?:[A-Za-z0-9._-]+\/){2,}[A-Za-z0-9._-]+\.[A-Za-z0-9_-]{1,12}/gu) ?? [], ...withoutStructured.match(/[A-Za-z]:\\(?:[A-Za-z0-9._ -]+\\)+[A-Za-z0-9._ -]+\.[A-Za-z0-9_-]{1,12}/gu) ?? []]; for (const value of paths) push(observation, 'FILE_PATH', value);
      }
    }
  }
  for (const [coverageKey, modality] of [['visual_text', 'OCR_TSV'], ['visual_templates', 'TEMPLATE'], ['faces', 'FACE_MANUAL'], ['audio_transcript', 'AUDIO_TRANSCRIPT']]) { const state = request.coverage[coverageKey]; if ((state === 'COMPLETE' && modalityCounts[modality] === 0) || (state === 'NOT_PRESENT' && modalityCounts[modality] !== 0)) throw new Error('DETECTOR-COVERAGE-INCOMPLETE'); }
  const blocked = coverageStates.includes('UNKNOWN') || request.observations.some(({confidence: score}) => confidence(score).status === 'UNKNOWN');
  const output = {schema_version: 'sensitive-signal-inventory-v1', inventory_id: `INV-${digest([request.case_id, request.source.sha256, signals]).slice(0, 16)}`, case_id: request.case_id, source: {ref: request.source.ref, sha256: request.source.sha256, bytes: request.source.bytes}, detector_actor_id: request.actor_id, aliases_sha256: request.aliases_sha256, templates_sha256: request.templates_sha256, coverage: request.coverage, signals, status: blocked ? 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN' : 'BLOCKED_PENDING_PRIVACY_POLICY'};
  output.canonical_sha256 = digest(output); return output;
};

export const assertSensitiveSignalInventory = (inventory, request) => {
  assertInventoryShape(inventory);
  const expected = deriveSensitiveSignals(request); assertInventoryShape(expected);
  if (JSON.stringify(stable(inventory)) !== JSON.stringify(stable(expected))) throw new Error('DETECTOR-INVENTORY-AUTHORITY-DRIFT');
  return inventory;
};

export const detectSensitiveSignals = (request) => assertSensitiveSignalInventory(deriveSensitiveSignals(request), request);

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const request = JSON.parse(readFileSync(resolve(process.argv[2] ?? ''), 'utf8'));
  process.stdout.write(`${JSON.stringify(detectSensitiveSignals(request), null, 2)}\n`);
}
