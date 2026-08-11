#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {parse as parseYaml} from 'yaml';

const target = process.argv[2];
if (!target) {
  console.error('usage: voice-draft-gate.mjs <request>');
  process.exit(2);
}
const request = parseYaml(readFileSync(target, 'utf8'));
const version = request.schemaVersion ?? request.schema_version;
const operation = request.operation ?? 'render-draft';
if (version === 'remotion-captions-v1' && operation === 'read') {
  console.log(`PASS voice-draft-gate: ${target} (legacy-read)`);
  process.exit(0);
}
const errors = [];
if (version !== 'remotion-captions-v2') errors.push('legacy-v1-new-draft-blocked');
if (operation !== 'render-draft') errors.push('operation');
for (const key of ['specRef', 'specSha256', 'captionTrackRef', 'correctionLedgerRef', 'transcriptIntelligenceRef']) {
  if (!request[key]) errors.push(key);
}
if (!/^[a-f0-9]{64}$/u.test(request.specSha256 ?? '')) errors.push('specSha256');
if (!['deterministic-passed', 'human-reviewed'].includes(request.verificationState)) errors.push('verificationState');
if (!['use', 'extend', 'reframe', 'discard'].includes(request.editorialDecision)) errors.push('editorialDecision');
if (operation === 'render-draft' && request.editorialDecision !== 'use') errors.push(`decision-${request.editorialDecision}-blocks-render`);
if (!Array.isArray(request.sourceSpans) || request.sourceSpans.length === 0) errors.push('sourceSpans');
for (const span of request.sourceSpans ?? []) {
  if (!span.absolute?.clockId || !span.local?.clockId || !(span.endSeconds > span.startSeconds)) errors.push('sourceSpan');
}
if (errors.length) {
  console.error(`FAIL voice-draft-gate: ${[...new Set(errors)].join(',')}`);
  process.exit(1);
}
console.log(`PASS voice-draft-gate: ${target} (v2-draft)`);
