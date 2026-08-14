import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, readdirSync, rmSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import Ajv2020 from 'ajv/dist/2020.js';
import {sha256} from './render-fixture.mjs';

const root = process.cwd();
const id = 'metodologia-workbook-html';
const base = `skills/${id}`;
const required = [
  `${base}/SKILL.md`, `${base}/LINEAGE.yml`, `${base}/references/operating-contract.md`,
  `${base}/schemas/workbook-spec-v1.schema.json`, `${base}/fixtures/positive/valid-spec.json`, `${base}/fixtures/positive/expected-tree.sha256`,
  `${base}/fixtures/negative/invalid-spec.json`, `${base}/references/capability-boundary.yml`,
  `${base}/scripts/check-skill.mjs`, `${base}/scripts/render-fixture.mjs`,
];
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const contents = new Map(required.map((path) => [path, read(path)]));
const combined = [...contents.values()].join('\n');

for (const token of ['Spec.', 'Compile.', 'Verify.', 'MetodologIA', 'RENDERED_DRAFT',
  'responsePersistence', 'fragments', 'coverage_gap', 'numerals-only',
  'icon-only-with-accessible-name', 'LicenseRef-MetodologIA-Internal']) {
  if (!combined.includes(token)) throw new Error(`WORKBOOK_CONTRACT_MISSING: ${token}`);
}

const schema = JSON.parse(contents.get(`${base}/schemas/workbook-spec-v1.schema.json`));
const positive = JSON.parse(contents.get(`${base}/fixtures/positive/valid-spec.json`));
const negative = JSON.parse(contents.get(`${base}/fixtures/negative/invalid-spec.json`));
if (schema.additionalProperties !== false || schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
  throw new Error('WORKBOOK_SCHEMA_NOT_STRICT');
}
const ajv = new Ajv2020({allErrors: true, strict: true});
const validate = ajv.compile(schema);
if (!validate(positive)) {
  throw new Error(`WORKBOOK_POSITIVE_INVALID: ${ajv.errorsText(validate.errors)}`);
}
if (validate(negative)) throw new Error('WORKBOOK_NEGATIVE_UNEXPECTED_PASS');

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};
const hashInput = structuredClone(positive);
delete hashInput.specSha256;
const actualSpecHash = createHash('sha256')
  .update(JSON.stringify(canonicalize(hashInput)))
  .digest('hex');
if (positive.specSha256 !== actualSpecHash) throw new Error('WORKBOOK_SPEC_HASH_DRIFT');

const unique = (values) => new Set(values).size === values.length;
if (!unique(positive.locales.map(({locale}) => locale))) throw new Error('WORKBOOK_LOCALE_ID_DUPLICATE');
for (const locale of positive.locales) {
  if (!unique(locale.sheets.map(({id}) => id))) throw new Error(`WORKBOOK_SHEET_ID_DUPLICATE: ${locale.locale}`);
  for (const sheet of locale.sheets) {
    if (!unique(sheet.steps.map(({id}) => id))) throw new Error(`WORKBOOK_STEP_ID_DUPLICATE: ${locale.locale}/${sheet.id}`);
  }
}
if (!unique(positive.assets.map(({id}) => id))) throw new Error('WORKBOOK_ASSET_ID_DUPLICATE');

const baseline = positive.locales[0].sheets.map((sheet) => ({
  id: sheet.id,
  steps: sheet.steps.map((step) => step.id),
}));
for (const locale of positive.locales.slice(1)) {
  const shape = locale.sheets.map((sheet) => ({id: sheet.id, steps: sheet.steps.map((step) => step.id)}));
  if (JSON.stringify(shape) !== JSON.stringify(baseline)) throw new Error(`WORKBOOK_PARITY_DRIFT: ${locale.locale}`);
}
if (!positive.locales.some((locale) => locale.locale === positive.primaryLocale)) {
  throw new Error('WORKBOOK_PRIMARY_LOCALE_MISSING');
}
if (positive.interactions.responsePersistence !== 'none') throw new Error('WORKBOOK_RESPONSE_PERSISTENCE');
for (const locale of positive.locales) {
  if (locale.primaryCta.trim().split(/\s+/u).length > positive.uiPattern.ctaVisibleWordsMax) {
    throw new Error(`WORKBOOK_CTA_TOO_LONG: ${locale.locale}`);
  }
}

