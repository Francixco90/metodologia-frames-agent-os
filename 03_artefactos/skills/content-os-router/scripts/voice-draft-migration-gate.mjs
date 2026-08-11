#!/usr/bin/env node
import {readFileSync} from 'node:fs';

const target = process.argv[2];
if (!target) {
  console.error('usage: voice-draft-migration-gate.mjs <job.json>');
  process.exit(2);
}
const job = JSON.parse(readFileSync(target, 'utf8'));
if (job.operation === 'read' && job.contractRevision === 1) {
  console.log(`PASS voice-draft-migration-gate: ${target} (legacy-read)`);
  process.exit(0);
}
const errors = [];
if (job.voiceDerived === true && job.operation === 'render-draft') {
  if (job.contractRevision !== 2) errors.push('legacy-v1-new-draft-blocked');
  if (!job.specRef || !/^[a-f0-9]{64}$/u.test(job.specSha256 ?? '')) errors.push('spec-binding');
  for (const key of ['captionTrackRef', 'correctionLedgerRef', 'transcriptIntelligenceRef']) {
    if (!job[key]) errors.push(key);
  }
  if (!['deterministic-passed', 'human-reviewed'].includes(job.verificationState)) errors.push('verificationState');
  if (!Array.isArray(job.sourceSpans) || job.sourceSpans.length === 0) errors.push('sourceSpans');
  for (const span of job.sourceSpans ?? []) {
    if (!span.sourceId || !span.absolute?.clockId || !span.local?.clockId || !(span.endSeconds > span.startSeconds) || !(span.absolute.endSeconds > span.absolute.startSeconds) || !(span.local.endSeconds > span.local.startSeconds)) errors.push('sourceSpan-dual-clock');
  }
}
if (errors.length) {
  console.error(`FAIL voice-draft-migration-gate: ${errors.join(',')}`);
  process.exit(1);
}
console.log(`PASS voice-draft-migration-gate: ${target} (v2-draft)`);
