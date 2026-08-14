import {z} from 'zod';

import {CvCompositionIdV1Schema} from './cv-design-system-v1.schema.ts';
import {PortableRefSchema, Sha256Schema} from './primitives-v1.schema.ts';

const CvDesignOptionV1Schema = z.strictObject({
  composition_id: CvCompositionIdV1Schema,
  rationale_ref: PortableRefSchema,
  rationale_sha256: Sha256Schema,
  preview_ref: PortableRefSchema,
  preview_sha256: Sha256Schema,
});

export const CvDesignDecisionApprovalV1Schema = z.strictObject({
  status: z.literal('HUMAN_APPROVED'),
  approved_decision_sha256: Sha256Schema,
  approver_ref: z.string().regex(/^H[0-9]{2}$/u),
  approved_at: z.iso.datetime({offset: true}),
});

export const CvDesignDecisionV1Schema = z
  .strictObject({
    schema_version: z.literal('cv-design-decision-v1'),
    decision_id: z.string().regex(/^CVDESIGN-[A-Z0-9-]{3,79}$/u),
    brief_id: z.string().regex(/^CVDBRIEF-[A-Z0-9-]{3,79}$/u),
    brief_sha256: Sha256Schema,
    design_system_id: z.string().regex(/^CVDS-[A-Z0-9-]{3,79}$/u),
    design_system_sha256: Sha256Schema,
    options: z.array(CvDesignOptionV1Schema).length(2),
    selected_composition: CvCompositionIdV1Schema.nullable(),
    state: z.enum(['DESIGN_OPTIONS_READY', 'HUMAN_APPROVED', 'BLOCKED']),
    next_gate: z.literal('CR_CV_DESIGN_APPROVED'),
    approval: CvDesignDecisionApprovalV1Schema.nullable(),
    decision_sha256: Sha256Schema,
  })
  .superRefine((decision, context) => {
    const optionIds = decision.options.map(({composition_id}) => composition_id);
    const expected = ['blueprint-executive', 'neo-swiss-editorial'];
    if ([...optionIds].sort().join('|') !== expected.sort().join('|')) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Exactly two governed options required',
      });
    }
    const approved = decision.state === 'HUMAN_APPROVED';
    if (approved !== (decision.approval !== null && decision.selected_composition !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['approval'],
        message: 'HUMAN_APPROVED requires exactly one selection and hash-bound approval',
      });
    }
    if (!approved && (decision.approval !== null || decision.selected_composition !== null)) {
      context.addIssue({code: 'custom', message: 'Unapproved decision cannot carry a selection'});
    }
  });

export type CvDesignDecisionV1 = z.infer<typeof CvDesignDecisionV1Schema>;