const walk = (directory, baseDirectory = directory) => readdirSync(directory).flatMap((name) => {
  const path = resolve(directory, name);
  return statSync(path).isDirectory() ? walk(path, baseDirectory) : [[path.slice(baseDirectory.length + 1), readFileSync(path)]];
});
const treeDigest = (directory) => sha256(`${walk(directory).sort(([left], [right]) => left.localeCompare(right)).map(([path, bytes]) => `${sha256(bytes)}  ${path}`).join('\n')}\n`);
const runRoot = mkdtempSync(resolve(tmpdir(), 'metodologia-workbook-html-'));
const firstRoot = resolve(runRoot, 'first');
const secondRoot = resolve(runRoot, 'second');
const renderer = resolve(root, `${base}/scripts/render-fixture.mjs`);
const fixture = resolve(root, `${base}/fixtures/positive/valid-spec.json`);
for (const output of [firstRoot, secondRoot]) {
  const result = spawnSync(process.execPath, [renderer, fixture, output], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(`WORKBOOK_RENDER_FAILED: ${result.stderr || result.stdout}`);
}
const firstFiles = walk(firstRoot).sort(([left], [right]) => left.localeCompare(right));
const secondFiles = walk(secondRoot).sort(([left], [right]) => left.localeCompare(right));
if (firstFiles.length !== secondFiles.length || firstFiles.some(([path, bytes], index) => path !== secondFiles[index][0] || !bytes.equals(secondFiles[index][1]))) {
  throw new Error('WORKBOOK_HTML_NON_DETERMINISTIC');
}
const expectedTreeSha256 = read(`${base}/fixtures/positive/expected-tree.sha256`).trim();
if (treeDigest(firstRoot) !== expectedTreeSha256) throw new Error('WORKBOOK_GOLDEN_TREE_DRIFT');
const esHtml = readFileSync(resolve(firstRoot, 'es/workbook.html'), 'utf8');
const enHtml = readFileSync(resolve(firstRoot, 'en/workbook.html'), 'utf8');
for (const [locale, html, level, copyLabel] of [['es', esHtml, 'Nivel', 'Copiar prompt'], ['en', enHtml, 'Level', 'Copy prompt']]) {
  const promptCount = (html.match(/<article[^>]*data-prompt-library/gu) ?? []).length;
  const copyButtons = html.match(/<button type="button" class="copy-prompt"[^>]*>\s*<svg aria-hidden="true"[^>]*>.*?<\/svg>\s*<\/button>/gu) ?? [];
  if (promptCount !== 3 || copyButtons.length !== promptCount || (html.match(new RegExp(`aria-label="${copyLabel} · ${level} 1"`, 'gu')) ?? []).length !== promptCount) throw new Error(`WORKBOOK_COPY_CONTROL_INVALID: ${locale}`);
  if ((html.match(new RegExp(`role="tab"[^>]*aria-label="${level} [1-4]"`, 'gu')) ?? []).length !== promptCount * 4 || (html.match(/<pre[^>]*role="tabpanel"/gu) ?? []).length !== promptCount * 4) throw new Error(`WORKBOOK_LEVEL_CONTROLS_INVALID: ${locale}`);
  for (const token of ["event.key==='ArrowRight'", "event.key==='ArrowLeft'", "event.key==='Home'", "event.key==='End'", "navigator.clipboard?.writeText", "document.execCommand('copy')", '[role="tabpanel"][hidden]{display:block}', '@media print', '.copy-prompt,.primary-cta{display:none!important}', 'workbook-spec-sha256']) {
    if (!html.includes(token)) throw new Error(`WORKBOOK_BEHAVIOR_MISSING: ${locale}/${token}`);
  }
}
const manifest = JSON.parse(readFileSync(resolve(firstRoot, 'build-manifest.json'), 'utf8'));
const receipt = JSON.parse(readFileSync(resolve(firstRoot, 'build-receipt.json'), 'utf8'));
if (manifest.specSha256 !== positive.specSha256 || receipt.specSha256 !== positive.specSha256 || receipt.manifestSha256 !== sha256(readFileSync(resolve(firstRoot, 'build-manifest.json')))) throw new Error('WORKBOOK_RECEIPT_BINDING_INVALID');
rmSync(runRoot, {recursive: true, force: true});

for (const pattern of [/\bMath\.random\s*\(/u, /\bDate\.now\s*\(/u, /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u, /\bsetTimeout\s*\(/u, /\bsetInterval\s*\(/u, /\/Users\//u, /\/home\//u]) {
  if (pattern.test(combined)) throw new Error(`WORKBOOK_FORBIDDEN_RUNTIME_OR_LOCATOR: ${String(pattern)}`);
}

console.info(`PASS ${id}: ${required.length} governed resources; strict schema, deterministic HTML, concise icon UI, multilingual parity, no persistence.`);
