import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import Ajv2020 from 'ajv/dist/2020.js';
import {canonicalize, sha256} from './compile-fixture.mjs';

const root = process.cwd();
const id = 'metodologia-workshop-route-landing-html';
const base = `skills/${id}`;
const required = [
  `${base}/SKILL.md`, `${base}/LINEAGE.yml`, `${base}/references/operating-contract.md`,
  `${base}/references/capability-boundary.yml`, `${base}/schemas/workshop-route-landing-spec-v1.schema.json`,
  `${base}/fixtures/positive/valid-spec.json`, `${base}/fixtures/positive/expected-tree.sha256`,
  `${base}/fixtures/negative/invalid-spec.json`, `${base}/scripts/compile-fixture.mjs`, `${base}/scripts/check-skill.mjs`,
];
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const contents = new Map(required.map((path) => [path, read(path)]));
const combined = [...contents.values()].join('\n');
const runtimeSurface = [...contents.entries()]
  .filter(([path]) => !path.endsWith('/scripts/check-skill.mjs'))
  .map(([, value]) => value)
  .join('\n');

for (const token of ['Spec.', 'Compile.', 'Verify.', 'MetodologIA', 'RENDERED_DRAFT', 'candidate',
  'coverage_gap', 'inline-svg', 'available', 'pending', 'local-candidate-evaluation']) {
  if (!combined.includes(token)) throw new Error(`WORKSHOP_ROUTE_CONTRACT_MISSING: ${token}`);
}

