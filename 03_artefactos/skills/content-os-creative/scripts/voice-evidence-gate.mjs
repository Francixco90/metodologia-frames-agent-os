#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {parse as parseYaml} from 'yaml';

const target = process.argv[2];
if (!target) {
  console.error('usage: voice-evidence-gate.mjs <creative-brief>');
  process.exit(2);
}
const brief = parseYaml(readFileSync(target, 'utf8'));
const operation = brief.operation ?? 'render-draft';
if (brief.schemaVersion === 'content-os-creative-brief-v1' && operation === 'read') {
  console.log(`PASS voice-evidence-gate: ${target} (legacy-read)`);
  process.exit(0);
}
const errors = [];
if (brief.schemaVersion !== 'content-os-creative-brief-v2') errors.push('legacy-v1-new-draft-blocked');
for (const key of ['specRef', 'specSha256', 'brandKitRef', 'brandKitSha256', 'visualBudgetRef', 'visualBudgetSha256', 'sourceAnalysisRef', 'sourceAnalysisSha256']) if (!brief[key]) errors.push(key);
if (!['use', 'extend', 'reframe', 'discard'].includes(brief.editorialDecision)) errors.push('editorialDecision');
if (operation === 'render-draft' && brief.editorialDecision !== 'use') errors.push(`decision-${brief.editorialDecision}-blocks-render`);
if (brief.voiceSource === true) {
  for (const key of ['captionTrackRef', 'correctionLedgerRef', 'transcriptIntelligenceRef', 'narrativeMapRef']) {
    if (!brief[key]) errors.push(key);
  }
  if (!['transcript_derived', 'assembly_map'].includes(brief.scriptMode)) errors.push('scriptMode');
  if (!['deterministic-passed', 'human-reviewed'].includes(brief.verificationState)) errors.push('verificationState');
  if (!Array.isArray(brief.storySpine?.beats) || brief.storySpine.beats.length === 0) errors.push('beats-empty');
  for (const beat of brief.storySpine?.beats ?? []) {
    const span = beat.sourceSpan;
    if (!span?.sourceId || !span.absolute?.clockId || !span.local?.clockId || !(span.endSeconds > span.startSeconds)) errors.push(`sourceSpan:${beat.label ?? 'unknown'}`);
  }
}
if (errors.length) {
  console.error(`FAIL voice-evidence-gate: ${[...new Set(errors)].join(',')}`);
  process.exit(1);
}
console.log(`PASS voice-evidence-gate: ${target} (${operation})`);
