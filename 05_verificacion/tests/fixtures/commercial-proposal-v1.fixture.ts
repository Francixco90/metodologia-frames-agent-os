import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {FramesWorkOrderV1Schema} from 'core/contracts/index.ts';
import {canonicalize} from 'core/evidence/canonical-json.ts';
import {hashCanonical} from 'core/evidence/hash.ts';
import {DefaultTransactionKernelV1} from 'core/orchestration/index.ts';
import {MaterialSkillAdapterV2} from 'workflows/core/index.ts';
import * as Authority from 'workflows/multimedia/_schema/commercial-proposal-authority-v1.schema.ts';
import * as CP from 'workflows/multimedia/_schema/commercial-proposal-v1.schema.ts';
import * as Materials from 'workflows/multimedia/_runner/commercial-proposal-materials-v1.ts';
import * as Profile from 'workflows/multimedia/_runner/commercial-proposal-profile-v1.ts';
import {
  commercialProposalRequestSha256V1,
  createCommercialProposalAuthorizationV1,
  createCommercialProposalProjections,
  type CommercialProposalProjectionBundleV1,
} from 'workflows/multimedia/_runner/commercial-proposal-projections-v1.ts';
import {
  makeTransactionDraft,
  makeTransactionGraph,
  makeTransactionSandbox,
  transactionAuthorityPort,
  transactionProducerAuthorizer,
} from './transaction-kernel-v1.fixture.ts';

export const commercialProposalExecutionId = 'commercial-proposal-canary';
export const commercialProposalSha = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');
const bytes = (value: unknown): Uint8Array => new TextEncoder().encode(canonicalize(value));
const sourceBytes = new TextEncoder().encode('Synthetic material evidence for a local canary.\n');
export const commercialProposalSources = [
  {
    source_id: 'evidence-user-asserted',
    ref: 'fixtures/commercial-proposal/evidence.txt',
    sha256: commercialProposalSha(sourceBytes),
    authority: 'user_assertion' as const,
    rights: 'restricted' as const,
  },
];
const sourceAuthorityReceipt = Profile.sealCommercialProposalContract({
  schemaVersion: 'brief-source-authority-receipt-v1' as const,
  receiptId: 'receipt-source-commercial-canary',
  source: commercialProposalSources[0]!,
  authorityMode: 'LOCAL_SIMULATION' as const,
  authorityActorId: 'LOCAL-USER-ASSERTION' as const,
  rightsBasis: 'user_supplied_for_local_brief' as const,
  allowedUseScope: 'local_internal_brief_only' as const,
  restrictions: ['no_external_distribution', 'no_claim_promotion'] as const,
  recordedAt: '2026-08-29T12:00:00.000Z',
});
export const commercialProposalSourceAuthorityManifest =
  Authority.CommercialProposalSourceAuthorityManifestV1Schema.parse(
    Profile.sealCommercialProposalContract({
      schemaVersion: 'commercial-proposal-source-authority-manifest-v1' as const,
      manifestId: 'source-authority-commercial-canary',
      entries: [sourceAuthorityReceipt],
    }),
  );

const roiSubject = {
  baseline: {
    value: 12,
    unit: 'hours',
    source: {
      sourceId: commercialProposalSources[0]!.source_id,
      sourceSha256: commercialProposalSources[0]!.sha256,
    },
  },
  formula: '(baseline - candidate) / baseline',
  horizon: {value: 3, unit: 'months' as const},
  unit: 'percentage',
  source: {
    sourceId: commercialProposalSources[0]!.source_id,
    sourceSha256: commercialProposalSources[0]!.sha256,
  },
};
const pricingSubject = {
  item: 'Synthetic pilot',
  amount: 1_000,
  currency: 'USD',
  cadence: 'ONE_TIME' as const,
};
const commitmentSubject = {
  statement: 'Produce four local draft artifacts.',
  owner: 'MetodologIA',
  acceptanceMeasure: 'Exact manifest readback.',
};
const authorityReceipt = (
  kind: 'ROI' | 'PRICING' | 'COMMITMENT',
  receiptId: string,
  subject: object,
) =>
  Authority.CommercialProposalAuthorityReceiptV1Schema.parse(
    Profile.sealCommercialProposalContract({
      schemaVersion: 'commercial-proposal-authority-receipt-v1' as const,
      receiptId,
      kind,
      subjectSha256: hashCanonical(subject),
      authority: 'verified' as const,
      authorityActorId: `actor.commercial-authority.${kind.toLowerCase()}`,
      authorizedScope: 'Synthetic local canary only.',
      allowedUseScope: 'local_internal_commercial_draft_only' as const,
      restrictions: [
        'human_commercial_approval_required',
        'no_external_distribution',
        'no_publication',
      ] as const,
      environment: 'LOCAL_SIMULATION' as const,
      issuedAt: '2026-08-29T12:00:00.000Z',
    }),
  );
