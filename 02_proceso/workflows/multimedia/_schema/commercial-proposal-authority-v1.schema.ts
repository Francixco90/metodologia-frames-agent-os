import {z} from 'zod';

import {hashExperienceValue} from '../../../core/contracts/experience-normalization.ts';
import * as P from '../../../core/contracts/primitives.ts';
import {hashCanonical} from '../../../core/evidence/hash.ts';
import {BriefSourceAuthorityReceiptV1Schema} from './brief-v1.schema.ts';

const Text = z.string().trim().min(1).max(2_000);
const AuthorityKindSchema = z.enum(['ROI', 'PRICING', 'COMMITMENT']);
const canonicalHash = (value: object): string =>
  hashCanonical(
    Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'canonicalSha256')),
  );
const checkHash = (value: {canonicalSha256: string}, context: z.RefinementCtx): void => {
  if (canonicalHash(value) !== value.canonicalSha256)
    context.addIssue({code: 'custom', path: ['canonicalSha256'], message: 'canonical hash drift'});
};

export const CommercialProposalAuthorityBindingV1Schema = (
  kind: z.infer<typeof AuthorityKindSchema>,
) =>
  z.strictObject({
    kind: z.literal(kind),
    receiptId: P.PortableIdSchema,
    receiptSha256: P.Sha256Schema,
    subjectSha256: P.Sha256Schema,
    authority: z.literal('verified'),
    authorizedScope: Text,
  });

export const CommercialProposalAuthorityReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('commercial-proposal-authority-receipt-v1'),
    receiptId: P.PortableIdSchema,
    kind: AuthorityKindSchema,
    subjectSha256: P.Sha256Schema,
    authority: z.literal('verified'),
    authorityActorId: P.ActorIdSchema,
    authorizedScope: Text,
    allowedUseScope: z.literal('local_internal_commercial_draft_only'),
    restrictions: z
      .array(
        z.enum([
          'human_commercial_approval_required',
          'no_external_distribution',
          'no_publication',
        ]),
      )
      .length(3),
    environment: z.literal('LOCAL_SIMULATION'),
    issuedAt: P.TimestampSchema,
    canonicalSha256: P.Sha256Schema,
  })
  .superRefine((value, context) => {
    if (new Set(value.restrictions).size !== 3)
      context.addIssue({code: 'custom', path: ['restrictions'], message: 'restrictions drift'});
    checkHash(value, context);
  });

export const CommercialProposalAuthorityManifestV1Schema = z
  .strictObject({
    schemaVersion: z.literal('commercial-proposal-authority-manifest-v1'),
    manifestId: P.PortableIdSchema,
    entries: z.array(CommercialProposalAuthorityReceiptV1Schema).max(80),
    canonicalSha256: P.Sha256Schema,
  })
  .superRefine((value, context) => {
    if (new Set(value.entries.map(({receiptId}) => receiptId)).size !== value.entries.length)
      context.addIssue({code: 'custom', path: ['entries'], message: 'duplicate receiptId'});
    checkHash(value, context);
  });

export const CommercialProposalSourceAuthorityManifestV1Schema = z
  .strictObject({
    schemaVersion: z.literal('commercial-proposal-source-authority-manifest-v1'),
    manifestId: P.PortableIdSchema,
    entries: z.array(BriefSourceAuthorityReceiptV1Schema).min(1).max(12),
    canonicalSha256: P.Sha256Schema,
  })
  .superRefine((value, context) => {
    const sourceIds = value.entries.map(({source}) => source.source_id);
    if (new Set(sourceIds).size !== sourceIds.length)
      context.addIssue({code: 'custom', path: ['entries'], message: 'duplicate source authority'});
    value.entries.forEach((receipt, index) => {
      if (
        receipt.source.sha256 === null ||
        receipt.source.authority !== 'user_assertion' ||
        receipt.source.rights !== 'restricted' ||
        hashExperienceValue(receipt) !== receipt.canonicalSha256
      )
        context.addIssue({
          code: 'custom',
          path: ['entries', index],
          message: 'source authority receipt drift',
        });
    });
    checkHash(value, context);
  });

export type CommercialProposalAuthorityReceiptV1 = z.infer<
  typeof CommercialProposalAuthorityReceiptV1Schema
>;
export type CommercialProposalAuthorityManifestV1 = z.infer<
  typeof CommercialProposalAuthorityManifestV1Schema
>;
export type CommercialProposalSourceAuthorityManifestV1 = z.infer<
  typeof CommercialProposalSourceAuthorityManifestV1Schema
>;
