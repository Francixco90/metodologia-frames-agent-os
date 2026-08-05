import {readFileSync} from 'node:fs';
import {resolve, join} from 'node:path';

const id = 'context-restore';
const root = process.cwd();
const skillDir = join(root, 'skills', id);

const required = [
  'SKILL.md',
  'LINEAGE.yml',
  'receipts/runtime-boundary.yml',
  'fixtures/positive/case-01.yml',
  'fixtures/negative/case-01.yml',
];

const contents = new Map(required.map((p) => [p, readFileSync(resolve(skillDir, p), 'utf8')]));
const combined = [...contents.values()].join('\n');
const failures = [];

// Forbidden APIs and absolute path literals must be absent across all governed files.
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
    failures.push(`forbidden API or absolute path detected: ${String(pattern)}`);
  }
}

// Governance tokens must be present.
for (const token of [
  'This skill should be used when',
  'lifecycle_state: active',
  'LicenseRef-MetodologIA-Internal',
  'coverage_gap',
  'fail-closed',
  'Derivada de',
]) {
  if (!combined.includes(token)) {
    failures.push(`missing governance token: ${token}`);
  }
}

// SKILL.md frontmatter must declare 4 scalar fields: name, description, version, license.
const skillMd = contents.get('SKILL.md');
const fmMatch = /^---\n([\s\S]*?)\n---/u.exec(skillMd);
if (!fmMatch) {
  failures.push('SKILL.md frontmatter not found');
} else {
  const fm = fmMatch[1];
  const scalars = ['name', 'description', 'version', 'license'];
  const present = scalars.filter((k) => new RegExp(`^${k}:`, 'mu').test(fm));
  if (present.length !== 4) {
    failures.push(`frontmatter expected 4 scalar fields, got ${present.length}`);
  }
}

// LINEAGE.yml must declare 5 top-level fields.
const lineage = contents.get('LINEAGE.yml');
const lineageKeys = [
  'content_origin',
  'derivation_mode',
  'external_fragments_reused',
  'publication_authority',
  'authority_refs',
];
const lineagePresent = lineageKeys.filter((k) => new RegExp(`^${k}:`, 'mu').test(lineage));
if (lineagePresent.length !== 5) {
  failures.push(`LINEAGE expected 5 fields, got ${lineagePresent.length}`);
}

// Minimal YAML parser (node builtins only) for the fixture subset:
// `key: value`, `key: >` folded scalar, `key:` nested list of `- item`.
function parseSimpleYml(text) {
  const lines = text.split('\n');
  const result = {};
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      i += 1;
      continue;
    }
    if (!/^[A-Za-z_]/u.test(raw)) {
      i += 1;
      continue;
    }
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/u.exec(raw);
    if (!m) {
      i += 1;
      continue;
    }
    const key = m[1];
    const rest = m[2];
    if (rest === '') {
      const items = [];
      i += 1;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') {
          i += 1;
          continue;
        }
        if (/^\s/u.test(l)) {
          const t = l.trim();
          if (t.startsWith('- ')) {
            items.push(t.slice(2));
          } else {
            items.push(t);
          }
          i += 1;
        } else {
          break;
        }
      }
      result[key] = items.length > 0 ? items : {};
    } else if (rest === '>' || rest === '>-' || rest === '|') {
      const parts = [];
      i += 1;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') {
          i += 1;
          continue;
        }
        if (/^\s/u.test(l)) {
          parts.push(l.trim());
          i += 1;
        } else {
          break;
        }
      }
      result[key] = parts.join(' ');
    } else if (rest.startsWith('> ')) {
      const parts = [rest.slice(2)];
      i += 1;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') {
          i += 1;
          continue;
        }
        if (/^\s/u.test(l)) {
          parts.push(l.trim());
          i += 1;
        } else {
          break;
        }
      }
      result[key] = parts.join(' ');
    } else if (rest.startsWith('- ')) {
      const items = [rest.slice(2)];
      i += 1;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') {
          i += 1;
          continue;
        }
        const lm = /^\s*-\s+(.*)$/u.exec(l);
        if (lm) {
          items.push(lm[1]);
          i += 1;
        } else if (/^\s\S/u.test(l)) {
          items[items.length - 1] += ' ' + l.trim();
          i += 1;
        } else {
          break;
        }
      }
      result[key] = items;
    } else {
      result[key] = rest;
      i += 1;
    }
  }
  return result;
}

const pos = parseSimpleYml(contents.get('fixtures/positive/case-01.yml'));
if (!pos.name || !pos.scenario || !pos.expected_behavior) {
  failures.push('positive fixture missing required keys: name, scenario, expected_behavior');
}

const neg = parseSimpleYml(contents.get('fixtures/negative/case-01.yml'));
if (!neg.violation) {
  failures.push('negative fixture missing violation folded scalar');
}

if (failures.length > 0) {
  console.error(`FAIL ${id}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.info(
  `PASS ${id}: ${required.length} governed resources, frontmatter 4 fields, LINEAGE 5 fields, fixtures parse, clean-room, fail-closed.`,
);
