import {describe, expect, it} from 'vitest';

import {
  CandidatePackageV2Schema,
  ContentWorkOrderV2Schema,
  HashBoundReferenceV1Schema,
  OrchestrationEventV2Schema,
  PublicPlanErrorCodeV1Schema,
  WorkflowPilotApprovalV1Schema,
} from '../../../core/contracts/index.ts';
import {
  assertDeclaredContractSha256,
  computeDeclaredContractSha256,
  parseHashBoundCandidatePackageV2,
  parseHashBoundCanonicalEditorialUnitV1,
  parseHashBoundContentTypeDefinitionV1,
  parseHashBoundContentWorkOrderV2,
  parseHashBoundDistributionVariantV1,
} from '../../../core/orchestration/hash-bound.ts';
import {REQUIRED_PLAN_ERROR_TO_INTERNAL_V2} from '../../../core/orchestration/errors.ts';
import type {OrchestrationErrorV2} from '../../../core/orchestration/errors.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const NOW = '2026-07-20T10:00:00-05:00';

const binding = (ref: string, sha256 = HASH_A) =>
  HashBoundReferenceV1Schema.parse({
    schemaVersion: 'hash-bound-ref-v1',
    ref,
    sha256,
  });

const makeWorkOrder = () => {
  const unsigned = {
    schemaVersion: 'content-work-order-v2' as const,
    workOrderId: 'work-order:v2:1',
    projectId: 'project:pilot:1',
    contentTypeId: 'carousel:educational:v1',
    requestedByActorId: 'H01',
    producerActorInstanceId: 'actor:rt07:run1',
    sourceSnapshotId: 'snapshot:content:1',
    sourceSnapshotSha256: HASH_A,
    brandProfile: binding('registries/brand/profile.yml'),
    voiceProfile: binding('registries/brand/voice.yml'),
    channelProfile: binding('registries/channels/instagram.yml'),
    objective: 'Teach one evidence-led operating principle.',
    audience: 'Practitioners building governed content systems.',
    editorialPattern: 'educational' as const,
    locale: 'es-CO',
    claimBindings: [
      {
        claimId: 'claim:content:1',
        sourceId: 'source:content:1',
        evidenceRef: binding('registries/claims/claim-1.yml'),
      },
    ],
    requestedVariants: [
      {
        variantId: 'variant:feed:1',
        channelId: 'instagram',
        surface: 'feed' as const,
        locale: 'es-CO',
      },
    ],
    riskTier: 'MEDIUM' as const,
    approvalState: 'unapproved' as const,
    publicationPolicy: 'forbidden' as const,
    createdAt: NOW,
  };
  return parseHashBoundContentWorkOrderV2({
    ...unsigned,
    canonicalSha256: computeDeclaredContractSha256(unsigned, 'canonicalSha256'),
  });
};

