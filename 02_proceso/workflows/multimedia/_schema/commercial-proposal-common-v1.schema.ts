import {z} from 'zod';

import * as P from '../../../core/contracts/primitives.ts';
import {hashCanonical} from '../../../core/evidence/hash.ts';

export const CommercialProposalTextV1Schema = z.string().trim().min(1).max(2_000);
export const COMMERCIAL_PROPOSAL_TEMPLATE_REF_V1 =
  '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/knowledge-base/30-templates/channels/30-template--commercial-proposal-deck--v1.0.md' as const;
export const COMMERCIAL_PROPOSAL_TEMPLATE_SHA256_V1 =
  'b430c922eea9068648cf81f75981c240973c2eea6b13faa02702b7b9b5c10863' as const;
// prettier-ignore
export const COMMERCIAL_PROPOSAL_SECTION_SEQUENCE_V1 = ['client situation', 'outcomes', 'approach', 'scope', 'evidence', 'risks', 'commercial boundary', 'next step'] as const;
// prettier-ignore
export const calculateCommercialProposalCanonicalSha256 = (value: object): string => hashCanonical(Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'canonicalSha256')));
export const checkCommercialProposalCanonicalSha256 = (
  value: {canonicalSha256: string},
  context: z.RefinementCtx,
): void => {
  if (calculateCommercialProposalCanonicalSha256(value) !== value.canonicalSha256)
    context.addIssue({code: 'custom', path: ['canonicalSha256'], message: 'canonical hash drift'});
};
// prettier-ignore
export const CommercialProposalEvidenceBindingV1Schema = z.strictObject({sourceId: z.string().min(1).max(120), sourceSha256: P.Sha256Schema});
export const CommercialProposalDeckGateV1Schema = z
  .strictObject({
    requested: z.boolean(),
    explicitConfirmation: z.boolean(),
    confirmationSha256: P.Sha256Schema.nullable(),
  })
  .superRefine((gate, context) => {
    if (gate.explicitConfirmation !== (gate.requested && gate.confirmationSha256 !== null))
      context.addIssue({code: 'custom', message: 'deck confirmation drift'});
  });
// prettier-ignore
export const CommercialProposalPrivacyV1Schema = z.strictObject({piiStatus: z.literal('NONE'), privacyReviewReceiptSha256: z.null()});
// prettier-ignore
export const CommercialProposalTemplateBindingV1Schema = z.strictObject({ref: z.literal(COMMERCIAL_PROPOSAL_TEMPLATE_REF_V1), sha256: z.literal(COMMERCIAL_PROPOSAL_TEMPLATE_SHA256_V1)});
export const CommercialProposalSectionSequenceV1Schema = z
  .array(z.enum(COMMERCIAL_PROPOSAL_SECTION_SEQUENCE_V1))
  .length(COMMERCIAL_PROPOSAL_SECTION_SEQUENCE_V1.length)
  .superRefine((value, context) => {
    if (value.some((section, index) => section !== COMMERCIAL_PROPOSAL_SECTION_SEQUENCE_V1[index]))
      context.addIssue({code: 'custom', message: 'commercial template sequence drift'});
  });
// prettier-ignore
export const CommercialProposalInputHashesV1Schema = z.strictObject({clientContext: P.Sha256Schema, offerScope: P.Sha256Schema, commercialStatus: P.Sha256Schema});
