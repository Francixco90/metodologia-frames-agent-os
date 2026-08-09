import {z} from 'zod';

import {PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';
import {MaterialReferenceV1Schema} from './experience-execution-v1.ts';

export const ResumeLineageRecordV1Schema = z.strictObject({
  schemaVersion: z.literal('resume-lineage-record-v1'),
  candidateId: PortableIdSchema,
  originRouteId: z.enum(['R6', 'R7']),
  activeStep: PortableIdSchema,
  summary: z.string().trim().min(1).max(280),
  briefKind: PortableIdSchema,
  candidate: MaterialReferenceV1Schema,
  latestArtifact: MaterialReferenceV1Schema,
  receipt: MaterialReferenceV1Schema,
  canonicalSha256: Sha256Schema,
});
export type ResumeLineageRecordV1 = z.infer<typeof ResumeLineageRecordV1Schema>;

export const ResolvedResumeCandidateV1Schema = z.strictObject({
  schemaVersion: z.literal('resolved-resume-candidate-v1'),
  candidateId: PortableIdSchema,
  stateRootRef: RelativePathSchema,
  lineageSha256: Sha256Schema,
  originRouteId: z.enum(['R6', 'R7']),
  activeStep: PortableIdSchema,
  summary: z.string().trim().min(1).max(280),
  briefKind: PortableIdSchema,
  latestArtifact: MaterialReferenceV1Schema,
  receipt: MaterialReferenceV1Schema,
});
export type ResolvedResumeCandidateV1 = z.infer<typeof ResolvedResumeCandidateV1Schema>;
