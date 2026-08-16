#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {compileBriefing} from './compile-briefing.mjs';

const root = resolve('03_artefactos/skills/career-notebook-briefing');
const read = (ref) => readFileSync(resolve(root, ref), 'utf8');
const corpus = [read('SKILL.md'), read('LINEAGE.yml'), read('receipts/runtime-boundary.yml'), read('references/briefing-contract.md')].join('\n');
for (const token of [
  'name: career-notebook-briefing', 'description: This skill should be used when',
  'version: 0.1.0', 'lifecycle_state: active', 'private_state_required: true',
  'publication_authority: false', 'NO_MATERIAL_DELTA', 'BLOCKED_AUTH',
]) if (!corpus.includes(token)) throw new Error(`CAREER-NOTEBOOK-MISSING ${token}`);
if (/\/Users\/|file:\/\//u.test(corpus)) throw new Error('CAREER-NOTEBOOK-PUBLIC-LOCATOR');
const fixturePath = resolve(root, 'fixtures/positive/briefing-request.json');
const request = JSON.parse(readFileSync(fixturePath, 'utf8'));
const first = JSON.stringify(compileBriefing(request));
const second = JSON.stringify(compileBriefing(request));
if (first !== second) throw new Error('CAREER-NOTEBOOK-NONDETERMINISTIC');
const output = JSON.parse(first);
if (output.status !== 'STUDIO_PENDING' || output.studio_artifacts.length !== 3) throw new Error('CAREER-NOTEBOOK-POSITIVE');
const commandOutput = execFileSync(process.execPath, [resolve(root, 'scripts/compile-briefing.mjs'), fixturePath], {encoding: 'utf8'});
if (JSON.stringify(JSON.parse(commandOutput)) !== first) throw new Error('CAREER-NOTEBOOK-CLI-DRIFT');
const setPath = (target, path, value) => {
  const parts = path.split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) cursor = cursor[part];
  cursor[parts.at(-1)] = value;
};
for (const negative of JSON.parse(read('fixtures/negative/rejected-requests.json'))) {
  const hostile = structuredClone(request);
  setPath(hostile, negative.path, negative.value);
  try {
    compileBriefing(hostile);
    throw new Error(`CAREER-NOTEBOOK-FAIL-OPEN ${negative.case}`);
  } catch (error) {
    if (String(error).includes('FAIL-OPEN')) throw error;
    if (!String(error).includes(negative.expected)) throw new Error(`CAREER-NOTEBOOK-WRONG-FAILURE ${negative.case}`);
  }
}
console.info('PASS career-notebook-briefing: capability-aware, idempotent and private-first.');
