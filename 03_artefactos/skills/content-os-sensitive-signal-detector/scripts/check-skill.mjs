#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';

import {assertSensitiveSignalInventory, detectSensitiveSignals} from './detect-sensitive-signals.mjs';

const root = process.cwd();
const skill = 'skills/content-os-sensitive-signal-detector';
const files = ['SKILL.md', 'LINEAGE.yml', 'schemas/sensitive-signal-inventory-v1.schema.json', 'scripts/detect-sensitive-signals.mjs', 'scripts/check-skill.mjs', 'fixtures/cases.json', 'receipts/runtime-boundary.yml'];
const contents = new Map(files.map((path) => [path, readFileSync(resolve(root, skill, path), 'utf8')]));
for (const token of ['sensitive-signal-inventory-v1', 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN', 'FACE_AUTO', 'no media', 'publication_authority: false']) if (![...contents.values()].join('\n').includes(token)) throw new Error(`SSD-CONTRACT-MISSING ${token}`);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const digest = (value) => sha(JSON.stringify(stable(value)));
const material = (ref, bytes) => ({ref, sha256: sha(bytes), bytes: bytes.length, content_base64: bytes.toString('base64')});
const canonicalMaterial = (ref, value) => material(ref, Buffer.from(JSON.stringify(stable(value))));
const cases = JSON.parse(contents.get('fixtures/cases.json'));
const templates = cases.templates.map(({content, ...item}) => {
  const bytes = Buffer.from(content);
  return {...item, content_base64: bytes.toString('base64'), sha256: sha(bytes), bytes: bytes.length};
});
const sourceBytes = Buffer.from('synthetic-source-analysis');
const source = {...material('sources/class-memory.bin', sourceBytes), frame_width: 1920, frame_height: 1080, frame_count: 61, duration_ms: 3000, has_audio: true};
const caseId = 'CASE-PRIVACY-SYNTHETIC';
const metadata = (value) => ({frame_width: value.frame_width, frame_height: value.frame_height, frame_count: value.frame_count, duration_ms: value.duration_ms, has_audio: value.has_audio});
const sourceMetadataSha256 = digest(metadata(source));
const coverage = {visual_text: 'COMPLETE', visual_templates: 'COMPLETE', faces: 'COMPLETE', audio_transcript: 'COMPLETE'};
const actors = {OCR_TSV: 'RT-09-PRIVACY-OCR-VERIFIER', TEMPLATE: 'RT-09-PRIVACY-TEMPLATE-VERIFIER', FACE_MANUAL: 'RT-11-PRIVACY-GUARDIAN', AUDIO_TRANSCRIPT: 'RT-09-PRIVACY-AUDIO-VERIFIER'};
const bindObservation = (observation) => {
  const {evidence: _evidence, ...core} = observation;
  const evidence = canonicalMaterial(`evidence/${core.observation_id.toLowerCase()}.json`, {schema_version: 'sensitive-signal-observation-evidence-v1', actor_id: actors[core.modality], case_id: caseId, source_sha256: source.sha256, source_metadata_sha256: sourceMetadataSha256, observation_id: core.observation_id, modality: core.modality, observation_sha256: digest(Object.fromEntries(Object.entries(core).filter(([key]) => key !== 'observation_id')))});
  return {...core, evidence};
};
const bindSourceProbe = (request) => {
  const sourceMetadata = metadata(request.source);
  request.source_probe_receipt = canonicalMaterial('evidence/source-probe.json', {schema_version: 'sensitive-signal-source-probe-v1', actor_id: 'RT-09-PRIVACY-SOURCE-PROBE-VERIFIER', case_id: request.case_id, source_sha256: request.source.sha256, source_bytes: request.source.bytes, source_metadata_sha256: digest(sourceMetadata), source_metadata: sourceMetadata});
};
const bindCoverage = (request) => {
  request.coverage_receipt = canonicalMaterial('evidence/coverage.json', {schema_version: 'sensitive-signal-coverage-receipt-v1', actor_id: 'RT-09-PRIVACY-COVERAGE-VERIFIER', case_id: request.case_id, source_sha256: request.source.sha256, source_metadata_sha256: digest(metadata(request.source)), coverage: request.coverage});
};
const observations = cases.observations.map(({evidence: _evidence, ...item}) => bindObservation(item));
const request = {
  schema_version: 'sensitive-signal-detector-request-v1', case_id: caseId, source, source_probe_receipt: null,
  actor_id: 'RT-07-H03-PRIVACY-DETECTOR-PRODUCER', aliases: cases.aliases, aliases_sha256: digest(cases.aliases),
  templates, templates_sha256: digest(templates), coverage, coverage_receipt: null, observations,
};
bindSourceProbe(request); bindCoverage(request);
const inventory = detectSensitiveSignals(request);
if (inventory.status !== 'BLOCKED_PENDING_PRIVACY_POLICY') throw new Error('SSD-POSITIVE-STATUS');
assertSensitiveSignalInventory(inventory, request);
for (const kind of cases.expected_kinds) if (!inventory.signals.some((signal) => signal.kind === kind)) throw new Error(`SSD-MISSING-KIND ${kind}`);
for (const identity of ['Kimberly-Clark', 'Arvex', 'GNP', 'Natalia']) if (!inventory.signals.some((signal) => signal.identity.canonical === identity)) throw new Error(`SSD-MISSING-IDENTITY ${identity}`);
const sofkaText = inventory.signals.find((signal) => signal.kind === 'BRAND_TEXT' && signal.identity.canonical === 'Sofka' && signal.modality === 'VISUAL_TEXT');
if (sofkaText?.identity.matched_alias !== 'Sofk' || sofkaText.confidence.status !== 'REVIEW_REQUIRED') throw new Error('SSD-PARTIAL-ALIAS');
if (inventory.signals.some((signal) => ['LOGO', 'FACE', 'AVATAR', 'TOOL_CHROME'].includes(signal.kind) && signal.confidence.status === 'CONFIRMED')) throw new Error('SSD-DATA-ONLY-CONFIDENCE');
if (!inventory.signals.some((signal) => signal.kind === 'URL' && signal.identity.canonical === 'https://example.test/demo')) throw new Error('SSD-URL-TRIM');
if (!inventory.signals.some((signal) => signal.kind === 'FILE_PATH' && signal.identity.canonical === 'workspace/class/private/file.csv')) throw new Error('SSD-PATH-PRESERVE');
const logos = inventory.signals.filter((signal) => signal.kind === 'LOGO');
if (logos.length !== 2 || logos[0].frame_span.end !== 24 || logos[1].frame_span.start !== 48) throw new Error('SSD-LOGO-REAPPEARANCE');
const schema = JSON.parse(contents.get('schemas/sensitive-signal-inventory-v1.schema.json'));
const validate = new Ajv2020({allErrors: true, strict: false}).compile(schema);
if (!validate(inventory) || validate({...inventory, render: true})) throw new Error('SSD-SCHEMA-STRICTNESS');
const expectBlocked = (label, mutate, pattern) => {
  const candidate = structuredClone(request); mutate(candidate);
  try { detectSensitiveSignals(candidate); } catch (error) { if (String(error).includes(pattern)) return; }
  throw new Error(`SSD-NEGATIVE-NOT-BLOCKED ${label}`);
};
const rebind = (candidate, index) => { candidate.observations[index] = bindObservation(candidate.observations[index]); };
expectBlocked('request-extra', (value) => { value.render = true; }, 'DETECTOR-REQUEST-KEYS');
expectBlocked('request-actor', (value) => { value.actor_id = 'ATTACKER'; }, 'DETECTOR-REQUEST-IDENTITY');
expectBlocked('source-drift', (value) => { value.source.sha256 = '0'.repeat(64); }, 'DETECTOR-SOURCE-PHYSICAL-DRIFT');
expectBlocked('source-evidence-reuse', (value) => { const replacement = Buffer.from('other-source-analysis'); value.source = {...value.source, ...material('sources/other-class.bin', replacement)}; bindSourceProbe(value); bindCoverage(value); }, 'DETECTOR-EVIDENCE-DRIFT');
expectBlocked('case-evidence-reuse', (value) => { value.case_id = 'CASE-OTHER'; bindSourceProbe(value); bindCoverage(value); }, 'DETECTOR-EVIDENCE-DRIFT');
expectBlocked('source-metadata-drift', (value) => { value.source.frame_width = 10000; }, 'DETECTOR-SOURCE-PROBE-DRIFT');
expectBlocked('coverage-drift', (value) => { value.coverage.faces = 'NOT_PRESENT'; }, 'DETECTOR-COVERAGE-DRIFT');
expectBlocked('coverage-visual-not-present', (value) => { value.coverage.faces = 'NOT_PRESENT'; value.observations = value.observations.filter(({modality}) => modality !== 'FACE_MANUAL'); bindCoverage(value); }, 'DETECTOR-COVERAGE-NOT-PRESENT-UNACCREDITED');
expectBlocked('coverage-audio-contradiction', (value) => { value.coverage.audio_transcript = 'NOT_PRESENT'; value.observations = value.observations.filter(({modality}) => modality !== 'AUDIO_TRANSCRIPT'); bindCoverage(value); }, 'DETECTOR-COVERAGE-AUDIO-CONTRADICTION');
expectBlocked('alias-drift', (value) => { value.aliases_sha256 = '0'.repeat(64); }, 'DETECTOR-ALIASES-DRIFT');
expectBlocked('alias-registry-ambiguity', (value) => { value.aliases.push({alias_id: 'AL-OTHER', kind: 'BRAND_TEXT', canonical: 'Other', variants: ['Sofka']}); value.aliases_sha256 = digest(value.aliases); }, 'DETECTOR-ALIAS-AMBIGUOUS');
expectBlocked('alias-canonical-duplicate-kind', (value) => { value.aliases.push({alias_id: 'AL-SOFKA-NAME', kind: 'NAME', canonical: 'Sofka', variants: ['Sofka person']}); value.aliases_sha256 = digest(value.aliases); }, 'DETECTOR-ALIAS-INVALID');
expectBlocked('alias-canonical-blank', (value) => { value.aliases[0].canonical = ' '; value.aliases_sha256 = digest(value.aliases); }, 'DETECTOR-ALIAS-INVALID');
expectBlocked('alias-canonical-padding', (value) => { value.aliases[0].canonical = ' Sofka '; value.aliases_sha256 = digest(value.aliases); }, 'DETECTOR-ALIAS-INVALID');
expectBlocked('alias-variant-padding', (value) => { value.aliases[0].variants[0] = ' Sofka '; value.aliases_sha256 = digest(value.aliases); }, 'DETECTOR-ALIAS-INVALID');
expectBlocked('alias-match-ambiguity', (value) => { value.aliases.push({alias_id: 'AL-SOFK-TARGET', kind: 'BRAND_TEXT', canonical: 'SofkTarget', variants: ['SofkTarget']}); value.aliases_sha256 = digest(value.aliases); value.observations[0].text = 'Sofk'; rebind(value, 0); }, 'DETECTOR-ALIAS-MATCH-AMBIGUOUS');
expectBlocked('template-drift', (value) => { value.templates[0].content_base64 = Buffer.from('drift').toString('base64'); }, 'DETECTOR-TEMPLATE-PHYSICAL-DRIFT');
expectBlocked('duplicate-observation-id', (value) => { value.observations.push(structuredClone(value.observations[0])); }, 'DETECTOR-OBSERVATION-INVALID');
expectBlocked('duplicate-observation-semantic', (value) => { const clone = structuredClone(value.observations[0]); clone.observation_id = 'OBS-OCR-DUP'; value.observations.push(bindObservation(clone)); }, 'DETECTOR-OBSERVATION-DUPLICATE');
expectBlocked('duplicate-observation-camouflage', (value) => { const clone = structuredClone(value.observations[0]); clone.observation_id = 'OBS-OCR-CAMOUFLAGE'; clone.template_id = 'TPL-SOFKA'; value.observations.push(bindObservation(clone)); }, 'DETECTOR-MODALITY-FIELDS');
expectBlocked('unknown-template', (value) => { value.observations[1].template_id = 'TPL-UNKNOWN'; rebind(value, 1); }, 'DETECTOR-TEMPLATE-UNKNOWN');
for (const ref of ['evidence//ocr.json', 'evidence/.ocr.json', 'Evidence/ocr.json', 'evidence/ocr/']) expectBlocked(`ref-${ref}`, (value) => { value.observations[0].evidence.ref = ref; }, 'DETECTOR-EVIDENCE-BINDING');
expectBlocked('duplicate-material-ref', (value) => { value.observations[1].evidence.ref = value.observations[0].evidence.ref; }, 'DETECTOR-MATERIAL-REF-DUPLICATE');
expectBlocked('evidence-base64', (value) => { value.observations[0].evidence.content_base64 += '='; }, 'DETECTOR-EVIDENCE-BASE64-CANONICAL');
expectBlocked('evidence-role', (value) => { const parsed = JSON.parse(Buffer.from(value.observations[0].evidence.content_base64, 'base64')); parsed.actor_id = 'RT-11-PRIVACY-GUARDIAN'; value.observations[0].evidence = canonicalMaterial('evidence/obs-ocr-1.json', parsed); }, 'DETECTOR-EVIDENCE-DRIFT');
expectBlocked('auto-face', (value) => { value.observations[5].modality = 'FACE_AUTO'; }, 'DETECTOR-OBSERVATION-INVALID');
expectBlocked('geometry-overflow', (value) => { value.observations[0].geometry.x = 1910; rebind(value, 0); }, 'DETECTOR-GEOMETRY-RANGE');
expectBlocked('frame-overflow', (value) => { value.observations[0].frame_span.end = 61; rebind(value, 0); }, 'DETECTOR-MODALITY-SPAN');
expectBlocked('audio-overflow', (value) => { value.observations[6].time_span_ms.end = 3001; rebind(value, 6); }, 'DETECTOR-MODALITY-SPAN');
expectBlocked('incomplete-coverage', (value) => { value.observations = value.observations.filter(({modality}) => modality !== 'AUDIO_TRANSCRIPT'); }, 'DETECTOR-COVERAGE-INCOMPLETE');
const boundary = structuredClone(request); boundary.observations[0].text = 'signposted'; rebind(boundary, 0);
if (detectSensitiveSignals(boundary).signals.some((signal) => signal.identity.canonical === 'GNP' && signal.modality === 'VISUAL_TEXT')) throw new Error('SSD-SUBSTRING-FALSE-POSITIVE');
const structured = structuredClone(request); structured.observations[0].text = 'https://example.test/Foo_(bar) https://example.test/demo]. https://example.test/nested).] /workspace/class/private/absolute.csv C:\\workspace\\class\\windows.csv 2026/08/21'; rebind(structured, 0);
const structuredSignals = detectSensitiveSignals(structured).signals;
for (const expected of ['https://example.test/Foo_(bar)', 'https://example.test/demo', 'https://example.test/nested', '/workspace/class/private/absolute.csv', 'C:\\workspace\\class\\windows.csv']) if (!structuredSignals.some((signal) => signal.identity.canonical === expected)) throw new Error(`SSD-STRUCTURED-PATTERN ${expected}`);
if (structuredSignals.some((signal) => signal.kind === 'FILE_PATH' && signal.identity.canonical.includes('2026/08/21'))) throw new Error('SSD-DATE-PATH-FALSE-POSITIVE');
const unicode = structuredClone(request); unicode.aliases.push({alias_id: 'AL-FFI', kind: 'BRAND_TEXT', canonical: 'ffi', variants: ['ﬃ']}); unicode.aliases_sha256 = digest(unicode.aliases); unicode.observations[0].text = 'ﬃ Sofka'; rebind(unicode, 0);
const unicodeSignals = detectSensitiveSignals(unicode).signals;
if (unicodeSignals.find((signal) => signal.identity.canonical === 'ffi')?.identity.matched_alias !== 'ﬃ' || unicodeSignals.find((signal) => signal.identity.canonical === 'Sofka')?.identity.matched_alias !== 'Sofka') throw new Error('SSD-UNICODE-MATCHED-ALIAS');
const unknownConfidence = structuredClone(request); unknownConfidence.observations[0].text = 'benign'; unknownConfidence.observations[0].confidence = 0.2; rebind(unknownConfidence, 0);
if (detectSensitiveSignals(unknownConfidence).status !== 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN') throw new Error('SSD-UNKNOWN-CONFIDENCE');
const rehash = (value) => { value.canonical_sha256 = digest(Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'canonical_sha256'))); };
for (const mutate of [
  (value) => { value.canonical_sha256 = '0'.repeat(64); },
  (value) => { value.signals.reverse(); },
  (value) => { value.detector_actor_id = 'ATTACKER'; rehash(value); },
  (value) => { value.source = {ref: 'sources/other.bin', sha256: '0'.repeat(64), bytes: 9}; rehash(value); },
  (value) => { value.signals.reverse(); value.signals.forEach((signal, index) => { signal.sequence = index; }); rehash(value); },
  (value) => { value.signals[0].kind = 'FACE'; value.signals[0].modality = 'VISUAL_MANUAL'; value.signals[0].confidence = {score: 0.99, status: 'CONFIRMED'}; rehash(value); },
  (value) => { value.signals[0].geometry.x = 999999; rehash(value); },
  (value) => { value.signals.push(structuredClone(value.signals[0])); value.signals.at(-1).signal_id = 'SIG-DUPLICATE'; value.signals.at(-1).sequence = value.signals.length - 1; value.canonical_sha256 = digest(Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'canonical_sha256'))); },
]) {
  const candidate = structuredClone(inventory); mutate(candidate);
  try { assertSensitiveSignalInventory(candidate, request); } catch { continue; }
  throw new Error('SSD-INVENTORY-FORGERY-ACCEPTED');
}
console.info(`PASS sensitive-signal-detector: ${inventory.signals.length} signals and 41 adversarial gates.`);
