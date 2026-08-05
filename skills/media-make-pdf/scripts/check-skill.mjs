import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const skill = 'skills/media-make-pdf';

const required = [
  `${skill}/SKILL.md`,
  `${skill}/LINEAGE.yml`,
  `${skill}/receipts/runtime-boundary.yml`,
  `${skill}/fixtures/positive/case-01.yml`,
  `${skill}/fixtures/negative/case-01.yml`,
];

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) {
    throw new Error(`MMP_MISSING_FILE: ${rel}`);
  }
}

const read = (rel) => readFileSync(resolve(root, rel), 'utf8');
const contents = new Map(required.map((rel) => [rel, read(rel)]));

const stripFrontmatter = (src) => {
  const match = /^---\n([\s\S]*?)\n---/.exec(src);
  return match ? match[1] : '';
};

const parseScalars = (block) => {
  const out = new Map();
  for (const line of block.split('\n')) {
    const m = /^([a-z_]+):\s*(\S.*?)\s*$/.exec(line);
    if (m) out.set(m[1], m[2]);
  }
  return out;
};

const skillMd = contents.get(`${skill}/SKILL.md`);
const fmScalars = parseScalars(stripFrontmatter(skillMd));
for (const key of ['name', 'description', 'version', 'license']) {
  if (!fmScalars.has(key)) {
    throw new Error(`MMP_FRONTMATTER_MISSING: ${key}`);
  }
}
if (fmScalars.get('name') !== 'media-make-pdf') {
  throw new Error('MMP_FRONTMATTER_NAME_MISMATCH');
}
if (!/^\d+\.\d+\.\d+$/.test(fmScalars.get('version'))) {
  throw new Error('MMP_FRONTMATTER_VERSION_INVALID');
}

const lineage = contents.get(`${skill}/LINEAGE.yml`);
const lineageScalars = parseScalars(lineage);
const lineageFields = [
  'schema_version',
  'skill_id',
  'version',
  'lifecycle_state',
  'execution_scope',
  'content_origin',
  'derivation_mode',
  'external_fragments_reused',
  'publication_authority',
];
if (!/^authority_refs:\s*$/m.test(lineage) && !/^authority_refs:\s*\S/m.test(lineage)) {
  throw new Error('MMP_LINEAGE_MISSING: authority_refs');
}
if (!/- skills\/vendor\/gstack\/make-pdf\/SKILL\.md/.test(lineage)) {
  throw new Error('MMP_LINEAGE_AUTHORITY_REF_MISSING');
}
if (!/- core\/contracts\/creation-v3\.ts/.test(lineage)) {
  throw new Error('MMP_LINEAGE_AUTHORITY_REF_MISSING');
}
for (const key of lineageFields) {
  if (!lineageScalars.has(key)) {
    throw new Error(`MMP_LINEAGE_MISSING: ${key}`);
  }
}
if (lineageScalars.get('skill_id') !== 'media-make-pdf') {
  throw new Error('MMP_LINEAGE_SKILL_ID_MISMATCH');
}
if (lineageScalars.get('external_fragments_reused') !== 'false') {
  throw new Error('MMP_LINEAGE_EXTERNAL_FRAGMENTS_NOT_FALSE');
}
if (lineageScalars.get('publication_authority') !== 'false') {
  throw new Error('MMP_LINEAGE_PUBLICATION_AUTHORITY_NOT_FALSE');
}

const parseYamlKeys = (src) => {
  const out = new Map();
  for (const line of src.split('\n')) {
    if (/^\s*#/.test(line)) continue;
    const m = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (m) out.set(m[1], m[2].trim());
  }
  return out;
};

const positive = contents.get(`${skill}/fixtures/positive/case-01.yml`);
const positiveKeys = parseYamlKeys(positive);
for (const key of ['name', 'scenario', 'expected_behavior']) {
  if (!positiveKeys.has(key)) {
    throw new Error(`MMP_POSITIVE_FIXTURE_MISSING: ${key}`);
  }
}

const negative = contents.get(`${skill}/fixtures/negative/case-01.yml`);
const negativeKeys = parseYamlKeys(negative);
for (const key of ['name', 'scenario', 'violation']) {
  if (!negativeKeys.has(key)) {
    throw new Error(`MMP_NEGATIVE_FIXTURE_MISSING: ${key}`);
  }
}
const violationValue = negativeKeys.get('violation');
if (!violationValue || violationValue === '') {
  throw new Error('MMP_NEGATIVE_VIOLATION_EMPTY');
}

const runtime = contents.get(`${skill}/receipts/runtime-boundary.yml`);
const runtimeKeys = parseYamlKeys(runtime);
if (runtimeKeys.get('network_allowed') !== 'false') {
  throw new Error('MMP_RUNTIME_NETWORK_NOT_FALSE');
}
if (runtimeKeys.get('execution_boundary') !== 'requires_user_confirmation') {
  throw new Error('MMP_RUNTIME_BOUNDARY_INVALID');
}

const scanSources = [
  skillMd,
  lineage,
  positive,
  negative,
  runtime,
  read(`${skill}/scripts/check-skill.mjs`),
];
const scanned = scanSources.join('\n');

const forbiddenApis = [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
];
for (const pattern of forbiddenApis) {
  if (pattern.test(scanned)) {
    throw new Error(`MMP_FORBIDDEN_API: ${String(pattern)}`);
  }
}

const prefixSlashUsers = String.fromCharCode(47, 85, 115, 101, 114, 115, 47);
const prefixHome = String.fromCharCode(47, 104, 111, 109, 101, 47);
const prefixWin = String.fromCharCode(67, 58, 92, 85, 115, 101, 114, 115, 92);
for (const prefix of [prefixSlashUsers, prefixHome, prefixWin]) {
  if (scanned.includes(prefix)) {
    throw new Error('MMP_FORBIDDEN_ABSOLUTE_PATH_PREFIX');
  }
}

console.info(
  `PASS media-make-pdf: ${required.length} governed resources, fail-closed boundary verified.`,
);
