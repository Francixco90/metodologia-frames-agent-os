#!/usr/bin/env node
/**
 * Frames ContentOS Keyframes — static pose-contract linter.
 *
 * Reads a composition HTML file, extracts declared pose-contract subjects
 * (data-keyframe-subject), explicit poses (data-pose + data-at), final state
 * (data-final-state), and the registered GSAP timeline, then emits pose-lint.json.
 * Detects: endpoint-only, identity-break (data-crossfade on non-replacement),
 * fake-3d (scale without perspective/z), unregistered timeline, end-on-black,
 * reset-to-rest, and unseekable runtime APIs. Static (no browser): deterministic,
 * offline, fast.
 *
 * Usage: node skills/content-os-keyframes/scripts/pose-lint.mjs <composition.html> --out <dir> [--strict]
 */
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve, dirname, basename} from 'node:path';

const args = process.argv.slice(2);
const compositionIdx = args.findIndex((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const strict = args.includes('--strict');
if (compositionIdx === -1 || outIdx === -1 || args[outIdx + 1] === undefined) {
  console.error('Usage: pose-lint.mjs <composition.html> --out <dir> [--strict]');
  process.exit(1);
}
const compositionPath = resolve(process.cwd(), args[compositionIdx]);
const outDir = resolve(process.cwd(), args[outIdx + 1]);
const html = readFileSync(compositionPath, 'utf8');

const timelineIds = [
  ...html.matchAll(
    /window\.__timelines\[['"]([^'"]+)['"]\]\s*=\s*gsap\.timeline\(\{paused:\s*true\}\)/gu,
  ),
].map((m) => m[1]);
const tweenCalls = [...html.matchAll(/\btl\.(fromTo|to|from|set)\(/gu)].map((m) => m[1]);
const compositionIdMatch = html.match(/data-composition-id=['"]([^'"]+)['"]/u);
const compositionId = compositionIdMatch
  ? compositionIdMatch[1]
  : basename(compositionPath).replace(/\.html$/u, '');

const subjects = [...html.matchAll(/data-keyframe-subject=['"]([^'"]+)['"]/gu)].map((m) => m[1]);
const poses = [...html.matchAll(/data-pose=['"]([^'"]+)['"]\s+data-at=['"]([\d.]+)['"]/gu)].map(
  (m) => ({
    name: m[1],
    at: Number.parseFloat(m[2]),
  }),
);
const finalStateMatch = html.match(/data-final-state=['"]([^'"]+)['"]/u);
const finalState = finalStateMatch ? finalStateMatch[1] : null;

const violations = [];

// endpoint-only: subject with timeline but fewer than 3 explicit poses (needs middle).
if (subjects.length > 0 && poses.length < 3) {
  violations.push({
    code: 'endpoint-only',
    detail: `subjects=${subjects.length} poses=${poses.length}; need >=3 poses (start/middle/final)`,
  });
}

// identity-break: data-crossfade present without replacement.
const crossfadeMatch = html.match(/data-crossfade=['"]([^'"]+)['"]/u);
if (crossfadeMatch && crossfadeMatch[1] !== 'replacement' && crossfadeMatch[1] !== 'dissolve') {
  violations.push({
    code: 'identity-break',
    detail: `data-crossfade="${crossfadeMatch[1]}" breaks subject identity`,
  });
}

// fake-3d: declared 3D intent (z/scaleZ/rotationX/Y) without perspective or preserve-3d.
// Pure 2D scale (pop/bounce) is NOT fake depth. Explicit data-fake-3d marker also flags.
const has3dIntent = /\bscaleZ\b|\brotationX\b|\brotationY\b|\bz:\s*[\d.-]/u.test(html);
const hasDepth = /perspective|preserve-3d/u.test(html);
const fake3dMarker = /data-fake-3d=['"]true['"]/u.test(html);
if ((has3dIntent && !hasDepth) || fake3dMarker) {
  violations.push({
    code: 'fake-3d',
    detail: '3D transform without perspective/transform-style: preserve-3d',
  });
}

// unregistered timeline: gsap.timeline not assigned to window.__timelines.
const unassignedTimeline =
  /gsap\.timeline\(\{[^}]*\}\)(?![^;]*window\.__timelines)/u.test(html) && timelineIds.length === 0;
if (unassignedTimeline) {
  violations.push({
    code: 'unregistered-timeline',
    detail: 'gsap.timeline not registered in window.__timelines',
  });
}

// end-on-black / reset-to-rest.
if (/data-end-on-black=['"]true['"]/u.test(html)) {
  violations.push({
    code: 'end-on-black',
    detail: 'final pose ends on black without explicit request',
  });
}
if (/data-reset-to-rest=['"]true['"]/u.test(html)) {
  violations.push({
    code: 'reset-to-rest',
    detail: 'final pose resets to rest without explicit request',
  });
}

// unseekable runtime APIs.
for (const [label, pattern] of Object.entries({
  'Math.random': /\bMath\.random\s*\(/u,
  'Date.now': /\bDate\.now\s*\(/u,
  'new Date': /\bnew\s+Date\s*\(/u,
  'performance.now': /\bperformance\.now\s*\(/u,
  'repeat:-1': /repeat:\s*-1/u,
  'relative +=': /['"]\s*\+=/u,
  'CSS transition': /\btransition\s*:/u,
})) {
  if (pattern.test(html)) {
    violations.push({code: 'unseekable', detail: `${label} detected`});
  }
}

const seekSafe = violations.length === 0 && timelineIds.length >= 1;
const lint = {
  schemaVersion: 'content-os-pose-lint-v1',
  composition: basename(compositionPath),
  compositionId,
  timelineIds,
  tweenCount: tweenCalls.length,
  subjects,
  poseCount: poses.length,
  poses,
  finalState,
  violations,
  seekSafe,
  strict,
};

mkdirSync(outDir, {recursive: true});
const outPath = resolve(outDir, 'pose-lint.json');
writeFileSync(outPath, `${JSON.stringify(lint, null, 2)}\n`, 'utf8');
if (strict && violations.length > 0) {
  console.error(`FAIL pose-lint (strict): ${violations.length} violation(s) -> ${outPath}`);
  for (const v of violations) {
    console.error(`  ${v.code}: ${v.detail}`);
  }
  process.exit(1);
}
console.info(
  `PASS pose-lint: ${tweenCalls.length} tweens, ${timelineIds.length} timeline(s), ${subjects.length} subject(s), ${poses.length} pose(s), seekSafe=${seekSafe} -> ${outPath}`,
);
