#!/usr/bin/env node
/**
 * Content OS Media — offline resolve cascade (deterministic, no network).
 *
 * Resolves a media intent against the local manifest + assets/ directory only.
 * Default is --local-only: no network is ever touched in the render path. Remote
 * adapters are documented in references/resolve-cascade.md as separate opt-in
 * scripts (auth-gated, fail-closed); this resolver does NOT invoke them.
 *
 * Cascade:
 *   1. Match in .media/manifest.jsonl (case/whitespace-insensitive) -> auto-reuse
 *   2. Scan assets/ for unregistered files sharing a word with the intent -> adopt
 *   3. No offline match + --local-only -> fail-closed error (no network)
 *
 * Usage: node skills/content-os-media/scripts/media-resolve.mjs --type <type> --intent "<desc>" --project <dir> [--local-only] [--json]
 */
import {
  readFileSync,
  existsSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  appendFileSync,
} from 'node:fs';
import {resolve, join, basename} from 'node:path';
import {createHash} from 'node:crypto';

const args = process.argv.slice(2);
const get = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] !== undefined ? args[idx + 1] : null;
};
const type = get('--type') ?? get('-t');
const intent = get('--intent') ?? get('-i');
const project = get('--project') ?? get('-p') ?? process.cwd();
const localOnly = args.includes('--local-only') || !args.includes('--remote-allowed');
const json = args.includes('--json');

if (!type || !intent) {
  console.error(
    'Usage: media-resolve.mjs --type <type> --intent "<desc>" --project <dir> [--local-only] [--json]',
  );
  process.exit(1);
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const normalize = (s) => s.toLowerCase().replace(/\s+/gu, ' ').trim();

const projectDir = resolve(project);
const manifestPath = join(projectDir, '.media', 'manifest.jsonl');
const assetsDir = join(projectDir, 'assets');
const mediaDir = join(projectDir, '.media');

// Step 1: manifest match (deterministic floor).
if (existsSync(manifestPath)) {
  const lines = readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
  const want = normalize(intent);
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== type) continue;
    if (normalize(entry.intent ?? '') === want) {
      const result = {
        ok: true,
        id: entry.id,
        path: entry.path,
        type: entry.type,
        provider: entry.provider ?? 'offline',
        source: 'manifest-reuse',
        sha256: entry.sha256,
      };
      if (json) {
        console.info(JSON.stringify(result, null, 2));
      } else {
        console.info(`resolved ${result.id} → ${result.path} (${result.type}, ${result.provider})`);
      }
      process.exit(0);
    }
  }
}

// Step 2: assets/ scan for unregistered files sharing a word with the intent.
if (existsSync(assetsDir)) {
  const walk = (dir) =>
    readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
      const p = join(dir, entry.name);
      return entry.isDirectory() ? walk(p) : [p];
    });
  const files = walk(assetsDir);
  const wantWords = new Set(
    normalize(intent)
      .split(' ')
      .filter((w) => w.length > 2),
  );
  for (const file of files) {
    const name = normalize(basename(file));
    if ([...wantWords].some((w) => name.includes(w))) {
      const id = `${type}_${String(files.indexOf(file) + 1).padStart(3, '0')}`;
      const entry = {
        id,
        type,
        path: file,
        sha256: sha256(readFileSync(file)),
        source: 'local-assets',
        provider: 'offline',
        auth_declared: false,
      };
      mkdirSync(mediaDir, {recursive: true});
      appendFileSync(manifestPath, `${JSON.stringify({...entry, intent})}\n`, 'utf8');
      const result = {ok: true, ...entry, source: 'assets-adopt'};
      if (json) {
        console.info(JSON.stringify(result, null, 2));
      } else {
        console.info(`resolved ${id} → ${file} (${type}, offline)`);
      }
      process.exit(0);
    }
  }
}

// Step 3: no offline match. Fail-closed when --local-only (the default).
if (localOnly) {
  console.error(
    `FAIL media-resolve: no offline match for type=${type} intent="${intent}". --local-only is default; remote adapters are opt-in (see references/resolve-cascade.md). No network touched.`,
  );
  process.exit(1);
}

// Non-local-only path is documented but not wired here: remote adapters are
// separate opt-in scripts (auth-gated, fail-closed). This resolver stays offline.
console.error(
  'FAIL media-resolve: remote adapters are not wired into this resolver. Use the opt-in adapter scripts documented in references/resolve-cascade.md with auth present.',
);
process.exit(1);
