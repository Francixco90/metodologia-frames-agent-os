import {createHash} from 'node:crypto';
import {lstatSync, readdirSync, readFileSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';

// Windows: realpathSync yields backslash-separated paths; normalise both
// sides of containment prefix checks so they are separator-agnostic.
const portable = (value: string): string => value.replaceAll('\\', '/');

import {ExperienceReleaseCapsuleV1Schema} from '../../core/contracts/experience-release-v1.ts';
import {canonicalize} from '../../core/evidence/canonical-json.ts';
import {ExperienceApprovalReceiptV1Schema} from './approval-receipt.ts';
import {assertLocalReleaseCommit, readCommittedReleaseFile} from './git-release-source.ts';
import {verifyHostLaunchProbes} from './host-launch-probe.ts';
import {assertExperienceReleaseSurface} from './release-surface-v1.ts';
import {assertSafeReleasePath} from './safe-release-file.ts';

const hash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const CAPSULE_FILES = [
  'SHA256SUMS',
  'acceptance-evidence.json',
  'compatibility.md',
  'migration.md',
  'release-manifest.json',
  'restore.md',
  'version-diff.json',
];
const EVIDENCE_ROOTS = ['04_estado/approvals/', '04_estado/receipts/', '05_verificacion/quality/'];

export type RestoreReport = {
  ok: boolean;
  releaseId: string;
  capsuleFiles: number;
  sourceFiles: number;
  errors: string[];
};

export const verifyReleaseCapsule = (
  capsuleDir: string,
  repositoryRoot = process.cwd(),
): RestoreReport => {
  const manifest = ExperienceReleaseCapsuleV1Schema.parse(
    JSON.parse(readFileSync(resolve(capsuleDir, 'release-manifest.json'), 'utf8')),
  );
  const errors: string[] = [];
  const identity = {
    releaseId: manifest.releaseId,
    parentReleaseId: manifest.parentReleaseId,
    commitSha: manifest.commitSha,
    releaseClass: manifest.releaseClass,
    artifacts: manifest.artifacts,
  };
  if (hash(canonicalize(identity)) !== manifest.canonicalSha256) {
    errors.push('canonical-hash-drift');
  }
  try {
    assertLocalReleaseCommit(repositoryRoot, manifest.commitSha);
    assertExperienceReleaseSurface(manifest.artifacts.map(({ref}) => ref));
  } catch (error) {
    errors.push((error as Error).message);
  }
  const sumLines = readFileSync(resolve(capsuleDir, 'SHA256SUMS'), 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean);
  const observedFiles = readdirSync(capsuleDir).sort();
  if (observedFiles.join('\n') !== CAPSULE_FILES.join('\n')) {
    errors.push('capsule-file-set-drift');
  }
  const ledgerNames = sumLines
    .map((line) => /^([a-f0-9]{64}) {2}([a-z0-9.-]+)$/u.exec(line)?.[2] ?? '')
    .sort();
  if (ledgerNames.join('\n') !== CAPSULE_FILES.filter((name) => name !== 'SHA256SUMS').join('\n')) {
    errors.push('checksum-ledger-incomplete');
  }
  for (const line of sumLines) {
    const match = /^([a-f0-9]{64}) {2}([a-z0-9.-]+)$/u.exec(line);
    if (!match?.[1] || !match[2]) {
      errors.push(`invalid-sum-line:${line}`);
      continue;
    }
    try {
      if (hash(readFileSync(resolve(capsuleDir, match[2]))) !== match[1]) {
        errors.push(`capsule-hash-drift:${match[2]}`);
      }
    } catch {
      errors.push(`capsule-file-missing:${match[2]}`);
    }
  }
  for (const file of manifest.artifacts) {
    try {
      assertSafeReleasePath(repositoryRoot, file.ref);
    } catch {
      errors.push(`source-path-unsafe:${file.ref}`);
      continue;
    }
    try {
      const observed = readCommittedReleaseFile(repositoryRoot, manifest.commitSha, file.ref);
      if (observed.sha256 !== file.sha256) {
        errors.push(`source-hash-drift:${file.ref}`);
      }
    } catch {
      errors.push(`source-commit-unavailable:${file.ref}`);
    }
  }
  const hostEvidence = manifest.acceptanceEvidence.filter(
    ({ref}) => ref !== 'acceptance-evidence.json',
  );
  try {
    const hostProof = verifyHostLaunchProbes(repositoryRoot, hostEvidence, {
      releaseId: manifest.releaseId,
      candidateCommit: manifest.commitSha,
      candidateSha256: manifest.canonicalSha256,
      releasedRefs: manifest.artifacts.map(({ref}) => ref),
    });
    if (hostProof.compatibleHosts.join('\n') !== [...manifest.compatibleHosts].sort().join('\n')) {
      errors.push('host-compatibility-claim-drift');
    }
  } catch (error) {
    errors.push((error as Error).message);
  }
  if (manifest.status === 'APPROVED') {
    const actors = new Set(manifest.decisions.map(({actorId}) => actorId));
    const roles = new Set(manifest.decisions.map(({role}) => role));
    if (actors.size !== 3 || roles.size !== 3) errors.push('approval-separation-invalid');
    const realRoot = realpathSync(repositoryRoot);
    for (const decision of manifest.decisions) {
      const ref = decision.evidence.ref;
      if (!EVIDENCE_ROOTS.some((prefix) => ref.startsWith(prefix))) {
        errors.push(`approval-path-invalid:${ref}`);
        continue;
      }
      try {
        const absolute = resolve(repositoryRoot, ref);
        const real = realpathSync(absolute);
        if (
          !lstatSync(absolute).isFile() ||
          lstatSync(absolute).isSymbolicLink() ||
          !portable(real).startsWith(`${portable(realRoot)}/`)
        ) {
          errors.push(`approval-not-regular:${ref}`);
        } else {
          const content = readFileSync(real, 'utf8');
          if (hash(content) !== decision.evidence.sha256) {
            errors.push(`approval-hash-drift:${ref}`);
            continue;
          }
          let receipt;
          try {
            receipt = ExperienceApprovalReceiptV1Schema.parse(JSON.parse(content));
          } catch {
            errors.push(`approval-receipt-invalid:${ref}`);
            continue;
          }
          if (
            receipt.releaseId !== manifest.releaseId ||
            receipt.role !== decision.role ||
            receipt.actorId !== decision.actorId ||
            receipt.decision !== decision.decision ||
            receipt.candidateCommit !== manifest.commitSha ||
            receipt.candidateSha256 !== manifest.canonicalSha256
          ) {
            errors.push(`approval-binding-drift:${ref}`);
          }
        }
      } catch {
        errors.push(`approval-file-missing:${ref}`);
      }
    }
  }
  return {
    ok: errors.length === 0,
    releaseId: manifest.releaseId,
    capsuleFiles: sumLines.length,
    sourceFiles: manifest.artifacts.length,
    errors,
  };
};