const schema = JSON.parse(contents.get(`${base}/schemas/workshop-route-landing-spec-v1.schema.json`));
const positive = JSON.parse(contents.get(`${base}/fixtures/positive/valid-spec.json`));
const negative = JSON.parse(contents.get(`${base}/fixtures/negative/invalid-spec.json`));
if (schema.additionalProperties !== false || schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') throw new Error('WORKSHOP_ROUTE_SCHEMA_NOT_STRICT');
const ajv = new Ajv2020({allErrors: true, strict: true});
const validate = ajv.compile(schema);
if (!validate(positive)) throw new Error(`WORKSHOP_ROUTE_POSITIVE_INVALID: ${ajv.errorsText(validate.errors)}`);
if (validate(negative)) throw new Error('WORKSHOP_ROUTE_NEGATIVE_UNEXPECTED_PASS');

const hashInput = structuredClone(positive);
delete hashInput.specSha256;
const actualSpecHash = createHash('sha256').update(JSON.stringify(canonicalize(hashInput))).digest('hex');
if (positive.specSha256 !== actualSpecHash) throw new Error('WORKSHOP_ROUTE_SPEC_HASH_DRIFT');
const expectedSections = ['entry', 'tension', 'route', 'method', 'resources', 'outcomes', 'trust', 'invitation'];
const localeIds = positive.locales.map(({locale}) => locale);
if (JSON.stringify([...localeIds].sort()) !== JSON.stringify(['en', 'es', 'pt'])) throw new Error('WORKSHOP_ROUTE_LOCALES_REQUIRED');
for (const locale of positive.locales) {
  if (JSON.stringify(locale.sections.map(({id: sectionId}) => sectionId)) !== JSON.stringify(expectedSections)) throw new Error(`WORKSHOP_ROUTE_SECTION_PARITY: ${locale.locale}`);
  if (locale.primaryCta.trim().split(/\s+/u).length > 3) throw new Error(`WORKSHOP_ROUTE_CTA_TOO_LONG: ${locale.locale}`);
  if (JSON.stringify(locale.resources.map(({id: resourceId}) => resourceId)) !== JSON.stringify(positive.resourceRegistry.map(({id: resourceId}) => resourceId))) throw new Error(`WORKSHOP_ROUTE_RESOURCE_PARITY: ${locale.locale}`);
  for (const resource of locale.resources) if (resource.ctaLabel.trim().split(/\s+/u).length > 3) throw new Error(`WORKSHOP_ROUTE_RESOURCE_CTA_TOO_LONG: ${locale.locale}/${resource.id}`);
}
for (const resource of positive.resourceRegistry) {
  if (resource.status === 'available' && !resource.ref) throw new Error(`WORKSHOP_ROUTE_AVAILABLE_WITHOUT_REF: ${resource.id}`);
  if (resource.status === 'pending' && resource.ref) throw new Error(`WORKSHOP_ROUTE_PENDING_WITH_REF: ${resource.id}`);
}

const walk = (directory, baseDirectory = directory) => readdirSync(directory).flatMap((name) => {
  const path = resolve(directory, name);
  return statSync(path).isDirectory() ? walk(path, baseDirectory) : [[path.slice(baseDirectory.length + 1), readFileSync(path)]];
});
const treeDigest = (directory) => sha256(`${walk(directory).sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => `${sha256(bytes)}  ${path}`).join('\n')}\n`);
const runRoot = mkdtempSync(resolve(tmpdir(), 'workshop-route-landing-'));
const firstRoot = resolve(runRoot, 'first');
const secondRoot = resolve(runRoot, 'second');
const compiler = resolve(root, `${base}/scripts/compile-fixture.mjs`);
const fixture = resolve(root, `${base}/fixtures/positive/valid-spec.json`);
for (const output of [firstRoot, secondRoot]) {
  const result = spawnSync(process.execPath, [compiler, fixture, output], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(`WORKSHOP_ROUTE_COMPILE_FAILED: ${result.stderr || result.stdout}`);
}
const firstFiles = walk(firstRoot).sort(([a], [b]) => a.localeCompare(b));
const secondFiles = walk(secondRoot).sort(([a], [b]) => a.localeCompare(b));
if (firstFiles.length !== secondFiles.length || firstFiles.some(([path, bytes], index) => path !== secondFiles[index][0] || !bytes.equals(secondFiles[index][1]))) throw new Error('WORKSHOP_ROUTE_CROSS_PROCESS_NON_DETERMINISTIC');
if (treeDigest(firstRoot) !== read(`${base}/fixtures/positive/expected-tree.sha256`).trim()) throw new Error('WORKSHOP_ROUTE_GOLDEN_DRIFT');

for (const locale of positive.locales) {
  const html = readFileSync(resolve(firstRoot, `${locale.locale}/index.html`), 'utf8');
  if ((html.match(/<section /gu) ?? []).length !== 8) throw new Error(`WORKSHOP_ROUTE_SECTION_COUNT: ${locale.locale}`);
  for (const sectionId of expectedSections) if (!html.includes(`<section id="${sectionId}"`)) throw new Error(`WORKSHOP_ROUTE_SECTION_MISSING: ${locale.locale}/${sectionId}`);
  for (const token of ['<a class="skip"', ':focus-visible', '@media print', 'prefers-reduced-motion', 'workshop-route-spec-sha256', 'data-resource-status="available"', 'data-resource-status="pending"', '<svg aria-hidden="true"']) if (!html.includes(token)) throw new Error(`WORKSHOP_ROUTE_HTML_BEHAVIOR_MISSING: ${locale.locale}/${token}`);
  for (const forbidden of ['<script', '<form', 'localStorage', 'sessionStorage', `fetch${'('}`]) if (html.includes(forbidden)) throw new Error(`WORKSHOP_ROUTE_HTML_FORBIDDEN: ${locale.locale}/${forbidden}`);
  const pendingCard = html.match(/<article class="resource" data-resource-status="pending">.*?<\/article>/u)?.[0] ?? '';
  if (!pendingCard || pendingCard.includes('href=')) throw new Error(`WORKSHOP_ROUTE_PENDING_LINK: ${locale.locale}`);
}
const manifestBytes = readFileSync(resolve(firstRoot, 'build-manifest.json'));
const manifest = JSON.parse(manifestBytes);
const receipt = JSON.parse(readFileSync(resolve(firstRoot, 'build-receipt.json')));
if (manifest.specSha256 !== positive.specSha256 || manifest.designSystemSha256 !== positive.designSystemLock.sha256 || receipt.manifestSha256 !== sha256(manifestBytes) || receipt.publicationAuthority !== false) throw new Error('WORKSHOP_ROUTE_RECEIPT_BINDING_INVALID');
for (const [relative, declared] of Object.entries(manifest.outputs)) {
  const path = resolve(firstRoot, relative);
  if (sha256(readFileSync(path)) !== declared) throw new Error(`WORKSHOP_ROUTE_OUTPUT_HASH_DRIFT: ${relative}`);
}
for (const requiredTarget of [positive.registrationRef, ...positive.resourceRegistry.filter(({status}) => status === 'available').map(({ref}) => ref)]) {
  if (!manifest.outputs[requiredTarget]) throw new Error(`WORKSHOP_ROUTE_TARGET_NOT_MATERIALIZED: ${requiredTarget}`);
}
const mutationTarget = resolve(firstRoot, `${positive.primaryLocale}/index.html`);
const originalBytes = readFileSync(mutationTarget);
writeFileSync(mutationTarget, `${originalBytes.toString('utf8')}<!-- mutation -->`);
if (sha256(readFileSync(mutationTarget)) === manifest.outputs[`${positive.primaryLocale}/index.html`]) throw new Error('WORKSHOP_ROUTE_MUTATION_NOT_DETECTED');
writeFileSync(mutationTarget, originalBytes);
rmSync(runRoot, {recursive: true, force: true});

for (const pattern of [/\bMath\.random\s*\(/u, /\bDate\.now\s*\(/u, /\bnew\s+Date\s*\(/u, /\bfetch\s*\(/u, /\/Users\//u, /\/home\//u, /file:\/\//u, /\/edit\b/u]) if (pattern.test(runtimeSurface)) throw new Error(`WORKSHOP_ROUTE_FORBIDDEN_RUNTIME_OR_LOCATOR: ${String(pattern)}`);

console.info(`PASS ${id}: strict Spec -> Compile -> Verify; 8 sections; ES/EN/PT; cross-process deterministic golden; honest resources; no JS/network/publish.`);
