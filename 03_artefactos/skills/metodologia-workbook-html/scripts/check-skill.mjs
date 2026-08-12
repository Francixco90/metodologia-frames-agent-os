import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';

const root = process.cwd();
const id = 'metodologia-workbook-html';
const base = `skills/${id}`;
const required = [
  `${base}/SKILL.md`, `${base}/LINEAGE.yml`, `${base}/references/operating-contract.md`,
  `${base}/schemas/workbook-spec-v1.schema.json`, `${base}/fixtures/positive/valid-spec.json`,
  `${base}/fixtures/negative/invalid-spec.json`, `${base}/references/capability-boundary.yml`,
  `${base}/scripts/check-skill.mjs`,
];
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const contents = new Map(required.map((path) => [path, read(path)]));
const combined = [...contents.values()].join('\n');

for (const token of ['Spec.', 'Compile.', 'Verify.', 'MetodologIA', 'RENDERED_DRAFT',
  'responsePersistence', 'fragments', 'coverage_gap', 'LicenseRef-MetodologIA-Internal']) {
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

for (const pattern of [/\bMath\.random\s*\(/u, /\bDate\.now\s*\(/u, /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u, /\bsetTimeout\s*\(/u, /\bsetInterval\s*\(/u, /\/Users\//u, /\/home\//u]) {
  if (pattern.test(combined)) throw new Error(`WORKBOOK_FORBIDDEN_RUNTIME_OR_LOCATOR: ${String(pattern)}`);
}

console.info(`PASS ${id}: ${required.length} governed resources; strict schema, multilingual parity, no persistence.`);
