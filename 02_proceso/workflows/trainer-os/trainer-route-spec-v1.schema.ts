import {z} from 'zod';
import {HashRefSchema, IdSchema, Sha256Schema, hashModel} from './common.ts';

export const TrainerRouteSpecV1Schema = z
  .strictObject({
    schemaVersion: z.literal('trainer-route-spec-v1'),
    routeId: IdSchema,
    specSha256: Sha256Schema,
    intake: HashRefSchema,
    locale: z.enum(['es', 'en', 'pt']),
    purpose: z.string().min(1).max(500),
    outcomes: z.array(z.string().min(1).max(300)).min(1).max(12),
    modules: z
      .array(
        z.strictObject({
          moduleId: IdSchema,
          title: z.string().min(1).max(160),
          outcome: z.string().min(1).max(300),
          evidence: z.string().min(1).max(300),
        }),
      )
      .min(1)
      .max(12),
    acceptanceCriteria: z.array(z.string().min(1).max(300)).min(1).max(20),
    decisions: z
      .array(
        z.strictObject({
          label: z.enum(['[INFERENCIA]', '[SUPUESTO]']),
          statement: z.string().min(1).max(300),
        }),
      )
      .min(1),
  })
  .superRefine((value, context) => {
    if (new Set(value.modules.map(({moduleId}) => moduleId)).size !== value.modules.length)
      context.addIssue({code: 'custom', path: ['modules'], message: 'module ids must be unique'});
    if (hashModel(value, 'specSha256') !== value.specSha256)
      context.addIssue({code: 'custom', path: ['specSha256'], message: 'spec hash drift'});
  });

export type TrainerRouteSpecV1 = z.infer<typeof TrainerRouteSpecV1Schema>;
