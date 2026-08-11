#!/usr/bin/env node
import {readFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse as yamlParse} from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';

const STEP_ORDER = ['setup', 'prepare', 'plan', 'design', 'build', 'verify', 'finalize'];
const VALID_STATES = new Set(['pending', 'in-progress', 'gate-passed', 'user-approved']);
const SCHEMA_VERSION = 'content-os-embedded-captions-audit-v1';
const VIOLATION_CODES = new Set([
  'missing-gate', 'step-out-of-order', 'no-render', 'network-in-workflow',
  'graded-footage', 'embed-overuse', 'v2-contract', 'editorial-decision',
]);
const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ajv = new Ajv2020({allErrors: true, strict: false});
const validateV2 = ajv.compile(JSON.parse(readFileSync(resolve(SKILL_DIR, 'schemas/embedded-captions-v2.schema.json'), 'utf8')));

const argv = process.argv.slice(2);
const target = argv[0];
const outFlagIdx = argv.indexOf('--out');
const outDir = outFlagIdx >= 0 ? argv[outFlagIdx + 1] : null;

if (!target) {
  console.error('usage: workflow-audit.mjs <project-state|jsonl> [--out <dir>]');
  process.exit(2);
}

const violations = [];
let schemaVersion = SCHEMA_VERSION;

function readTarget(path) {
  const raw = readFileSync(path, 'utf8');
  if (path.endsWith('.jsonl') || raw.trim().startsWith('{')) {
    return {kind: 'jsonl', text: raw};
  }
  return {kind: 'yaml', text: raw};
}

function auditSteps(found) {
  for (let i = 1; i < found.length; i++) {
    const prev = STEP_ORDER.indexOf(found[i - 1].step);
    const cur = STEP_ORDER.indexOf(found[i].step);
    if (prev !== -1 && cur !== -1 && cur < prev) {
      violations.push({
        code: 'step-out-of-order',
        detail: `${found[i].step} before ${found[i - 1].step}`,
      });
    }
  }
  for (const {step, state} of found) {
    if (!STEP_ORDER.includes(step)) {
      violations.push({code: 'missing-gate', detail: `unknown step ${step}`});
    } else if (!VALID_STATES.has(state)) {
      violations.push({code: 'missing-gate', detail: `${step} state ${state}`});
    }
  }
  const fin = found.find((s) => s.step === 'finalize');
  if (
    fin &&
    (fin.state === 'gate-passed' || fin.state === 'user-approved') &&
    isUnrendered === true
  ) {
    violations.push({code: 'no-render', detail: 'finalize gate passed without render'});
  }
}

function auditObject(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.schemaVersion) schemaVersion = obj.schemaVersion;
  if (obj.schemaVersion === 'embedded-captions-v2') {
    if (!validateV2(obj)) {
      for (const error of validateV2.errors ?? []) {
        violations.push({code: 'v2-contract', detail: `${error.instancePath || '/'} ${error.message}`});
      }
    }
    if (obj.operation === 'render-draft' && obj.editorialDecision !== 'use') {
      violations.push({code: 'editorial-decision', detail: `${obj.editorialDecision ?? 'missing'} blocks render-draft`});
    }
  }
  if (obj.route && obj.route !== 'content-os-embedded-captions') {
    violations.push({code: 'missing-gate', detail: `route ${obj.route}`});
  }
  if (obj.offline !== undefined && obj.offline !== true) {
    violations.push({code: 'network-in-workflow', detail: 'offline not true'});
  }
  const blob = JSON.stringify(obj);
  if (/https?:\/\//.test(blob)) {
    violations.push({code: 'network-in-workflow', detail: 'https URL in state'});
  }
  // graded-footage checks (never grade/recolor the footage)
  if (obj.graded_footage === true) {
    violations.push({code: 'graded-footage', detail: 'graded_footage true'});
  }
  // embed-overuse checks (rail-first; embed scarce)
  if (obj.embed_all === true) {
    violations.push({code: 'embed-overuse', detail: 'embed_all true'});
  }
  if (obj.rail_mode === 'none') {
    violations.push({code: 'embed-overuse', detail: 'rail_mode none'});
  }
  if (Array.isArray(obj.steps)) {
    auditSteps(obj.steps);
  }
}

let isUnrendered = false;

function auditManifest(text) {
  const lines = text.split('\n').filter((l) => l.trim().startsWith('{'));
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    isUnrendered = obj.rendered === false;
    auditObject(obj);
  }
}

function auditBrief(text) {
  let parsed = null;
  try {
    parsed = yamlParse(text);
  } catch {
    parsed = null;
  }
  if (parsed && typeof parsed === 'object') {
    isUnrendered = parsed.rendered === false;
    auditObject(parsed);
  }
}

let targetData;
try {
  targetData = readTarget(target);
} catch {
  console.error(`audit: cannot read ${target}`);
  process.exit(2);
}

if (targetData.kind === 'jsonl') {
  auditManifest(targetData.text);
} else {
  let parsed = null;
  try {
    parsed = yamlParse(targetData.text);
  } catch {
    parsed = null;
  }
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.steps)) {
    auditBrief(targetData.text);
  } else {
    // regex fallback scan
    const stepRegex = /^\s*-\s+step:\s*['"]?([^'"\n#]+).*\n\s*state:\s*['"]?([^'"\n#]+)/gmu;
    const found = [];
    let match;
    while ((match = stepRegex.exec(targetData.text)) !== null) {
      found.push({step: match[1].trim(), state: match[2].trim()});
    }
    if (found.length > 0) auditSteps(found);
    auditBrief(targetData.text);
  }
}

const seen = new Set();
const unique = violations.filter((v) => {
  const key = `${v.code}:${v.detail}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
const known = unique.filter((v) => VIOLATION_CODES.has(v.code));
const unknown = unique.filter((v) => !VIOLATION_CODES.has(v.code));

if (outDir) {
  try {
    const {mkdirSync, writeFileSync} = await import('node:fs');
    mkdirSync(outDir, {recursive: true});
    writeFileSync(
      `${outDir}/audit-report.json`,
      JSON.stringify(
        {schemaVersion, target, violations: known, unknown, pass: known.length === 0},
        null,
        2,
      ),
    );
  } catch {}
}

if (known.length > 0) {
  console.error(`FAIL ${schemaVersion}: ${known.length} violation(s) in ${target}`);
  for (const v of known) console.error(`  ${v.code}: ${v.detail}`);
  process.exitCode = 1;
} else {
  console.info(`PASS ${schemaVersion}: ${target} (${unknown.length} unknown ignored)`);
}
