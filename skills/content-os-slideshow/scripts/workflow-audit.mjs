#!/usr/bin/env node
/**
 * content-os-slideshow workflow audit.
 *
 * Validates a workflow-state (JSONL manifest branch) or brief (YAML branch)
 * against the slideshow workflow contract:
 *   - step order: setup, plan, design, build, verify, finalize
 *   - gate states: pending | in-progress | gate-passed | user-approved
 *   - navigable deck not MP4: rendered_mp4 must NOT be true (no master-root)
 *   - slide writing: headline_label must NOT be true (claim, not label)
 *   - offline: state must be offline (no https URL in state, offline=true)
 *   - finalize: gate-passed with deck_presentable=false = no-deck
 *
 * Violation codes:
 *   missing-gate, step-out-of-order, no-deck, network-in-workflow,
 *   render-mp4, label-not-claim
 *
 * Exit: 0 if PASS (0 violations on examples/positive), 1 if violations (strict).
 */
import {readFileSync} from 'node:fs';
import {parse as yamlParse} from 'yaml';

const STEP_ORDER = ['setup', 'plan', 'design', 'build', 'verify', 'finalize'];
const VALID_STATES = new Set(['pending', 'in-progress', 'gate-passed', 'user-approved']);
const SCHEMA_VERSION = 'content-os-slideshow-audit-v1';
const VIOLATION_CODES = new Set([
  'missing-gate',
  'step-out-of-order',
  'no-deck',
  'network-in-workflow',
  'render-mp4',
  'label-not-claim',
]);

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
    isNotPresentable === true
  ) {
    violations.push({code: 'no-deck', detail: 'finalize gate passed without deck'});
  }
}

function auditObject(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.schemaVersion) schemaVersion = obj.schemaVersion;
  if (obj.route && obj.route !== 'content-os-slideshow') {
    violations.push({code: 'missing-gate', detail: `route ${obj.route}`});
  }
  if (obj.offline !== undefined && obj.offline !== true) {
    violations.push({code: 'network-in-workflow', detail: 'offline not true'});
  }
  const blob = JSON.stringify(obj);
  if (/https?:\/\//.test(blob)) {
    violations.push({code: 'network-in-workflow', detail: 'https URL in state'});
  }
  // render-mp4 checks (deck has no master-root; render truncates to first slide)
  if (obj.rendered_mp4 === true) {
    violations.push({code: 'render-mp4', detail: 'rendered_mp4 true'});
  }
  // label-not-claim checks (headline is a complete-sentence claim, not a label)
  if (obj.headline_label === true) {
    violations.push({code: 'label-not-claim', detail: 'headline_label true'});
  }
  if (Array.isArray(obj.steps)) {
    auditSteps(obj.steps);
  }
}

let isNotPresentable = false;

function auditManifest(text) {
  const lines = text.split('\n').filter((l) => l.trim().startsWith('{'));
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    isNotPresentable = obj.deck_presentable === false;
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
    isNotPresentable = parsed.deck_presentable === false;
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
