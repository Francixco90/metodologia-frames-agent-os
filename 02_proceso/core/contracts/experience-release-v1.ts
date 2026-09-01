import {z} from 'zod';

import {PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';
import {EXPERIENCE_ROUTE_IDS_V1, ExperienceRouteIdV1Schema} from './experience-assistance-v1.ts';

const ReleaseArtifactV1Schema = z.strictObject({
  ref: RelativePathSchema,
  sha256: Sha256Schema,
});
const ReleaseDecisionV1Schema = z.strictObject({
  actorId: PortableIdSchema,
  role: z.enum(['RT-09', 'RT-11', 'H01']),
  decision: z.enum(['PASS', 'FAIL', 'APPROVE', 'REJECT']),
  evidence: ReleaseArtifactV1Schema,
});

export const ExperienceReleaseCapsuleV1Schema = z
  .strictObject({
    schemaVersion: z.literal('experience-release-capsule-v1'),
    releaseId: PortableIdSchema,
    parentReleaseId: PortableIdSchema.nullable(),
    commitSha: z.string().regex(/^[a-f0-9]{40}$/u),
    releaseClass: z.enum(['PATCH', 'COMPATIBLE', 'BREAKING', 'SAFETY', 'SOURCE_REFRESH']),
    status: z.enum(['DRAFT', 'CANDIDATE', 'APPROVED', 'SUPERSEDED', 'RETIRED', 'REVOKED']),
    artifacts: z.array(ReleaseArtifactV1Schema).min(1).max(32),
    compatibleRoutes: z
      .array(ExperienceRouteIdV1Schema)
      .min(1)
      .max(EXPERIENCE_ROUTE_IDS_V1.length)
      .refine(
        (routes) => new Set(routes).size === routes.length,
        'Compatible routes must be unique',
      ),
    compatibleHosts: z
      .array(z.enum(['CLAUDE', 'CODEX', 'CHATGPT', 'TEXT_FALLBACK']))
      .min(1)
      .max(4),
    invalidatedObjects: z.array(RelativePathSchema).max(32),
    gaps: z.array(z.string().trim().min(1).max(500)).max(32),
    migration: ReleaseArtifactV1Schema,
    restore: ReleaseArtifactV1Schema,
    acceptanceEvidence: z.array(ReleaseArtifactV1Schema).min(1).max(32),
    decisions: z.array(ReleaseDecisionV1Schema).max(3),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (value.status !== 'APPROVED') {
      return;
    }
    const decisions = new Map(value.decisions.map((item) => [item.role, item.decision]));
    if (
      decisions.get('RT-09') !== 'PASS' ||
      decisions.get('RT-11') !== 'PASS' ||
      decisions.get('H01') !== 'APPROVE'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'APPROVED requires RT-09 PASS, RT-11 PASS and H01 APPROVE.',
      });
    }
  });
export type ExperienceReleaseCapsuleV1 = z.infer<typeof ExperienceReleaseCapsuleV1Schema>;
