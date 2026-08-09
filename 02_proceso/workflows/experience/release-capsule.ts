import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

import {
  ExperienceReleaseCapsuleV1Schema,
  type ExperienceReleaseCapsuleV1,
} from '../../core/contracts/experience-release-v1.ts';
import {canonicalize} from '../../core/evidence/canonical-json.ts';
import {ExperienceApprovalReceiptV1Schema} from './approval-receipt.ts';
import {writeCapsuleAtomically} from './atomic-capsule-store.ts';
import {readCommittedReleaseFile} from './git-release-source.ts';
import {type HostLaunchProbeEvidence, verifyHostLaunchProbes} from './host-launch-probe.ts';
import {
  assertExperienceReleaseSurface,
  EXPERIENCE_RELEASE_SURFACE_V1_ID,
} from './release-surface-v1.ts';
import {readSafeReleaseFile, relativeReleaseFile} from './safe-release-file.ts';

const hash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const EVIDENCE_ROOTS = ['04_estado/approvals/', '04_estado/receipts/', '05_verificacion/quality/'];

export type BuildReleaseOptions = {
  root: string;
  output: string;
  releaseId: string;
  parentRelease: string | null;
  releaseClass: string;
  repositoryCommit: string;
  files: string[];
  status?: 'CANDIDATE' | 'APPROVED';
  decisions?: ExperienceReleaseCapsuleV1['decisions'];
  hostProbes?: HostLaunchProbeEvidence[];
};

type CandidateIdentityOptions = Pick<
  BuildReleaseOptions,
  'root' | 'releaseId' | 'parentRelease' | 'releaseClass' | 'repositoryCommit' | 'files'
>;

const candidateIdentity = (options: CandidateIdentityOptions) => ({
  releaseId: options.releaseId,
  parentReleaseId: options.parentRelease,
  commitSha: options.repositoryCommit,
  releaseClass: options.releaseClass,
  artifacts: [...new Set(options.files.map((item) => relativeReleaseFile(options.root, item)))]
    .sort()
    .map((path) => {
      const {ref, sha256} = readCommittedReleaseFile(options.root, options.repositoryCommit, path);
      return {ref, sha256};
    }),
});

export const computeReleaseCandidateSha256 = (options: CandidateIdentityOptions): string =>
  hash(canonicalize(candidateIdentity(options)));

