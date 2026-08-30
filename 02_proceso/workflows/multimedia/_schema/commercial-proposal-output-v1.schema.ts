import {z} from 'zod';

import * as P from '../../../core/contracts/primitives.ts';
import * as Common from './commercial-proposal-common-v1.schema.ts';

// prettier-ignore
const ArtifactSchema = z.strictObject({format: z.enum(['md', 'html', 'json', 'csv']), relativePath: P.RelativePathSchema, mediaType: z.enum(['text/markdown', 'text/html', 'application/json', 'text/csv']), bytes: z.number().int().positive(), sha256: P.Sha256Schema});
export const CommercialProposalArtifactManifestV1Schema = z
  .strictObject({
    schemaVersion: z.literal('commercial-proposal-artifact-manifest-v1'),
    manifestId: P.PortableIdSchema,
    proposalId: P.PortableIdSchema,
    specSha256: P.Sha256Schema,
    readinessSha256: P.Sha256Schema,
    workOrderSha256: P.Sha256Schema,
    authorizationSha256: P.Sha256Schema,
    sourceAuthorityManifestSha256: P.Sha256Schema,
    commercialAuthorityManifestSha256: P.Sha256Schema,
    template: Common.CommercialProposalTemplateBindingV1Schema,
    sectionSequence: Common.CommercialProposalSectionSequenceV1Schema,
    commercialInputsSha256: Common.CommercialProposalInputHashesV1Schema,
    artifacts: z.array(ArtifactSchema).length(4),
    deck: Common.CommercialProposalDeckGateV1Schema.safeExtend({materialized: z.literal(false)}),
    maximumAutomaticState: z.literal('RENDERED_DRAFT'),
    canonicalSha256: P.Sha256Schema,
  })
  .superRefine((value, context) => {
    if (new Set(value.artifacts.map(({format}) => format)).size !== 4)
      context.addIssue({code: 'custom', path: ['artifacts'], message: 'four formats required'});
    Common.checkCommercialProposalCanonicalSha256(value, context);
  });
// prettier-ignore
export const CommercialProposalAuthorizationV1Schema = z.strictObject({scope: z.literal('PROJECT_LOCAL'), contentClass: z.literal('commercial-proposal'), producerActorInstanceId: P.ActorIdSchema, workOrderSha256: P.Sha256Schema, specSha256: P.Sha256Schema, readinessSha256: P.Sha256Schema, sourceManifestSha256: P.Sha256Schema, sourceAuthorityManifestSha256: P.Sha256Schema, commercialAuthorityManifestSha256: P.Sha256Schema, templateSha256: z.literal(Common.COMMERCIAL_PROPOSAL_TEMPLATE_SHA256_V1), inputsSha256: P.Sha256Schema});
// prettier-ignore
const VerificationChecksSchema = z.strictObject({contracts: z.enum(['PASS', 'FAIL']), contractBinding: z.enum(['PASS', 'FAIL']), executionBinding: z.enum(['PASS', 'FAIL']), materialBinding: z.enum(['PASS', 'FAIL']), artifactBinding: z.enum(['PASS', 'FAIL']), templateProjection: z.enum(['PASS', 'FAIL']), markdownHtmlParity: z.enum(['PASS', 'FAIL']), canonicalJson: z.enum(['PASS', 'FAIL']), rfc4180: z.enum(['PASS', 'FAIL']), deckBoundary: z.enum(['PASS', 'FAIL'])});
export const CommercialProposalVerificationV1Schema = z
  .strictObject({
    schemaVersion: z.literal('commercial-proposal-verification-v1'),
    receiptId: P.PortableIdSchema,
    proposalId: P.PortableIdSchema,
    specSha256: P.Sha256Schema,
    manifestSha256: P.Sha256Schema,
    evidenceSha256: P.Sha256Schema,
    verdict: z.enum(['PASS', 'REVISE', 'BLOCKED']),
    checks: VerificationChecksSchema,
    issues: z.array(Common.CommercialProposalTextV1Schema).max(80),
    environment: z.literal('LOCAL_SIMULATION'),
    canonicalSha256: P.Sha256Schema,
  })
  .superRefine((value, context) => {
    const passed = Object.values(value.checks).every((check) => check === 'PASS');
    if ((value.verdict === 'PASS') !== (passed && value.issues.length === 0))
      context.addIssue({code: 'custom', path: ['verdict'], message: 'verification verdict drift'});
    if (value.verdict !== 'PASS' && value.issues.length === 0)
      context.addIssue({code: 'custom', path: ['issues'], message: 'non-PASS requires issues'});
    Common.checkCommercialProposalCanonicalSha256(value, context);
  });

export type CommercialProposalArtifactManifestV1 = z.output<
  typeof CommercialProposalArtifactManifestV1Schema
>;
export type CommercialProposalVerificationV1 = z.output<
  typeof CommercialProposalVerificationV1Schema
>;
export type CommercialProposalAuthorizationV1 = z.output<
  typeof CommercialProposalAuthorizationV1Schema
>;
