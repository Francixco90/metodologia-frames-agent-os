#!/usr/bin/env node
/**
 * content-os-product-launch-video workflow audit.
 *
 * Validates a workflow-state (JSONL manifest branch) or brief (YAML branch)
 * against the product-launch-video workflow contract:
 *   - step order: setup, capture, design, storyboard, audio, visual-design,
 *     build-frames, finalize
 *   - gate states: pending | in-progress | gate-passed | user-approved
 *   - capture: URL input requires capture=true; capture_blocked=true = violation
 *   - offline: state must be offline (no https URL in state, offline=true)
 *   - finalize: gate-passed with rendered=false = no-render
 *
 * Violation codes:
 *   missing-gate, step-out-of-order, capture-blocked, no-capture-for-url,
 *   no-render, network-in-workflow
 *
 * Exit: 0 if PASS (0 violations on examples/positive), 1 if violations (strict).
 */
import {readFileSync, existsSync} from 'node:fs';
import {parse as yamlParse} from 'yaml';

const STEP_ORDER = [
  'setup',
  'capture',
  'design',
  'storyboard',
  'audio',
  'visual-design',
  'build-frames',
  'finalize',
];
const VALID_STATES = new Set(['pending', 'in-progress', 'gate-passed', 'user-approved']);
const SCHEMA_VERSION = 'content-os-product-launch-video-audit-v1';
const VIOLATION_CODES = new Set([
  'missing-gate',
  'step-out-of-order',
  'capture-blocked',
  'no-capture-for-url',
  'no-render',
  'network-in-workflow',
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

function auditStepBlocks(blocks) {
  const out = [];
  for (const block of blocks) {
    const stepRegex = /^\s*-\s+step:\s*['"]?([^'"\n#]+).*\n\s*state:\s*['"]?([^'"\n#]+)/gmu;
    const found = [];
    let match;
    while ((match = stepRegex.exec(block)) !== null) {
      found.push({step: match[1].trim(), state: match[2].trim()});
    }
    if (found.length === 0) continue;
    // step-out-of-order
    for (let i = 1; i < found.length; i++) {
      const prev = STEP_ORDER.indexOf(found[i - 1].step);
      const cur = STEP_ORDER.indexOf(found[i].step);
      if (prev === -1 || cur === -1) continue;
      if (cur < prev) {
        violations.push({
          code: 'step-out-of-order',
          detail: `${found[i].step} before ${found[i - 1].step}`,
        });
      }
    }
    // missing-gate: invalid state or unknown step
    for (const {step, state} of found) {
      if (!STEP_ORDER.includes(step)) {
        violations.push({code: 'missing-gate', detail: `unknown step ${step}`});
      } else if (!VALID_STATES.has(state)) {
        violations.push({code: 'missing-gate', detail: `${step} invalid state ${state}`});
      }
    }
    out.push(found);
  }
  return out;
}

function auditBrief(text) {
  // YAML/JSONL brief branch
  let blocks = [];
  const jsonlLines = text.split('\n').filter((l) => l.trim().startsWith('{'));
  if (jsonlLines.length > 0) {
    for (const line of jsonlLines) {
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      blocks.push(obj);
    }
  }
  if (blocks.length === 0) {
    // YAML fallback: parse whole file as YAML
    if (/\bprojectId:/.test(text)) {
      let parsed = null;
      try {
        parsed = yamlParse(text);
      } catch {
        parsed = null;
      }
      if (parsed && typeof parsed === 'object') blocks.push(parsed);
    }
  }
  for (const obj of blocks) {
    if (!obj || typeof obj !== 'object') continue;
    if (obj.schemaVersion) schemaVersion = obj.schemaVersion;
    // route check
    if (obj.route && obj.route !== 'content-os-product-launch-video') {
      violations.push({code: 'missing-gate', detail: `route ${obj.route}`});
    }
    // offline
    if (obj.offline !== undefined && obj.offline !== true) {
      violations.push({code: 'network-in-workflow', detail: 'offline not true'});
    }
    // https URL in state (source_ref or any https)
    const blob = JSON.stringify(obj);
    if (/https?:\/\//.test(blob)) {
      violations.push({code: 'network-in-workflow', detail: 'https URL in state'});
    }
    // capture rules
    const sourceType = obj.source_type;
    const capture = obj.capture;
    if (sourceType === 'url' && capture === false) {
      violations.push({code: 'no-capture-for-url', detail: 'url input without capture'});
    }
    if (obj.capture_blocked === true) {
      violations.push({code: 'capture-blocked', detail: 'capture hard-stop not respected'});
    }
    // steps (jsonl object form)
    if (Array.isArray(obj.steps)) {
      const found = obj.steps;
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
      // finalize no-render
      const fin = found.find((s) => s.step === 'finalize');
      if (
        fin &&
        (fin.state === 'gate-passed' || fin.state === 'user-approved') &&
        obj.rendered === false
      ) {
        violations.push({code: 'no-render', detail: 'finalize gate passed without render'});
      }
    }
  }
}

function auditManifest(text) {
  // JSONL manifest branch: each line is a workflow-state object with steps[]
  const lines = text.split('\n').filter((l) => l.trim().startsWith('{'));
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (obj.schemaVersion) schemaVersion = obj.schemaVersion;
    if (obj.route && obj.route !== 'content-os-product-launch-video') {
      violations.push({code: 'missing-gate', detail: `route ${obj.route}`});
    }
    if (obj.offline !== undefined && obj.offline !== true) {
      violations.push({code: 'network-in-workflow', detail: 'offline not true'});
    }
    const blob = JSON.stringify(obj);
    if (/https?:\/\//.test(blob)) {
      violations.push({code: 'network-in-workflow', detail: 'https URL in state'});
    }
    if (obj.source_type === 'url' && obj.capture === false) {
      violations.push({code: 'no-capture-for-url', detail: 'url input without capture'});
    }
    if (obj.capture_blocked === true) {
      violations.push({code: 'capture-blocked', detail: 'capture hard-stop not respected'});
    }
    if (Array.isArray(obj.steps)) {
      for (let i = 1; i < obj.steps.length; i++) {
        const prev = STEP_ORDER.indexOf(obj.steps[i - 1].step);
        const cur = STEP_ORDER.indexOf(obj.steps[i].step);
        if (prev !== -1 && cur !== -1 && cur < prev) {
          violations.push({
            code: 'step-out-of-order',
            detail: `${obj.steps[i].step} before ${obj.steps[i - 1].step}`,
          });
        }
      }
      for (const s of obj.steps) {
        if (!STEP_ORDER.includes(s.step)) {
          violations.push({code: 'missing-gate', detail: `unknown step ${s.step}`});
        } else if (!VALID_STATES.has(s.state)) {
          violations.push({code: 'missing-gate', detail: `${s.step} state ${s.state}`});
        }
      }
      const fin = obj.steps.find((s) => s.step === 'finalize');
      if (
        fin &&
        (fin.state === 'gate-passed' || fin.state === 'user-approved') &&
        obj.rendered === false
      ) {
        violations.push({code: 'no-render', detail: 'finalize gate passed without render'});
      }
    }
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
  // YAML brief: prefer full YAML parse (auditBrief); fall back to regex scan
  // (auditStepBlocks) only if the file does not parse as YAML with a steps array.
  let parsed = null;
  try {
    parsed = yamlParse(targetData.text);
  } catch {
    parsed = null;
  }
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.steps)) {
    auditBrief(targetData.text);
  } else {
    auditStepBlocks([targetData.text]);
    auditBrief(targetData.text);
  }
}

// de-dup
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
  // write report
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
  for (const v of known) {
    console.error(`  ${v.code}: ${v.detail}`);
  }
  process.exitCode = 1;
} else {
  console.info(`PASS ${schemaVersion}: ${target} (${unknown.length} unknown ignored)`);
}
