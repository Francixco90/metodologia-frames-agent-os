#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT = process.cwd();
const DIR = resolve(ROOT, 'skills/content-os-transcript-intelligence');
const PREFIX = 'COSTI_CHECK_';
const required = [
  'SKILL.md', 'LINEAGE.yml', 'source-manifest.yml', 'receipts/runtime-boundary.yml',
  'receipts/verification-v0.1.0.yml',
  'rules/workflow-contract.md', 'schemas/transcript-intelligence-v1.schema.json',
  'schemas/artifacts-v1.schema.json', 'scripts/transcript-intelligence.mjs',
  'scripts/lib/context.mjs', 'scripts/lib/linguistic.mjs',
  'scripts/lib/semantic.mjs',
  'scripts/check-skill.mjs', 'references/language-quality-policy.md',
  'references/caption-editing-policy.md', 'references/semantic-retrieval.md',
  'references/narrative-mining.md', 'assets/semantic-intents.json',
  'fixtures/positive/job.json', 'fixtures/positive/asr-candidate.json',
  'fixtures/positive/authority.json', 'fixtures/positive/editorial-notes.json',
  'fixtures/negative/text-only-pronunciation.json',
  'fixtures/negative/material-ambiguity.json', 'fixtures/negative/ambiguous-asr.json',
];
const errors = [];
for (const rel of required) if (!existsSync(resolve(DIR, rel))) errors.push(`${PREFIX}MISSING ${rel}`);

const skill = readFileSync(resolve(DIR, 'SKILL.md'), 'utf8');
if (!skill.startsWith('---\nname: content-os-transcript-intelligence\n')) errors.push(`${PREFIX}FRONTMATTER_NAME`);
for (const token of ['minimal-clarity', 'audio_required', 'coaching-private.json', 'sourceSpan', 'local-evaluation', 'discard', 'extend', 'reframe']) {
  if (!skill.includes(token)) errors.push(`${PREFIX}MISSING_TOKEN ${token}`);
}

const manifest = readFileSync(resolve(DIR, 'source-manifest.yml'), 'utf8');
const localHashes = {
  'references/caption-editing-policy.md': '514d595459c06bbcbee1c3860c2dbf0518fc068d09c23908560a5555a6d57c63',
  'references/language-quality-policy.md': '2d86474e13df2851eed8b16a6335830183ee083bd760c84889f3a9d830eda9ed',
  'references/narrative-mining.md': 'fbd62d45c115608752ba5bed54e2048bca0d7fdebf6c28910e4a7d6a1bae1b45',
  'references/semantic-retrieval.md': 'efd3e416cd6202cdfcea46bc23a520fc7cfb25ab9c20013281b7f1b0a05404dd',
  'assets/semantic-intents.json': '029886b04a6761b27f5b64e696965e898bb1f83125a2709fd6bd83632714f4a2',
};
for (const [rel, expected] of Object.entries(localHashes)) {
  const actual = createHash('sha256').update(readFileSync(resolve(DIR, rel))).digest('hex');
  if (actual !== expected || !manifest.includes(`sha256: ${expected}`)) errors.push(`${PREFIX}HASH ${rel}`);
}
for (const token of ['rights:', 'authority_class:', 'disposition:', 'runtime_external_dependencies: []', 'copied_external_books: false', 'copied_private_transcripts: false']) {
  if (!manifest.includes(token)) errors.push(`${PREFIX}SOURCE_POLICY ${token}`);
}

const scanned = ['SKILL.md', 'source-manifest.yml', ...Object.keys(localHashes), 'fixtures/positive/job.json', 'fixtures/negative/material-ambiguity.json']
  .map((rel) => readFileSync(resolve(DIR, rel), 'utf8')).join('\n');
if (/\/Users\/|\/Downloads\/|\/Documents\/|docs\.google\.com/i.test(scanned)) errors.push(`${PREFIX}PRIVATE_LOCATOR`);

const temp = mkdtempSync(resolve(tmpdir(), 'costi-check-'));
function run(args) {
  return spawnSync(process.execPath, [resolve(DIR, 'scripts/transcript-intelligence.mjs'), ...args], {cwd: ROOT, encoding: 'utf8'});
}
const positiveJob = resolve(DIR, 'fixtures/positive/job.json');
const positive = run(['verify', '--job', positiveJob, '--out', resolve(temp, 'positive')]);
if (positive.status !== 0) errors.push(`${PREFIX}POSITIVE ${positive.stderr}`);
const search = run(['search', '--job', positiveJob, '--query', 'muestra aplicaciones funcionando', '--out', resolve(temp, 'search')]);
if (search.status !== 0 || !search.stdout.includes('"segmentId": "s3"')) errors.push(`${PREFIX}SEMANTIC_SEARCH`);
const packageRun = run(['package', '--job', positiveJob, '--out', resolve(temp, 'package')]);
if (packageRun.status !== 0 || existsSync(resolve(temp, 'package/public/coaching-private.json'))) errors.push(`${PREFIX}PRIVATE_PACKAGE`);
const textOnly = run(['verify', '--job', resolve(DIR, 'fixtures/negative/text-only-pronunciation.json'), '--out', resolve(temp, 'text-only')]);
if (textOnly.status === 0 || !textOnly.stderr.includes('audio-required-for-pronunciation')) errors.push(`${PREFIX}AUDIO_GATE`);
const ambiguity = run(['verify', '--job', resolve(DIR, 'fixtures/negative/material-ambiguity.json'), '--out', resolve(temp, 'ambiguity')]);
if (ambiguity.status === 0 || !ambiguity.stderr.includes('material-ambiguity')) errors.push(`${PREFIX}MATERIAL_GATE`);

if (errors.length) {
  console.error(`FAIL content-os-transcript-intelligence: ${errors.length} error(s)`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`PASS content-os-transcript-intelligence: ${required.length} files, source hashes, public/private split, semantic and negative gates.`);
