#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const dsRoot = resolve(repoRoot, '03_artefactos/brand/career-design-system');
const skillRoot = resolve(repoRoot, '03_artefactos/skills/career-design-system');
const failures = [];
const pass = (label) => process.stdout.write(`PASS ${label}\n`);
const fail = (label, detail) => failures.push(`${label}: ${detail}`);
const bytes = (path) => readFileSync(path);
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const requiredSkillFiles = [
  'SKILL.md', 'context.md', 'LINEAGE.yml',
  'references/options-contract.md', 'references/verification.md',
  'templates/design-brief.example.json', 'templates/design-decision.example.json',
  'fixtures/positive/synthetic-profile.json', 'fixtures/negative/rejected-inputs.json',
];
for (const ref of requiredSkillFiles) {
  if (!existsSync(resolve(skillRoot, ref))) fail('skill-files', `missing ${ref}`);
}
if (failures.length === 0) pass('skill-files');

const manifestPath = resolve(dsRoot, 'manifest.v1.json');
const manifest = json(manifestPath);
if (manifest.schema_version !== 'metodologia-career-design-system-v1') fail('manifest', 'schema');
if (manifest.primary_composition !== 'blueprint-executive' || manifest.secondary_composition !== 'neo-swiss-editorial') fail('manifest', 'composition order');
if (manifest.default_theme !== 'navy' || manifest.print_theme !== 'light') fail('manifest', 'theme policy');
const manifestPayload = structuredClone(manifest);
delete manifestPayload.system_binding_sha256;
if (sha256(canonical(manifestPayload)) !== manifest.system_binding_sha256) fail('manifest', 'binding hash');
if (!failures.some((entry) => entry.startsWith('manifest:'))) pass('manifest');

for (const asset of manifest.assets) {
  const path = resolve(dsRoot, asset.ref);
  if (!existsSync(path)) fail('asset-hashes', `missing ${asset.ref}`);
  else if (sha256(bytes(path)) !== asset.sha256) fail('asset-hashes', `stale ${asset.ref}`);
}
for (const [refKey, hashKey] of [['manifest_ref', 'manifest_sha256'], ['rights_ref', 'rights_sha256']]) {
  const path = resolve(dsRoot, manifest.font_authority[refKey]);
  if (!existsSync(path) || sha256(bytes(path)) !== manifest.font_authority[hashKey]) fail('asset-hashes', `font authority ${refKey}`);
}
if (!failures.some((entry) => entry.startsWith('asset-hashes:'))) pass('asset-hashes');

const decisionPath = resolve(dsRoot, manifest.decision.ref);
const decision = json(decisionPath);
if (decision.state !== 'HUMAN_APPROVED' || decision.approval?.approver_ref !== 'H01') fail('decision', 'human gate');
if (decision.selected_composition !== manifest.primary_composition) fail('decision', 'primary drift');
const decisionPayload = structuredClone(decision);
delete decisionPayload.decision_sha256;
delete decisionPayload.approval;
delete decisionPayload.state;
if (sha256(canonical(decisionPayload)) !== decision.decision_sha256) fail('decision', 'canonical hash');
if (decision.approval?.approved_decision_sha256 !== decision.decision_sha256) fail('decision', 'approval hash');
if (decision.decision_sha256 !== manifest.decision.decision_sha256) fail('decision', 'manifest binding');
const optionsManifest = resolve(dsRoot, 'options/manifest.json');
if (!existsSync(optionsManifest) || sha256(bytes(optionsManifest)) !== manifest.decision.options_manifest_sha256) fail('decision', 'options hash');
if (!failures.some((entry) => entry.startsWith('decision:'))) pass('decision');

