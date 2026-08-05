#!/usr/bin/env node
// Self-contained ESM checker for context-sync-gbrain skill.
// Uses only node:* built-ins. No network, no timers, no absolute paths.

import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const skillRoot = join(__dirname, '..');

const required = [
  'SKILL.md',
  'LINEAGE.yml',
  'receipts/runtime-boundary.yml',
  'fixtures/positive/case-01.yml',
  'fixtures/negative/case-01.yml',
];

const errors = [];

// 1. Required files exist
for (const rel of required) {
  const abs = join(skillRoot, rel);
  if (!existsSync(abs)) {
    errors.push(`missing required file: ${rel}`);
  }
}

// 2. SKILL.md frontmatter: 4 fields
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const block = m[1];
  const fields = {};
  for (const line of block.split('\n')) {
    const fm = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (fm) fields[fm[1]] = fm[2].trim();
  }
  return fields;
}

const skillPath = join(skillRoot, 'SKILL.md');
if (existsSync(skillPath)) {
  const skillText = readFileSync(skillPath, 'utf8');
  const fm = parseFrontmatter(skillText);
  if (!fm) {
    errors.push('SKILL.md: no frontmatter block found');
  } else {
    const fmRequired = ['name', 'description', 'version', 'license'];
    for (const f of fmRequired) {
      if (!fm[f] || fm[f].length === 0) {
        errors.push(`SKILL.md frontmatter missing field: ${f}`);
      }
    }
  }
} else {
  errors.push('SKILL.md missing — cannot check frontmatter');
}

// 3. LINEAGE.yml: 5 fields
const lineagePath = join(skillRoot, 'LINEAGE.yml');
if (existsSync(lineagePath)) {
  const lineageText = readFileSync(lineagePath, 'utf8');
  const lineageFields = {};
  for (const line of lineageText.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (m && !m[2].trim().startsWith('>') && m[1] !== 'authority_refs') {
      lineageFields[m[1]] = m[2].trim();
    }
  }
  const lineageRequired = [
    'content_origin',
    'derivation_mode',
    'external_fragments_reused',
    'publication_authority',
  ];
  for (const f of lineageRequired) {
    if (!(f in lineageFields)) {
      errors.push(`LINEAGE.yml missing field: ${f}`);
    }
  }
  if (!/authority_refs:/.test(lineageText)) {
    errors.push('LINEAGE.yml missing field: authority_refs');
  }
} else {
  errors.push('LINEAGE.yml missing — cannot check fields');
}

// 4. Fixtures parse as YAML (minimal structural check)
function parseYamlMinimal(text) {
  // Very small YAML check: at least one top-level key with a value.
  let foundKey = false;
  for (const line of text.split('\n')) {
    if (/^[A-Za-z0-9_]+:\s*\S/.test(line) || /^[A-Za-z0-9_]+:\s*>/.test(line)) {
      foundKey = true;
      break;
    }
  }
  return foundKey;
}

const fixtures = ['fixtures/positive/case-01.yml', 'fixtures/negative/case-01.yml'];
for (const rel of fixtures) {
  const abs = join(skillRoot, rel);
  if (existsSync(abs)) {
    const text = readFileSync(abs, 'utf8');
    if (!parseYamlMinimal(text)) {
      errors.push(`fixture ${rel}: no parseable YAML key found`);
    }
  } else {
    errors.push(`fixture ${rel}: missing`);
  }
}

// 5. Negative fixture must have a violation folded scalar
const negPath = join(skillRoot, 'fixtures/negative/case-01.yml');
if (existsSync(negPath)) {
  const negText = readFileSync(negPath, 'utf8');
  if (!/^violation:\s*>/m.test(negText)) {
    errors.push('fixtures/negative/case-01.yml: missing violation folded scalar (>)');
  }
}

// 6. Runtime boundary checks
const runtimePath = join(skillRoot, 'receipts/runtime-boundary.yml');
if (existsSync(runtimePath)) {
  const rtText = readFileSync(runtimePath, 'utf8');
  if (!/^network_allowed:\s*false\s*$/m.test(rtText)) {
    errors.push('receipts/runtime-boundary.yml: network_allowed must be false');
  }
  if (!/^execution_boundary:\s*requires_user_confirmation\s*$/m.test(rtText)) {
    errors.push(
      'receipts/runtime-boundary.yml: execution_boundary must be requires_user_confirmation',
    );
  }
} else {
  errors.push('receipts/runtime-boundary.yml missing');
}

// 7. Forbidden globals in this script (static self-check)
const selfText = readFileSync(__filename, 'utf8');
const forbiddenTokens = [
  ['Math', '.', 'random'],
  ['Date', '.', 'now'],
  ['new', ' ', 'Date'],
  ['fetch', '('],
  ['set', 'Timeout'],
  ['set', 'Interval'],
];
for (const parts of forbiddenTokens) {
  const token = parts.join('');
  if (selfText.includes(token)) {
    errors.push('checker self-check: forbidden token present');
  }
}
// Forbidden absolute path prefixes in this script (other than __dirname-derived joins)
const forbiddenPrefixes = [
  ['/', 'Users', '/'],
  ['/', 'home', '/'],
  ['C', ':', String.fromCharCode(92), 'Users', String.fromCharCode(92)],
];
for (const parts of forbiddenPrefixes) {
  const prefix = parts.join('');
  if (selfText.includes(prefix)) {
    errors.push('checker self-check: absolute path prefix present');
  }
}

if (errors.length > 0) {
  console.error('FAIL');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
} else {
  console.log('PASS');
  process.exit(0);
}
