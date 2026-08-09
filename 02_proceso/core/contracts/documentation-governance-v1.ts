import {z} from 'zod';

import {ActorIdSchema, PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';
import {GitCommitSchema} from './creation-v3.ts';

export const MutationClassV1Schema = z.enum([
  'CREATE',
  'EXPAND',
  'EXTEND',
  'CORRECT',
  'MIGRATE',
  'DEPRECATE',
]);
export type MutationClassV1 = z.infer<typeof MutationClassV1Schema>;

export const DocumentationSurfaceV1Schema = z.enum([
  'QUICK_START',
  'FUNCTIONAL_GUIDE',
  'TECHNICAL_REFERENCE',
  'ARCHITECTURE',
  'WORKFLOW_SEQUENCE',
  'SKILL_CONTEXT',
  'TEMPLATES_DELIVERABLES',
  'ROUTING_COMMANDS',
  'TROUBLESHOOTING',
  'ADR',
  'CHANGELOG_COMPATIBILITY',
  'INDEXES_INVENTORIES',
  'PORTAL',
  'TESTS_EXAMPLES',
]);
export type DocumentationSurfaceV1 = z.infer<typeof DocumentationSurfaceV1Schema>;

const RequiredSurfaceSchema = z.strictObject({
  surface: DocumentationSurfaceV1Schema,
  disposition: z.literal('REQUIRED'),
  sourceRefs: z.array(RelativePathSchema).min(1).max(20),
});
const NotApplicableSurfaceSchema = z.strictObject({
  surface: DocumentationSurfaceV1Schema,
  disposition: z.literal('NOT_APPLICABLE'),
  reasonCode: z.enum([
    'NO_USER_VISIBLE_CHANGE',
    'NO_ARCHITECTURE_CHANGE',
    'NO_WORKFLOW_CHANGE',
    'NO_ROUTING_CHANGE',
    'NO_COMPATIBILITY_CHANGE',
    'LOCAL_SCOPE_ONLY',
  ]),
});
const SurfaceDispositionSchema = z.discriminatedUnion('disposition', [
  RequiredSurfaceSchema,
  NotApplicableSurfaceSchema,
]);

export const DocumentationImpactPlanV1Schema = z
  .strictObject({
    schemaVersion: z.literal('documentation-impact-plan-v1'),
    planId: PortableIdSchema,
    changeClass: MutationClassV1Schema,
    scope: z.enum(['CANONICAL', 'PROJECT_LOCAL', 'USER_LOCAL']),
    affectedIds: z.array(PortableIdSchema).min(1).max(40),
    surfaces: z.array(SurfaceDispositionSchema).length(DocumentationSurfaceV1Schema.options.length),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    const ids = value.surfaces.map(({surface}) => surface);
    if (new Set(ids).size !== DocumentationSurfaceV1Schema.options.length) {
      context.addIssue({code: 'custom', message: 'Every documentation surface must resolve once.'});
    }
    if (
      value.scope !== 'CANONICAL' &&
      value.surfaces.some(
        (item) =>
          item.disposition === 'REQUIRED' &&
          item.sourceRefs.some((ref) => !ref.startsWith('04_estado/local/')),
      )
    ) {
      context.addIssue({code: 'custom', message: 'Local impact plans may only write local docs.'});
    }
  });
export type DocumentationImpactPlanV1 = z.infer<typeof DocumentationImpactPlanV1Schema>;

export const DocumentationClosureReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('documentation-closure-receipt-v1'),
    receiptId: PortableIdSchema,
    impactPlanSha256: Sha256Schema,
    candidateSha256: Sha256Schema,
    baseCommit: GitCommitSchema,
    headCommit: GitCommitSchema,
    actorId: ActorIdSchema,
    verifierActorId: ActorIdSchema,
    status: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
    sources: z.array(z.strictObject({ref: RelativePathSchema, sha256: Sha256Schema})).max(40),
    projections: z.array(z.strictObject({ref: RelativePathSchema, sha256: Sha256Schema})).max(80),
    checks: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
    privacyStatus: z.enum(['PASS', 'FAIL', 'UNKNOWN']),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (value.actorId === value.verifierActorId) {
      context.addIssue({
        code: 'custom',
        message: 'Producer and documentation verifier must differ.',
      });
    }
    if (
      value.status === 'PASS' &&
      (value.sources.length === 0 ||
        value.projections.length === 0 ||
        value.privacyStatus !== 'PASS')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'PASS requires sources, projections and privacy PASS.',
      });
    }
  });
export type DocumentationClosureReceiptV1 = z.infer<typeof DocumentationClosureReceiptV1Schema>;

export const MutationProfileV1Schema = z.strictObject({
  skillId: PortableIdSchema,
  mutationClasses: z.array(MutationClassV1Schema).max(MutationClassV1Schema.options.length),
  documentationImpactRequired: z.boolean(),
});
export type MutationProfileV1 = z.infer<typeof MutationProfileV1Schema>;
