import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;
const fail = (msg) => {
  console.error('FAIL: ' + msg);
  failures++;
};

const required = ['SKILL.md', 'LINEAGE.yml', 'receipts/runtime-boundary.yml'];
for (const rel of required) {
  if (!existsSync(join(ROOT, rel))) fail('missing required file: ' + rel);
}

const posPath = join(ROOT, 'fixtures/positive/case-01.yml');
const negPath = join(ROOT, 'fixtures/negative/case-01.yml');
if (!existsSync(posPath)) fail('missing positive fixture');
if (!existsSync(negPath)) fail('missing negative fixture');

function parseFrontmatterScalar(text, key) {
  const re = new RegExp('^' + key + ':\\s*(.+)$', 'm');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function parseYamlScalar(text, key) {
  const re = new RegExp('^' + key + ':\\s*(.+)$', 'm');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function parseYamlList(text, key) {
  const lines = text.split('\n');
  const out = [];
  let capturing = false;
  for (const line of lines) {
    if (line.startsWith(key + ':')) {
      capturing = true;
      continue;
    }
    if (capturing) {
      if (/^\s+-\s/.test(line)) {
        out.push(line.replace(/^\s+-\s/, '').trim());
      } else if (/^\S/.test(line) && line.trim() !== '') {
        break;
      }
    }
  }
  return out;
}

const skillText = existsSync(join(ROOT, 'SKILL.md'))
  ? readFileSync(join(ROOT, 'SKILL.md'), 'utf8')
  : '';
const fmScalars = ['name', 'description', 'version', 'license'];
for (const key of fmScalars) {
  const val = parseFrontmatterScalar(skillText, key);
  if (!val) fail('SKILL.md frontmatter missing scalar: ' + key);
}

const lineageText = existsSync(join(ROOT, 'LINEAGE.yml'))
  ? readFileSync(join(ROOT, 'LINEAGE.yml'), 'utf8')
  : '';
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
  if (!parseYamlScalar(lineageText, key)) fail('LINEAGE.yml missing field: ' + key);
}
const authorityRefs = parseYamlList(lineageText, 'authority_refs');
if (authorityRefs.length < 1) fail('LINEAGE.yml missing authority_refs entries');

if (existsSync(posPath)) {
  const t = readFileSync(posPath, 'utf8');
  if (!parseYamlScalar(t, 'name')) fail('positive fixture missing name');
  if (!parseYamlScalar(t, 'scenario')) fail('positive fixture missing scenario');
  if (!parseYamlScalar(t, 'expected_behavior')) fail('positive fixture missing expected_behavior');
}

if (existsSync(negPath)) {
  const t = readFileSync(negPath, 'utf8');
  if (!parseYamlScalar(t, 'name')) fail('negative fixture missing name');
  if (!parseYamlScalar(t, 'scenario')) fail('negative fixture missing scenario');
  if (!parseYamlScalar(t, 'expected_behavior')) fail('negative fixture missing expected_behavior');
  const violationRe = /^violation:\s*>\s*\n([\s\S]*?)(?:\n\S|\n?$)/m;
  if (!violationRe.test(t)) fail('negative fixture missing violation folded scalar');
}

const rbPath = join(ROOT, 'receipts/runtime-boundary.yml');
if (existsSync(rbPath)) {
  const t = readFileSync(rbPath, 'utf8');
  const na = parseYamlScalar(t, 'network_allowed');
  if (na !== 'false') fail('runtime-boundary network_allowed must be false');
  const eb = parseYamlScalar(t, 'execution_boundary');
  if (eb !== 'requires_user_confirmation')
    fail('runtime-boundary execution_boundary must be requires_user_confirmation');
}

const forbidden = [
  String.fromCharCode(77, 97, 116, 104, 46, 114, 97, 110, 100, 111, 109),
  String.fromCharCode(68, 97, 116, 101, 46, 110, 111, 119),
  String.fromCharCode(110, 101, 119, 32, 68, 97, 116, 101),
  String.fromCharCode(102, 101, 116, 99, 104),
  String.fromCharCode(115, 101, 116, 84, 105, 109, 101, 111, 117, 116),
  String.fromCharCode(115, 101, 116, 73, 110, 116, 101, 114, 118, 97, 108),
  String.fromCharCode(47, 85, 115, 101, 114, 115, 47),
  String.fromCharCode(47, 104, 111, 109, 101, 47),
  String.fromCharCode(67, 58, 92, 85, 115, 101, 114, 115, 92),
];
const selfText = readFileSync(new URL(import.meta.url), 'utf8');
for (const tok of forbidden) {
  if (selfText.includes(tok)) fail('forbidden token present in checker source: ' + tok);
}

if (failures > 0) {
  console.error('check-skill: ' + failures + ' failure(s)');
  process.exit(1);
}
console.log('PASS check-skill: web-crawl4ai');
process.exit(0);