const authorityReceipts = [
  authorityReceipt('ROI', 'authority-roi', roiSubject),
  authorityReceipt('PRICING', 'authority-pricing', pricingSubject),
  authorityReceipt('COMMITMENT', 'authority-commitment', commitmentSubject),
];
const authorityBinding = (receipt: (typeof authorityReceipts)[number]) => ({
  kind: receipt.kind,
  receiptId: receipt.receiptId,
  receiptSha256: hashCanonical(receipt),
  subjectSha256: receipt.subjectSha256,
  authority: receipt.authority,
  authorizedScope: receipt.authorizedScope,
});
export const commercialProposalAuthorityManifest =
  Authority.CommercialProposalAuthorityManifestV1Schema.parse(
    Profile.sealCommercialProposalContract({
      schemaVersion: 'commercial-proposal-authority-manifest-v1' as const,
      manifestId: 'commercial-authority-commercial-canary',
      entries: authorityReceipts,
    }),
  );

export const commercialProposalReadinessDraft = {
  schemaVersion: 'commercial-proposal-readiness-v1' as const,
  readinessId: 'readiness-commercial-canary',
  proposalId: 'proposal-commercial-canary',
  contentClass: 'commercial-proposal' as const,
  sourceManifestSha256: hashCanonical(commercialProposalSources),
  brandProfile: {status: 'AVAILABLE' as const, profileSha256: commercialProposalSha('brand')},
  deck: {requested: false, explicitConfirmation: false, confirmationSha256: null},
  status: 'READY' as const,
  issues: [] as string[],
};
export const commercialProposalReadiness = (): CP.CommercialProposalReadinessV1 =>
  Profile.sealCommercialProposalReadiness(structuredClone(commercialProposalReadinessDraft));
export const commercialProposalClaim = (
  overrides: Record<string, unknown> = {},
): CP.CommercialProposalClaimV1 =>
  CP.CommercialProposalClaimV1Schema.parse(
    Profile.sealCommercialProposalContract({
      schemaVersion: 'commercial-proposal-claim-v1' as const,
      claimId: 'claim-cycle-time',
      statement: 'Valor, "verificable"\nsegunda línea.',
      classification: 'INFERRED' as const,
      evidence: [
        {
          sourceId: commercialProposalSources[0]!.source_id,
          sourceSha256: commercialProposalSources[0]!.sha256,
        },
      ],
      limitations: ['Synthetic evidence; no production commitment.'],
      ...overrides,
    }),
  );
export const commercialProposalSpecDraft = () => ({
  schemaVersion: 'commercial-proposal-spec-v1' as const,
  specId: 'spec-commercial-canary',
  proposalId: commercialProposalReadinessDraft.proposalId,
  readinessSha256: hashCanonical(commercialProposalReadiness()),
  workOrderSha256: commercialProposalSha('unbound-workorder'),
  sourceManifestSha256: hashCanonical(commercialProposalSources),
  sourceAuthorityManifestSha256: hashCanonical(commercialProposalSourceAuthorityManifest),
  commercialAuthorityManifestSha256: hashCanonical(commercialProposalAuthorityManifest),
  sources: structuredClone(commercialProposalSources),
  template: {
    ref: CP.COMMERCIAL_PROPOSAL_TEMPLATE_REF_V1,
    sha256: CP.COMMERCIAL_PROPOSAL_TEMPLATE_SHA256_V1,
  },
  sectionSequence: [...CP.COMMERCIAL_PROPOSAL_SECTION_SEQUENCE_V1],
  clientContext: 'A synthetic buyer must decide whether a bounded pilot is worth evaluating.',
  offerScope: 'One local discovery pilot with explicit inclusions and exclusions.',
  commercialStatus: 'Synthetic controlled figures; commercial approval remains pending.',
  audience: 'Technical buyer and commercial approver.',
  objective: 'Evaluate one falsifiable commercial decision.',
  privacy: {piiStatus: 'NONE' as const, privacyReviewReceiptSha256: null},
  scope: {included: ['Local synthetic pilot.'], excluded: ['Production and publication.']},
  assumptions: ['Synthetic inputs remain clearly labeled.'],
  claims: [commercialProposalClaim()],
  roi: {...roiSubject, authority: authorityBinding(authorityReceipts[0]!)},
  pricing: [{...pricingSubject, authority: authorityBinding(authorityReceipts[1]!)}],
  commitments: [{...commitmentSubject, authority: authorityBinding(authorityReceipts[2]!)}],
  maximumAutomaticState: 'RENDERED_DRAFT' as const,
});
export const parseCommercialProposalSpec = (
  overrides: Record<string, unknown> = {},
): CP.CommercialProposalSpecV1 =>
  CP.CommercialProposalSpecV1Schema.parse(
    Profile.sealCommercialProposalContract({...commercialProposalSpecDraft(), ...overrides}),
  );

