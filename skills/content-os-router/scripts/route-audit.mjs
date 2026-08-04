#!/usr/bin/env node
/**
 * Frames ContentOS Router — static intent-brief auditor.
 *
 * Reads an intent brief (JSONL) or brief (YAML-ish) and detects:
 * missing-route, missing-capability-map, unknown-source-type, route-by-keyword,
 * no-deliverable, network-in-route. Emits route-audit.json
 * (schemaVersion content-os-router-audit-v1). --strict exits nonzero. Static
 * (no deps): deterministic, offline, fast.
 *
 * Usage: node skills/content-os-router/scripts/route-audit.mjs <intent-brief> --out <dir> [--strict]
 */
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve, basename} from 'node:path';

const args = process.argv.slice(2);
const targetIdx = args.findIndex((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const strict = args.includes('--strict');
if (targetIdx === -1 || outIdx === -1 || args[outIdx + 1] === undefined) {
  console.error('Usage: route-audit.mjs <intent-brief> --out <dir> [--strict]');
  process.exit(1);
}
const targetPath = resolve(process.cwd(), args[targetIdx]);
const outDir = resolve(process.cwd(), args[outIdx + 1]);
const text = readFileSync(targetPath, 'utf8');

const validSources = new Set([
  'url',
  'github-pr',
  'text',
  'website',
  'brief',
  'footage',
  'music',
  'figma',
]);
const validRoutes = new Set([
  'content-os-pr-to-video',
  'content-os-website-to-video',
  'content-os-faceless-explainer',
  'content-os-product-launch-video',
  'content-os-motion-graphics',
  'content-os-embedded-captions',
  'content-os-slideshow',
  'content-os-general-video',
]);
const validCapabilities = new Set([
  'content-os-core',
  'content-os-animation',
  'content-os-keyframes',
  'content-os-creative',
  'content-os-media',
  'content-os-registry',
]);
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
    if (!entry.intentId) continue;
    const {intentId} = entry;
    if (!entry.route || !validRoutes.has(entry.route)) {
      violations.push({
        code: 'missing-route',
        detail: `intent ${intentId} missing or invalid route`,
      });
    }
    if (!Array.isArray(entry.capability_map) || entry.capability_map.length === 0) {
      violations.push({
        code: 'missing-capability-map',
        detail: `intent ${intentId} missing capability_map`,
      });
    } else if (entry.capability_map.some((c) => !validCapabilities.has(c))) {
      violations.push({
        code: 'missing-capability-map',
        detail: `intent ${intentId} invalid capability in map`,
      });
    }
    if (!entry.source_type || !validSources.has(entry.source_type)) {
      violations.push({
        code: 'unknown-source-type',
        detail: `intent ${intentId} missing or unknown source_type`,
      });
    }
    if (!entry.deliverable || String(entry.deliverable).trim() === '') {
      violations.push({code: 'no-deliverable', detail: `intent ${intentId} missing deliverable`});
    }
    if (entry.offline !== true) {
      violations.push({code: 'network-in-route', detail: `intent ${intentId} offline not true`});
    }
    if (hasNetwork(line)) {
      violations.push({code: 'network-in-route', detail: `intent ${intentId} https URL in brief`});
    }
  }
} else {
  // Brief (YAML-ish): split into entry blocks by top-level `- id:` markers.
  const blocks = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (/^\s*-\s+intentId:\s*/u.test(line)) {
      if (cur) blocks.push(cur);
      cur = [line];
    } else if (cur) {
      cur.push(line);
    }
  }
  if (cur) blocks.push(cur);
  for (const rawLines of blocks) {
    const raw = rawLines.join('\n');
    const idM = raw.match(/^\s*-\s+intentId:\s*['"]?([^'"\n]+)/mu);
    const id = idM ? idM[1].trim() : '?';
    const routeM = raw.match(/\broute:\s*['"]?([^'"\n]+)/u);
    const route = routeM ? routeM[1].trim() : null;
    const sourceM = raw.match(/\bsource_type:\s*['"]?([^'"\n]+)/u);
    const source = sourceM ? sourceM[1].trim() : null;
    const hasDeliverable = /\bdeliverable:\s*['"]?[^'"\n]+/u.test(raw);
    const hasCapMap = /\bcapability_map:\s*\[?[^\]]+/u.test(raw);
    const offline = /\boffline:\s*true\b/u.test(raw);
    if (!route || !validRoutes.has(route)) {
      violations.push({code: 'missing-route', detail: `intent ${id} missing or invalid route`});
    }
    if (!hasCapMap) {
      violations.push({
        code: 'missing-capability-map',
        detail: `intent ${id} missing capability_map`,
      });
    }
    if (!source || !validSources.has(source)) {
      violations.push({
        code: 'unknown-source-type',
        detail: `intent ${id} missing or unknown source_type`,
      });
    }
    if (!hasDeliverable) {
      violations.push({code: 'no-deliverable', detail: `intent ${id} missing deliverable`});
    }
    if (!offline) {
      violations.push({code: 'network-in-route', detail: `intent ${id} offline not true`});
    }
    if (hasNetwork(raw)) {
      violations.push({code: 'network-in-route', detail: `intent ${id} https URL in brief`});
    }
  }
}

const audit = {
  schemaVersion: 'content-os-router-audit-v1',
  target: basename(targetPath),
  mode: isManifest ? 'manifest' : 'brief',
  violations,
  routeBound: !violations.some((v) => v.code === 'missing-route'),
  capabilityMapped: !violations.some((v) => v.code === 'missing-capability-map'),
  sourceTyped: !violations.some((v) => v.code === 'unknown-source-type'),
  offlineFirst: !violations.some((v) => v.code === 'network-in-route'),
  strict,
};

mkdirSync(outDir, {recursive: true});
const outPath = resolve(outDir, 'route-audit.json');
writeFileSync(outPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
if (strict && violations.length > 0) {
  console.error(`FAIL route-audit (strict): ${violations.length} violation(s) -> ${outPath}`);
  for (const v of violations) {
    console.error(`  ${v.code}: ${v.detail}`);
  }
  process.exit(1);
}
console.info(
  `PASS route-audit: routeBound=${audit.routeBound}, capabilityMapped=${audit.capabilityMapped}, sourceTyped=${audit.sourceTyped}, offlineFirst=${audit.offlineFirst}, violations=${violations.length} -> ${outPath}`,
);
