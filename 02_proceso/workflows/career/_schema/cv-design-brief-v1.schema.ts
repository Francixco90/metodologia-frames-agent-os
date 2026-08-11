import {z} from 'zod';

import {CvOutputKindV1Schema} from './cv-spec-v1.schema.ts';
import {
  CareerDesignSystemRefV1Schema,
  CvCompositionIdV1Schema,
} from './cv-design-system-v1.schema.ts';
import {Sha256Schema} from './primitives-v1.schema.ts';

export const CvDesignBriefV1Schema = z
  .strictObject({
    schema_version: z.literal('cv-design-brief-v1'),
    brief_id: z.string().regex(/^CVDBRIEF-[A-Z0-9-]{3,79}$/u),
    candidate_id: z.string().regex(/^CAND-[A-Z0-9-]{3,79}$/u),
    audiences: z
      .array(z.enum(['recruiter', 'hiring_manager']))
      .min(1)
      .max(2),
    languages: z
      .array(z.enum(['es', 'en', 'pt']))
      .min(1)
      .max(3),
    requested_outputs: z.array(CvOutputKindV1Schema).min(1).max(4),
    density: z.enum(['compact', 'balanced', 'editorial']),
    hierarchy: z
      .array(z.enum(['identity', 'positioning', 'proof', 'experience', 'capabilities']))
      .min(3)
      .max(5),
    interaction_depth: z.enum(['minimal', 'progressive-disclosure']),
    constraints: z.array(z.string().min(1).max(300)).max(20),
    design_system: CareerDesignSystemRefV1Schema,
    requested_compositions: z.array(CvCompositionIdV1Schema).length(2),
    state: z.enum(['DRAFT', 'DESIGN_OPTIONS_READY', 'BLOCKED']),
    next_gate: z.literal('CR_CV_DESIGN_APPROVED'),
    brief_sha256: Sha256Schema,
  })
  .superRefine((brief, context) => {
    const expected = ['blueprint-executive', 'neo-swiss-editorial'];
    if ([...brief.requested_compositions].sort().join('|') !== expected.sort().join('|')) {
      context.addIssue({
        code: 'custom',
        path: ['requested_compositions'],
        message: 'Brief must request exactly the two governed alternatives',
      });
    }
    if (!brief.requested_outputs.includes('executive-html')) {
      context.addIssue({
        code: 'custom',
        path: ['requested_outputs'],
        message: 'Design brief is only required for executive HTML',
      });
    }
  });

export type CvDesignBriefV1 = z.infer<typeof CvDesignBriefV1Schema>;
