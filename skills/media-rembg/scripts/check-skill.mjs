// media-rembg self-checker — self-contained Node ESM, node:* built-ins only.
// Verifies skill scaffolding, frontmatter, LINEAGE, fixtures, runtime boundary.
// Exit 0 PASS / non-zero FAIL.
import {readFileSync, existsSync, statSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = join(__dirname, '..');

const required = [
  'SKILL.md',
  'LINEAGE.yml',
  'receipts/runtime-boundary.yml',
  'fixtures/positive/case-01.yml',
  'fixtures/negative/case-01.yml',
];

const failures = [];
const ok = (msg) => console.log('PASS ' + msg);
const fail = (msg) => {
  failures.push(msg);
  console.log('FAIL ' + msg);
};

// --- 1. required files exist ---
for (const rel of required) {
  const abs = join(skillRoot, rel);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    fail('missing required file: ' + rel);
  } else {
    ok('exists: ' + rel);
  }
}
if (failures.length > 0) {
  console.error('CHECKER FAILED — missing files');
  process.exit(1);
}

// --- 2. minimal YAML parser (sufficient for these flat fixtures) ---
// Supports: top-level `key: scalar`, `key: >` folded block, `key:` mapping.
function parseSimpleYaml(text) {
  const obj = {};
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) {
      i += 1;
      continue;
    }
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) {
      i += 1;
      continue;
    }
    const m = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (!m) {
      i += 1;
      continue;
    }
    const key = m[1];
    const rest = m[2];
    if (rest === '>') {
      // folded block: collect following indented lines as one string
      const collected = [];
      i += 1;
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        collected.push(lines[i].replace(/^\s+/, ''));
        i += 1;
      }
      obj[key] = collected.join(' ');
      continue;
    }
    if (rest === '') {
      // could be mapping or list; collect indented block as nested
      const nested = {};
      i += 1;
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        const nline = lines[i];
        const nm = nline.match(/^\s+(- )?([\w][\w-]*)\s*:\s*(.*)$/);
        if (nm) {
          nested[nm[2]] = nm[3];
        }
        i += 1;
      }
      obj[key] = Object.keys(nested).length > 0 ? nested : null;
      continue;
    }
    obj[key] = rest.replace(/^['"]|['"]$/g, '');
    i += 1;
  }
  return obj;
}

function readYaml(rel) {
  const abs = join(skillRoot, rel);
  return parseSimpleYaml(readFileSync(abs, 'utf8'));
}

// --- 3. SKILL.md frontmatter: 4 scalar fields ---
const skillText = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
const fmMatch = skillText.match(/^---\n([\s\S]*?)\n---/);
if (!fmMatch) {
  fail('SKILL.md missing frontmatter block');
} else {
  const fm = parseSimpleYaml(fmMatch[1]);
  const scalars = ['name', 'description', 'version', 'license'];
  for (const k of scalars) {
    const v = fm[k];
    if (typeof v !== 'string' || v.length === 0) {
      fail('SKILL.md frontmatter scalar missing/empty: ' + k);
    } else {
      ok('SKILL.md frontmatter: ' + k + '=' + (v.length > 40 ? v.slice(0, 40) + '...' : v));
    }
  }
}

// --- 4. LINEAGE: 10 fields ---
const lineage = readYaml('LINEAGE.yml');
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
let lineageMissing = 0;
for (const f of lineageFields) {
  if (!(f in lineage)) {
    fail('LINEAGE missing field: ' + f);
    lineageMissing += 1;
  }
}
if (lineageMissing === 0) {
  ok('LINEAGE has all 10 fields');
}
if (lineage.skill_id !== 'media-rembg') {
  fail('LINEAGE skill_id != media-rembg (got ' + lineage.skill_id + ')');
} else {
  ok('LINEAGE skill_id=media-rembg');
}
if (String(lineage.external_fragments_reused) !== 'false') {
  fail('LINEAGE external_fragments_reused must be false');
} else {
  ok('LINEAGE external_fragments_reused=false');
}

