#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse as parseYaml} from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';

const target = process.argv[2];
if (!target) {
  console.error('usage: linguistic-gate.mjs <workflow-state>');
  process.exit(2);
}
const state = parseYaml(readFileSync(target, 'utf8'));
const required = [
  'specRef',
  'specSha256',
  'captionPolicyRef',
  'captionTrackRef',
  'correctionLedgerRef',
  'transcriptIntelligenceRef',
];
const errors = [];
const legacyRead = state.schemaVersion === 'embedded-captions-v1' && state.operation === 'read';
if (state.schemaVersion === 'embedded-captions-v1' && !legacyRead) {
  errors.push('legacy-v1-new-draft-blocked');
}
if (!legacyRead) {
  const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const schema = JSON.parse(readFileSync(resolve(skillDir, 'schemas/embedded-captions-v2.schema.json'), 'utf8'));
  const ajv = new Ajv2020({allErrors: true, strict: false});
  const validate = ajv.compile(schema);
  if (!validate(state)) errors.push(`schema:${ajv.errorsText(validate.errors)}`);
  if (state.schemaVersion !== 'embedded-captions-v2') errors.push('schemaVersion');
  if (state.operation !== 'render-draft') errors.push('operation');
  if (state.scriptMode !== 'transcript_derived') errors.push('scriptMode');
  if (!['deterministic-passed', 'human-reviewed'].includes(state.verificationState)) {
    errors.push('verificationState');
  }
  if (!['use', 'extend', 'reframe', 'discard'].includes(state.editorialDecision)) {
    errors.push('editorialDecision');
  }
  if (state.operation === 'render-draft' && state.editorialDecision !== 'use') {
    errors.push(`decision-${state.editorialDecision}-blocks-render`);
  }
  for (const ref of required) if (!state[ref]) errors.push(ref);
  if (!/^[a-f0-9]{64}$/u.test(state.specSha256 ?? '')) errors.push('specSha256');
  if (!Array.isArray(state.sourceSpans) || state.sourceSpans.length === 0) errors.push('sourceSpans');
  for (const span of state.sourceSpans ?? []) {
    if (!span.sourceId || !span.absolute?.clockId || !span.local?.clockId) errors.push('sourceSpan-clock');
    if (!(span.endSeconds > span.startSeconds)) errors.push('sourceSpan-range');
  }
}
if (errors.length) {
  console.error(`linguistic-gate: ${errors.join(',')}`);
  process.exit(1);
}
console.log(`PASS linguistic-gate: ${target} (${legacyRead ? 'legacy-read' : 'v2-draft'})`);