export const buildReleaseCapsule = (options: BuildReleaseOptions): ExperienceReleaseCapsuleV1 => {
  const output = resolve(options.output);
  const status = options.status ?? 'CANDIDATE';
  const vaultRoot = resolve(options.root, '04_estado/releases/experience');
  const expectedVaultOutput = resolve(vaultRoot, options.releaseId);
  if (status === 'APPROVED' && output !== expectedVaultOutput) {
    throw new Error(`EXP-RELEASE-VAULT: APPROVED output must be ${expectedVaultOutput}`);
  }
  if (status !== 'APPROVED' && (output === vaultRoot || output.startsWith(`${vaultRoot}/`))) {
    throw new Error('EXP-RELEASE-VAULT: only APPROVED releases may enter the vault');
  }
  const files = [
    ...new Set(options.files.map((item) => relativeReleaseFile(options.root, item))),
  ].sort();
  if (files.length === 0) throw new Error('EXP-RELEASE-EMPTY: at least one file is required');
  assertExperienceReleaseSurface(files);
  const identity = candidateIdentity(options);
  const candidateSha256 = hash(canonicalize(identity));
  const hostProof = verifyHostLaunchProbes(options.root, options.hostProbes ?? [], {
    releaseId: options.releaseId,
    candidateCommit: options.repositoryCommit,
    candidateSha256,
    releasedRefs: files,
  });
  const decisions = options.decisions ?? [];
  if (status === 'APPROVED') {
    const actors = new Set(decisions.map(({actorId}) => actorId));
    const roles = new Set(decisions.map(({role}) => role));
    if (actors.size !== 3 || roles.size !== 3) {
      throw new Error('EXP-RELEASE-SEPARATION: APPROVED requires three distinct actors and roles');
    }
    for (const decision of decisions) {
      const ref = relativeReleaseFile(options.root, decision.evidence.ref);
      if (!EVIDENCE_ROOTS.some((prefix) => ref.startsWith(prefix))) {
        throw new Error(`EXP-RELEASE-EVIDENCE: disallowed evidence path ${ref}`);
      }
      const observed = readSafeReleaseFile(options.root, ref);
      if (observed.sha256 !== decision.evidence.sha256) {
        throw new Error(`EXP-RELEASE-EVIDENCE: stale evidence hash ${ref}`);
      }
      let receipt;
      try {
        receipt = ExperienceApprovalReceiptV1Schema.parse(JSON.parse(observed.content));
      } catch {
        throw new Error(`EXP-RELEASE-EVIDENCE: invalid approval receipt ${ref}`);
      }
      if (
        receipt.releaseId !== options.releaseId ||
        receipt.role !== decision.role ||
        receipt.actorId !== decision.actorId ||
        receipt.decision !== decision.decision ||
        receipt.candidateCommit !== options.repositoryCommit ||
        receipt.candidateSha256 !== candidateSha256
      ) {
        throw new Error(`EXP-RELEASE-EVIDENCE: approval binding mismatch ${ref}`);
      }
    }
  }
  const generated: Record<string, string> = {
    'version-diff.json': `${JSON.stringify({schemaVersion: 'experience-version-diff-v1', releaseId: options.releaseId, parentReleaseId: options.parentRelease, releaseClass: options.releaseClass, releaseSurface: EXPERIENCE_RELEASE_SURFACE_V1_ID, invalidatedObjects: [], revalidation: ['RT-09', 'RT-11', 'H01']}, null, 2)}\n`,
    'compatibility.md': `# Compatibilidad\n\nSuperficie: \`${EXPERIENCE_RELEASE_SURFACE_V1_ID}\`.\n\nHosts con launch probe material PASS: ${hostProof.compatibleHosts.join(', ')}.\n\nHosts sin PASS (UNKNOWN/incompatibles): ${hostProof.unknownHosts.join(', ') || 'ninguno'}.\n\nLa compatibilidad aplica solo al commit y candidate hash de esta cápsula; no es un claim global de autoarranque.\n`,
    'migration.md':
      '# Migración\n\n1. Verificar hashes y commit.\n2. Ejecutar paridad y canary sintético.\n3. Congelar candidate.\n4. Obtener RT-09, RT-11 y H01 por separado.\n\nUna cápsula CANDIDATE no migra estado ni activa efectos.\n',
    'restore.md': `# Restauración\n\nVerificar SHA256SUMS. Recuperar archivos desde \`${options.repositoryCommit}\` y comprobar cada hash. No restaurar estado privado ni receipts de aprobación.\n`,
    'acceptance-evidence.json': `${JSON.stringify({schemaVersion: 'experience-acceptance-evidence-v1', releaseId: options.releaseId, approvalEvidence: decisions.map(({role, decision, evidence}) => ({role, decision, evidence})), hostProbeEvidence: hostProof.refs, compatibleHosts: hostProof.compatibleHosts, unknownHosts: hostProof.unknownHosts, metrics: {baseline: 'UNKNOWN', result: 'UNKNOWN'}, verdict: status === 'APPROVED' ? 'PASS' : 'UNKNOWN', nextGate: status === 'APPROVED' ? 'H01_COMPLETE' : 'RT-09'}, null, 2)}\n`,
  };
  const manifest = ExperienceReleaseCapsuleV1Schema.parse({
    schemaVersion: 'experience-release-capsule-v1',
    ...identity,
    status,
    compatibleRoutes: ['R0', 'R1', 'R2', 'R3', 'R3-LOOSE', 'R4', 'R5', 'R6', 'R7'],
    compatibleHosts: hostProof.compatibleHosts,
    invalidatedObjects: [],
    gaps: [
      ...(status === 'APPROVED' ? [] : ['Approval evidence remains pending.']),
      ...hostProof.unknownHosts.map((host) => `Host compatibility UNKNOWN: ${host}`),
    ],
    migration: {ref: 'migration.md', sha256: hash(generated['migration.md']!)},
    restore: {ref: 'restore.md', sha256: hash(generated['restore.md']!)},
    acceptanceEvidence: [
      {ref: 'acceptance-evidence.json', sha256: hash(generated['acceptance-evidence.json']!)},
      ...hostProof.refs,
    ],
    decisions,
    canonicalSha256: candidateSha256,
  });
  const artifacts = {
    ...generated,
    'release-manifest.json': `${JSON.stringify(manifest, null, 2)}\n`,
  };
  const sums = Object.entries(artifacts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${hash(value)}  ${name}`)
    .join('\n');
  writeCapsuleAtomically(options.root, output, {...artifacts, SHA256SUMS: `${sums}\n`});
  return manifest;
};
