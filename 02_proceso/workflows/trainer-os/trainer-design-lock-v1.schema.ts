import {z} from 'zod';
import {HashRefSchema, IdSchema, Sha256Schema, hashModel} from './common.ts';

export const TrainerDesignLockV1Schema = z
  .strictObject({
    schemaVersion: z.literal('trainer-design-lock-v1'),
    lockId: IdSchema,
    designLockSha256: Sha256Schema,
    routeSpec: HashRefSchema,
    decision: z.literal('human-selected'),
    selectedDirectionId: IdSchema,
    directions: z
      .array(z.strictObject({directionId: IdSchema, summary: z.string().min(1).max(300)}))
      .length(2),
    decisionReceipt: HashRefSchema,
    decisionActor: z.literal('H01'),
    tokens: HashRefSchema,
    components: z.array(IdSchema).min(1),
    accessibility: z.strictObject({contrast: z.literal('AA'), reducedMotion: z.literal(true)}),
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    if (!value.directions.some(({directionId}) => directionId === value.selectedDirectionId))
      context.addIssue({
        code: 'custom',
        path: ['selectedDirectionId'],
        message: 'selected direction must be one of exactly two directions',
      });
    if (new Set(value.directions.map(({directionId}) => directionId)).size !== 2)
      context.addIssue({
        code: 'custom',
        path: ['directions'],
        message: 'directions must be unique',
      });
    if (hashModel(value, 'designLockSha256') !== value.designLockSha256)
      context.addIssue({
        code: 'custom',
        path: ['designLockSha256'],
        message: 'design lock hash drift',
      });
  });

export type TrainerDesignLockV1 = z.infer<typeof TrainerDesignLockV1Schema>;
