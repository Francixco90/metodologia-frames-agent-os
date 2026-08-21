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
const canonical = (value) => JSON.stringify(value, Object.keys(value).sort());
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
};
const digest = (value) => sha(JSON.stringify(stable(value)));
const exact = (value, keys, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}-OBJECT`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (canonical(actual) !== canonical(expected)) throw new Error(`${label}-KEYS`);
};
const isId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value);
const ref = (value, label, withContent = false) => {
  exact(value, withContent ? ['ref', 'sha256', 'bytes', 'content_base64'] : ['ref', 'sha256', 'bytes'], label);
  if (!/^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\\)[A-Za-z0-9._/-]+$/u.test(value.ref)) throw new Error(`${label}-REF`);
  if (!/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isInteger(value.bytes) || value.bytes < 1) throw new Error(`${label}-BINDING`);
  if (withContent) {
    const bytes = Buffer.from(value.content_base64, 'base64');
    if (bytes.length !== value.bytes || sha(bytes) !== value.sha256) throw new Error(`${label}-PHYSICAL-DRIFT`);
  }
};
const span = (value, label) => {
  if (value === null) return;
  exact(value, ['start', 'end'], label);
  if (!Number.isInteger(value.start) || !Number.isInteger(value.end) || value.start < 0 || value.end < value.start) throw new Error(`${label}-RANGE`);
};
const geometry = (value) => {
  if (value === null) return;
  exact(value, ['x', 'y', 'width', 'height'], 'DETECTOR-GEOMETRY');
  if (![value.x, value.y].every((item) => Number.isInteger(item) && item >= 0) || ![value.width, value.height].every((item) => Number.isInteger(item) && item > 0)) throw new Error('DETECTOR-GEOMETRY-RANGE');
};
const normalized = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US');
const aliasMatch = (text, aliases) => aliases.flatMap((entry) => entry.variants.map((variant) => {
  const haystack = normalized(text);
  const needle = normalized(variant);
  const exactMatch = haystack.includes(needle);
  const partial = !exactMatch && needle.length >= 4 && haystack.split(/[^\p{L}\p{N}-]+/u).some((token) => token.length >= 4 && (needle.startsWith(token) || token.startsWith(needle)));
  return exactMatch || partial ? {entry, partial, variant: exactMatch ? variant : text.match(/[\p{L}\p{N}-]{4,}/u)?.[0] ?? variant} : null;
}).filter(Boolean));
const confidence = (score) => ({score, status: score >= 0.9 ? 'CONFIRMED' : score >= 0.5 ? 'REVIEW_REQUIRED' : 'UNKNOWN'});

export const detectSensitiveSignals = (request) => {
  exact(request, ['schema_version', 'case_id', 'source', 'actor_id', 'aliases', 'aliases_sha256', 'templates', 'templates_sha256', 'coverage', 'observations'], 'DETECTOR-REQUEST');
  if (request.schema_version !== 'sensitive-signal-detector-request-v1' || !isId(request.case_id) || !isId(request.actor_id)) throw new Error('DETECTOR-REQUEST-IDENTITY');
  ref(request.source, 'DETECTOR-SOURCE');
  exact(request.coverage, ['visual_text', 'visual_templates', 'faces', 'audio_transcript'], 'DETECTOR-COVERAGE');
  const coverageStates = Object.values(request.coverage);
  if (!coverageStates.every((item) => ['COMPLETE', 'NOT_PRESENT', 'UNKNOWN'].includes(item))) throw new Error('DETECTOR-COVERAGE-STATE');
  const aliasIds = new Set();
  const aliasVariants = new Map();
  for (const entry of request.aliases) {
    exact(entry, ['alias_id', 'kind', 'canonical', 'variants'], 'DETECTOR-ALIAS');
    if (!isId(entry.alias_id) || aliasIds.has(entry.alias_id) || !['NAME', 'BRAND_TEXT'].includes(entry.kind) || !entry.canonical || !Array.isArray(entry.variants) || entry.variants.length < 1 || !entry.variants.every((variant) => typeof variant === 'string' && variant.trim().length > 0)) throw new Error('DETECTOR-ALIAS-INVALID');
    aliasIds.add(entry.alias_id);
    for (const variant of [entry.canonical, ...entry.variants]) {
      const key = normalized(variant); const owner = aliasVariants.get(key);
      if (owner && owner !== entry.canonical) throw new Error('DETECTOR-ALIAS-AMBIGUOUS');
      aliasVariants.set(key, entry.canonical);
    }
  }
  if (digest(request.aliases) !== request.aliases_sha256) throw new Error('DETECTOR-ALIASES-DRIFT');
  const templates = new Map();
  for (const item of request.templates) {
    exact(item, ['template_id', 'kind', 'identity', 'content_base64', 'sha256', 'bytes'], 'DETECTOR-TEMPLATE');
    if (!isId(item.template_id) || templates.has(item.template_id) || !['LOGO', 'AVATAR', 'TOOL_CHROME'].includes(item.kind) || !item.identity) throw new Error('DETECTOR-TEMPLATE-INVALID');
    ref({ref: `templates/${item.template_id}.bin`, sha256: item.sha256, bytes: item.bytes, content_base64: item.content_base64}, 'DETECTOR-TEMPLATE', true);
    templates.set(item.template_id, item);
  }
  if (digest(request.templates) !== request.templates_sha256) throw new Error('DETECTOR-TEMPLATES-DRIFT');
  const observationIds = new Set();
  const modalityCounts = {OCR_TSV: 0, TEMPLATE: 0, FACE_MANUAL: 0, AUDIO_TRANSCRIPT: 0};
  const signals = [];
  const push = (observation, kind, identity, matchedAlias = null, score = observation.confidence) => {
    const projection = {observation_id: observation.observation_id, kind, identity, matchedAlias};
    signals.push({
      signal_id: `SIG-${sha(JSON.stringify(projection)).slice(0, 16)}`, kind,
      identity: {canonical: identity, matched_alias: matchedAlias},
      modality: {OCR_TSV: 'VISUAL_TEXT', TEMPLATE: 'VISUAL_TEMPLATE', FACE_MANUAL: 'VISUAL_MANUAL', AUDIO_TRANSCRIPT: 'AUDIO_TRANSCRIPT'}[observation.modality],
      frame_span: observation.frame_span, time_span_ms: observation.time_span_ms,
      geometry: observation.geometry, confidence: confidence(score),
      evidence: {observation_id: observation.observation_id, material: {ref: observation.evidence.ref, sha256: observation.evidence.sha256, bytes: observation.evidence.bytes}},
    });
  };
  for (const observation of request.observations) {
    exact(observation, ['observation_id', 'modality', 'text', 'template_id', 'identity', 'frame_span', 'time_span_ms', 'geometry', 'confidence', 'evidence'], 'DETECTOR-OBSERVATION');
    if (!isId(observation.observation_id) || observationIds.has(observation.observation_id) || !['OCR_TSV', 'TEMPLATE', 'FACE_MANUAL', 'AUDIO_TRANSCRIPT'].includes(observation.modality)) throw new Error('DETECTOR-OBSERVATION-INVALID');
    observationIds.add(observation.observation_id); modalityCounts[observation.modality] += 1; ref(observation.evidence, 'DETECTOR-EVIDENCE', true);
    span(observation.frame_span, 'DETECTOR-FRAME-SPAN'); span(observation.time_span_ms, 'DETECTOR-TIME-SPAN'); geometry(observation.geometry);
    if (typeof observation.confidence !== 'number' || observation.confidence < 0 || observation.confidence > 1) throw new Error('DETECTOR-CONFIDENCE');
    const audio = observation.modality === 'AUDIO_TRANSCRIPT';
    if (audio ? observation.frame_span !== null || observation.geometry !== null || observation.time_span_ms === null : observation.frame_span === null || observation.geometry === null || observation.time_span_ms !== null) throw new Error('DETECTOR-MODALITY-SPAN');
    if (observation.modality === 'TEMPLATE') {
      const template = templates.get(observation.template_id); if (!template) throw new Error('DETECTOR-TEMPLATE-UNKNOWN');
      push(observation, template.kind, template.identity);
    } else if (observation.modality === 'FACE_MANUAL') {
      if (!observation.identity) throw new Error('DETECTOR-FACE-AUTHORITY'); push(observation, 'FACE', observation.identity);
    } else {
      if (typeof observation.text !== 'string' || observation.text.length === 0) throw new Error('DETECTOR-TEXT-MISSING');
      for (const match of aliasMatch(observation.text, request.aliases)) {
        if (observation.modality !== 'AUDIO_TRANSCRIPT' || match.entry.kind === 'BRAND_TEXT') push(observation, observation.modality === 'AUDIO_TRANSCRIPT' ? 'SPOKEN_BRAND' : match.entry.kind, match.entry.canonical, match.variant, match.partial ? Math.min(observation.confidence, 0.89) : observation.confidence);
      }
      if (observation.modality === 'OCR_TSV') {
        for (const value of observation.text.match(/https?:\/\/[^\s]+/giu) ?? []) push(observation, 'URL', value);
        for (const value of observation.text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu) ?? []) push(observation, 'EMAIL', value);
        const withoutUrls = observation.text.replace(/https?:\/\/[^\s]+/giu, '');
        for (const value of withoutUrls.match(/(?:\/[A-Za-z0-9._-]+){2,}/gu) ?? []) push(observation, 'FILE_PATH', value);
      }
    }
  }
  for (const [coverageKey, modality] of [['visual_text', 'OCR_TSV'], ['visual_templates', 'TEMPLATE'], ['faces', 'FACE_MANUAL'], ['audio_transcript', 'AUDIO_TRANSCRIPT']]) {
    const state = request.coverage[coverageKey];
    if ((state === 'COMPLETE' && modalityCounts[modality] === 0) || (state === 'NOT_PRESENT' && modalityCounts[modality] !== 0)) throw new Error('DETECTOR-COVERAGE-INCOMPLETE');
  }
  if (new Set(signals.map(({signal_id}) => signal_id)).size !== signals.length) throw new Error('DETECTOR-SIGNAL-DUPLICATE');
  const blocked = coverageStates.includes('UNKNOWN') || signals.some(({confidence: item}) => item.status === 'UNKNOWN');
  const output = {schema_version: 'sensitive-signal-inventory-v1', inventory_id: `INV-${digest([request.case_id, request.source.sha256, signals]).slice(0, 16)}`, case_id: request.case_id, source: request.source, detector_actor_id: request.actor_id, aliases_sha256: request.aliases_sha256, templates_sha256: request.templates_sha256, coverage: request.coverage, signals, status: blocked ? 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN' : 'BLOCKED_PENDING_PRIVACY_POLICY'};
  output.canonical_sha256 = digest(output);
  if (!validateInventory(output)) throw new Error(`DETECTOR-INVENTORY-SCHEMA ${new Ajv2020().errorsText(validateInventory.errors)}`);
  return output;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const request = JSON.parse(readFileSync(resolve(process.argv[2] ?? ''), 'utf8'));
  process.stdout.write(`${JSON.stringify(detectSensitiveSignals(request), null, 2)}\n`);
}
