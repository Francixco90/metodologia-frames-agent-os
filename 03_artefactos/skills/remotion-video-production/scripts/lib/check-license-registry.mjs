import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';

export const checkLicenseRegistry = ({
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
}) => {
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
  const contentReceipt = readYaml(
    contentLicenseEvidence?.receipt_ref ?? 'skills/remotion-video-production/LINEAGE.yaml',
  );
  if (
    contentReceipt.license_id !== 'LicenseRef-MetodologIA-Internal' ||
    contentReceipt.license_text_ref !== contentLicenseEvidence?.text_ref ||
    contentReceipt.license_text_sha256 !== contentLicenseEvidence?.text_sha256 ||
    contentReceipt.permissions?.external_distribution !==
      'requires_separate_verifiable_authorization'
  ) {
    errors.push('content license: texto, receipt o límites no están ligados');
  }

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
    runtimeReceipt.supersedes?.receipt_ref !==
      'skills/remotion-video-production/licenses/remotion-4.0.494-evaluation-receipt-h03.yml' ||
    runtimeReceipt.supersedes?.receipt_sha256 !==
      '5e073ab99011507e0d8d8ee2334f6eb1ce971b3748e0eec81e65a5f81b85f046' ||
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
  const installedManifest = JSON.parse(
    readFileSync(resolve(root, runtimeReceipt.installed_evidence.package_manifest_ref), 'utf8'),
  );
  const lockfileText = readFileSync(resolve(root, runtimeReceipt.version_binding.lockfile_ref), 'utf8');
  if (
    installedManifest.version !== '4.0.494' ||
    !lockfileText.includes(`${runtimeReceipt.version_binding.package_key}:`) ||
    !lockfileText.includes(runtimeReceipt.version_binding.package_integrity)
  ) {
    errors.push('runtime license: versión o integridad no resuelven al lockfile instalado');
  }

  const registry = readYaml('registries/skills/skill-registry.yml');
  const entry = registry.entries?.find(({skill_id: id}) => id === 'remotion-video-production');
  const legacy = registry.entries?.find(({skill_id: id}) => id === 'stitch-remotion-walkthrough');
  const walk = (path) =>
    readdirSync(path).flatMap((name) => {
      const child = join(path, name);
      return statSync(child).isDirectory() ? walk(child) : [child];
    });
  const manifest = `${walk(skillRoot)
    .sort()
    .map((path) => `${sha256(readFileSync(path))}  ${relative(skillRoot, path).split(sep).join('/')}`)
    .join('\n')}\n`;
  const contentSha256 = sha256(skillText);
  if (
    entry?.current_state !== 'active' ||
    entry?.content_sha256 !== contentSha256 ||
    entry?.package_manifest_sha256 !== sha256(manifest) ||
    entry?.content_license_evidence?.receipt_sha256 !== contentLicenseEvidence?.receipt_sha256 ||
    entry?.runtime_license_evidence?.receipt_sha256 !== runtimeAuthority?.receipt_sha256 ||
    entry?.execution_scope !== 'local-design-and-validation' ||
    entry?.production_runtime_status !== 'blocked_license_coverage_gap'
  ) {
    errors.push('skill registry: canonical skill state, hashes, scope or runtime gate invalid');
  }
  if (
    legacy?.content_license !== 'LicenseRef-MetodologIA-Internal' ||
    legacy?.content_license_evidence?.text_ref !== contentLicenseEvidence?.text_ref ||
    legacy?.content_license_evidence?.text_sha256 !== contentLicenseEvidence?.text_sha256 ||
    legacy?.content_license_evidence?.receipt_ref !== contentLicenseEvidence?.receipt_ref ||
    legacy?.content_license_evidence?.receipt_sha256 !== contentLicenseEvidence?.receipt_sha256
  ) {
    errors.push('skill registry: legacy LicenseRef no resuelve a la evidencia interna');
  }
  const events = (registry.events ?? []).filter(
    ({skill_id: id}) => id === 'remotion-video-production',
  );
  let previousState = null;
  for (const [index, event] of events.entries()) {
    if (
      event.event_order !== index + 1 ||
      event.transition?.from !== previousState ||
      (index === events.length - 1 && event.content_sha256 !== contentSha256)
    ) {
      errors.push(`skill registry: invalid canonical event ${event.event_id ?? index + 1}`);
    }
    previousState = event.transition?.to;
  }
  if (previousState !== 'active') {
    errors.push('skill registry: canonical event chain does not reach active');
  }
  if (!existsSync(resolve(root, runtimeAuthority.receipt_ref))) {
    errors.push('runtime license: authority receipt missing');
  }
};
