import {z} from 'zod';
import * as P from '../../../core/contracts/primitives.ts';
import {hashCanonical} from '../../../core/evidence/hash.ts';
import {BriefSourceSchema} from './brief-v1.schema.ts';
import {CommercialProposalAuthorityBindingV1Schema} from './commercial-proposal-authority-v1.schema.ts';
import * as Common from './commercial-proposal-common-v1.schema.ts';

const Text = Common.CommercialProposalTextV1Schema;
const TextList = z.array(Text).min(1).max(40);
const HorizonUnit = z.enum(['days', 'months', 'years']);
const EvidenceBindingSchema = Common.CommercialProposalEvidenceBindingV1Schema;
// prettier-ignore
const CommercialAuthoritySchema = CommercialProposalAuthorityBindingV1Schema;
export const CommercialProposalReadinessV1Schema = z
  .strictObject({
    schemaVersion: z.literal('commercial-proposal-readiness-v1'),
    readinessId: P.PortableIdSchema,
    proposalId: P.PortableIdSchema,
    contentClass: z.literal('commercial-proposal'),
    sourceManifestSha256: P.Sha256Schema,
    brandProfile: z.discriminatedUnion('status', [
      z.strictObject({status: z.literal('AVAILABLE'), profileSha256: P.Sha256Schema}),
      z.strictObject({status: z.literal('MISSING'), profileSha256: z.null()}),
    ]),
    deck: Common.CommercialProposalDeckGateV1Schema,
    status: z.enum(['READY', 'BLOCKED']),
    issues: z.array(Text).max(40),
    canonicalSha256: P.Sha256Schema,
  })
  .superRefine((value, context) => {
    if ((value.status === 'READY') !== (value.issues.length === 0))
      context.addIssue({code: 'custom', path: ['issues'], message: 'readiness status/issue drift'});
    Common.checkCommercialProposalCanonicalSha256(value, context);
  });
export const CommercialProposalClaimV1Schema = z
  .strictObject({
    schemaVersion: z.literal('commercial-proposal-claim-v1'),
    claimId: P.PortableIdSchema,
    statement: Text,
    classification: z.enum(['OBSERVED', 'INFERRED', 'ASSUMED']),
    evidence: z.array(EvidenceBindingSchema).min(1).max(20),
    limitations: z.array(Text).max(20),
    canonicalSha256: P.Sha256Schema,
  })
  .superRefine((value, context) => Common.checkCommercialProposalCanonicalSha256(value, context));
// prettier-ignore
const RoiSchema = z.strictObject({baseline: z.strictObject({value: z.number().finite(), unit: Text, source: EvidenceBindingSchema}), formula: Text, horizon: z.strictObject({value: z.number().positive(), unit: HorizonUnit}), unit: Text, source: EvidenceBindingSchema, authority: CommercialAuthoritySchema('ROI')});
// prettier-ignore
const PriceSchema = z.strictObject({item: Text, amount: z.number().nonnegative().finite(), currency: z.string().regex(/^[A-Z]{3}$/u), cadence: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL']), authority: CommercialAuthoritySchema('PRICING')});
// prettier-ignore
const CommitmentSchema = z.strictObject({statement: Text, owner: Text, acceptanceMeasure: Text, authority: CommercialAuthoritySchema('COMMITMENT')});
export const CommercialProposalSpecV1Schema = z
  .strictObject({
    schemaVersion: z.literal('commercial-proposal-spec-v1'),
    specId: P.PortableIdSchema,
    proposalId: P.PortableIdSchema,
    readinessSha256: P.Sha256Schema,
    workOrderSha256: P.Sha256Schema,
    sourceManifestSha256: P.Sha256Schema,
    sourceAuthorityManifestSha256: P.Sha256Schema,
    commercialAuthorityManifestSha256: P.Sha256Schema,
    sources: z.array(BriefSourceSchema).min(1).max(12),
    template: Common.CommercialProposalTemplateBindingV1Schema,
    sectionSequence: Common.CommercialProposalSectionSequenceV1Schema,
    clientContext: Text,
    offerScope: Text,
    commercialStatus: Text,
    audience: Text,
    objective: Text,
    privacy: Common.CommercialProposalPrivacyV1Schema,
    scope: z.strictObject({included: TextList, excluded: TextList}),
    assumptions: TextList,
    claims: z.array(CommercialProposalClaimV1Schema).min(1).max(40),
    roi: RoiSchema.nullable(),
    pricing: z.array(PriceSchema).max(40),
    commitments: z.array(CommitmentSchema).max(40),
    maximumAutomaticState: z.literal('RENDERED_DRAFT'),
    canonicalSha256: P.Sha256Schema,
  })
  .superRefine((value, context) => {
    const sources = new Map(value.sources.map((source) => [source.source_id, source]));
    if (sources.size !== value.sources.length)
      context.addIssue({code: 'custom', path: ['sources'], message: 'duplicate source_id'});
    if (hashCanonical(value.sources) !== value.sourceManifestSha256)
      context.addIssue({code: 'custom', path: ['sourceManifestSha256'], message: 'manifest drift'});
    value.sources.forEach((source, index) => {
      if (
        source.sha256 === null ||
        source.authority !== 'user_assertion' ||
        source.rights !== 'restricted' ||
        !P.RelativePathSchema.safeParse(source.ref).success
      )
        context.addIssue({code: 'custom', path: ['sources', index], message: 'source not bound'});
    });
    if (new Set([value.clientContext, value.offerScope, value.commercialStatus]).size !== 3)
      context.addIssue({code: 'custom', message: 'commercial inputs must remain distinct'});
    const bindings = value.claims.flatMap((claim) => claim.evidence);
    if (value.roi) bindings.push(value.roi.baseline.source, value.roi.source);
    bindings.forEach((binding, index) => {
      const source = sources.get(binding.sourceId);
      if (
        !source ||
        source.sha256 !== binding.sourceSha256 ||
        source.authority !== 'user_assertion' ||
        source.rights !== 'restricted'
      )
        context.addIssue({code: 'custom', message: `unresolved evidence ${index}`});
    });
    const authoritySubjects = [
      ...(value.roi
        ? [
            {
              subject: Object.fromEntries(
                Object.entries(value.roi).filter(([key]) => key !== 'authority'),
              ),
              authority: value.roi.authority,
            },
          ]
        : []),
      ...value.pricing.map(({authority, ...subject}) => ({subject, authority})),
      ...value.commitments.map(({authority, ...subject}) => ({subject, authority})),
    ];
    authoritySubjects.forEach(({subject, authority}, index) => {
      if (hashCanonical(subject) !== authority.subjectSha256)
        context.addIssue({code: 'custom', message: `commercial authority subject drift ${index}`});
    });
    Common.checkCommercialProposalCanonicalSha256(value, context);
  });
export type CommercialProposalReadinessV1 = z.output<typeof CommercialProposalReadinessV1Schema>;
export type CommercialProposalClaimV1 = z.output<typeof CommercialProposalClaimV1Schema>;
export type CommercialProposalSpecV1 = z.output<typeof CommercialProposalSpecV1Schema>;
export * from './commercial-proposal-common-v1.schema.ts';
export * from './commercial-proposal-output-v1.schema.ts';
