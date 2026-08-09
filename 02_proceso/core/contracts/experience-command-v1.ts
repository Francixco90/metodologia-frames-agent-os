import {z} from 'zod';

import {PortableIdSchema, Sha256Schema} from './primitives.ts';
import {ExperienceRouteIdV1Schema} from './experience-assistance-v1.ts';

export const ExperienceCommandViewV1Schema = z.strictObject({
  schemaVersion: z.literal('experience-command-view-v1'),
  command: z.enum(['MENU', 'ROUTE']),
  identity: z.literal('Frames ContentOS · por MetodologIA'),
  title: z.string().trim().min(1).max(120),
  primaryAction: z.string().trim().min(1).max(120),
  options: z.array(z.string().trim().min(1).max(80)).max(4),
  selectedRoute: ExperienceRouteIdV1Schema.nullable(),
  workflowPlan: z.array(PortableIdSchema).max(10),
  activeStep: PortableIdSchema.nullable(),
  nextGate: z.string().trim().min(1).max(80),
  envelopeHash: Sha256Schema.nullable(),
  readOnly: z.literal(true),
  effects: z.tuple([]),
});
export type ExperienceCommandViewV1 = z.infer<typeof ExperienceCommandViewV1Schema>;