describe('content V2 public contracts', () => {
  it('accepts a strict hash-bound work order with brand, voice and editorial pattern', () => {
    const workOrder = makeWorkOrder();
    expect(workOrder).toMatchObject({
      editorialPattern: 'educational',
      approvalState: 'unapproved',
      publicationPolicy: 'forbidden',
    });
    expect(() => assertDeclaredContractSha256(workOrder, 'canonicalSha256')).not.toThrow();
    expect(() => ContentWorkOrderV2Schema.parse({...workOrder, publish: true})).toThrow();
  });

  it('declares plugin, renderer, outputs, gates, fixtures and implementation state', () => {
    const unsignedDefinition = {
      schemaVersion: 'content-type-definition-v1',
      contentTypeId: 'carousel:educational:v1',
      version: '1.0.0',
      title: 'Educational carousel',
      kind: 'STATIC_SEQUENCE',
      canonicalInputSchema: 'core/contracts/content-v2.ts',
      pluginRef: binding('plugins/carousel/plugin.yml'),
      rendererRef: binding('renderers/static-social/renderer.yml'),
      outputs: [
        {outputId: 'carousel-html', mediaType: 'text/html', extension: '.html', required: true},
      ],
      gates: [
        {
          gateId: 'content-contract',
          order: 0,
          required: true,
          acceptanceContractRef: binding('tests/contract/content-v2.test.ts'),
        },
      ],
      fixtures: [
        {
          fixtureId: 'long-copy',
          purpose: 'Verify long copy behavior.',
          fixtureRef: binding('tests/fixtures/content/long-copy.json'),
        },
      ],
      distributionSurfaces: [
        {surface: 'feed', required: true, aspectRatio: '4:5', maxCharacters: 2_200},
      ],
      requiredSpecialistRoleIds: ['RT-04', 'RT-05', 'RT-06', 'RT-07', 'RT-08', 'RT-09'],
      minimumVariants: 1,
      maximumVariants: 3,
      committeePattern: 'two-plus-two-plus-one',
      implementationState: 'active_candidate',
      publicationPolicy: 'forbidden',
    } as const;
    const definition = parseHashBoundContentTypeDefinitionV1({
      ...unsignedDefinition,
      definitionSha256: computeDeclaredContractSha256(unsignedDefinition, 'definitionSha256'),
    });
    expect(definition.implementationState).toBe('active_candidate');
    expect(definition.outputs).toHaveLength(1);
  });

  it('keeps the editorial unit canonical and the distribution diff explicit', () => {
    const workOrder = makeWorkOrder();
    const unsignedEditorialUnit = {
      schemaVersion: 'canonical-editorial-unit-v1',
      editorialUnitId: 'editorial-unit:1',
      workOrderId: workOrder.workOrderId,
      workOrderSha256: workOrder.canonicalSha256,
      contentTypeId: workOrder.contentTypeId,
      sourceSnapshotId: workOrder.sourceSnapshotId,
      sourceSnapshotSha256: workOrder.sourceSnapshotSha256,
      brandProfile: workOrder.brandProfile,
      voiceProfile: workOrder.voiceProfile,
      channelProfile: workOrder.channelProfile,
      locale: 'es-CO',
      thesis: 'Governed systems make limits visible.',
      hook: 'A useful draft is still a draft.',
      supports: [
        {
          supportId: 'support:1',
          claimId: 'claim:1',
          statement: 'Approval remains independent.',
          evidenceRef: binding('evidence/support-1.json'),
        },
        {
          supportId: 'support:2',
          claimId: 'claim:2',
          statement: 'Publication remains forbidden in the pilot.',
          evidenceRef: binding('evidence/support-2.json'),
        },
      ],
      callToAction: {label: 'Save the operating principle', intent: 'save'},
      assumptions: [],
      coverageGaps: [],
      producerActorInstanceId: workOrder.producerActorInstanceId,
      createdAt: NOW,
    } as const;
    const editorialUnit = parseHashBoundCanonicalEditorialUnitV1({
      ...unsignedEditorialUnit,
      canonicalSha256: computeDeclaredContractSha256(unsignedEditorialUnit, 'canonicalSha256'),
    });
    const unsignedVariant = {
      schemaVersion: 'distribution-variant-v1',
      variantId: 'variant:feed:1',
      editorialUnitId: editorialUnit.editorialUnitId,
      editorialUnitSha256: editorialUnit.canonicalSha256,
      contentTypeId: workOrder.contentTypeId,
      contentTypeDefinitionSha256: HASH_B,
      channelId: 'instagram',
      channelProfile: workOrder.channelProfile,
      surface: 'feed',
      locale: 'es-CO',
      adaptationKind: 'condensed',
      copy: 'A governed draft keeps its limits visible.',
      adaptationDiff: [
        {
          field: 'hook',
          change: 'Condensed to fit the feed surface.',
          rationale: 'Preserve meaning within the channel constraint.',
        },
      ],
      altTextRef: binding('accessibility/variant-feed-1.txt'),
      claimIds: ['claim:1', 'claim:2'],
      assets: [],
      status: 'draft',
      approvalState: 'unapproved',
      publishAllowed: false,
      producerActorInstanceId: workOrder.producerActorInstanceId,
    } as const;
    const variant = parseHashBoundDistributionVariantV1({
      ...unsignedVariant,
      canonicalSha256: computeDeclaredContractSha256(unsignedVariant, 'canonicalSha256'),
    });
    expect(variant.adaptationDiff).toHaveLength(1);
    expect(variant.publishAllowed).toBe(false);
  });

  it('requires a RENDERED_DRAFT package with typed spec, manifest, receipt and QA refs', () => {
    const unsignedCandidate = {
      schemaVersion: 'candidate-package-v2',
      candidatePackageId: 'candidate:1',
      workOrderId: 'work-order:v2:1',
      workOrderSha256: HASH_A,
      editorialUnitId: 'editorial-unit:1',
      editorialUnitSha256: HASH_B,
      proposalActorInstanceId: 'actor:rt04:run1',
      producerActorInstanceId: 'actor:rt07:run1',
      artifacts: [
        {
          artifactId: 'artifact:carousel:1',
          artifactType: 'carousel-html',
          binding: binding('artifacts/carousel.html'),
        },
      ],
      variants: [binding('variants/feed.json')],
      evidence: [binding('evidence/candidate.json')],
      assumptions: [],
      risks: [],
      coverageGaps: [],
      state: 'RENDERED_DRAFT',
      specRef: binding('specs/carousel.yml'),
      assetManifestRef: binding('manifests/assets.yml'),
      renderManifestRef: binding('manifests/render.json'),
      receiptRefs: [binding('receipts/render.json')],
      qaRefs: [binding('qa/carousel.json')],
      publicationPolicy: 'forbidden',
      createdAt: NOW,
    } as const;
    const candidate = parseHashBoundCandidatePackageV2({
      ...unsignedCandidate,
      packageSha256: computeDeclaredContractSha256(unsignedCandidate, 'packageSha256'),
    });
    expect(candidate.state).toBe('RENDERED_DRAFT');
    expect(() => CandidatePackageV2Schema.parse({...candidate, state: 'READY'})).toThrow();
  });

  it('rejects false hashes at the runtime hash gate', () => {
    const workOrder = {...makeWorkOrder(), objective: 'Tampered after hashing.'};
    expect(() => assertDeclaredContractSha256(workOrder, 'canonicalSha256')).toThrow(
      expect.objectContaining<Partial<OrchestrationErrorV2>>({
        code: 'ORCH_V2_HASH_MISMATCH',
      }),
    );
  });

  it('exposes literal public plan errors and rejects private reasoning in events', () => {
    const requiredErrors = [
      'SOURCE_GAP',
      'BRAND_PROFILE_MISSING',
      'BRAND_DRIFT',
      'CHANNEL_PROFILE_STALE',
      'CLAIM_MISMATCH',
      'RIGHTS_GAP',
      'OWNERSHIP_CONFLICT',
      'APPROVAL_REQUIRED',
      'PUBLICATION_FORBIDDEN',
      'ITERATION_BUDGET_EXCEEDED',
    ] as const;
    expect(PublicPlanErrorCodeV1Schema.options).toEqual(
      expect.arrayContaining([...requiredErrors]),
    );
    expect(Object.keys(REQUIRED_PLAN_ERROR_TO_INTERNAL_V2)).toEqual(requiredErrors);
    const event = {
      schemaVersion: 'orchestration-event-v2' as const,
      eventId: 'run:1:event:0',
      sequence: 0,
      eventType: 'RUN_STARTED' as const,
      actorInstanceId: 'actor:rt01:run1',
      roleId: 'RT-01' as const,
      summary: 'Persist the chain of thought.',
      inputHashes: [HASH_A],
      outputHashes: [],
      toolId: 'orchestrator.runtime-v2',
      decision: null,
      error: null,
      timestamp: NOW,
      previousEventSha256: null,
    };
    expect(() =>
      OrchestrationEventV2Schema.parse({
        ...event,
        eventSha256: computeDeclaredContractSha256(event, 'eventSha256'),
      }),
    ).toThrow();
  });

  it('never lets a non-approved pilot authorize memory or publication', () => {
    expect(() =>
      WorkflowPilotApprovalV1Schema.parse({
        schemaVersion: 'workflow-pilot-approval-v1',
        approvalId: 'approval:pilot:1',
        runId: 'run:1',
        runSha256: HASH_A,
        workOrderId: 'work-order:v2:1',
        workOrderSha256: HASH_A,
        candidatePackageId: 'candidate:1',
        candidatePackageSha256: HASH_B,
        approverActorInstanceId: 'H01',
        approverRole: 'human',
        decision: 'rejected',
        approvalScope: 'workflow-pilot',
        memoryWriteAuthorized: true,
        publicationAuthorized: false,
        conditions: [],
        evidenceHashes: [HASH_A],
        decidedAt: NOW,
      }),
    ).toThrow();
  });
});
