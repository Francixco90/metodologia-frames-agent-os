#!/usr/bin/env node
/**
 * Frames ContentOS Creative — static creative-brief auditor.
 *
 * Reads a creative brief (YAML-ish), extracts brandRef/voiceRef/channelRef, story spine
 * beats, and detects: missing brandRef, external font/asset URLs (not offline-first),
 * lazy web defaults (pure-white, generic-copy), and missing story spine. Emits
 * creative-audit.json (schemaVersion content-os-creative-audit-v1). Static (no deps):
 * deterministic, offline, fast. --strict exits nonzero on violations.
 *
 * Usage: node skills/content-os-creative/scripts/creative-audit.mjs <brief.yml> --out <dir> [--strict]
 */
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve, dirname, basename} from 'node:path';

const args = process.argv.slice(2);
const briefIdx = args.findIndex((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const strict = args.includes('--strict');
if (briefIdx === -1 || outIdx === -1 || args[outIdx + 1] === undefined) {
  console.error('Usage: creative-audit.mjs <brief.yml> --out <dir> [--strict]');
  process.exit(1);
}
const briefPath = resolve(process.cwd(), args[briefIdx]);
const outDir = resolve(process.cwd(), args[outIdx + 1]);
const text = readFileSync(briefPath, 'utf8');

const extract = (key) => {
  const m = text.match(new RegExp(`^\\s*${key}:\\s*['"]?([^'"\\n]+)['"]?\\s*$`, 'mu'));
  return m ? m[1].trim() : null;
};
const brandRef = extract('brandRef');
const voiceRef = extract('voiceRef');
const channelRef = extract('channelRef');
const compositionId = extract('compositionId') ?? basename(briefPath).replace(/\.ya?ml$/u, '');
const compositionPattern = extract('compositionPattern');
const hasStorySpine =
  /\bstorySpine:/u.test(text) && /\bhook:/u.test(text) && /\bbeats:/u.test(text);
const beatCount = [...text.matchAll(/^\s*-\s*\{?\s*label:\s*['"]?([^'",}\n]+)/gmu)].length;

const violations = [];

if (!brandRef) {
  violations.push({
    code: 'missing-brandRef',
    detail: 'brandRef absent; cannot resolve brand tokens offline',
  });
}
if (!voiceRef) {
  violations.push({
    code: 'missing-voiceRef',
    detail: 'voiceRef absent; cannot resolve voice profile',
  });
}
if (!channelRef) {
  violations.push({
    code: 'missing-channelRef',
    detail: 'channelRef absent; cannot resolve channel profile',
  });
}
if (!hasStorySpine) {
  violations.push({
    code: 'missing-story-spine',
    detail: 'storySpine with hook+beats+final required before HTML',
  });
} else if (beatCount === 0) {
  violations.push({code: 'empty-beats', detail: 'storySpine declared but no beats listed'});
}

// External fonts / assets (not offline-first).
const externalFont = /https?:\/\/fonts\.googleapis\.com/u.test(text);
const externalAsset =
  /https?:\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^'"\s)]+\.(woff2?|ttf|otf|mp4|webm|mp3|wav|png|jpg|jpeg|gif|svg)/iu.test(
    text,
  );
if (externalFont) {
  violations.push({
    code: 'external-font',
    detail: 'external font CDN detected; use offline brand bundle',
  });
}
if (externalAsset) {
  violations.push({
    code: 'external-asset',
    detail: 'external asset URL detected; offline-first violation',
  });
}

// Lazy web defaults.
if (/lazy-default:\s*true/u.test(text)) {
  violations.push({
    code: 'lazy-default',
    detail: 'lazy web default flagged (pure-white/generic-copy/soft-shadow)',
  });
}
if (/pure-white:\s*true/u.test(text)) {
  violations.push({
    code: 'pure-white',
    detail: 'pure white background without brand token override',
  });
}
if (/generic-copy:\s*true/u.test(text)) {
  violations.push({code: 'generic-copy', detail: 'generic copy without voice profile resolution'});
}

const brandResolved = Boolean(brandRef && voiceRef && channelRef);
const audit = {
  schemaVersion: 'content-os-creative-audit-v1',
  brief: basename(briefPath),
  compositionId,
  brandRef,
  voiceRef,
  channelRef,
  compositionPattern,
  storySpineDeclared: hasStorySpine,
  beatCount,
  violations,
  brandResolved,
  offlineFirst: !externalFont && !externalAsset,
  strict,
};

mkdirSync(outDir, {recursive: true});
const outPath = resolve(outDir, 'creative-audit.json');
writeFileSync(outPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
if (strict && violations.length > 0) {
  console.error(`FAIL creative-audit (strict): ${violations.length} violation(s) -> ${outPath}`);
  for (const v of violations) {
    console.error(`  ${v.code}: ${v.detail}`);
  }
  process.exit(1);
}
console.info(
  `PASS creative-audit: brandResolved=${brandResolved}, beats=${beatCount}, offlineFirst=${audit.offlineFirst}, violations=${violations.length} -> ${outPath}`,
);
