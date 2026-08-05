import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'context-setup-gbrain';

const required = [
  `skills/${id}/SKILL.md`,
  `skills/${id}/LINEAGE.yml`,
  `skills/${id}/receipts/runtime-boundary.yml`,
  `skills/${id}/fixtures/positive/case-01.yml`,
  `skills/${id}/fixtures/negative/case-01.yml`,
];

// Read all required files (throws if missing).
const contents = new Map(required.map((p) => [p, readFileSync(resolve(root, p), 'utf8')]));
const combined = [...contents.values()].join('\n');

// Contract tokens that must appear somewhere in the governed files.
for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'Derivada de setup-gbrain',
  'fail-closed',
  'coverage_gap',
]) {
  if (!combined.includes(token)) {
    throw new Error(`${id.toUpperCase()}_CONTRACT_MISSING: ${token}`);
  }
}

// Skill-specific tokens.
for (const token of [id, 'global brain', 'bootstrap', 'store']) {
  if (!combined.includes(token)) {
    throw new Error(`${id.toUpperCase()}_SKILL_TOKEN_MISSING: ${token}`);
  }
}

// Forbidden APIs and absolute paths.
for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
  /\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u,
]) {
  if (pattern.test(combined)) {
    throw new Error(`${id.toUpperCase()}_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// --- Minimal YAML reader (only what these fixtures need) ---
function parseSimpleYaml(text) {
  const result = {};
  let lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // skip blank / comment
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) {
      i += 1;
      continue;
    }
    const match = line.match(/^(\w[\w-]*):\s*(.*)$/u);
    if (!match) {
      i += 1;
      continue;
    }
    const key = match[1];
    const rest = match[2];
    if (rest === '>' || rest === '|') {
      // folded / literal block: collect indented following lines
      const block = [];
      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (/^\s+/.test(next) || /^\s*$/.test(next)) {
          block.push(next.replace(/^\s+/, ''));
          i += 1;
        } else {
          break;
        }
      }
      result[key] = block.join(' ').trim();
    } else {
      result[key] = rest.trim();
      i += 1;
    }
  }
  return result;
}

// --- Assert SKILL.md frontmatter has 4 top-level fields ---
const skillText = contents.get(`skills/${id}/SKILL.md`);
const fmMatch = skillText.match(/^---\n([\s\S]*?)\n---/u);
if (!fmMatch) {
  throw new Error(`${id.toUpperCase()}_FRONTMATTER_MISSING`);
}
const fmText = fmMatch[1];
const fmFields = ['name', 'description', 'version', 'license'];
for (const f of fmFields) {
  const re = new RegExp(`^${f}:`, 'mu');
  if (!re.test(fmText)) {
    throw new Error(`${id.toUpperCase()}_FRONTMATTER_FIELD_MISSING: ${f}`);
  }
}

// --- Assert LINEAGE.yml has 5 fields ---
const lineageText = contents.get(`skills/${id}/LINEAGE.yml`);
const lineageFields = [
  'content_origin',
  'derivation_mode',
  'external_fragments_reused',
  'publication_authority',
  'authority_refs',
];
for (const f of lineageFields) {
  const re = new RegExp(`^${f}:`, 'mu');
  if (!re.test(lineageText)) {
    throw new Error(`${id.toUpperCase()}_LINEAGE_FIELD_MISSING: ${f}`);
  }
}

// --- Assert fixtures parse as YAML and have required keys ---
const posText = contents.get(`skills/${id}/fixtures/positive/case-01.yml`);
const negText = contents.get(`skills/${id}/fixtures/negative/case-01.yml`);

const pos = parseSimpleYaml(posText);
const neg = parseSimpleYaml(negText);

for (const k of ['name', 'scenario', 'expected_behavior']) {
  if (!(k in pos) || !pos[k]) {
    throw new Error(`${id.toUpperCase()}_POSITIVE_FIXTURE_MISSING_KEY: ${k}`);
  }
}
if (!('violation' in neg) || !neg.violation) {
  throw new Error(`${id.toUpperCase()}_NEGATIVE_FIXTURE_MISSING_VIOLATION`);
}

console.info(`PASS ${id}: ${required.length} governed resources, clean-room, fail-closed.`);
