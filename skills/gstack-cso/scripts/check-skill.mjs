import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;
const fail = (msg) => {
  console.error('FAIL: ' + msg);
  failures++;
};

const required = [
  'SKILL.md',
  'LINEAGE.yml',
  'fixtures/positive',
  'fixtures/negative',
  'scripts/check-skill.mjs',
  'receipts/runtime-boundary.yml',
];
for (const rel of required) {
  if (!existsSync(join(ROOT, rel))) fail('missing required path: ' + rel);
}

const skillPath = join(ROOT, 'SKILL.md');
const skillText = existsSync(skillPath) ? readFileSync(skillPath, 'utf8') : '';

const skillChecks = [
  {token: 'name: gstack-cso', label: 'SKILL.md name'},
  {token: 'license: LicenseRef-MetodologIA-Internal', label: 'SKILL.md license'},
  {token: 'execution_scope: local-evaluation', label: 'SKILL.md execution_scope'},
  {token: 'model_agnostic: true', label: 'SKILL.md model_agnostic'},
];
for (const {token, label} of skillChecks) {
  if (!skillText.includes(token)) fail(label + ' missing or wrong: ' + token);
}

const descRe = /^description:\s*This skill should be used when/m;
if (!descRe.test(skillText)) {
  fail('SKILL.md description must start with "This skill should be used when"');
}

const lineagePath = join(ROOT, 'LINEAGE.yml');
const lineageText = existsSync(lineagePath) ? readFileSync(lineagePath, 'utf8') : '';
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
for (const key of lineageFields) {
  const re = new RegExp('^' + key + ':\\s*\\S+', 'm');
  if (!re.test(lineageText)) fail('LINEAGE.yml missing field: ' + key);
}
const authorityRe = /^authority_refs:\s*\n(\s+-\s.+\n?){1,}/m;
if (!authorityRe.test(lineageText)) {
  fail('LINEAGE.yml missing authority_refs entries');
}
if (lineageText.split('\n').filter((l) => l.startsWith('  -')).length < 1) {
  fail('LINEAGE.yml authority_refs has no entries');
}

const rbPath = join(ROOT, 'receipts/runtime-boundary.yml');
if (existsSync(rbPath)) {
  const t = readFileSync(rbPath, 'utf8');
  const naRe = /^network_allowed:\s*(\S+)/m;
  const na = naRe.exec(t);
  if (!na || na[1] !== 'false') {
    fail('runtime-boundary network_allowed must be false');
  }
  const ebRe = /^execution_boundary:\s*(\S+)/m;
  const eb = ebRe.exec(t);
  if (!eb || eb[1] !== 'requires_user_confirmation') {
    fail('runtime-boundary execution_boundary must be requires_user_confirmation');
  }
} else {
  fail('runtime-boundary.yml missing');
}

const negPath = join(ROOT, 'fixtures/negative/case-01.yml');
if (existsSync(negPath)) {
  const t = readFileSync(negPath, 'utf8');
  const violationRe = /^violation:\s*>\s*\n([\s\S]*?)(?:\n\S|\n?$)/m;
  if (!violationRe.test(t)) {
    fail('negative fixture missing violation folded scalar');
  }
}

const forbidden = [
  String.fromCharCode(77, 97, 116, 104, 46, 114, 97, 110, 100, 111, 109),
  String.fromCharCode(68, 97, 116, 101, 46, 110, 111, 119),
  String.fromCharCode(110, 101, 119, 32, 68, 97, 116, 101),
  String.fromCharCode(102, 101, 116, 99, 104, 40),
  String.fromCharCode(115, 101, 116, 84, 105, 109, 101, 111, 117, 116),
  String.fromCharCode(115, 101, 116, 73, 110, 116, 101, 114, 118, 97, 108),
  String.fromCharCode(47, 85, 115, 101, 114, 115, 47),
  String.fromCharCode(47, 104, 111, 109, 101, 47),
  String.fromCharCode(67, 58, 92, 85, 115, 101, 114, 115, 92),
];
const selfText = readFileSync(new URL(import.meta.url), 'utf8');
for (const tok of forbidden) {
  if (selfText.includes(tok)) {
    fail('forbidden token present in checker source: ' + tok);
  }
}

const allText = [
  skillText,
  lineageText,
  existsSync(rbPath) ? readFileSync(rbPath, 'utf8') : '',
  existsSync(join(ROOT, 'fixtures/positive/case-01.yml'))
    ? readFileSync(join(ROOT, 'fixtures/positive/case-01.yml'), 'utf8')
    : '',
  existsSync(negPath) ? readFileSync(negPath, 'utf8') : '',
].join('\n');
for (const tok of forbidden) {
  if (allText.includes(tok)) {
    fail('forbidden token present in skill content: ' + tok);
  }
}

if (failures > 0) {
  console.error('check-skill: ' + failures + ' failure(s)');
  process.exit(1);
}
console.log('PASS check-skill: gstack-cso');
process.exit(0);
