#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {basename, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {argsOf, fail, loadContext, writeJson} from './lib/context.mjs';
import {buildLinguistic} from './lib/linguistic.mjs';
import {buildSemantic, searchSemantic} from './lib/semantic.mjs';

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMMANDS = new Set(['ingest', 'analyze', 'caption', 'index', 'search', 'narrative', 'verify', 'package']);
const PUBLIC_FILES = ['literal-transcript.json', 'language-events.json', 'correction-ledger.json', 'caption-track.json', 'pronunciation-glossary.json', 'semantic-index.json', 'narrative-map.json', 'verification.json'];

function build(ctx, framework) {
  const linguistic = buildLinguistic(ctx);
  return {...linguistic, ...buildSemantic(ctx, linguistic, framework)};
}

function persistAll(outDir, artifacts) {
  const mapping = {
    'literal-transcript.json': artifacts.literal,
    'language-events.json': artifacts.languageEvents,
    'correction-ledger.json': artifacts.ledger,
    'caption-track.json': artifacts.captions,
    'pronunciation-glossary.json': artifacts.pronunciation,
    'coaching-private.json': artifacts.coaching,
    'semantic-index.json': artifacts.semantic,
    'narrative-map.json': artifacts.narrative,
    'verification.json': artifacts.verification,
  };
  for (const [name, value] of Object.entries(mapping)) writeJson(outDir, name, value);
  return mapping;
}

const args = argsOf(process.argv.slice(2));
const command = args._[0];
if (!COMMANDS.has(command)) fail('USAGE', 'expected ingest|analyze|caption|index|search|narrative|verify|package');
if (!args.job) fail('USAGE', '--job required');
const jobPath = resolve(String(args.job));
if (!existsSync(jobPath)) fail('MISSING_JOB', jobPath);
const artifacts = build(loadContext(jobPath), String(args.framework ?? 'impact'));
const outDir = resolve(String(args.out ?? resolve(dirname(jobPath), 'transcript-intelligence-output')));

if (command === 'ingest') writeJson(outDir, 'literal-transcript.json', artifacts.literal);
if (command === 'analyze') {
  writeJson(outDir, 'language-events.json', artifacts.languageEvents);
  writeJson(outDir, 'correction-ledger.json', artifacts.ledger);
  writeJson(outDir, 'pronunciation-glossary.json', artifacts.pronunciation);
  writeJson(outDir, 'coaching-private.json', artifacts.coaching);
}
if (command === 'caption') writeJson(outDir, 'caption-track.json', artifacts.captions);
if (command === 'index') writeJson(outDir, 'semantic-index.json', artifacts.semantic);
if (command === 'narrative') writeJson(outDir, 'narrative-map.json', artifacts.narrative);
if (command === 'search') {
  if (!args.query) fail('USAGE', '--query required for search');
  const results = searchSemantic(SKILL_DIR, artifacts.semantic, String(args.query));
  writeJson(outDir, 'search-results.json', results);
  console.log(JSON.stringify(results, null, 2));
}
if (command === 'verify') {
  persistAll(outDir, artifacts);
  if (artifacts.verification.verdict !== 'PASS') fail('VERIFICATION_FAILED', artifacts.verification.blockers.map((item) => item.code).join(','));
}
if (command === 'package') {
  if (artifacts.verification.verdict !== 'PASS') fail('PACKAGE_BLOCKED', artifacts.verification.blockers.map((item) => item.code).join(','));
  const publicDir = resolve(outDir, 'public');
  const values = persistAll(outDir, artifacts);
  for (const name of PUBLIC_FILES) writeJson(publicDir, name, values[name]);
  const manifest = {
    schemaVersion: 'transcript-intelligence-package-v1', state: 'local-evaluation', publicFiles: PUBLIC_FILES,
    excludedPrivateFiles: ['coaching-private.json'],
    files: PUBLIC_FILES.map((name) => ({name, sha256: createHash('sha256').update(readFileSync(resolve(publicDir, name))).digest('hex')})),
    publicationAuthority: false,
  };
  writeJson(outDir, 'package-manifest.json', manifest);
}
console.log(`PASS ${command} ${basename(jobPath)} -> ${outDir}`);
