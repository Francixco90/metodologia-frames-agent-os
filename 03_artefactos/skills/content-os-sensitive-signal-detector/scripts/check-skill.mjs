#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';

import {detectSensitiveSignals} from './detect-sensitive-signals.mjs';

const root = process.cwd();
const skill = 'skills/content-os-sensitive-signal-detector';
const files = ['SKILL.md', 'LINEAGE.yml', 'schemas/sensitive-signal-inventory-v1.schema.json', 'scripts/detect-sensitive-signals.mjs', 'scripts/check-skill.mjs', 'fixtures/cases.json', 'receipts/runtime-boundary.yml'];
const contents = new Map(files.map((path) => [path, readFileSync(resolve(root, skill, path), 'utf8')]));
for (const token of ['sensitive-signal-inventory-v1', 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN', 'FACE_AUTO', 'no media', 'publication_authority: false']) {
  if (![...contents.values()].join('\n').includes(token)) throw new Error(`SSD-CONTRACT-MISSING ${token}`);
}
const sha = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const digest = (value) => sha(JSON.stringify(stable(value)));
const cases = JSON.parse(contents.get('fixtures/cases.json'));
const material = (id, text) => {
  const bytes = Buffer.from(text);
  return {ref: `evidence/${id}.json`, sha256: sha(bytes), bytes: bytes.length, content_base64: bytes.toString('base64')};
};
const templates = cases.templates.map(({content, ...item}) => {
  const bytes = Buffer.from(content);
  return {...item, content_base64: bytes.toString('base64'), sha256: sha(bytes), bytes: bytes.length};
});
const observations = cases.observations.map(({evidence, ...item}) => ({...item, evidence: material(item.observation_id, evidence)}));
const request = {
  schema_version: 'sensitive-signal-detector-request-v1', case_id: 'CASE-PRIVACY-SYNTHETIC',
  source: {ref: 'sources/class-memory.mp4', sha256: '1'.repeat(64), bytes: 4096},
  actor_id: 'RT-07-H03-PRIVACY-DETECTOR-PRODUCER', aliases: cases.aliases,
  aliases_sha256: digest(cases.aliases), templates, templates_sha256: digest(templates),
  coverage: {visual_text: 'COMPLETE', visual_templates: 'COMPLETE', faces: 'COMPLETE', audio_transcript: 'COMPLETE'}, observations,
};
const inventory = detectSensitiveSignals(request);
if (inventory.status !== 'BLOCKED_PENDING_PRIVACY_POLICY') throw new Error('SSD-POSITIVE-STATUS');
const {canonical_sha256: inventorySha, ...unsignedInventory} = inventory;
if (inventorySha !== digest(unsignedInventory)) throw new Error('SSD-CANONICAL-HASH');
for (const kind of cases.expected_kinds) if (!inventory.signals.some((signal) => signal.kind === kind)) throw new Error(`SSD-MISSING-KIND ${kind}`);
for (const identity of ['Kimberly-Clark', 'Arvex', 'GNP', 'Natalia']) if (!inventory.signals.some((signal) => signal.identity.canonical === identity)) throw new Error(`SSD-MISSING-IDENTITY ${identity}`);
const sofkaText = inventory.signals.find((signal) => signal.kind === 'BRAND_TEXT' && signal.identity.canonical === 'Sofka');
if (sofkaText?.identity.matched_alias !== 'Sofk') throw new Error('SSD-PARTIAL-ALIAS');
if (sofkaText.confidence.status !== 'REVIEW_REQUIRED') throw new Error('SSD-PARTIAL-CONFIDENCE');
const logos = inventory.signals.filter((signal) => signal.kind === 'LOGO');
if (logos.length !== 2 || logos[0].frame_span.end !== 24 || logos[1].frame_span.start !== 48) throw new Error('SSD-LOGO-REAPPEARANCE');
const schema = JSON.parse(contents.get('schemas/sensitive-signal-inventory-v1.schema.json'));
const validate = new Ajv2020({allErrors: true, strict: false}).compile(schema);
if (!validate(inventory)) throw new Error('SSD-SCHEMA-POSITIVE');
const extraOutput = {...inventory, render: true};
if (validate(extraOutput)) throw new Error('SSD-SCHEMA-EXTRA-ACCEPTED');
const expectBlocked = (label, mutate, pattern) => {
  const candidate = structuredClone(request); mutate(candidate);
  try { detectSensitiveSignals(candidate); } catch (error) { if (String(error).includes(pattern)) return; }
  throw new Error(`SSD-NEGATIVE-NOT-BLOCKED ${label}`);
};
expectBlocked('request-extra', (value) => { value.render = true; }, 'DETECTOR-REQUEST-KEYS');
expectBlocked('alias-drift', (value) => { value.aliases_sha256 = '0'.repeat(64); }, 'DETECTOR-ALIASES-DRIFT');
expectBlocked('alias-ambiguity', (value) => { value.aliases.push({alias_id: 'AL-OTHER', kind: 'BRAND_TEXT', canonical: 'Other', variants: ['Sofka']}); value.aliases_sha256 = digest(value.aliases); }, 'DETECTOR-ALIAS-AMBIGUOUS');
expectBlocked('template-drift', (value) => { value.templates[0].content_base64 = Buffer.from('drift').toString('base64'); }, 'DETECTOR-TEMPLATE-PHYSICAL-DRIFT');
expectBlocked('duplicate-observation', (value) => { value.observations.push(structuredClone(value.observations[0])); }, 'DETECTOR-OBSERVATION-INVALID');
expectBlocked('unknown-template', (value) => { value.observations[1].template_id = 'TPL-UNKNOWN'; }, 'DETECTOR-TEMPLATE-UNKNOWN');
expectBlocked('ref-alias', (value) => { value.observations[0].evidence.ref = 'evidence/./ocr.json'; }, 'DETECTOR-EVIDENCE-REF');
expectBlocked('auto-face', (value) => { value.observations[5].modality = 'FACE_AUTO'; }, 'DETECTOR-OBSERVATION-INVALID');
expectBlocked('incomplete-coverage', (value) => { value.observations = value.observations.filter(({modality}) => modality !== 'AUDIO_TRANSCRIPT'); }, 'DETECTOR-COVERAGE-INCOMPLETE');
expectBlocked('audio-span', (value) => { value.observations[6].time_span_ms = null; }, 'DETECTOR-MODALITY-SPAN');
const unknownCoverage = structuredClone(request); unknownCoverage.coverage.faces = 'UNKNOWN';
if (detectSensitiveSignals(unknownCoverage).status !== 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN') throw new Error('SSD-UNKNOWN-COVERAGE');
const unknownConfidence = structuredClone(request); unknownConfidence.observations[0].confidence = 0.2;
if (detectSensitiveSignals(unknownConfidence).status !== 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN') throw new Error('SSD-UNKNOWN-CONFIDENCE');
console.info(`PASS sensitive-signal-detector: ${inventory.signals.length} signals and 12 adversarial gates.`);
