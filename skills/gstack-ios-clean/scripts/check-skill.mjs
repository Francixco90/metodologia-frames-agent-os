import {readFileSync, existsSync, statSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = join(__dirname, '..');

const required = [
  'SKILL.md',
  'LINEAGE.yml',
  'fixtures/positive',
  'fixtures/negative',
  'scripts/check-skill.mjs',
  'receipts/runtime-boundary.yml',
];

const lineageFields = [
  'schema_version',
  'skill_id',
  'version',
  'lifecycle_state',
  'execution_scope',
  'content_origin',
  'derivation_mode',
  'authority_refs',
  'external_fragments_reused',
  'publication_authority',
];

// Build forbidden strings from char-code arrays so the checker does not
// self-trip when scanning its own source text.
const fromCodes = (arr) => String.fromCharCode(...arr);
const forbiddenTokens = [
  fromCodes([77, 97, 116, 104, 46, 114, 97, 110, 100, 111, 109]),
  fromCodes([68, 97, 116, 101, 46, 110, 111, 119]),
  fromCodes([110, 101, 119, 32, 68, 97, 116, 101]),
  fromCodes([102, 101, 116, 99, 104, 40]),
  fromCodes([115, 101, 116, 84, 105, 109, 101, 111, 117, 116]),
  fromCodes([115, 101, 116, 73, 110, 116, 101, 114, 118, 97, 108]),
];
const forbiddenPaths = [
  fromCodes([47, 85, 115, 101, 114, 115, 47]),
  fromCodes([47, 104, 111, 109, 101, 47]),
  fromCodes([67, 58, 92, 85, 115, 101, 114, 115, 92]),
];

const failures = [];
const fail = (msg) => failures.push(msg);

// 1. Required files/dirs exist
for (const rel of required) {
  const abs = join(skillRoot, rel);
  if (!existsSync(abs)) {
    fail(`missing required path: ${rel}`);
    continue;
  }
  if (rel.includes('.')) {
    if (!statSync(abs).isFile()) fail(`expected file at ${rel}, found directory`);
  } else {
    if (!statSync(abs).isDirectory()) fail(`expected directory at ${rel}, found file`);
  }
}

// 2. SKILL.md token scan
const skillPath = join(skillRoot, 'SKILL.md');
if (existsSync(skillPath)) {
  const skill = readFileSync(skillPath, 'utf8');
  const checks = [
    ['name: gstack-ios-clean', skill.includes('name: gstack-ios-clean')],
    [
      'license: LicenseRef-MetodologIA-Internal',
      skill.includes('license: LicenseRef-MetodologIA-Internal'),
    ],
    ['execution_scope: local-evaluation', skill.includes('execution_scope: local-evaluation')],
    ['model_agnostic: true', skill.includes('model_agnostic: true')],
  ];
  for (const [label, ok] of checks) {
    if (!ok) fail(`SKILL.md missing token: ${label}`);
  }
  const descLine = skill.split('\n').find((l) => l.startsWith('description:'));
  if (!descLine || !descLine.includes('This skill should be used when')) {
    fail('SKILL.md description must start with "This skill should be used when"');
  }
  for (const tok of forbiddenTokens) {
    if (skill.includes(tok)) fail(`SKILL.md contains forbidden token: ${tok}`);
  }
  for (const pref of forbiddenPaths) {
    if (skill.includes(pref)) fail(`SKILL.md contains forbidden absolute path prefix: ${pref}`);
  }
}

// 3. LINEAGE.yml 10 fields
const lineagePath = join(skillRoot, 'LINEAGE.yml');
if (existsSync(lineagePath)) {
  const lineage = readFileSync(lineagePath, 'utf8');
  for (const field of lineageFields) {
    const re = new RegExp(`^${field}:`, 'm');
    if (!re.test(lineage)) fail(`LINEAGE.yml missing field: ${field}`);
  }
}

// 4. Runtime boundary 2 fields
const boundaryPath = join(skillRoot, 'receipts/runtime-boundary.yml');
if (existsSync(boundaryPath)) {
  const boundary = readFileSync(boundaryPath, 'utf8');
  if (!/^network_allowed:/m.test(boundary))
    fail('runtime-boundary.yml missing field: network_allowed');
  if (!/^execution_boundary:/m.test(boundary))
    fail('runtime-boundary.yml missing field: execution_boundary');
}

// 5. Self-check: forbidden tokens in checker source
const self = readFileSync(fileURLToPath(import.meta.url), 'utf8');
for (const tok of forbiddenTokens) {
  if (self.includes(tok)) fail(`check-skill.mjs contains forbidden token: ${tok}`);
}
for (const pref of forbiddenPaths) {
  if (self.includes(pref)) fail(`check-skill.mjs contains forbidden absolute path prefix: ${pref}`);
}

if (failures.length > 0) {
  for (const m of failures) console.error('FAIL: ' + m);
  process.exit(1);
}
console.log('PASS gstack-ios-clean');
process.exit(0);
