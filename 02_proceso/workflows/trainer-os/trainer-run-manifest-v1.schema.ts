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
    stateOutput: HashRefSchema.optional(),
    resumeOutput: HashRefSchema.optional(),
    handoffOutput: HashRefSchema.optional(),
    stateRef: PortableRefSchema,
    resumeRef: PortableRefSchema,
    handoffRef: PortableRefSchema,
    invalidated: z.array(
      z.enum(['routeSpec', 'designLock', 'artifactPlan', 'buildManifest', 'verificationReceipt']),
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
    const rank = [
      'INTAKE',
      'CONTEXT_READY',
      'SPEC_READY',
      'DESIGN_LOCKED',
      'COMPILED',
      'VERIFIED',
      'HUMAN_REVIEW',
      'RENDERED_DRAFT',
    ].indexOf(value.state);
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
    for (const key of value.invalidated)
      if (value[key])
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'invalidated descendant must be absent',
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
