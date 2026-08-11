#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdtempSync, readFileSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {runAdversarial} from './lib/adversarial-check.mjs';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = 'COSTI_CHECK_';
const required = [
  'SKILL.md', 'LINEAGE.yml', 'source-manifest.yml', 'receipts/runtime-boundary.yml',
  'receipts/verification-v0.1.0.yml', 'receipts/verification-v0.2.0.yml', 'receipts/verification-v0.3.0.yml', 'receipts/verification-v0.4.0.yml', 'receipts/verification-v0.5.0.yml',
  'rules/workflow-contract.md', 'schemas/transcript-intelligence-v1.schema.json',
  'schemas/artifacts-v1.schema.json', 'scripts/transcript-intelligence.mjs',
  'scripts/lib/context.mjs', 'scripts/lib/media-validation.mjs', 'scripts/lib/output-path.mjs', 'scripts/lib/adversarial-check.mjs',
  'scripts/lib/linguistic.mjs', 'scripts/lib/semantic.mjs',
  'scripts/check-skill.mjs', 'references/language-quality-policy.md',
  'references/caption-editing-policy.md', 'references/semantic-retrieval.md',
  'references/narrative-mining.md', 'assets/semantic-intents.json',
  'fixtures/positive/job.json', 'fixtures/positive/legacy-job.json',
  'fixtures/positive/asr-candidate.json', 'fixtures/positive/authority.json',
  'fixtures/positive/editorial-notes.json', 'fixtures/positive/visual-reference.json',
  'fixtures/positive/inference.json', 'fixtures/negative/text-only-pronunciation.json',
  'fixtures/negative/material-ambiguity.json', 'fixtures/negative/ambiguous-asr.json',
  'fixtures/negative/hash-mismatch.json', 'fixtures/negative/material-authority-required.json',
  'fixtures/negative/unauthorized-material-asr.json', 'fixtures/negative/unauthorized-material-authority.json',
  'fixtures/negative/adversarial-cases.json',
];
const errors = [];
for (const rel of required) if (!existsSync(resolve(DIR, rel))) errors.push(`${PREFIX}MISSING ${rel}`);

const skill = readFileSync(resolve(DIR, 'SKILL.md'), 'utf8');
if (!skill.startsWith('---\nname: content-os-transcript-intelligence\n')) errors.push(`${PREFIX}FRONTMATTER_NAME`);
for (const token of ['minimal-clarity', 'audio_required', 'coaching-private.json', 'sourceSpan', 'local-evaluation', 'discard', 'extend', 'reframe', 'literal_audio', 'asr_candidate', 'visual_reference']) {
  if (!skill.includes(token)) errors.push(`${PREFIX}MISSING_TOKEN ${token}`);
}

const schema = readFileSync(resolve(DIR, 'schemas/transcript-intelligence-v1.schema.json'), 'utf8');
const parsedSchema = JSON.parse(schema);
if (parsedSchema.properties?.contractRevision?.const !== 3) errors.push(`${PREFIX}SCHEMA_REVISION`);
for (const token of ['contractRevision', 'inputClock', 'originAbsoluteSeconds', 'literal_audio', 'editorial_notes', 'visual_reference', 'inference', 'model', 'config', 'durationSeconds', 'derivedFromSourceSha256']) {
  if (!schema.includes(`"${token}"`)) errors.push(`${PREFIX}SCHEMA_TOKEN ${token}`);
}

const manifest = readFileSync(resolve(DIR, 'source-manifest.yml'), 'utf8');
const localHashes = {
  'references/caption-editing-policy.md': null,
  'references/language-quality-policy.md': null,
  'references/narrative-mining.md': null,
  'references/semantic-retrieval.md': null,
  'assets/semantic-intents.json': null,
};
for (const rel of Object.keys(localHashes)) {
  const actual = createHash('sha256').update(readFileSync(resolve(DIR, rel))).digest('hex');
  if (!manifest.includes(`ref: ${rel}\n        sha256: ${actual}`)) errors.push(`${PREFIX}HASH ${rel}`);
}
for (const token of ['rights:', 'authority_class:', 'disposition:', 'runtime_external_dependencies: []', 'copied_external_books: false', 'copied_private_transcripts: false']) {
  if (!manifest.includes(token)) errors.push(`${PREFIX}SOURCE_POLICY ${token}`);
}

function textFiles(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return textFiles(path);
    return ['.md', '.json', '.yml', '.mjs'].includes(extname(entry.name)) ? [path] : [];
  });
}
const scanned = textFiles(DIR).map((path) => readFileSync(path, 'utf8')).join('\n');
if (/\/Users\/|\/Downloads\/|\/Documents\/|docs\.google\.com/i.test(scanned)) errors.push(`${PREFIX}PRIVATE_LOCATOR`);

