import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {checkLicenseRegistry} from './lib/check-license-registry.mjs';

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
  if (frontmatter.version !== '0.2.0') errors.push('SKILL.md: versión inesperada');
}

const lineCount = skillText.split('\n').length;
if (lineCount > 500) errors.push(`SKILL.md: ${lineCount} líneas exceden el límite de 500`);

const modules = [
  'video-spec-authoring',
  'beat-map-design',
  'motion-art-direction',
  'compositions-and-metadata',
  'deterministic-animation',
  'keyframe-pose-contract',
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
  'licenses/remotion-4.0.494-evaluation-receipt-h03.yml',
  'licenses/remotion-4.0.494-evaluation-receipt-h03-002.yml',
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
const runtimeAuthority = lineage.runtime?.license_authority;
checkLicenseRegistry({
  contentLicenseEvidence,
  errors,
  lineage,
  readYaml,
  root,
  runtimeAuthority,
  sha256,
  skillRoot,
  skillText,
  validateBoundFile,
});

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
