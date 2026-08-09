import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {relative, resolve, sep} from 'node:path';

import {
  PortableIdSchema,
  ResumeLineageRecordV1Schema,
  ResolvedResumeCandidateV1Schema,
  hashExperienceValue,
  type MaterialReferenceV1,
  type ResolvedResumeCandidateV1,
} from '../../core/contracts/index.ts';

const inside = (root: string, target: string): boolean =>
  target === root || target.startsWith(`${root}${sep}`);

function verifyMaterial(stateRoot: string, material: MaterialReferenceV1): MaterialReferenceV1 {
  const lexical = resolve(stateRoot, material.ref);
  if (!inside(stateRoot, lexical)) throw new Error('RESUME_LINEAGE_OUTSIDE_STATE_ROOT');
  const stat = lstatSync(lexical);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('RESUME_LINEAGE_NOT_REGULAR');
  const actual = realpathSync(lexical);
  if (!inside(stateRoot, actual)) throw new Error('RESUME_LINEAGE_REALPATH_ESCAPE');
  const sha256 = createHash('sha256').update(readFileSync(actual)).digest('hex');
  if (sha256 !== material.sha256) throw new Error('RESUME_LINEAGE_HASH_MISMATCH');
  return {ref: relative(stateRoot, actual).split(sep).join('/'), sha256};
}

export function resolveResumeCandidateV1(input: {
  stateRoot: string;
  candidateId: string;
}): ResolvedResumeCandidateV1 {
  const candidateId = PortableIdSchema.parse(input.candidateId);
  const stateRoot = realpathSync(resolve(input.stateRoot));
  const lineagePath = resolve(stateRoot, 'lineages', candidateId, 'resume.json');
  if (!inside(stateRoot, lineagePath)) throw new Error('RESUME_LINEAGE_OUTSIDE_STATE_ROOT');
  const stat = lstatSync(lineagePath);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('RESUME_LINEAGE_NOT_REGULAR');
  const lineageRealPath = realpathSync(lineagePath);
  if (!inside(stateRoot, lineageRealPath)) throw new Error('RESUME_LINEAGE_REALPATH_ESCAPE');
  const lineage = ResumeLineageRecordV1Schema.parse(
    JSON.parse(readFileSync(lineageRealPath, 'utf8')),
  );
  if (
    lineage.candidateId !== candidateId ||
    hashExperienceValue(lineage) !== lineage.canonicalSha256
  ) {
    throw new Error('RESUME_LINEAGE_HASH_MISMATCH');
  }
  verifyMaterial(stateRoot, lineage.candidate);
  const latestArtifact = verifyMaterial(stateRoot, lineage.latestArtifact);
  const receipt = verifyMaterial(stateRoot, lineage.receipt);
  return ResolvedResumeCandidateV1Schema.parse({
    schemaVersion: 'resolved-resume-candidate-v1',
    candidateId,
    stateRootRef: relative(stateRoot, lineageRealPath).split(sep).join('/'),
    lineageSha256: lineage.canonicalSha256,
    originRouteId: lineage.originRouteId,
    activeStep: lineage.activeStep,
    summary: lineage.summary,
    briefKind: lineage.briefKind,
    latestArtifact,
    receipt,
  });
}
