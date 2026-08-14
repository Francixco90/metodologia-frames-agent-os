import {z} from 'zod';
import {HashRefSchema, IdSchema, Sha256Schema, hashModel} from './common.ts';

export const TrainerIntakeV1Schema = z
  .strictObject({
    schemaVersion: z.literal('trainer-intake-v1'),
    intakeId: IdSchema,
    intakeSha256: Sha256Schema,
    locale: z.enum(['es', 'en', 'pt']),
    audience: z.string().min(1).max(500),
    purpose: z.string().min(1).max(500),
    observableOutcomes: z.array(z.string().min(1).max(300)).min(1).max(12),
    constraints: z.array(z.string().min(1).max(300)).max(12),
    discovery: z.strictObject({
      promptRounds: z
        .array(
          z.strictObject({
            round: z.number().int().min(1).max(5),
            prompt: z.string().min(1).max(300),
            blocking: z.boolean(),
          }),
        )
        .min(3)
        .max(5),
      progressiveDisclosure: z.enum(['overview', 'focused', 'deep']),
      tokenBudget: z.strictObject({
        maximum: z.number().int().positive().max(12000),
        estimated: z.number().int().nonnegative(),
        measured: z.number().int().nonnegative(),
      }),
    }),
    decisions: z
      .array(
        z.strictObject({
          label: z.enum(['[INFERENCIA]', '[SUPUESTO]']),
          statement: z.string().min(1).max(300),
        }),
      )
      .max(12),
    sourceRefs: z.array(HashRefSchema).max(20),
    privacyReviewed: z.literal(true),
  })
  .superRefine((value, context) => {
    if (value.discovery.promptRounds.filter(({blocking}) => blocking).length > 2)
      context.addIssue({
        code: 'custom',
        path: ['discovery', 'promptRounds'],
        message: 'maximum two blocking questions',
      });
    if (value.discovery.promptRounds.some(({round}, index) => round !== index + 1))
      context.addIssue({
        code: 'custom',
        path: ['discovery', 'promptRounds'],
        message: 'rounds must be sequential from 1',
      });
    if (
      value.discovery.tokenBudget.estimated > value.discovery.tokenBudget.maximum ||
      value.discovery.tokenBudget.measured > value.discovery.tokenBudget.maximum
    )
      context.addIssue({
        code: 'custom',
        path: ['discovery', 'tokenBudget'],
        message: 'token budget exceeded',
      });
    if (hashModel(value, 'intakeSha256') !== value.intakeSha256)
      context.addIssue({code: 'custom', path: ['intakeSha256'], message: 'intake hash drift'});
  });

export type TrainerIntakeV1 = z.infer<typeof TrainerIntakeV1Schema>;