const temp = mkdtempSync(resolve(tmpdir(), 'costi-check-'));
const fixtureRoot = resolve(temp, 'fixtures');
cpSync(resolve(DIR, 'fixtures'), fixtureRoot, {recursive: true});
function run(args) {
  return spawnSync(process.execPath, [resolve(DIR, 'scripts/transcript-intelligence.mjs'), ...args], {cwd: DIR, encoding: 'utf8'});
}
function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
const positiveJob = resolve(fixtureRoot, 'positive/job.json');
const positiveRef = 'outputs/positive';
const positiveOut = resolve(dirname(positiveJob), positiveRef);
const positive = run(['verify', '--job', positiveJob, '--out', positiveRef]);
if (positive.status !== 0) errors.push(`${PREFIX}POSITIVE ${positive.stderr}`);
else {
  const verification = json(resolve(positiveOut, 'verification.json'));
  const captions = json(resolve(positiveOut, 'caption-track.json'));
  if (!verification.provenance?.hashesVerified || verification.compatibility?.migratedInMemory || verification.clocks?.local?.originAbsoluteSeconds !== 1) errors.push(`${PREFIX}PROVENANCE_CLOCKS`);
  if (captions.segments[0]?.startSeconds !== 0 || captions.segments[0]?.sourceSpan?.absolute?.startSeconds !== 1 || captions.segments[0]?.sourceSpan?.local?.startSeconds !== 0) errors.push(`${PREFIX}DUAL_CLOCK_SPAN`);
  for (const evidenceClass of ['asr_candidate', 'editorial_notes', 'visual_reference', 'inference']) {
    if (!verification.provenance.evidenceClasses.includes(evidenceClass)) errors.push(`${PREFIX}EVIDENCE_CLASS ${evidenceClass}`);
  }
  if (verification.evidencePolicy.editorialNotesCanEstablishAudibility !== false || verification.evidencePolicy.inferenceCanEstablishAudibility !== false) errors.push(`${PREFIX}EVIDENCE_AUTHORITY`);
}

const legacyJob = resolve(fixtureRoot, 'positive/legacy-job.json');
const inspect = run(['inspect', '--job', legacyJob]);
if (inspect.status !== 0 || !inspect.stdout.includes('legacy-read-only')) errors.push(`${PREFIX}LEGACY_READ`);
for (const command of ['ingest', 'analyze', 'caption', 'index', 'search', 'narrative', 'verify', 'package']) {
  const args = [command, '--job', legacyJob, '--out', `outputs/legacy-${command}`];
  if (command === 'search') args.push('--query', 'synthetic');
  const blocked = run(args);
  if (blocked.status === 0 || !blocked.stderr.includes('MIGRATION_REQUIRED')) errors.push(`${PREFIX}LEGACY_DERIVATIVE ${command}`);
}
const migrationRef = 'outputs/migration';
const migrationOut = resolve(dirname(legacyJob), migrationRef);
const migration = run(['migrate', '--job', legacyJob, '--out', migrationRef]);
if (migration.status !== 0) errors.push(`${PREFIX}MIGRATION ${migration.stderr}`);
else {
  const migrated = run(['verify', '--job', resolve(migrationOut, 'migrated-job.json'), '--out', 'verify']);
  if (migrated.status !== 0) errors.push(`${PREFIX}MIGRATED_VERIFY ${migrated.stderr}`);
}

const search = run(['search', '--job', positiveJob, '--query', 'muestra aplicaciones funcionando', '--out', 'outputs/search']);
if (search.status !== 0 || !search.stdout.includes('"segmentId": "s3"')) errors.push(`${PREFIX}SEMANTIC_SEARCH`);
const packageRun = run(['package', '--job', positiveJob, '--out', 'outputs/package']);
if (packageRun.status !== 0 || existsSync(resolve(dirname(positiveJob), 'outputs/package/public/coaching-private.json'))) errors.push(`${PREFIX}PRIVATE_PACKAGE`);
const textOnly = run(['verify', '--job', resolve(fixtureRoot, 'negative/text-only-pronunciation.json'), '--out', 'outputs/text-only']);
if (textOnly.status === 0 || !textOnly.stderr.includes('audio-required-for-pronunciation')) errors.push(`${PREFIX}AUDIO_GATE`);
const ambiguity = run(['verify', '--job', resolve(fixtureRoot, 'negative/material-ambiguity.json'), '--out', 'outputs/ambiguity']);
if (ambiguity.status === 0 || !ambiguity.stderr.includes('material-ambiguity')) errors.push(`${PREFIX}MATERIAL_GATE`);
const materialAuthority = run(['verify', '--job', resolve(fixtureRoot, 'negative/material-authority-required.json'), '--out', 'outputs/material-authority']);
if (materialAuthority.status === 0 || !materialAuthority.stderr.includes('material-authority-required')) errors.push(`${PREFIX}MATERIAL_AUTHORITY_GATE`);
const mismatch = run(['verify', '--job', resolve(fixtureRoot, 'negative/hash-mismatch.json'), '--out', 'outputs/hash-mismatch']);
if (mismatch.status === 0 || !mismatch.stderr.includes('HASH_MISMATCH')) errors.push(`${PREFIX}HASH_GATE`);

runAdversarial({dir: DIR, temp, run, errors, prefix: PREFIX});

if (errors.length) {
  console.error(`FAIL content-os-transcript-intelligence: ${errors.length} error(s)`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`PASS content-os-transcript-intelligence: ${required.length} files, explicit migration, media binding, bounded dual clocks, real-ref provenance, authority, packaging and privacy gates.`);
