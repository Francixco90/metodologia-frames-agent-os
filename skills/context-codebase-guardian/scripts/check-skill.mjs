import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'context-codebase-guardian';
const required = [
  `skills/${id}/SKILL.md`,
  `skills/${id}/LINEAGE.yml`,
  `skills/${id}/receipts/runtime-boundary.yml`,
  `skills/${id}/fixtures/positive/case-01.yml`,
  `skills/${id}/fixtures/negative/case-01.yml`,
];

const contents = new Map();
for (const p of required) {
  try {
    contents.set(p, readFileSync(resolve(root, p), 'utf8'));
  } catch {
    console.error(`FAIL ${id}: missing required file ${p}`);
    process.exit(1);
  }
}

const combined = [...contents.values()].join('\n');

// --- SKILL.md frontmatter: 4 scalar fields ---
const skillMd = contents.get(`skills/${id}/SKILL.md`);
const fmMatch = skillMd.match(/^---\n([\s\S]*?)\n---/u);
if (!fmMatch) {
  console.error(`FAIL ${id}: SKILL.md missing frontmatter block`);
  process.exit(1);
}
const fm = fmMatch[1];
for (const f of ['name', 'description', 'version', 'license']) {
  const re = new RegExp(`^${f}:`, 'mu');
  if (!re.test(fm)) {
    console.error(`FAIL ${id}: frontmatter missing scalar field ${f}`);
    process.exit(1);
  }
}

// --- LINEAGE.yml: 10 fields ---
const lineage = contents.get(`skills/${id}/LINEAGE.yml`);
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
  const re = new RegExp(`^${f}:`, 'mu');
  if (!re.test(lineage)) {
    console.error(`FAIL ${id}: LINEAGE missing field ${f}`);
    process.exit(1);
  }
}

// --- Minimal YAML parser (key: value, folded > blocks, list items) ---
function parseSimpleYAML(text) {
  const result = {};
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      i += 1;
      continue;
    }
    const kv = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/u);
    if (!kv) {
      i += 1;
      continue;
    }
    const key = kv[1];
    const rest = kv[2];
    if (rest === '>' || rest === '|') {
      const block = [];
      i += 1;
      while (i < lines.length) {
        const bl = lines[i];
        if (bl === '') {
          i += 1;
          continue;
        }
        if (bl.startsWith(' ') || bl.startsWith('\t')) {
          block.push(bl.trim());
          i += 1;
        } else {
          break;
        }
      }
      result[key] = block.join(' ');
    } else if (rest === '') {
      const items = [];
      i += 1;
      while (i < lines.length) {
        const il = lines[i];
        const it = il.trim();
        if (it.startsWith('- ')) {
          items.push(it.slice(2));
          i += 1;
        } else if (it === '') {
          i += 1;
        } else {
          break;
        }
      }
      if (items.length > 0) result[key] = items;
    } else {
      result[key] = rest;
      i += 1;
    }
  }
  return result;
}

// --- Fixtures parse as YAML with expected keys ---
const posPath = `skills/${id}/fixtures/positive/case-01.yml`;
const negPath = `skills/${id}/fixtures/negative/case-01.yml`;

let posParsed;
let negParsed;
try {
  posParsed = parseSimpleYAML(contents.get(posPath));
} catch {
  console.error(`FAIL ${id}: positive fixture YAML parse error`);
  process.exit(1);
}
try {
  negParsed = parseSimpleYAML(contents.get(negPath));
} catch {
  console.error(`FAIL ${id}: negative fixture YAML parse error`);
  process.exit(1);
}

if (!posParsed.name || !posParsed.scenario || !posParsed.expected_behavior) {
  console.error(`FAIL ${id}: positive fixture missing keys (name, scenario, expected_behavior)`);
  process.exit(1);
}

if (!('violation' in negParsed)) {
  console.error(`FAIL ${id}: negative fixture missing violation key`);
  process.exit(1);
}

// --- runtime-boundary.yml values present ---
const rbPath = `skills/${id}/receipts/runtime-boundary.yml`;
const rbParsed = parseSimpleYAML(contents.get(rbPath));
if (rbParsed.network_allowed !== 'false') {
  console.error(`FAIL ${id}: runtime-boundary network_allowed must be false`);
  process.exit(1);
}
if (rbParsed.execution_boundary !== 'requires_user_confirmation') {
  console.error(
    `FAIL ${id}: runtime-boundary execution_boundary must be requires_user_confirmation`,
  );
  process.exit(1);
}

// --- Contract tokens present ---
for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'Derivada de',
  'fail-closed',
  'coverage_gap',
]) {
  if (!combined.includes(token)) {
    console.error(`FAIL ${id}: contract missing token ${token}`);
    process.exit(1);
  }
}

// --- Forbidden API patterns in governed content (names built from char codes) ---
function cc(...codes) {
  return String.fromCharCode(...codes);
}
const dot = cc(46);
const wsp = '\\s*';
const wsp1 = '\\s+';
const lp = '\\(';
const wb = '\\b';
const forbiddenApiRegexes = [
  new RegExp(
    wb + cc(77, 97, 116, 104) + '\\' + dot + cc(114, 97, 110, 100, 111, 109) + wsp + lp,
    'u',
  ),
  new RegExp(wb + cc(68, 97, 116, 101) + '\\' + dot + cc(110, 111, 119) + wsp + lp, 'u'),
  new RegExp(wb + cc(110, 101, 119) + wsp1 + cc(68, 97, 116, 101) + wsp + lp, 'u'),
  new RegExp(wb + cc(102, 101, 116, 99, 104) + wsp + lp, 'u'),
  new RegExp(wb + cc(115, 101, 116, 84, 105, 109, 101, 111, 117, 116) + wsp + lp, 'u'),
  new RegExp(wb + cc(115, 101, 116, 73, 110, 116, 101, 114, 118, 97, 108) + wsp + lp, 'u'),
];
for (const re of forbiddenApiRegexes) {
  if (re.test(combined)) {
    console.error(`FAIL ${id}: forbidden API call detected in governed content`);
    process.exit(1);
  }
}

// --- Forbidden absolute path prefixes (each prefix fully built from char codes) ---
const forbiddenPathPrefixes = [
  String.fromCharCode(47, 85, 115, 101, 114, 115, 47),
  String.fromCharCode(47, 104, 111, 109, 101, 47),
  String.fromCharCode(67, 58, 92, 85, 115, 101, 114, 115, 92),
];
for (const prefix of forbiddenPathPrefixes) {
  if (combined.includes(prefix)) {
    console.error(`FAIL ${id}: forbidden absolute path prefix detected`);
    process.exit(1);
  }
}

console.info(
  `PASS ${id}: ${required.length} governed resources, frontmatter + LINEAGE + fixtures valid, fail-closed.`,
);
