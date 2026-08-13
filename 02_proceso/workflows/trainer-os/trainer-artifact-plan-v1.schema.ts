import {z} from 'zod';
import {HashRefSchema, IdSchema, PortableRefSchema, Sha256Schema, hashModel} from './common.ts';

export const TrainerArtifactPlanV1Schema = z
  .strictObject({
    schemaVersion: z.literal('trainer-artifact-plan-v1'),
    planId: IdSchema,
    planSha256: Sha256Schema,
    routeSpec: HashRefSchema,
    designLock: HashRefSchema,
    artifacts: z
      .array(
        z.strictObject({
          artifactId: IdSchema,
          kind: z.enum(['landing', 'masterclass', 'workbook', 'playbook', 'prompt-library']),
          outputRef: PortableRefSchema,
          acceptanceCriteria: z.array(z.string().min(1)).min(1),
        }),
      )
      .min(1),
    maximumState: z.literal('RENDERED_DRAFT'),
    publicationAuthority: z.literal(false),
    progressiveDisclosure: z.enum(['overview', 'focused', 'deep']),
    tokenBudget: z.strictObject({
      maximum: z.number().int().positive().max(12000),
      estimated: z.number().int().nonnegative(),
      measured: z.number().int().nonnegative(),
    }),
  })
  .superRefine((value, context) => {
    if (
      value.tokenBudget.estimated > value.tokenBudget.maximum ||
      value.tokenBudget.measured > value.tokenBudget.maximum
    )
      context.addIssue({code: 'custom', path: ['tokenBudget'], message: 'token budget exceeded'});
    if (
      new Set(value.artifacts.map(({artifactId}) => artifactId)).size !== value.artifacts.length ||
      new Set(value.artifacts.map(({outputRef}) => outputRef)).size !== value.artifacts.length
    )
      context.addIssue({
        code: 'custom',
        path: ['artifacts'],
        message: 'artifact ids and output refs must be unique',
      });
    if (hashModel(value, 'planSha256') !== value.planSha256)
      context.addIssue({code: 'custom', path: ['planSha256'], message: 'plan hash drift'});
  });

export type TrainerArtifactPlanV1 = z.infer<typeof TrainerArtifactPlanV1Schema>;
