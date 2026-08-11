import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const id = 'metodologia-masterclass-html';
const base = `skills/${id}`;
const required = [
  `${base}/SKILL.md`, `${base}/LINEAGE.yml`, `${base}/references/operating-contract.md`,
  `${base}/schemas/masterclass-spec-v1.schema.json`, `${base}/fixtures/positive/valid-spec.json`,
  `${base}/fixtures/negative/invalid-spec.json`, `${base}/receipts/runtime-boundary.yml`,
  `${base}/scripts/check-skill.mjs`,
];
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const contents = new Map(required.map((path) => [path, read(path)]));
const combined = [...contents.values()].join('\n');

for (const token of ['Spec.', 'Compile.', 'Verify.', 'MetodologIA', 'RENDERED_DRAFT',
  'facilitatorNote', 'ArrowRight', '90', '120', 'deepLinkContract', 'coverage_gap']) {
  if (!combined.includes(token)) throw new Error(`MASTERCLASS_CONTRACT_MISSING: ${token}`);
}

const schema = JSON.parse(contents.get(`${base}/schemas/masterclass-spec-v1.schema.json`));
const positive = JSON.parse(contents.get(`${base}/fixtures/positive/valid-spec.json`));
const negative = JSON.parse(contents.get(`${base}/fixtures/negative/invalid-spec.json`));
const sha = /^[a-f0-9]{64}$/u;
const localRef = (value) => typeof value === 'string' && !/^[a-z]+:|^\/|(?:^|\/)\.\.(?:\/|$)|private|privado|secret|\s/iu.test(value);
const validateContract = (spec) => {
  const errors = [];
  if (spec.schemaVersion !== 'masterclass-spec-v1') errors.push('schemaVersion');
  if (spec.brand !== 'MetodologIA') errors.push('brand');
  if (spec.state !== 'RENDERED_DRAFT') errors.push('state');
  if (!sha.test(spec.specSha256 ?? '')) errors.push('specSha256');
  if (!localRef(spec.designSystemLock?.ref) || !sha.test(spec.designSystemLock?.sha256 ?? '')) errors.push('designSystemLock');
  if (JSON.stringify(spec.modes) !== JSON.stringify([{id: 'core', minutes: 90}, {id: 'extended', minutes: 120}])) errors.push('modes');
  if (!Array.isArray(spec.locales) || spec.locales.length < 2) errors.push('locales');
  for (const locale of spec.locales ?? []) if (!Array.isArray(locale.slides) || locale.slides.length < 1) errors.push(`slides:${locale.locale}`);
  const keyboard = spec.keyboard ?? {};
  if (JSON.stringify(keyboard.next) !== JSON.stringify(['ArrowRight', 'PageDown', 'Space']) || JSON.stringify(keyboard.previous) !== JSON.stringify(['ArrowLeft', 'PageUp']) || keyboard.first !== 'Home' || keyboard.last !== 'End' || keyboard.ignoreEditableTargets !== true || keyboard.buttons !== true || keyboard.outline !== true) errors.push('keyboard');
  if (spec.deepLinkContract?.preserveLocale !== true || spec.deepLinkContract?.preserveFragment !== true || spec.deepLinkContract?.missingTarget !== 'block') errors.push('deepLinkContract');
  if (!Array.isArray(spec.assets) || spec.assets.length < 1) errors.push('assets');
  for (const asset of spec.assets ?? []) if (!localRef(asset.ref) || !sha.test(asset.sha256 ?? '') || asset.rights?.status !== 'cleared' || !asset.rights?.authority) errors.push(`asset:${asset.id}`);
  if (!localRef(spec.output?.htmlRef) || spec.output?.state !== 'RENDERED_DRAFT') errors.push('output');
  return errors;
};
if (schema.additionalProperties !== false || schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
  throw new Error('MASTERCLASS_SCHEMA_NOT_STRICT');
}
const positiveErrors = validateContract(positive);
if (positiveErrors.length) throw new Error(`MASTERCLASS_POSITIVE_INVALID: ${positiveErrors.join(',')}`);
if (validateContract(negative).length === 0) throw new Error('MASTERCLASS_NEGATIVE_UNEXPECTED_PASS');

const baseline = positive.locales[0].slides.map((slide) => slide.id);
const seenLocales = new Set();
for (const locale of positive.locales) {
  if (seenLocales.has(locale.locale)) throw new Error(`MASTERCLASS_DUPLICATE_LOCALE: ${locale.locale}`);
  seenLocales.add(locale.locale);
  if (JSON.stringify(locale.slides.map((slide) => slide.id)) !== JSON.stringify(baseline)) {
    throw new Error(`MASTERCLASS_PARITY_DRIFT: ${locale.locale}`);
  }
  const core = locale.slides.reduce((sum, slide) => sum + slide.timing.coreMinutes, 0);
  const extended = locale.slides.reduce((sum, slide) => sum + slide.timing.extendedMinutes, 0);
  if (core !== 90 || extended !== 120) throw new Error(`MASTERCLASS_TIMING_MISMATCH: ${locale.locale} ${core}/${extended}`);
}
if (!seenLocales.has(positive.primaryLocale)) throw new Error('MASTERCLASS_PRIMARY_LOCALE_MISSING');

for (const pattern of [/\bMath\.random\s*\(/u, /\bDate\.now\s*\(/u, /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u, /\bsetTimeout\s*\(/u, /\bsetInterval\s*\(/u, /\/Users\//u, /\/home\//u]) {
  if (pattern.test(combined)) throw new Error(`MASTERCLASS_FORBIDDEN_RUNTIME_OR_LOCATOR: ${String(pattern)}`);
}

console.info(`PASS ${id}: ${required.length} governed resources; strict schema, 90/120 timing, keyboard and deep links.`);
