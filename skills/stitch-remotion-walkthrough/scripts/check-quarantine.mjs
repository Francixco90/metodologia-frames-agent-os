import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {parse} from 'yaml';

const root = process.cwd();
const skillRoot = resolve(root, 'skills/stitch-remotion-walkthrough');
const walk = (path) =>
  readdirSync(path).flatMap((name) => {
    const child = join(path, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
const errors = [];
const files = walk(skillRoot);
const forbiddenExtensions = /\.(?:tsx?|jsx?|sh|png|jpe?g|webp|mp4|mov|zip)$/u;

for (const path of files) {
  const relativePath = relative(skillRoot, path);
  if (forbiddenExtensions.test(relativePath) && relativePath !== 'scripts/check-quarantine.mjs') {
    errors.push(`${relativePath}: material ejecutable o asset legacy no permitido`);
  }
}

const skillText = readFileSync(resolve(skillRoot, 'SKILL.md'), 'utf8');
const frontmatterMatch = skillText.match(/^---\n([\s\S]*?)\n---\n/u);
if (!frontmatterMatch) {
  errors.push('SKILL.md: frontmatter ausente');
} else {
  const frontmatter = parse(frontmatterMatch[1]);
  if (
    frontmatter.name !== 'stitch-remotion-walkthrough' ||
    frontmatter.metadata?.lifecycle_state !== 'quarantined'
  ) {
    errors.push('SKILL.md: identidad o cuarentena inválida');
  }
}

const lineage = parse(readFileSync(resolve(skillRoot, 'LINEAGE.yml'), 'utf8'));
if (
  lineage.lifecycle_state !== 'quarantined' ||
  lineage.legacy_observation?.copied_material_in_this_package !== false ||
  lineage.legacy_observation?.license_status_for_observed_copy !== 'unresolved'
) {
  errors.push('LINEAGE.yml: quarantine/license/copy flags invalid');
}

const registry = parse(readFileSync(resolve(root, 'registries/skills/skill-registry.yml'), 'utf8'));
const entry = registry.entries?.find(
  (candidate) => candidate.skill_id === 'stitch-remotion-walkthrough',
);
const contentSha256 = createHash('sha256').update(skillText).digest('hex');
const packageManifest = `${files
  .sort()
  .map(
    (path) =>
      `${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${relative(skillRoot, path)}`,
  )
  .join('\n')}\n`;
const packageManifestSha256 = createHash('sha256').update(packageManifest).digest('hex');
if (
  entry?.current_state !== 'quarantined' ||
  entry?.content_sha256 !== contentSha256 ||
  entry?.package_manifest_sha256 !== packageManifestSha256 ||
  entry?.execution_scope !== 'reference_only'
) {
  errors.push('skill registry: legacy must remain hash-bound, quarantined and reference_only');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS STITCH QUARANTINE: ${files.length} archivos originales de wrapper; sin material legacy copiado.`,
  );
}
