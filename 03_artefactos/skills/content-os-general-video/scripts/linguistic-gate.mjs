#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {parse as parseYaml} from 'yaml';

const target = process.argv[2];
if (!target) {
  console.error('usage: linguistic-gate.mjs <workflow-state>');
  process.exit(2);
}
const state = parseYaml(readFileSync(target, 'utf8'));
const errors = [];
if (state.vo_mode === 'transcribed') {
  if (state.scriptMode !== 'transcript_derived') errors.push('scriptMode');
  for (const ref of ['captionPolicyRef', 'transcriptIntelligenceRef', 'narrativeMapRef']) {
    if (!state[ref]) errors.push(ref);
  }
}
if (errors.length) {
  console.error(`linguistic-gate: ${errors.join(',')}`);
  process.exit(1);
}
console.log(`PASS linguistic-gate: ${target}`);
