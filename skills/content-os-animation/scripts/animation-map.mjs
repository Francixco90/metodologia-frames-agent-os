#!/usr/bin/env node
/**
 * Content OS Animation — static animation-map auditor.
 *
 * Reads a composition HTML file, extracts the registered GSAP timeline(s) and
 * enumerates tween calls (fromTo / to / from / set) via a conservative regex
 * sweep, then emits an animation-map.json. Static (no browser): deterministic,
 * offline, fast. A full runtime sampler (bboxes, seek-flags) is Fase 4 work.
 *
 * Usage: node skills/content-os-animation/scripts/animation-map.mjs <composition.html> --out <dir>
 */
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve, dirname, basename} from 'node:path';

const args = process.argv.slice(2);
const compositionIdx = args.findIndex((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
if (compositionIdx === -1 || outIdx === -1 || args[outIdx + 1] === undefined) {
  console.error('Usage: animation-map.mjs <composition.html> --out <dir>');
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
const forbidden = [];
for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /repeat:\s*-1/u,
  /getBoundingClientRect/u,
]) {
  if (pattern.test(html)) forbidden.push(String(pattern));
}

const map = {
  schemaVersion: 'content-os-animation-map-v1',
  composition: basename(compositionPath),
  timelineIds,
  tweenCount: tweenCalls.length,
  tweenKinds: tweenCalls.reduce((acc, kind) => {
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {}),
  forbiddenDetected: forbidden,
  seekSafe: forbidden.length === 0 && timelineIds.length === 1,
};

mkdirSync(outDir, {recursive: true});
const outPath = resolve(outDir, 'animation-map.json');
writeFileSync(outPath, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
console.info(
  `PASS animation-map: ${tweenCalls.length} tweens, ${timelineIds.length} timeline(s), seekSafe=${map.seekSafe} -> ${outPath}`,
);