// --- 5. fixtures parse YAML ---
const pos = readYaml('fixtures/positive/case-01.yml');
const neg = readYaml('fixtures/negative/case-01.yml');
if (!pos.name || !pos.scenario || !pos.expected_behavior) {
  fail('positive fixture missing name/scenario/expected_behavior');
} else {
  ok('positive fixture parsed: ' + pos.name);
}
if (!neg.name || !neg.scenario) {
  fail('negative fixture missing name/scenario');
} else {
  ok('negative fixture parsed: ' + neg.name);
}
if (!neg.violation || typeof neg.violation !== 'string' || neg.violation.length === 0) {
  fail('negative fixture missing violation folded scalar');
} else {
  ok('negative fixture has violation (' + neg.violation.length + ' chars)');
}

// --- 6. runtime-boundary values ---
const rb = readYaml('receipts/runtime-boundary.yml');
if (String(rb.network_allowed) !== 'false') {
  fail('runtime-boundary network_allowed must be false (got ' + rb.network_allowed + ')');
} else {
  ok('runtime-boundary network_allowed=false');
}
if (rb.execution_boundary !== 'requires_user_confirmation') {
  fail('runtime-boundary execution_boundary must be requires_user_confirmation');
} else {
  ok('runtime-boundary execution_boundary=requires_user_confirmation');
}

// --- 7. SKILL.md fail-closed language present ---
const lower = skillText.toLowerCase();
if (!lower.includes('fail-closed')) {
  fail('SKILL.md missing fail-closed language');
} else {
  ok('SKILL.md contains fail-closed');
}
if (!lower.includes('confirmación') && !lower.includes('confirmation')) {
  fail('SKILL.md missing confirmation requirement language');
} else {
  ok('SKILL.md contains confirmation requirement');
}
if (!lower.includes('coverage_gap')) {
  fail('SKILL.md missing coverage_gap note');
} else {
  ok('SKILL.md contains coverage_gap note');
}
const derivLine = 'Derivada de rembg (OpenGHz/rembg-bg-removal, MIT).';
if (!skillText.includes(derivLine)) {
  fail('SKILL.md missing derivation line');
} else {
  ok('SKILL.md has derivation line');
}

// --- 8. self-source forbidden-token scan (guard the guard) ---
// Forbidden substrings must not appear in this checker's own source.
// Every forbidden token (including home-path prefixes) is reconstructed
// from char codes so the literal forbidden strings never appear here.
const sourceSelf = readFileSync(fileURLToPath(import.meta.url), 'utf8');
const fromCodes = (codes) => String.fromCharCode(...codes);
const forbiddenTokens = [
  fromCodes([77, 97, 116, 104, 46, 114, 97, 110, 100, 111, 109]),
  fromCodes([68, 97, 116, 101, 46, 110, 111, 119]),
  fromCodes([110, 101, 119, 32, 68, 97, 116, 101]),
  fromCodes([102, 101, 116, 99, 104]),
  fromCodes([115, 101, 116, 84, 105, 109, 101, 111, 117, 116]),
  fromCodes([115, 101, 116, 73, 110, 116, 101, 114, 118, 97, 108]),
  fromCodes([47, 85, 115, 101, 114, 115, 47]),
  fromCodes([47, 104, 111, 109, 101, 47]),
  fromCodes([67, 58, 92, 85, 115, 101, 114, 115, 92]),
];
for (const tok of forbiddenTokens) {
  if (sourceSelf.includes(tok)) {
    fail('checker source contains forbidden token');
  } else {
    ok('checker source clean of forbidden token');
  }
}

// --- report ---
if (failures.length > 0) {
  console.error('CHECKER FAILED (' + failures.length + ' failures)');
  process.exit(1);
}
console.log('CHECKER PASS — media-rembg skill valid');
process.exit(0);
