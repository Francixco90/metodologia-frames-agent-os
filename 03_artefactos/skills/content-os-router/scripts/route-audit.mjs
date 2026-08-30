#!/usr/bin/env node
// Static, deterministic and offline intent-brief auditor. [CÓDIGO]
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
const validStages = new Set(['P00', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09']);
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
    const isContentV2 = entry.schema_version === 'content-intent-v2';
    if (!entry.intentId && !isContentV2) continue;
    const intentId = entry.intentId ?? String(entry.request_hash ?? '').slice(0, 12);
    if (isContentV2) {
      const path = Array.isArray(entry.selected_stage_path) ? entry.selected_stage_path : [];
      const intervention = entry.content_class === 'intervention';
      const commercialProposal = entry.content_class === 'commercial-proposal';
      if (path.length < 2 || path.some((stage) => !validStages.has(stage))) {
        violations.push({code: 'missing-route', detail: `intent ${intentId} invalid stage path`});
      }
      if (!intervention && !path.includes('P03')) {
        violations.push({code: 'brief-required', detail: `intent ${intentId} new piece omits P03`});
      }
      const commercialPaths = [
        ['P01', 'P02', 'P03', 'P05', 'P06', 'P07'],
        ['P00', 'P01', 'P02', 'P03', 'P05', 'P06', 'P07'],
      ];
      if (
        commercialProposal &&
        !commercialPaths.some((candidate) => JSON.stringify(candidate) === JSON.stringify(path))
      ) {
        violations.push({
          code: 'commercial-route',
          detail: `intent ${intentId} must use the exact governed commercial proposal path`,
        });
      }
      if (!commercialProposal && (!path.includes('P07') || !path.includes('P08'))) {
        violations.push({code: 'review-required', detail: `intent ${intentId} omits P07/P08`});
      }
      if (path.includes('P09') && entry.next_gate !== 'MW_DISTRIBUTION_AUTHORIZED') {
        violations.push({code: 'distribution-gate', detail: `intent ${intentId} P09 lacks manual gate`});
      }
      if (!entry.brief_ref || !String(entry.brief_ref).endsWith('/brief.md')) {
        violations.push({code: 'brief-required', detail: `intent ${intentId} lacks canonical briefRef`});
      }
      if (!Array.isArray(entry.blocking_questions) || entry.blocking_questions.length > 3) {
        violations.push({code: 'question-budget', detail: `intent ${intentId} exceeds three questions`});
      }
      if (!Array.isArray(entry.route_candidates) || entry.route_candidates.length === 0) {
        violations.push({code: 'missing-route', detail: `intent ${intentId} missing route candidates`});
      }
      if (entry.effect_class === 'external_reversible' || entry.effect_class === 'irreversible') {
        violations.push({code: 'external-effect', detail: `intent ${intentId} requests external effect`});
      }
      continue;
    }
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
  // YAML-ish brief: split by top-level intent markers.
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
