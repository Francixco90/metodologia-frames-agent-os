import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {parse} from 'yaml';

const root = process.cwd();
const skillRoot = resolve(root, 'skills/remotion-video-production');
const skillPath = resolve(skillRoot, 'SKILL.md');
const skillText = readFileSync(skillPath, 'utf8');
const frontmatterMatch = skillText.match(/^---\n([\s\S]*?)\n---\n/u);
const errors = [];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fileSha256 = (relativePath) => sha256(readFileSync(resolve(root, relativePath)));
const readYaml = (relativePath) => parse(readFileSync(resolve(root, relativePath), 'utf8'));
const portablePathPattern =
  /^(?!\/)(?!\.\.?(?:\/|$))(?!.*\/\.\.?(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u;
const validateBoundFile = (reference, expectedSha256, label) => {
  if (
    typeof reference !== 'string' ||
    !portablePathPattern.test(reference) ||
    !existsSync(resolve(root, reference))
  ) {
    errors.push(`${label}: referencia portable no resoluble`);
    return;
  }
  if (typeof expectedSha256 !== 'string' || fileSha256(reference) !== expectedSha256) {
    errors.push(`${label}: hash no coincide con el archivo resoluble`);
  }
};

if (!frontmatterMatch) {
  errors.push('SKILL.md: frontmatter ausente');
} else {
  const frontmatter = parse(frontmatterMatch[1]);
  if (frontmatter.name !== 'remotion-video-production') {
    errors.push('SKILL.md: name debe coincidir con el directorio');
  }
  if (
    typeof frontmatter.description !== 'string' ||
    !frontmatter.description.startsWith('This skill should be used when')
  ) {
    errors.push('SKILL.md: description debe usar third-person y triggers explícitos');
  }
  if (frontmatter.version !== '0.1.0') errors.push('SKILL.md: versión inesperada');
}

const lineCount = skillText.split('\n').length;
if (lineCount > 500) errors.push(`SKILL.md: ${lineCount} líneas exceden el límite de 500`);

const modules = [
  'video-spec-authoring',
  'beat-map-design',
  'motion-art-direction',
  'compositions-and-metadata',
  'deterministic-animation',
  'timing-and-transitions',
  'assets-and-rights',
  'audio-and-captions',
  'charts-and-data-storytelling',
  'gsap-integration',
  'three-and-r3f',
  'lottie',
  'rendering-and-review',
  'postproduction-handoff',
  'edge-cases',
];

for (const module of modules) {
  if (!skillText.includes(`\`${module}\``)) errors.push(`SKILL.md: router no declara ${module}`);
  if (!existsSync(resolve(skillRoot, 'references', `${module}.md`))) {
    errors.push(`references/${module}.md ausente`);
  }
}

for (const workProduct of [
  '00-source-script.md',
  '01-video-spec.yml',
  '02-beat-map.yml',
  '03-visual-philosophy.md',
]) {
  if (!skillText.includes(`\`${workProduct}\``)) {
    errors.push(`SKILL.md: contrato documental ausente ${workProduct}`);
  }
}

for (const required of [
  'CHANGELOG.md',
  'LINEAGE.yaml',
  'licenses/LicenseRef-MetodologIA-Internal.md',
  'licenses/README.md',
  'licenses/content-license-receipt.yml',
  'licenses/remotion-4.0.494-evaluation-receipt.yml',
  'licenses/runtime-license-verdict.yml',
  'schemas/render-input.schema.json',
  'schemas/render-output.schema.json',
  'schemas/render-error.schema.json',
  'fixtures/positive/render-input.json',
  'fixtures/negative/banned-apis.fixture.txt',
  'examples/minimal-deterministic/Composition.tsx',
  'scripts/check-contracts.mjs',
  'scripts/check-example.mjs',
  'scripts/check-sources.mjs',
]) {
  if (!existsSync(resolve(skillRoot, required))) errors.push(`${required} ausente`);
}

const lineage = readYaml('skills/remotion-video-production/LINEAGE.yaml');
if (lineage.runtime?.remotion_version !== '4.0.494' || lineage.runtime?.zod_major !== 4) {
  errors.push('LINEAGE.yaml: toolchain Remotion/Zod incorrecto');
}
const expectedSourceIds = [
  'SRC-LEGACY-STITCH-REMOTION-001',
  'SRC-REMOTION-DOCS-001',
  'SRC-REMOTION-SKILLS-001',
];
const lineageReferences = lineage.references ?? [];
const lineageSourceIds = lineageReferences.map(({source_id: sourceId}) => sourceId).sort();
if (JSON.stringify(lineageSourceIds) !== JSON.stringify(expectedSourceIds)) {
  errors.push('LINEAGE.yaml: IDs de fuente canónicos incompletos o no canónicos');
}
const sourceRegistry = readYaml('registries/sources/source-registry.yml');
const sourceEntries = new Map(
  (sourceRegistry.entries ?? []).map((entry) => [entry.source_id, entry]),
);
for (const reference of lineageReferences) {
  const sourceEntry = sourceEntries.get(reference.source_id);
  if (
    sourceEntry === undefined ||
    reference.registry_state !== sourceEntry.current_state ||
    reference.url !== sourceEntry.canonical_uri ||
    reference.canonical_uri_sha256 !== sourceEntry.canonical_uri_sha256 ||
    reference.content_hash_status !== sourceEntry.hashes?.status ||
    reference.raw_sha256 !== sourceEntry.hashes?.raw_sha256 ||
    reference.normalized_sha256 !== sourceEntry.hashes?.normalized_sha256
  ) {
    errors.push(`LINEAGE.yaml: ${reference.source_id} no refleja el registro canónico`);
    continue;
  }
  if (
    !Array.isArray(reference.restrictions) ||
    !reference.restrictions.every((restriction) => sourceEntry.restrictions?.includes(restriction))
  ) {
    errors.push(`LINEAGE.yaml: ${reference.source_id} omite limitaciones canónicas`);
  }
  for (const receipt of reference.receipts ?? []) {
    if (!sourceEntry.receipts?.includes(receipt.ref)) {
      errors.push(`LINEAGE.yaml: receipt ajeno a ${reference.source_id}`);
      continue;
    }
    validateBoundFile(receipt.ref, receipt.sha256, `${reference.source_id} receipt`);
    const parsedReceipt = readYaml(receipt.ref);
    if (parsedReceipt.source_id !== reference.source_id) {
      errors.push(`LINEAGE.yaml: receipt no resuelve a ${reference.source_id}`);
    }
  }
}
const officialSkillRef = lineageReferences.find(
  (reference) => reference.source_id === 'SRC-REMOTION-SKILLS-001',
);
if (
  officialSkillRef?.commit !== '62d0a68043d5adb5ff6baa1e38328855172c9d92' ||
  officialSkillRef?.use !== 'reference_only_license_unresolved' ||
  officialSkillRef?.copied_material !== false
) {
  errors.push('LINEAGE.yaml: remotion-dev/skills debe permanecer reference-only y sin copia');
}
if (lineage.runtime?.commercial_or_production_use !== 'coverage_gap') {
  errors.push('LINEAGE.yaml: gap de licencia productiva debe permanecer explícito');
}

const contentLicenseEvidence = lineage.content_license_evidence;
validateBoundFile(
  contentLicenseEvidence?.text_ref,
  contentLicenseEvidence?.text_sha256,
  'content license text',
);
validateBoundFile(
  contentLicenseEvidence?.receipt_ref,
  contentLicenseEvidence?.receipt_sha256,
  'content license receipt',
);
const contentLicenseReceipt = readYaml(
  contentLicenseEvidence?.receipt_ref ?? 'skills/remotion-video-production/LINEAGE.yaml',
);
if (
  contentLicenseReceipt.license_id !== 'LicenseRef-MetodologIA-Internal' ||
  contentLicenseReceipt.license_text_ref !== contentLicenseEvidence?.text_ref ||
  contentLicenseReceipt.license_text_sha256 !== contentLicenseEvidence?.text_sha256 ||
  contentLicenseReceipt.permissions?.external_distribution !==
    'requires_separate_verifiable_authorization'
) {
  errors.push('content license: texto, receipt o límites no están ligados');
}

const runtimeAuthority = lineage.runtime?.license_authority;
validateBoundFile(
  runtimeAuthority?.receipt_ref,
  runtimeAuthority?.receipt_sha256,
  'runtime license receipt',
);
const runtimeReceipt = readYaml(
  runtimeAuthority?.receipt_ref ?? 'skills/remotion-video-production/LINEAGE.yaml',
);
const runtimeVerdict = readYaml(
  'skills/remotion-video-production/licenses/runtime-license-verdict.yml',
);
if (
  runtimeAuthority?.kind !== 'exact_version_hash_bound_evaluation_receipt' ||
  runtimeAuthority?.legal_eligibility_adjudicated !== false ||
  runtimeReceipt.runtime?.version !== '4.0.494' ||
  runtimeReceipt.evaluation?.commercial_or_production_use !== 'coverage_gap' ||
  runtimeReceipt.evaluation?.consequence !== 'blocked' ||
  runtimeVerdict.evaluation_receipt?.ref !== runtimeAuthority?.receipt_ref ||
  runtimeVerdict.evaluation_receipt?.sha256 !== runtimeAuthority?.receipt_sha256 ||
  runtimeVerdict.commercial_or_production_use?.consequence !== 'blocked'
) {
  errors.push('runtime license: receipt exacto o bloqueo comercial inválido');
}
validateBoundFile(
  runtimeReceipt.version_binding?.lockfile_ref,
  runtimeReceipt.version_binding?.lockfile_sha256,
  'runtime lockfile',
);
validateBoundFile(
  runtimeReceipt.installed_evidence?.package_manifest_ref,
  runtimeReceipt.installed_evidence?.package_manifest_sha256,
  'installed Remotion package manifest',
);
validateBoundFile(
  runtimeReceipt.installed_evidence?.license_text_ref,
  runtimeReceipt.installed_evidence?.license_text_sha256,
  'installed Remotion license',
);
const installedRuntimeManifest = JSON.parse(
  readFileSync(resolve(root, runtimeReceipt.installed_evidence.package_manifest_ref), 'utf8'),
);
const lockfileText = readFileSync(
  resolve(root, runtimeReceipt.version_binding.lockfile_ref),
  'utf8',
);
if (
  installedRuntimeManifest.version !== '4.0.494' ||
  !lockfileText.includes(`${runtimeReceipt.version_binding.package_key}:`) ||
  !lockfileText.includes(runtimeReceipt.version_binding.package_integrity)
) {
  errors.push('runtime license: versión o integridad no resuelven al lockfile instalado');
}

const registry = readYaml('registries/skills/skill-registry.yml');
const registryEntry = registry.entries?.find(
  (entry) => entry.skill_id === 'remotion-video-production',
);
const legacyRegistryEntry = registry.entries?.find(
  (entry) => entry.skill_id === 'stitch-remotion-walkthrough',
);
const contentSha256 = sha256(skillText);
const walk = (path) =>
  readdirSync(path).flatMap((name) => {
    const child = join(path, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
const packageManifest = `${walk(skillRoot)
  .sort()
  .map((path) => `${sha256(readFileSync(path))}  ${relative(skillRoot, path)}`)
  .join('\n')}\n`;
const packageManifestSha256 = sha256(packageManifest);
if (
  registryEntry?.current_state !== 'active' ||
  registryEntry?.content_sha256 !== contentSha256 ||
  registryEntry?.package_manifest_sha256 !== packageManifestSha256 ||
  registryEntry?.content_license_evidence?.receipt_ref !== contentLicenseEvidence?.receipt_ref ||
  registryEntry?.content_license_evidence?.receipt_sha256 !==
    contentLicenseEvidence?.receipt_sha256 ||
  registryEntry?.runtime_license_evidence?.receipt_ref !== runtimeAuthority?.receipt_ref ||
  registryEntry?.runtime_license_evidence?.receipt_sha256 !== runtimeAuthority?.receipt_sha256 ||
  registryEntry?.execution_scope !== 'local-design-and-validation' ||
  registryEntry?.production_runtime_status !== 'blocked_license_coverage_gap'
) {
  errors.push('skill registry: canonical skill state, hashes, scope or runtime gate invalid');
}
if (
  legacyRegistryEntry?.content_license !== 'LicenseRef-MetodologIA-Internal' ||
  legacyRegistryEntry?.content_license_evidence?.text_ref !== contentLicenseEvidence?.text_ref ||
  legacyRegistryEntry?.content_license_evidence?.text_sha256 !==
    contentLicenseEvidence?.text_sha256 ||
  legacyRegistryEntry?.content_license_evidence?.receipt_ref !==
    contentLicenseEvidence?.receipt_ref ||
  legacyRegistryEntry?.content_license_evidence?.receipt_sha256 !==
    contentLicenseEvidence?.receipt_sha256
) {
  errors.push('skill registry: legacy LicenseRef no resuelve a la evidencia interna');
}
const registryEvents = (registry.events ?? []).filter(
  (event) => event.skill_id === 'remotion-video-production',
);
let previousState = null;
for (const [index, event] of registryEvents.entries()) {
  if (
    event.event_order !== index + 1 ||
    event.transition?.from !== previousState ||
    event.content_sha256 !== contentSha256
  ) {
    errors.push(`skill registry: invalid canonical event ${event.event_id ?? index + 1}`);
  }
  previousState = event.transition?.to;
}
if (previousState !== 'active')
  errors.push('skill registry: canonical event chain does not reach active');

if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(skillText)) {
  errors.push('SKILL.md: ruta local absoluta detectada');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS REMOTION SKILL: router de ${modules.length} módulos, lineage, contratos y ${lineCount} líneas válidos.`,
  );
}
