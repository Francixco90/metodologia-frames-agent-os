#!/usr/bin/env node
/**
 * Frames ContentOS Registry — static registry manifest/brief auditor.
 *
 * Reads a registry manifest (JSONL) or brief (YAML-ish) and detects:
 * missing-sha256, missing-seek-safe, network-in-block, not-offline,
 * block-missing-dimensions, block-missing-duration, component-with-dimensions,
 * component-with-duration, missing-composition-id. Emits registry-audit.json
 * (schemaVersion content-os-registry-audit-v1). --strict exits nonzero. Static
 * (no deps): deterministic, offline, fast.
 *
 * Usage: node skills/content-os-registry/scripts/registry-audit.mjs <manifest-or-brief> --out <dir> [--strict]
 */
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve, basename} from 'node:path';

const args = process.argv.slice(2);
const targetIdx = args.findIndex((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const strict = args.includes('--strict');
if (targetIdx === -1 || outIdx === -1 || args[outIdx + 1] === undefined) {
  console.error('Usage: registry-audit.mjs <manifest-or-brief> --out <dir> [--strict]');
  process.exit(1);
}
const targetPath = resolve(process.cwd(), args[targetIdx]);
const outDir = resolve(process.cwd(), args[outIdx + 1]);
const text = readFileSync(targetPath, 'utf8');

const hasNetwork = (s) => /\bhttps?:\/\//iu.test(s);
const violations = [];

const isManifest = targetPath.endsWith('.jsonl') || /^\s*\{/mu.test(text);

if (isManifest) {
  for (const line of text.split('\n').filter(Boolean)) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!entry.id || !entry.type) continue;
    const {id} = entry;
    if (!entry.sha256 || !/^[a-f0-9]{64}$/u.test(entry.sha256)) {
      violations.push({code: 'missing-sha256', detail: `entry ${id} missing or invalid sha256`});
    }
    if (entry.type === 'block' && entry.seek_safe !== true) {
      violations.push({code: 'missing-seek-safe', detail: `block ${id} seek_safe not true`});
    }
    if (entry.offline !== true) {
      violations.push({code: 'not-offline', detail: `entry ${id} offline not true`});
    }
    if (hasNetwork(line)) {
      violations.push({code: 'network-in-block', detail: `entry ${id} https URL`});
    }
    if (entry.type === 'block') {
      if (!entry.dimensions) {
        violations.push({
          code: 'block-missing-dimensions',
          detail: `block ${id} missing dimensions`,
        });
      }
      if (entry.duration_s === undefined) {
        violations.push({code: 'block-missing-duration', detail: `block ${id} missing duration_s`});
      }
      if (!entry.composition_id) {
        violations.push({
          code: 'missing-composition-id',
          detail: `block ${id} missing composition_id`,
        });
      }
    }
    if (entry.type === 'component') {
      if (entry.dimensions) {
        violations.push({
          code: 'component-with-dimensions',
          detail: `component ${id} has dimensions`,
        });
      }
      if (entry.duration_s !== undefined) {
        violations.push({
          code: 'component-with-duration',
          detail: `component ${id} has duration_s`,
        });
      }
    }
  }
} else {
  // Brief (YAML-ish): split into entry blocks by top-level `- id:` markers.
  const blocks = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (/^\s*-\s+id:\s*/u.test(line)) {
      if (cur) blocks.push(cur);
      cur = [line];
    } else if (cur) {
      cur.push(line);
    }
  }
  if (cur) blocks.push(cur);
  for (const rawLines of blocks) {
    const raw = rawLines.join('\n');
    const idM = raw.match(/^\s*-\s+id:\s*['"]?([^'"\n]+)/mu);
    const id = idM ? idM[1].trim() : '?';
    const typeM = raw.match(/\btype:\s*['"]?([^'"\n]+)/u);
    const type = typeM ? typeM[1].trim() : null;
    const hasSha = /\bsha256:\s*['"]?([a-f0-9]{64})['"]?/u.test(raw);
    const seek = /\bseek_safe:\s*true\b/u.test(raw);
    const offline = /\boffline:\s*true\b/u.test(raw);
    const hasDim = /\bdimensions:\s*['"]?([^'"\n]+)/u.test(raw);
    const hasDur = /\bduration_s:\s*['"]?(\d+)/u.test(raw);
    const hasCompId = /\bcomposition_id:\s*['"]?([^'"\n]+)/u.test(raw);
    if (!hasSha) {
      violations.push({code: 'missing-sha256', detail: `entry ${id} missing/invalid sha256`});
    }
    if (type === 'block' && !seek) {
      violations.push({code: 'missing-seek-safe', detail: `block ${id} seek_safe not true`});
    }
    if (!offline) {
      violations.push({code: 'not-offline', detail: `entry ${id} offline not true`});
    }
    if (hasNetwork(raw)) {
      violations.push({code: 'network-in-block', detail: `entry ${id} https URL`});
    }
    if (type === 'block' && !hasDim) {
      violations.push({code: 'block-missing-dimensions', detail: `block ${id} missing dimensions`});
    }
    if (type === 'block' && !hasDur) {
      violations.push({code: 'block-missing-duration', detail: `block ${id} missing duration_s`});
    }
    if (type === 'block' && !hasCompId) {
      violations.push({
        code: 'missing-composition-id',
        detail: `block ${id} missing composition_id`,
      });
    }
    if (type === 'component' && hasDim) {
      violations.push({
        code: 'component-with-dimensions',
        detail: `component ${id} has dimensions`,
      });
    }
    if (type === 'component' && hasDur) {
      violations.push({code: 'component-with-duration', detail: `component ${id} has duration_s`});
    }
  }
}

const audit = {
  schemaVersion: 'content-os-registry-audit-v1',
  target: basename(targetPath),
  mode: isManifest ? 'manifest' : 'brief',
  violations,
  hashBound: !violations.some((v) => v.code === 'missing-sha256'),
  seekSafe: !violations.some((v) => v.code === 'missing-seek-safe'),
  offlineFirst: !violations.some((v) => v.code === 'network-in-block' || v.code === 'not-offline'),
  strict,
};

mkdirSync(outDir, {recursive: true});
const outPath = resolve(outDir, 'registry-audit.json');
writeFileSync(outPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
if (strict && violations.length > 0) {
  console.error(`FAIL registry-audit (strict): ${violations.length} violation(s) -> ${outPath}`);
  for (const v of violations) {
    console.error(`  ${v.code}: ${v.detail}`);
  }
  process.exit(1);
}
console.info(
  `PASS registry-audit: hashBound=${audit.hashBound}, seekSafe=${audit.seekSafe}, offlineFirst=${audit.offlineFirst}, violations=${violations.length} -> ${outPath}`,
);
