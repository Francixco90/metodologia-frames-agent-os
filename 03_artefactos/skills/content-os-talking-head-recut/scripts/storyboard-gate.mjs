#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {parse as parseYaml} from 'yaml';

const target = process.argv[2];
if (!target) {
  console.error('usage: storyboard-gate.mjs <storyboard>');
  process.exit(2);
}
const job = parseYaml(readFileSync(target, 'utf8'));
const version = job.schemaVersion ?? (job.composition_id ? 'talking-head-recut-v1' : null);
const operation = job.operation ?? 'render-draft';
if (version === 'talking-head-recut-v1' && operation === 'read') {
  console.log(`PASS storyboard-gate: ${target} (legacy-read)`);
  process.exit(0);
}
const errors = [];
if (version !== 'talking-head-recut-v2') errors.push('legacy-v1-new-draft-blocked');
for (const key of ['specId', 'specSha256', 'correctionLedgerRef', 'transcriptIntelligenceRef', 'semanticIndexRef', 'narrativeMapRef']) {
  if (!job[key]) errors.push(key);
}
if (job.scriptMode !== 'assembly_map') errors.push('scriptMode');
if (!['use', 'extend', 'reframe', 'discard'].includes(job.editorialDecision)) errors.push('editorialDecision');
if (operation === 'render-draft' && job.editorialDecision !== 'use') errors.push(`decision-${job.editorialDecision}-blocks-render`);
if (!Array.isArray(job.cards) || job.cards.length === 0) errors.push('cards-empty');
for (const card of job.cards ?? []) {
  const span = card.sourceSpan;
  if (!card.evidenceRef || !span?.sourceId || !span.absolute?.clockId || !span.local?.clockId || !(span.endSeconds > span.startSeconds)) {
    errors.push(`card-evidence:${card.id ?? 'unknown'}`);
  }
  if (card.kind === 'pip') {
    const visual = card.visualSpan;
    if (!visual?.sourceId || !visual.absolute?.clockId || !visual.local?.clockId || !(visual.endSeconds > visual.startSeconds)) errors.push(`card-visualSpan:${card.id ?? 'unknown'}`);
    if (visual && (!(visual.absolute.endSeconds > visual.absolute.startSeconds) || !(visual.local.endSeconds > visual.local.startSeconds))) errors.push(`card-visualSpan-range:${card.id ?? 'unknown'}`);
  }
}
if (errors.length) {
  console.error(`FAIL storyboard-gate: ${[...new Set(errors)].join(',')}`);
  process.exit(1);
}
console.log(`PASS storyboard-gate: ${target} (${operation})`);
