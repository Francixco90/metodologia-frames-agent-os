#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readFileSync} from 'node:fs';
import {basename, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {argsOf, fail, loadContext, readJson, safeRef, sha256File, writeJson} from './lib/context.mjs';
import {buildLinguistic} from './lib/linguistic.mjs';
import {resolveOutput} from './lib/output-path.mjs';
import {buildSemantic, searchSemantic} from './lib/semantic.mjs';

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMMANDS = new Set(['inspect', 'migrate', 'ingest', 'analyze', 'caption', 'index', 'search', 'narrative', 'verify', 'package']);
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

function migrateLegacy(jobPath, job, outDir) {
  if ((job.contractRevision ?? 1) >= 3) fail('MIGRATION_NOT_REQUIRED');
  if (!job.source?.ref || !job.provenance?.model?.ref || !job.provenance?.config?.ref || !Number.isFinite(job.source.durationSeconds)) {
    fail('MIGRATION_INPUTS_REQUIRED', 'source-ref-duration-model-ref-config-ref');
  }
  const inputDir = resolve(outDir, 'inputs');
  mkdirSync(inputDir, {recursive: true});
  function copy(label, ref) {
    const sourcePath = safeRef(jobPath, ref, `migration:${label}`);
    const name = `${label}-${basename(ref)}`;
    copyFileSync(sourcePath, resolve(inputDir, name));
    return {ref: `inputs/${name}`, sha256: sha256File(sourcePath)};
  }
  const source = copy('source', job.source.ref);
  const asr = copy('asr', job.asrRef);
  const authority = copy('authority', job.authorityRef);
  const model = copy('model', job.provenance.model.ref);
  const config = copy('config', job.provenance.config.ref);
  const notes = (job.notesRefs ?? []).map((ref, index) => copy(`note-${index + 1}`, ref));
  const migrated = {
    ...job,
    contractRevision: 3,
    source: {...job.source, ref: source.ref, sha256: source.sha256},
    clocks: {inputClock: 'absolute', absolute: {id: 'source-media', unit: 'seconds', originSeconds: 0}, local: {id: 'selection', unit: 'seconds', originAbsoluteSeconds: 0}},
    inputs: [
      {class: 'asr_candidate', ...asr, authorityClass: 'candidate'},
      {class: 'authority', ...authority, authorityClass: 'declared-authority'},
      ...notes.map((item) => ({class: 'editorial_notes', ...item, authorityClass: 'locator-only'})),
    ],
    provenance: {model: {...job.provenance.model, ...model}, config: {...job.provenance.config, ...config}},
  };
  delete migrated.asrRef;
  delete migrated.authorityRef;
  delete migrated.notesRefs;
  writeJson(outDir, 'migrated-job.json', migrated);
  return migrated;
}

const args = argsOf(process.argv.slice(2));
const command = args._[0];
if (!COMMANDS.has(command)) fail('USAGE', 'expected inspect|migrate|ingest|analyze|caption|index|search|narrative|verify|package');
if (!args.job) fail('USAGE', '--job required');
const jobPath = resolve(String(args.job));
if (!existsSync(jobPath)) fail('MISSING_JOB', jobPath);
const output = resolveOutput(jobPath, args.out === undefined ? undefined : String(args.out), fail);
const outDir = output.dir;
const rawJob = readJson(jobPath);
const legacy = (rawJob.contractRevision ?? 1) < 3;
if (command === 'inspect') {
  console.log(JSON.stringify({schemaVersion: rawJob.schemaVersion, contractRevision: rawJob.contractRevision ?? 1, mode: legacy ? 'legacy-read-only' : 'current', migrationRequired: legacy}, null, 2));
  process.exit(0);
}
if (command === 'migrate') {
  migrateLegacy(jobPath, rawJob, outDir);
  console.log(`PASS migrate ${basename(jobPath)} -> ${output.ref}`);
  process.exit(0);
}
if (legacy) fail('MIGRATION_REQUIRED', `revision-${rawJob.contractRevision ?? 1}`);
const artifacts = build(loadContext(jobPath), String(args.framework ?? 'impact'));

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
  if (rawJob.policy.publicPackage !== true) fail('PACKAGE_BLOCKED', 'publicPackage=false');
  if (artifacts.verification.verdict !== 'PASS') fail('PACKAGE_BLOCKED', artifacts.verification.blockers.map((item) => item.code).join(','));
  const publicDir = resolve(outDir, 'public');
  const values = persistAll(outDir, artifacts);
  for (const name of PUBLIC_FILES) writeJson(publicDir, name, values[name]);
  const manifest = {
    schemaVersion: 'transcript-intelligence-package-v1', contractRevision: 3,
    state: 'local-evaluation', publicFiles: PUBLIC_FILES,
    excludedPrivateFiles: ['coaching-private.json'],
    files: PUBLIC_FILES.map((name) => ({name, sha256: createHash('sha256').update(readFileSync(resolve(publicDir, name))).digest('hex')})),
    provenance: artifacts.verification.provenance,
    clocks: artifacts.verification.clocks,
    publicationAuthority: false,
  };
  writeJson(outDir, 'package-manifest.json', manifest);
}
console.log(`PASS ${command} ${basename(jobPath)} -> ${output.ref}`);
