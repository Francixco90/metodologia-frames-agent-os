#!/usr/bin/env node
/**
 * Frames ContentOS PR to Video — static workflow-state auditor.
 *
 * Reads a workflow state (JSONL) or brief (YAML-ish) and detects:
 * missing-gate, step-out-of-order, footage-in-pr-video, style-not-code-editorial,
 * no-render, network-in-workflow. Emits workflow-audit.json
 * (schemaVersion content-os-pr-to-video-audit-v1). --strict exits
 * nonzero. Static (no deps): deterministic, offline, fast.
 *
 * Usage: node skills/content-os-pr-to-video/scripts/workflow-audit.mjs <workflow-state> --out <dir> [--strict]
 */
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve, basename} from 'node:path';

const args = process.argv.slice(2);
const targetIdx = args.findIndex((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const strict = args.includes('--strict');
if (targetIdx === -1 || outIdx === -1 || args[outIdx + 1] === undefined) {
  console.error('Usage: workflow-audit.mjs <workflow-state> --out <dir> [--strict]');
  process.exit(1);
}
const targetPath = resolve(process.cwd(), args[targetIdx]);
const outDir = resolve(process.cwd(), args[outIdx + 1]);
const text = readFileSync(targetPath, 'utf8');

const stepOrder = [
  'setup',
  'ingest',
  'design',
  'storyboard',
  'audio',
  'visual-design',
  'build-frames',
  'finalize',
];
const validStates = new Set(['pending', 'in-progress', 'gate-passed', 'user-approved']);
const hasNetwork = (s) => /\bhttps?:\/\//iu.test(s);
const violations = [];

const isManifest = targetPath.endsWith('.jsonl') || /^\s*\{/mu.test(text);

const collectEntry = (entry, id) => {
  if (!entry.route || entry.route !== 'content-os-pr-to-video') {
    violations.push({code: 'missing-gate', detail: `project ${id} missing or invalid route`});
  }
  if (entry.style && entry.style !== 'code-editorial') {
    violations.push({
      code: 'style-not-code-editorial',
      detail: `project ${id} style ${entry.style} (must be code-editorial)`,
    });
  }
  if (entry.footage === true) {
    violations.push({
      code: 'footage-in-pr-video',
      detail: `project ${id} footage=true in pr-to-video workflow`,
    });
  }
  if (!Array.isArray(entry.steps) || entry.steps.length < 8) {
    violations.push({code: 'missing-gate', detail: `project ${id} missing steps (need 8)`});
    return;
  }
  let prevOrder = -1;
  for (const step of entry.steps) {
    const order = stepOrder.indexOf(step.step);
    if (order === -1) {
      violations.push({
        code: 'step-out-of-order',
        detail: `project ${id} unknown step ${step.step}`,
      });
      continue;
    }
    if (order <= prevOrder) {
      violations.push({
        code: 'step-out-of-order',
        detail: `project ${id} step ${step.step} out of order`,
      });
    }
    if (!validStates.has(step.state)) {
      violations.push({
        code: 'missing-gate',
        detail: `project ${id} step ${step.step} invalid state`,
      });
    }
    prevOrder = Math.max(prevOrder, order);
  }
  const finalize = entry.steps.find((s) => s.step === 'finalize');
  if (finalize && finalize.state === 'gate-passed' && !entry.rendered) {
    violations.push({
      code: 'no-render',
      detail: `project ${id} finalize gate passed but no render`,
    });
  }
};

if (isManifest) {
  for (const line of text.split('\n').filter(Boolean)) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!entry.projectId) continue;
    collectEntry(entry, entry.projectId);
    if (hasNetwork(line)) {
      violations.push({
        code: 'network-in-workflow',
        detail: `project ${entry.projectId} https URL in state`,
      });
    }
  }
} else {
  // Brief (YAML-ish): split into entry blocks by `- projectId:` markers, or
  // treat the whole text as one entry when it is a top-level single doc.
  const blocks = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (/^\s*-\s+projectId:\s*/u.test(line)) {
      if (cur) blocks.push(cur);
      cur = [line];
    } else if (cur) {
      cur.push(line);
    }
  }
  if (cur) blocks.push(cur);
  if (blocks.length === 0 && /\bprojectId:\s*['"]?[^'"\n]+/u.test(text)) {
    blocks.push(text.split('\n'));
  }
  for (const rawLines of blocks) {
    const raw = rawLines.join('\n');
    const idM = raw.match(/^\s*-?\s*projectId:\s*['"]?([^'"\n]+)/mu);
    const id = idM ? idM[1].trim() : '?';
    const routeM = raw.match(/\broute:\s*['"]?([^'"\n]+)/u);
    const route = routeM ? routeM[1].trim() : null;
    const styleM = raw.match(/\bstyle:\s*['"]?([^'"\n#]+)/u);
    const style = styleM ? styleM[1].trim() : null;
    const hasFootage = /\bfootage:\s*true\b/u.test(raw);
    const offlineTrue = /\boffline:\s*true\b/u.test(raw);
    // Step order + state validation (parse the steps: block).
    const stepsBlock = raw.match(/steps:\s*\n([\s\S]*?)(?:\n[a-zA-Z]|\n#|$)/u);
    const stepEntries = [];
    if (stepsBlock) {
      const stepLineRe = /^\s*-\s+step:\s*['"]?([^'"\n#]+).*\n\s*state:\s*['"]?([^'"\n#]+)/gmu;
      let m;
      while ((m = stepLineRe.exec(stepsBlock[1])) !== null) {
        stepEntries.push({step: m[1].trim(), state: m[2].trim()});
      }
    }
    let prevOrder = -1;
    for (const step of stepEntries) {
      const order = stepOrder.indexOf(step.step);
      if (order === -1) {
        violations.push({
          code: 'step-out-of-order',
          detail: `project ${id} unknown step ${step.step}`,
        });
        continue;
      }
      if (order <= prevOrder) {
        violations.push({
          code: 'step-out-of-order',
          detail: `project ${id} step ${step.step} out of order`,
        });
      }
      if (!validStates.has(step.state)) {
        violations.push({
          code: 'missing-gate',
          detail: `project ${id} step ${step.step} invalid state`,
        });
      }
      prevOrder = Math.max(prevOrder, order);
    }
    const finalizeStep = stepEntries.find((s) => s.step === 'finalize');
    const renderedTrue = /\brendered:\s*true\b/u.test(raw);
    if (finalizeStep && finalizeStep.state === 'gate-passed' && !renderedTrue) {
      violations.push({
        code: 'no-render',
        detail: `project ${id} finalize gate passed but no render`,
      });
    }
    if (!route || route !== 'content-os-pr-to-video') {
      violations.push({code: 'missing-gate', detail: `project ${id} missing or invalid route`});
    }
    if (stepEntries.length < 8) {
      violations.push({
        code: 'missing-gate',
        detail: `project ${id} missing steps (need 8, found ${stepEntries.length})`,
      });
    }
    if (style && style !== 'code-editorial') {
      violations.push({
        code: 'style-not-code-editorial',
        detail: `project ${id} style ${style} (must be code-editorial)`,
      });
    }
    if (hasFootage) {
      violations.push({
        code: 'footage-in-pr-video',
        detail: `project ${id} footage=true in pr-to-video workflow`,
      });
    }
    if (!offlineTrue) {
      violations.push({code: 'network-in-workflow', detail: `project ${id} offline not true`});
    }
    if (hasNetwork(raw)) {
      violations.push({code: 'network-in-workflow', detail: `project ${id} https URL in state`});
    }
  }
}

const audit = {
  schemaVersion: 'content-os-pr-to-video-audit-v1',
  target: basename(targetPath),
  mode: isManifest ? 'manifest' : 'brief',
  violations,
  gateBound: !violations.some((v) => v.code === 'missing-gate'),
  ordered: !violations.some((v) => v.code === 'step-out-of-order'),
  codeEditorial: !violations.some((v) => v.code === 'style-not-code-editorial'),
  noFootage: !violations.some((v) => v.code === 'footage-in-pr-video'),
  offlineFirst: !violations.some((v) => v.code === 'network-in-workflow'),
  strict,
};

mkdirSync(outDir, {recursive: true});
const outPath = resolve(outDir, 'workflow-audit.json');
writeFileSync(outPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
if (strict && violations.length > 0) {
  console.error(`FAIL workflow-audit (strict): ${violations.length} violation(s) -> ${outPath}`);
  for (const v of violations) {
    console.error(`  ${v.code}: ${v.detail}`);
  }
  process.exit(1);
}
console.info(
  `PASS workflow-audit: gateBound=${audit.gateBound}, ordered=${audit.ordered}, codeEditorial=${audit.codeEditorial}, noFootage=${audit.noFootage}, offlineFirst=${audit.offlineFirst}, violations=${violations.length} -> ${outPath}`,
);
