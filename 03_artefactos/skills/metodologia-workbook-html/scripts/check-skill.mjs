import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

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
const sha = /^[a-f0-9]{64}$/u;
const localRef = (value) => typeof value === 'string' && !/^[a-z]+:|^\/|(?:^|\/)\.\.(?:\/|$)|private|privado|secret|\s/iu.test(value);
const validateContract = (spec) => {
  const errors = [];
  if (spec.schemaVersion !== 'workbook-spec-v1') errors.push('schemaVersion');
  if (spec.brand !== 'MetodologIA') errors.push('brand');
  if (spec.state !== 'RENDERED_DRAFT') errors.push('state');
  if (!sha.test(spec.specSha256 ?? '')) errors.push('specSha256');
  if (!localRef(spec.designSystemLock?.ref) || !sha.test(spec.designSystemLock?.sha256 ?? '')) errors.push('designSystemLock');
  if (!Array.isArray(spec.locales) || spec.locales.length < 2) errors.push('locales');
  for (const locale of spec.locales ?? []) {
    if (!Array.isArray(locale.sheets) || locale.sheets.length < 3) errors.push(`sheets:${locale.locale}`);
    for (const sheet of locale.sheets ?? []) if (!Array.isArray(sheet.steps) || sheet.steps.length < 1) errors.push(`steps:${sheet.id}`);
  }
  if (spec.interactions?.tabsKeyboard !== true || spec.interactions?.copyPrompts !== true || spec.interactions?.responsePersistence !== 'none') errors.push('interactions');
  if ((spec.interactions?.preferencePersistence ?? []).some((value) => !['theme', 'locale'].includes(value))) errors.push('preferencePersistence');
  if (spec.noJs?.contentReadable !== true || spec.noJs?.navigationFallback !== 'fragments') errors.push('noJs');
  if (spec.print?.enabled !== true || spec.print?.hideInteractiveControls !== true || spec.print?.preserveAllContent !== true) errors.push('print');
  if (!Array.isArray(spec.assets) || spec.assets.length < 1) errors.push('assets');
  for (const asset of spec.assets ?? []) if (!localRef(asset.ref) || !sha.test(asset.sha256 ?? '') || asset.rights?.status !== 'cleared' || !asset.rights?.authority) errors.push(`asset:${asset.id}`);
  if (!localRef(spec.output?.htmlRef) || spec.output?.state !== 'RENDERED_DRAFT') errors.push('output');
  return errors;
};
if (schema.additionalProperties !== false || schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
  throw new Error('WORKBOOK_SCHEMA_NOT_STRICT');
}
const positiveErrors = validateContract(positive);
if (positiveErrors.length) throw new Error(`WORKBOOK_POSITIVE_INVALID: ${positiveErrors.join(',')}`);
if (validateContract(negative).length === 0) throw new Error('WORKBOOK_NEGATIVE_UNEXPECTED_PASS');

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
