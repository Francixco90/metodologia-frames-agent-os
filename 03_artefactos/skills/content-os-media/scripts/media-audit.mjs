#!/usr/bin/env node
/**
 * Frames ContentOS Media — static media manifest / brief auditor.
 *
 * Reads a media manifest (JSONL, one entry per line) or a brief (YAML-ish),
 * and detects: remote-without-auth (provider=remote, auth_declared!=true),
 * remote-without-opt-in (mediaProfile!=remote-opt-in but remote entries exist),
 * network-in-render-path (https URL in entry.path), missing-sha256,
 * missing-source, missing-provenance, vendor-placeholder-reuse (at_test).
 * Emits media-audit.json (schemaVersion content-os-media-audit-v1). --strict
 * exits nonzero. Static (no deps): deterministic, offline, fast.
 *
 * Usage: node skills/content-os-media/scripts/media-audit.mjs <manifest-or-brief> --out <dir> [--strict]
 */
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve, basename} from 'node:path';

const args = process.argv.slice(2);
const targetIdx = args.findIndex((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const strict = args.includes('--strict');
if (targetIdx === -1 || outIdx === -1 || args[outIdx + 1] === undefined) {
  console.error('Usage: media-audit.mjs <manifest-or-brief> --out <dir> [--strict]');
  process.exit(1);
}
const targetPath = resolve(process.cwd(), args[targetIdx]);
const outDir = resolve(process.cwd(), args[outIdx + 1]);
const text = readFileSync(targetPath, 'utf8');

const isManifest = targetPath.endsWith('.jsonl') || /^\s*\{/mu.test(text);
const violations = [];

const hasNetworkInPath = (s) => /\bhttps?:\/\//iu.test(s);
const isVendorPlaceholder = (s) => /\bat_test\b/u.test(s);

if (isManifest) {
  const lines = text.split('\n').filter(Boolean);
  let mediaProfile = 'offline';
  const profileMatch = text.match(/"mediaProfile":\s*"([^"]+)"/u);
  if (profileMatch) mediaProfile = profileMatch[1];
  const remoteOptInMatch = text.match(/"remoteOptIn":\s*\[([^\]]*)\]/u);
  const hasOptIn = remoteOptInMatch && remoteOptInMatch[1].trim().length > 0;

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.schemaVersion || entry.mediaProfile || entry.projectId) continue;
    if (entry.provider === 'remote') {
      if (entry.auth_declared !== true) {
        violations.push({
          code: 'remote-without-auth',
          detail: `entry ${entry.id ?? '?'} provider=remote but auth_declared is not true (fail-closed)`,
        });
      }
      if (mediaProfile !== 'remote-opt-in' || !hasOptIn) {
        violations.push({
          code: 'remote-without-opt-in',
          detail: `entry ${entry.id ?? '?'} provider=remote but project mediaProfile=${mediaProfile} (opt-in not declared)`,
        });
      }
    }
    if (!entry.sha256 || !/^[a-f0-9]{64}$/u.test(entry.sha256)) {
      violations.push({
        code: 'missing-sha256',
        detail: `entry ${entry.id ?? '?'} missing or invalid sha256 (provenance required)`,
      });
    }
    if (!entry.source) {
      violations.push({
        code: 'missing-source',
        detail: `entry ${entry.id ?? '?'} missing source (provenance required)`,
      });
    }
    if (entry.path && hasNetworkInPath(entry.path)) {
      violations.push({
        code: 'network-in-render-path',
        detail: `entry ${entry.id ?? '?'} path is https URL; default render path is offline`,
      });
    }
    if (isVendorPlaceholder(line)) {
      violations.push({
        code: 'vendor-placeholder-reuse',
        detail: 'vendor placeholder (at_test) reused; use own credential contract',
      });
    }
  }
} else {
  // Brief (YAML-ish).
  const profileMatch = text.match(/mediaProfile:\s*['"]?([^'"\n]+)['"]?/u);
  const mediaProfile = profileMatch ? profileMatch[1].trim() : null;
  if (!mediaProfile) {
    violations.push({
      code: 'missing-mediaProfile',
      detail: 'mediaProfile not declared (offline|remote-opt-in)',
    });
  }
  const remoteProvider = /\bprovider:\s*remote\b/u.test(text);
  const authDeclared = /\bauth_declared:\s*true\b/u.test(text);
  if (remoteProvider && !authDeclared) {
    violations.push({
      code: 'remote-without-auth',
      detail: 'brief declares provider:remote but no auth_declared:true',
    });
  }
  if (remoteProvider && mediaProfile !== 'remote-opt-in') {
    violations.push({
      code: 'remote-without-opt-in',
      detail: `brief uses remote but mediaProfile=${mediaProfile}`,
    });
  }
  if (hasNetworkInPath(text)) {
    violations.push({
      code: 'network-in-render-path',
      detail: 'https URL in brief; default render path is offline',
    });
  }
  if (isVendorPlaceholder(text)) {
    violations.push({
      code: 'vendor-placeholder-reuse',
      detail: 'vendor placeholder (at_test) reused',
    });
  }
  if (/\blazy-default:\s*true\b/u.test(text)) {
    violations.push({
      code: 'lazy-default',
      detail: 'lazy default flagged (placeholder media without resolve)',
    });
  }
  if (/\bplaceholder-media:\s*true\b/u.test(text)) {
    violations.push({code: 'placeholder-media', detail: 'placeholder media without real resolve'});
  }
}

const audit = {
  schemaVersion: 'content-os-media-audit-v1',
  target: basename(targetPath),
  mode: isManifest ? 'manifest' : 'brief',
  violations,
  offlineFirst: !violations.some((v) => v.code === 'network-in-render-path'),
  provenanceComplete: !violations.some(
    (v) => v.code === 'missing-sha256' || v.code === 'missing-source',
  ),
  remoteFailClosed: !violations.some(
    (v) => v.code === 'remote-without-auth' || v.code === 'remote-without-opt-in',
  ),
  strict,
};

mkdirSync(outDir, {recursive: true});
const outPath = resolve(outDir, 'media-audit.json');
writeFileSync(outPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
if (strict && violations.length > 0) {
  console.error(`FAIL media-audit (strict): ${violations.length} violation(s) -> ${outPath}`);
  for (const v of violations) {
    console.error(`  ${v.code}: ${v.detail}`);
  }
  process.exit(1);
}
console.info(
  `PASS media-audit: offlineFirst=${audit.offlineFirst}, provenanceComplete=${audit.provenanceComplete}, remoteFailClosed=${audit.remoteFailClosed}, violations=${violations.length} -> ${outPath}`,
);