const systemRef = json(resolve(dsRoot, manifest.contract_ref.ref));
const systemPayload = structuredClone(systemRef);
delete systemPayload.design_system_sha256;
const brief = json(resolve(dsRoot, 'decisions/design-brief-v1.json'));
const briefPayload = structuredClone(brief);
delete briefPayload.brief_sha256;
delete briefPayload.state;
if (sha256(canonical(systemPayload)) !== systemRef.design_system_sha256) fail('contract-runners', 'design-system hash');
if (sha256(canonical(briefPayload)) !== brief.brief_sha256) fail('contract-runners', 'brief hash');
if (brief.design_system.design_system_sha256 !== systemRef.design_system_sha256) fail('contract-runners', 'brief system binding');
if (!failures.some((entry) => entry.startsWith('contract-runners:'))) pass('contract-runners');

const tokenJson = readFileSync(resolve(dsRoot, 'tokens/tokens.v1.json'), 'utf8');
const governedSources = [
  tokenJson,
  readFileSync(resolve(dsRoot, 'tokens/tokens.v1.css'), 'utf8'),
  readFileSync(resolve(dsRoot, 'components/components.v1.css'), 'utf8'),
  readFileSync(resolve(dsRoot, 'components/snippets.v1.html'), 'utf8'),
  readFileSync(resolve(dsRoot, 'print/print.v1.css'), 'utf8'),
];
if (governedSources.some((source) => /#[0-9a-f]{3,8}\b/iu.test(source))) fail('token-discipline', 'raw color');
if (governedSources.some((source) => /(?:https?:)?\/\//iu.test(source))) fail('token-discipline', 'remote dependency');
if (!tokenJson.includes('brand.ink') || !tokenJson.includes('brand.gold_fill')) fail('token-discipline', 'central authority aliases');
if (!failures.some((entry) => entry.startsWith('token-discipline:'))) pass('token-discipline');

const components = json(resolve(dsRoot, 'components/registry.v1.json'));
const ids = new Set(components.components.map((component) => component.id));
for (const required of ['header', 'hero', 'theme-toggle', 'inline-disclosure', 'evidence-dialog', 'contact-cta']) {
  if (!ids.has(required)) fail('components', `missing ${required}`);
}
const snippets = readFileSync(resolve(dsRoot, 'components/snippets.v1.html'), 'utf8');
if ((snippets.match(/data-dialog-close/g) ?? []).length !== 2) fail('components', 'one close control in markup plus one JS binding required');
if (!snippets.includes('data-label-light') || !snippets.includes('data-label-navy')) fail('components', 'labels must originate in HTML');
if (!failures.some((entry) => entry.startsWith('components:'))) pass('components');

const icons = json(resolve(dsRoot, 'icons/registry.v1.json'));
if (icons.icons.length !== 5 || !icons.icons.every((icon) => /^icon-[a-z-]+$/u.test(icon.id))) fail('icons', 'registry');
if (!failures.some((entry) => entry.startsWith('icons:'))) pass('icons');

const positive = json(resolve(skillRoot, 'fixtures/positive/synthetic-profile.json'));
const negative = json(resolve(skillRoot, 'fixtures/negative/rejected-inputs.json'));
if (positive.synthetic_only !== true || !positive.proof.every((item) => item.evidence_id?.startsWith('SYN-'))) fail('fixtures', 'positive provenance');
if (negative.cases.length < 5 || !negative.cases.every((item) => item.expected === 'BLOCKED')) fail('fixtures', 'negative coverage');
if (!failures.some((entry) => entry.startsWith('fixtures:'))) pass('fixtures');

const skillText = readFileSync(resolve(skillRoot, 'SKILL.md'), 'utf8');
for (const ref of ['context.md', 'references/options-contract.md', 'references/verification.md']) {
  if (!skillText.includes(ref)) fail('progressive-disclosure', `unlinked ${ref}`);
}
if (!failures.some((entry) => entry.startsWith('progressive-disclosure:'))) pass('progressive-disclosure');

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
  process.exit(1);
}
process.stdout.write('PASS career-design-system focal checker (10/10)\n');
