import {z} from 'zod';
import {HashRefSchema, IdSchema, PortableRefSchema, Sha256Schema, hashModel} from './common.ts';

export const TrainerStateSchema = z.enum([
  'INTAKE',
  'CONTEXT_READY',
  'SPEC_READY',
  'DESIGN_LOCKED',
  'COMPILED',
  'VERIFIED',
  'HUMAN_REVIEW',
  'RENDERED_DRAFT',
]);
const HumanReviewReceiptRefSchema = HashRefSchema.extend({
  actorId: z.literal('H01'),
  verdict: z.literal('APPROVED'),
  buildManifestSha256: Sha256Schema,
  verificationReceiptSha256: Sha256Schema,
});
export const TrainerRunManifestV1Schema = z
  .strictObject({
    schemaVersion: z.literal('trainer-run-manifest-v1'),
    runId: IdSchema,
    manifestSha256: Sha256Schema,
    projectId: z.literal('trainer-os'),
    state: TrainerStateSchema,
    intakeRef: PortableRefSchema,
    intake: HashRefSchema.optional(),
    routeSpec: HashRefSchema.optional(),
    designLock: HashRefSchema.optional(),
    artifactPlan: HashRefSchema.optional(),
    buildManifest: HashRefSchema.optional(),
    verificationReceipt: HashRefSchema.optional(),
    humanReviewReceipt: HumanReviewReceiptRefSchema.optional(),
    stateOutput: HashRefSchema.optional(),
    resumeOutput: HashRefSchema.optional(),
    handoffOutput: HashRefSchema.optional(),
    stateRef: PortableRefSchema,
    resumeRef: PortableRefSchema,
    handoffRef: PortableRefSchema,
    invalidated: z.array(
      z.enum([
        'routeSpec',
        'designLock',
        'artifactPlan',
        'buildManifest',
        'verificationReceipt',
        'humanReviewReceipt',
      ]),
    ),
    maximumState: z.literal('RENDERED_DRAFT'),
    effects: z.strictObject({
      network: z.literal(false),
      connectors: z.literal(false),
      publication: z.literal(false),
    }),
    tokenBudget: z.strictObject({
      maximum: z.number().int().positive().max(12000),
      estimated: z.number().int().nonnegative(),
      measured: z.number().int().nonnegative(),
    }),
  })
  .superRefine((value, context) => {
    const states = [
      'INTAKE',
      'CONTEXT_READY',
      'SPEC_READY',
      'DESIGN_LOCKED',
      'COMPILED',
      'VERIFIED',
      'HUMAN_REVIEW',
      'RENDERED_DRAFT',
    ] as const;
    const rank = states.indexOf(value.state);
    const stagedFields = [
      ['intake', 1],
      ['routeSpec', 2],
      ['designLock', 3],
      ['artifactPlan', 4],
      ['buildManifest', 4],
      ['verificationReceipt', 5],
      ['humanReviewReceipt', 7],
    ] as const;
    for (const [field, minimumRank] of stagedFields) {
      if (rank < minimumRank && value[field])
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} is not allowed before ${states[minimumRank]}`,
        });
    }
    if (rank >= 1 && !value.intake)
      context.addIssue({code: 'custom', path: ['intake'], message: 'state requires intake'});
    if (rank >= 1 && (!value.stateOutput || !value.resumeOutput || !value.handoffOutput))
      context.addIssue({
        code: 'custom',
        path: ['stateOutput'],
        message: 'state requires continuity outputs',
      });
    if (rank >= 2 && !value.routeSpec)
      context.addIssue({code: 'custom', path: ['routeSpec'], message: 'state requires route spec'});
    if (rank >= 3 && !value.designLock)
      context.addIssue({
        code: 'custom',
        path: ['designLock'],
        message: 'state requires design lock',
      });
    if (rank >= 4 && (!value.artifactPlan || !value.buildManifest))
      context.addIssue({
        code: 'custom',
        path: ['artifactPlan'],
        message: 'compiled state requires plan and build',
      });
    if (rank >= 5 && !value.verificationReceipt)
      context.addIssue({
        code: 'custom',
        path: ['verificationReceipt'],
        message: 'verified state requires receipt',
      });
    if (rank >= 7 && !value.humanReviewReceipt)
      context.addIssue({
        code: 'custom',
        path: ['humanReviewReceipt'],
        message: 'rendered draft requires human review receipt',
      });
    if (
      value.humanReviewReceipt &&
      value.buildManifest &&
      value.humanReviewReceipt.buildManifestSha256 !== value.buildManifest.sha256
    )
      context.addIssue({
        code: 'custom',
        path: ['humanReviewReceipt', 'buildManifestSha256'],
        message: 'human review must bind the current build',
      });
    if (
      value.humanReviewReceipt &&
      value.verificationReceipt &&
      value.humanReviewReceipt.verificationReceiptSha256 !== value.verificationReceipt.sha256
    )
      context.addIssue({
        code: 'custom',
        path: ['humanReviewReceipt', 'verificationReceiptSha256'],
        message: 'human review must bind the current verification',
      });
    const invalidatableFields = [
      'routeSpec',
      'designLock',
      'artifactPlan',
      'buildManifest',
      'verificationReceipt',
      'humanReviewReceipt',
    ] as const;
    for (const key of value.invalidated) {
      const keyIndex = invalidatableFields.indexOf(key);
      for (const descendant of invalidatableFields.slice(keyIndex)) {
        if (!value.invalidated.includes(descendant))
          context.addIssue({
            code: 'custom',
            path: ['invalidated'],
            message: `${key} invalidation must include ${descendant}`,
          });
        if (value[descendant])
          context.addIssue({
            code: 'custom',
            path: [descendant],
            message: 'invalidated descendant must be absent',
          });
      }
    }
    if (value.intake && value.intake.ref !== value.intakeRef)
      context.addIssue({code: 'custom', path: ['intakeRef'], message: 'intake ref mismatch'});
    for (const [output, ref] of [
      ['stateOutput', 'stateRef'],
      ['resumeOutput', 'resumeRef'],
      ['handoffOutput', 'handoffRef'],
    ] as const)
      if (value[output] && value[output].ref !== value[ref])
        context.addIssue({
          code: 'custom',
          path: [ref],
          message: `${output} ref mismatch`,
        });
    if (new Set(value.invalidated).size !== value.invalidated.length)
      context.addIssue({
        code: 'custom',
        path: ['invalidated'],
        message: 'invalidated must be unique',
      });
    if (
      value.tokenBudget.estimated > value.tokenBudget.maximum ||
      value.tokenBudget.measured > value.tokenBudget.maximum
    )
      context.addIssue({code: 'custom', path: ['tokenBudget'], message: 'token budget exceeded'});
    if (hashModel(value, 'manifestSha256') !== value.manifestSha256)
      context.addIssue({code: 'custom', path: ['manifestSha256'], message: 'manifest hash drift'});
  });

export type TrainerRunManifestV1 = z.infer<typeof TrainerRunManifestV1Schema>;
