// Self-contained checker for context-schema-aware-db skill.
// Node ESM, node:* built-ins only. No vendor imports.
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(__dirname, '..');

// ---- Forbidden tokens in source code ----
// Construct forbidden absolute-path prefixes from char codes so this checker
// does not self-trip on its own forbidden-pattern detection.
const slash = String.fromCharCode(47); // "/"
const colon = String.fromCharCode(58); // ":"
const usersPrefix = slash + String.fromCharCode(85, 115, 101, 114, 115) + slash; // "/Users/"
const homePrefix = slash + String.fromCharCode(104, 111, 109, 101) + slash; // "/home/"
const winPrefix =
  String.fromCharCode(67) + colon + String.fromCharCode(92, 85, 115, 101, 114, 115, 92); // "C:\Users\"
const forbiddenTokens = [
  'Math.random',
  'Date.now',
  'new Date',
  'fetch',
  'setTimeout',
  'setInterval',
  usersPrefix,
  homePrefix,
  winPrefix,
];

// ---- Required files ----
const required = [
  'SKILL.md',
  'LINEAGE.yml',
  'receipts/runtime-boundary.yml',
  'fixtures/positive/case-01.yml',
  'fixtures/negative/case-01.yml',
];

// ---- Tiny YAML parser (enough for our fixtures) ----
function parseYAML(text) {
  const result = {};
  let currentKey = null;
  let inFolded = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    // folded scalar continuation
    if (inFolded && /^\s+>\s*$/.test(line) === false && /^\s+\S/.test(line)) {
      // continuation of folded scalar
      if (currentKey && typeof result[currentKey] === 'string') {
        result[currentKey] += ' ' + line.trim();
      }
      continue;
    }
    const m = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (m) {
      const key = m[1];
      const val = m[2].trim();
      currentKey = key;
      if (val === '' || val === '>') {
        // folded scalar starts here
        result[key] = '';
        inFolded = val === '>';
      } else {
        result[key] = val.replace(/^["']|["']$/g, '');
        inFolded = false;
      }
    } else if (inFolded && /^\s+>\s*$/.test(line)) {
      // marker only, ignore
      continue;
    }
  }
  return result;
}

function readText(rel) {
  const p = join(skillDir, rel);
  return readFileSync(p, 'utf8');
}

function fail(msg) {
  console.error('FAIL: ' + msg);
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) fail(msg);
}

// ---- Check required files exist ----
for (const rel of required) {
  const p = join(skillDir, rel);
  if (!existsSync(p)) fail('Missing required file: ' + rel);
}

// ---- Check no forbidden tokens in any source file ----
function scanForbidden(rel) {
  const text = readText(rel);
  for (const tok of forbiddenTokens) {
    if (text.includes(tok)) {
      fail("Forbidden token '" + tok + "' found in " + rel);
    }
  }
}

// Scan all files in skill dir (excluding this script itself)
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p);
    } else if (st.isFile()) {
      // skip self
      if (p === resolve(__dirname, 'check-skill.mjs')) continue;
      scanForbidden(join(dir, name).slice(skillDir.length + 1));
    }
  }
}
walk(skillDir);

// ---- Frontmatter check (4 scalar fields: name, version, license, description) ----
const skillText = readText('SKILL.md');
const fmMatch = skillText.match(/^---\n([\s\S]*?)\n---/);
assert(fmMatch, 'SKILL.md missing frontmatter block');
const fmText = fmMatch[1];
for (const field of ['name', 'version', 'license', 'description']) {
  const re = new RegExp('^' + field + '\\s*:\\s*\\S', 'm');
  assert(re.test(fmText), 'SKILL.md frontmatter missing scalar field: ' + field);
}

// ---- LINEAGE check (10 fields) ----
const lineageText = readText('LINEAGE.yml');
const lineage = parseYAML(lineageText);
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
for (const f of lineageFields) {
  assert(Object.prototype.hasOwnProperty.call(lineage, f), 'LINEAGE.yml missing field: ' + f);
}

// ---- Fixtures parse + negative has violation ----
const posText = readText('fixtures/positive/case-01.yml');
const pos = parseYAML(posText);
assert(pos.name, 'positive fixture missing name');
assert(pos.scenario, 'positive fixture missing scenario');
assert(pos.expected_behavior, 'positive fixture missing expected_behavior');

const negText = readText('fixtures/negative/case-01.yml');
const neg = parseYAML(negText);
assert(neg.name, 'negative fixture missing name');
assert(neg.scenario, 'negative fixture missing scenario');
assert(
  Object.prototype.hasOwnProperty.call(neg, 'violation'),
  'negative fixture missing violation (folded scalar)',
);

// ---- Runtime boundary receipt ----
const rbText = readText('receipts/runtime-boundary.yml');
const rb = parseYAML(rbText);
assert(
  rb.network_allowed === 'false' || rb.network_allowed === false,
  'runtime-boundary.yml network_allowed must be false',
);
assert(
  rb.execution_boundary === 'requires_user_confirmation',
  'runtime-boundary.yml execution_boundary must be requires_user_confirmation',
);

console.log('PASS');
process.exit(0);