export const makeCommercialProposalWorkOrder = (seed: CP.CommercialProposalSpecV1) => {
  const inputs = Materials.commercialProposalWorkOrderInputsV1(seed);
  const draft = {
    schemaVersion: 'frames-work-order-v1' as const,
    workOrderId: `WO.R6.${seed.proposalId}`,
    requestHash: commercialProposalRequestSha256V1(seed),
    routeId: 'R6' as const,
    workflowId: Materials.COMMERCIAL_PROPOSAL_WORKFLOW_ID_V1,
    stepId: Materials.COMMERCIAL_PROPOSAL_STEP_ID_V1,
    skillId: Materials.COMMERCIAL_PROPOSAL_SKILL_ID_V1,
    actorId: Materials.COMMERCIAL_PROPOSAL_PRODUCER_ACTOR_ID_V1,
    readSet: inputs.map(({ref}) => ref),
    writeSet: [
      'commercial-proposal.md',
      'commercial-proposal.html',
      'commercial-proposal.json',
      'commercial-proposal.csv',
    ],
    inputs,
    expectedOutputs: [
      'commercial-proposal.md',
      'commercial-proposal.html',
      'commercial-proposal.json',
      'commercial-proposal.csv',
    ],
    tools: [],
    effectClass: 'LOCAL_REVERSIBLE' as const,
    budget: {targetFiles: 4, maxFiles: 4, targetTokens: 1, maxTokens: 100},
    acceptanceCriteria: [...Materials.COMMERCIAL_PROPOSAL_ACCEPTANCE_V1],
    stopRule: Materials.COMMERCIAL_PROPOSAL_STOP_RULE_V1,
  };
  return FramesWorkOrderV1Schema.parse({...draft, canonicalSha256: hashCanonical(draft)});
};
export const makeCommercialProposalMaterials = (
  spec: CP.CommercialProposalSpecV1,
): Materials.CommercialProposalMaterialBindingV1 => ({
  sourceAuthorityManifest: commercialProposalSourceAuthorityManifest,
  commercialAuthorityManifest: commercialProposalAuthorityManifest,
  materials: [
    {
      ref: CP.COMMERCIAL_PROPOSAL_TEMPLATE_REF_V1,
      bytes: readFileSync(resolve(CP.COMMERCIAL_PROPOSAL_TEMPLATE_REF_V1)),
    },
    {
      ref: 'receipts/commercial-proposal-readiness.json',
      bytes: bytes(commercialProposalReadiness()),
    },
    {ref: 'manifests/commercial-proposal-sources.json', bytes: bytes(spec.sources)},
    {
      ref: Materials.COMMERCIAL_PROPOSAL_SOURCE_AUTHORITY_REF_V1,
      bytes: bytes(commercialProposalSourceAuthorityManifest),
    },
    {
      ref: Materials.COMMERCIAL_PROPOSAL_AUTHORITY_REF_V1,
      bytes: bytes(commercialProposalAuthorityManifest),
    },
    {ref: 'inputs/client-context.txt', bytes: new TextEncoder().encode(spec.clientContext)},
    {ref: 'inputs/offer-scope.txt', bytes: new TextEncoder().encode(spec.offerScope)},
    {ref: 'inputs/commercial-status.txt', bytes: new TextEncoder().encode(spec.commercialStatus)},
    {ref: commercialProposalSources[0]!.ref, bytes: sourceBytes},
  ],
});
export const makeCommercialProposalBundle = (): CommercialProposalProjectionBundleV1 => {
  const seed = parseCommercialProposalSpec();
  const workOrder = makeCommercialProposalWorkOrder(seed);
  const spec = parseCommercialProposalSpec({workOrderSha256: hashCanonical(workOrder)});
  const authorization = createCommercialProposalAuthorizationV1(spec, workOrder);
  return createCommercialProposalProjections(
    spec,
    commercialProposalReadiness(),
    {workOrder, authorization},
    makeCommercialProposalMaterials(spec),
  );
};

export const runCommercialProposalKernel = async (
  projection: CommercialProposalProjectionBundleV1,
  executionAuthorization = projection.authorization,
) => {
  const sandbox = makeTransactionSandbox();
  const graph = makeTransactionGraph(
    commercialProposalExecutionId,
    projection.workOrder,
    projection.authorization,
  );
  const execution = makeTransactionDraft(
    commercialProposalExecutionId,
    sandbox.authority,
    graph,
    projection.workOrder,
    executionAuthorization,
  );
  const receipt = await new MaterialSkillAdapterV2(
    new DefaultTransactionKernelV1(sandbox.state, {producerAuthority: transactionAuthorityPort}),
    {
      [projection.workOrder.skillId]: () => ({
        intents: projection.artifacts.map(({relativePath: ref, bytes: content}) => ({
          ref,
          bytes: content,
        })),
      }),
    },
    transactionProducerAuthorizer,
  ).invoke({execution});
  return {receipt, effect: sandbox.effect, state: sandbox.state};
};
