import {z} from 'zod';

import {ActorIdSchema, PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';
import {containsProhibitedReasoningText} from './reasoning-safety.ts';
import {HashBoundReferenceV1Schema} from './content-v2.ts';

const NonEmptyTextSchema = z.string().trim().min(1).max(4_000);
const ShortTextSchema = z.string().trim().min(1).max(320);
const VersionSchema = z
  .string()
  .regex(/^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?$/u, 'Expected a semantic version');

export const GitCommitSchema = z
  .string()
  .regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u, 'Expected a Git object identifier');

const addUniqueIssue = (
  values: readonly string[],
  context: z.core.$RefinementCtx,
  path: PropertyKey[],
  message: string,
): void => {
  if (new Set(values).size !== values.length) {
    context.addIssue({code: 'custom', message, path});
  }
};

const rejectPrivateReasoning = (
  value: unknown,
  context: z.core.$RefinementCtx,
  path: PropertyKey[] = [],
): void => {
  if (containsProhibitedReasoningText(value)) {
    context.addIssue({
      code: 'custom',
      message: 'Durable creation contracts cannot persist prohibited reasoning text.',
      path,
    });
  }
};

export const SourceFreezeReadSetPurposeV1Schema = z.enum([
  'source_registry',
  'source_lifecycle_contract',
  'source_material',
  'source_lifecycle_receipt',
  'brand_profile',
  'voice_profile',
  'brand_adaptation',
  'channel_profile',
  'governance_decision',
  'workflow_registry',
  'legacy_input',
  'legacy_snapshot',
]);

export const EvidenceAuthorityKindV1Schema = z.enum([
  'source',
  'governance_decision',
  'registry',
  'profile',
]);

export const EvidenceAuthorityLifecycleV1Schema = z.enum([
  'active',
  'active_candidate',
  'candidate',
]);

export const EvidenceUseDecisionV1Schema = z.enum([
  'grounded',
  'qualified_candidate',
  'planned_reference',
  'legacy_read_only',
]);

export const SourceFreezeReadSetEntryV1Schema = z.strictObject({
  bindingId: PortableIdSchema,
  purpose: SourceFreezeReadSetPurposeV1Schema,
  authorityId: PortableIdSchema,
  materialRef: HashBoundReferenceV1Schema,
});

export const EvidenceAuthorityBindingV1Schema = z.strictObject({
  authorityId: PortableIdSchema,
  authorityKind: EvidenceAuthorityKindV1Schema,
  lifecycleState: EvidenceAuthorityLifecycleV1Schema,
  useDecision: EvidenceUseDecisionV1Schema,
  readSetBindingId: PortableIdSchema,
  rightsVerdict: z.enum([
    'allowed_internal_grounding',
    'allowed_internal_implementation',
    'candidate_limited',
  ]),
  allowedUseScope: ShortTextSchema,
  restrictions: z.array(ShortTextSchema).max(16),
});

export const SourceFreezeManifestV1Schema = z
  .strictObject({
    schemaVersion: z.literal('source-freeze-manifest-v1'),
    manifestId: PortableIdSchema,
    contentId: PortableIdSchema,
    baseCommit: GitCommitSchema,
    createdByActorInstanceId: ActorIdSchema,
    verifiedByActorInstanceId: ActorIdSchema,
    readSet: z.array(SourceFreezeReadSetEntryV1Schema).min(1).max(64),
    authorities: z.array(EvidenceAuthorityBindingV1Schema).min(1).max(32),
    profileBindings: z.strictObject({
      brand: HashBoundReferenceV1Schema,
      voice: HashBoundReferenceV1Schema,
      channel: HashBoundReferenceV1Schema,
      adaptation: HashBoundReferenceV1Schema,
    }),
    legacyProvenance: z.strictObject({
      input: HashBoundReferenceV1Schema,
      snapshot: HashBoundReferenceV1Schema,
      authority: z.literal('read_only'),
    }),
    coverageGaps: z.array(PortableIdSchema).min(1).max(32),
    globalSourceLocked: z.literal(false),
    publicationAuthority: z.literal(false),
  })
  .superRefine((manifest, context) => {
    addUniqueIssue(
      manifest.readSet.map(({bindingId}) => bindingId),
      context,
      ['readSet'],
      'Source-freeze read-set binding IDs must be unique.',
    );
    addUniqueIssue(
      manifest.readSet.map(({materialRef}) => materialRef.ref),
      context,
      ['readSet'],
      'Source-freeze read-set paths must be unique.',
    );
    addUniqueIssue(
      manifest.authorities.map(({authorityId}) => authorityId),
      context,
      ['authorities'],
      'Evidence authority IDs must be unique.',
    );
    const readSetIds = new Set(manifest.readSet.map(({bindingId}) => bindingId));
    const readSetById = new Map(manifest.readSet.map((entry) => [entry.bindingId, entry]));
    const frozenRefs = new Set(
      manifest.readSet.map(({materialRef}) => `${materialRef.ref}:${materialRef.sha256}`),
    );
    for (const [index, authority] of manifest.authorities.entries()) {
      if (!readSetIds.has(authority.readSetBindingId)) {
        context.addIssue({
          code: 'custom',
          message: `SOURCE_GAP: authority ${authority.authorityId} has no read-set binding.`,
          path: ['authorities', index, 'readSetBindingId'],
        });
      }
      const readSetEntry = readSetById.get(authority.readSetBindingId);
      if (readSetEntry !== undefined && readSetEntry.authorityId !== authority.authorityId) {
        context.addIssue({
          code: 'custom',
          message: `SOURCE_GAP: authority ${authority.authorityId} points to read-set material owned by ${readSetEntry.authorityId}.`,
          path: ['authorities', index, 'readSetBindingId'],
        });
      }
    }
    for (const [profile, binding] of Object.entries(manifest.profileBindings)) {
      if (!frozenRefs.has(`${binding.ref}:${binding.sha256}`)) {
        context.addIssue({
          code: 'custom',
          message: `SOURCE_GAP: profile ${profile} is outside the frozen read set.`,
          path: ['profileBindings', profile],
        });
      }
    }
    for (const [legacyKind, binding] of [
      ['input', manifest.legacyProvenance.input],
      ['snapshot', manifest.legacyProvenance.snapshot],
    ] as const) {
      if (!frozenRefs.has(`${binding.ref}:${binding.sha256}`)) {
        context.addIssue({
          code: 'custom',
          message: `SOURCE_GAP: legacy ${legacyKind} is outside the frozen read set.`,
          path: ['legacyProvenance', legacyKind],
        });
      }
    }
    if (manifest.createdByActorInstanceId === manifest.verifiedByActorInstanceId) {
      context.addIssue({
        code: 'custom',
        message: 'OWNERSHIP_CONFLICT: source-freeze producer and verifier must differ.',
        path: ['verifiedByActorInstanceId'],
      });
    }
    rejectPrivateReasoning(manifest, context);
  });

export type SourceFreezeManifestV1 = z.infer<typeof SourceFreezeManifestV1Schema>;

export const PlannedCapabilityIdV1Schema = z.enum([
  'd3',
  'three',
  'lottie',
  'gsap',
  'remotion-v3-creative-compositor',
]);

const PlannedCapabilityLabelByIdV1 = {
  d3: 'D3',
  three: 'Three.js',
  lottie: 'Lottie',
  gsap: 'GSAP',
  'remotion-v3-creative-compositor': 'Remotion',
} as const;

export const PlannedCapabilityV1Schema = z.strictObject({
  capabilityId: PlannedCapabilityIdV1Schema,
  label: z.enum(['D3', 'Three.js', 'Lottie', 'GSAP', 'Remotion']),
  state: z.literal('planned_capability'),
  intendedUse: ShortTextSchema,
  verificationGate: z.literal('H-03'),
  requirementRef: HashBoundReferenceV1Schema,
});

export type PlannedCapabilityV1 = z.infer<typeof PlannedCapabilityV1Schema>;

export const CanonicalContentFrontmatterV1Schema = z
  .strictObject({
    schemaVersion: z.literal('canonical-content-document-v1'),
    contentId: PortableIdSchema,
    version: VersionSchema,
    authoredStatus: z.literal('DRAFT'),
    brandId: z.literal('metodologia'),
    locale: z.literal('es-LatAm'),
    editorialPattern: z.enum([
      'educational',
      'how-to',
      'insight',
      'data',
      'case',
      'offer',
      'community',
      'curation',
    ]),
    primaryWorkflow: z.enum([
      'carousel',
      'feed-text',
      'feed-photo',
      'infographic',
      'story-sequence',
      'reel-motion',
      'microcopy',
      'live-kit',
    ]),
    surface: z.enum(['instagram-feed', 'instagram-story', 'instagram-reel', 'instagram-live']),
    authoredByActorInstanceId: ActorIdSchema,
    sourceFreezeManifest: HashBoundReferenceV1Schema,
    profiles: z.strictObject({
      brand: HashBoundReferenceV1Schema,
      voice: HashBoundReferenceV1Schema,
      channel: HashBoundReferenceV1Schema,
      adaptation: HashBoundReferenceV1Schema,
    }),
    plannedCapabilities: z.array(PlannedCapabilityV1Schema).max(16),
    rightsPolicy: z.literal('source_freeze_and_first_party_assets_only'),
    publicationPolicy: z.literal('forbidden'),
    distributionState: z.literal('NOT_DESIGNED'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((frontmatter, context) => {
    addUniqueIssue(
      frontmatter.plannedCapabilities.map(({capabilityId}) => capabilityId),
      context,
      ['plannedCapabilities'],
      'Planned capability IDs must be unique.',
    );
    addUniqueIssue(
      frontmatter.plannedCapabilities.map(({label}) => label),
      context,
      ['plannedCapabilities'],
      'Planned capability labels must be unique.',
    );
    for (const [index, capability] of frontmatter.plannedCapabilities.entries()) {
      if (capability.label !== PlannedCapabilityLabelByIdV1[capability.capabilityId]) {
        context.addIssue({
          code: 'custom',
          message: `Capability ${capability.capabilityId} requires label ${PlannedCapabilityLabelByIdV1[capability.capabilityId]}.`,
          path: ['plannedCapabilities', index, 'label'],
        });
      }
    }
    rejectPrivateReasoning(frontmatter, context);
  });

export type CanonicalContentFrontmatterV1 = z.infer<typeof CanonicalContentFrontmatterV1Schema>;

export const CanonicalClaimKindV1Schema = z.enum([
  'first_party_principle',
  'editorial_recommendation',
  'system_decision',
  'indicator_plan',
  'performance_result',
]);

export const CanonicalClaimSupportV1Schema = z.enum(['direct', 'qualified', 'inferred']);

export const EvidenceRoleV1Schema = z.enum([
  'supports',
  'qualifies',
  'contradicts',
  'defines_system_behavior',
]);

export const EvidenceLocatorV1Schema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('line_range'),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  }),
  z.strictObject({
    kind: z.literal('heading'),
    heading: ShortTextSchema,
  }),
  z.strictObject({
    kind: z.literal('json_pointer'),
    pointer: z
      .string()
      .trim()
      .regex(/^\/(?:[^~/]|~[01])*(?:\/(?:[^~/]|~[01])*)*$/u),
  }),
  z.strictObject({
    kind: z.literal('yaml_path'),
    path: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_.\-[\]]+$/u),
  }),
]);

export const PerformanceEvidenceV1Schema = z.strictObject({
  datasetRef: HashBoundReferenceV1Schema,
  unit: ShortTextSchema,
  period: ShortTextSchema,
  denominator: ShortTextSchema,
  method: NonEmptyTextSchema,
});

export const CanonicalClaimV1Schema = z
  .strictObject({
    claimId: PortableIdSchema,
    statement: NonEmptyTextSchema,
    claimKind: CanonicalClaimKindV1Schema,
    support: CanonicalClaimSupportV1Schema,
    authorityId: PortableIdSchema,
    evidenceRole: EvidenceRoleV1Schema,
    locator: EvidenceLocatorV1Schema,
    limitation: NonEmptyTextSchema,
    performanceEvidence: PerformanceEvidenceV1Schema.optional(),
  })
  .superRefine((claim, context) => {
    if (claim.locator.kind === 'line_range' && claim.locator.endLine < claim.locator.startLine) {
      context.addIssue({
        code: 'custom',
        message: 'Evidence line range must end at or after its start.',
        path: ['locator'],
      });
    }
    if (claim.claimKind === 'performance_result' && claim.performanceEvidence === undefined) {
      context.addIssue({
        code: 'custom',
        message:
          'CLAIM_MISMATCH: performance results require dataset, unit, period, denominator and method.',
        path: ['performanceEvidence'],
      });
    }
    if (claim.claimKind !== 'performance_result' && claim.performanceEvidence !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Performance evidence is reserved for performance_result claims.',
        path: ['performanceEvidence'],
      });
    }
    if (claim.support === 'inferred' && claim.limitation.length < 12) {
      context.addIssue({
        code: 'custom',
        message: 'Inferred claims require a material limitation.',
        path: ['limitation'],
      });
    }
  });

export type CanonicalClaimV1 = z.infer<typeof CanonicalClaimV1Schema>;

export const CanonicalSupportV1Schema = z.strictObject({
  supportId: PortableIdSchema,
  statement: NonEmptyTextSchema,
  claimIds: z.array(PortableIdSchema).min(1).max(8),
  pillar: z.enum(['P1', 'P2', 'P3']),
});

export const NarrativeBeatPurposeV1Schema = z.enum([
  'thesis',
  'decision',
  'system',
  'workflow_matrix',
  'process',
  'visual_router',
  'boundary',
  'cta',
  'support',
]);

export const CanonicalNarrativeBeatV1Schema = z.strictObject({
  position: z.number().int().positive().max(32),
  label: ShortTextSchema,
  purpose: NarrativeBeatPurposeV1Schema,
  statement: NonEmptyTextSchema,
  claimIds: z.array(PortableIdSchema).max(8),
  plannedCapabilityIds: z.array(PlannedCapabilityIdV1Schema).max(16),
  stateDisclosure: z.enum(['not_applicable', 'planned_capability']),
});

export const VisualRelationKindV1Schema = z.enum([
  'sequence',
  'dependency',
  'contrast',
  'hierarchy',
  'grouping',
  'comparison',
  'mapping',
  'boundary',
]);

export const AuthoredVisualRelationV1Schema = z.strictObject({
  relationId: PortableIdSchema,
  kind: VisualRelationKindV1Schema,
  refs: z.array(PortableIdSchema).min(2).max(6),
  meaning: NonEmptyTextSchema,
});

export const AuthoredVisualDirectionV1Schema = z.strictObject({
  ideaCentral: NonEmptyTextSchema.pipe(z.string().min(20).max(280)),
  evidenceMode: z.enum(['conceptual', 'categorical', 'quantitative_claims']),
  relations: z.array(AuthoredVisualRelationV1Schema).min(1).max(8),
  mustPreserve: z.array(NonEmptyTextSchema).min(1).max(6),
  mustNotImply: z.array(NonEmptyTextSchema).min(1).max(6),
  accessibility: z.strictObject({
    equivalentMessage: NonEmptyTextSchema,
    readingOrderRefs: z.array(PortableIdSchema).min(2).max(16),
    nonColorCue: NonEmptyTextSchema,
  }),
});

export const CanonicalContentBodyV1Schema = z
  .strictObject({
    title: z.string().trim().min(5).max(96),
    audience: NonEmptyTextSchema,
    problem: NonEmptyTextSchema,
    promise: NonEmptyTextSchema,
    thesis: z.string().trim().min(20).max(280),
    supports: z.array(CanonicalSupportV1Schema).min(2).max(3),
    claims: z.array(CanonicalClaimV1Schema).min(1).max(32),
    narrativeBeats: z.array(CanonicalNarrativeBeatV1Schema).min(1).max(32),
    visualDirection: AuthoredVisualDirectionV1Schema,
    callToAction: z.string().trim().min(12).max(280),
    rightsAndAssets: z.array(NonEmptyTextSchema).min(1).max(8),
    accessibility: z.array(NonEmptyTextSchema).min(1).max(8),
    limits: z.array(NonEmptyTextSchema).min(1).max(16),
  })
  .superRefine((body, context) => {
    addUniqueIssue(
      body.supports.map(({supportId}) => supportId),
      context,
      ['supports'],
      'Support IDs must be unique.',
    );
    addUniqueIssue(
      body.claims.map(({claimId}) => claimId),
      context,
      ['claims'],
      'Claim IDs must be unique.',
    );
    addUniqueIssue(
      body.claims.map(({statement}) => statement.normalize('NFC').trim().toLocaleLowerCase('es')),
      context,
      ['claims'],
      'Normalized claim statements must be unique.',
    );
    addUniqueIssue(
      body.visualDirection.relations.map(({relationId}) => relationId),
      context,
      ['visualDirection', 'relations'],
      'Visual relation IDs must be unique.',
    );

    const claimIds = new Set(body.claims.map(({claimId}) => claimId));
    const supportIds = new Set(body.supports.map(({supportId}) => supportId));
    const referencedClaimIds = new Set<string>();

    for (const [supportIndex, support] of body.supports.entries()) {
      addUniqueIssue(
        support.claimIds,
        context,
        ['supports', supportIndex, 'claimIds'],
        'A support cannot repeat a claim reference.',
      );
      for (const claimId of support.claimIds) {
        referencedClaimIds.add(claimId);
        if (!claimIds.has(claimId)) {
          context.addIssue({
            code: 'custom',
            message: `CLAIM_MISMATCH: support references unknown claim ${claimId}.`,
            path: ['supports', supportIndex, 'claimIds'],
          });
        }
      }
    }

    for (const claimId of claimIds) {
      if (!referencedClaimIds.has(claimId)) {
        context.addIssue({
          code: 'custom',
          message: `CLAIM_MISMATCH: claim ${claimId} is not used by any support.`,
          path: ['claims'],
        });
      }
    }

    const expectedPositions = body.narrativeBeats.map((_, index) => index + 1);
    const actualPositions = body.narrativeBeats.map(({position}) => position);
    if (actualPositions.some((position, index) => position !== expectedPositions[index])) {
      context.addIssue({
        code: 'custom',
        message: 'Narrative beat positions must be contiguous and ordered from one.',
        path: ['narrativeBeats'],
      });
    }

    for (const [beatIndex, beat] of body.narrativeBeats.entries()) {
      for (const claimId of beat.claimIds) {
        if (!claimIds.has(claimId)) {
          context.addIssue({
            code: 'custom',
            message: `CLAIM_MISMATCH: narrative beat references unknown claim ${claimId}.`,
            path: ['narrativeBeats', beatIndex, 'claimIds'],
          });
        }
      }
    }

    const semanticRefs = new Set([
      'thesis',
      'problem',
      'promise',
      'cta',
      ...claimIds,
      ...supportIds,
    ]);
    for (const [relationIndex, relation] of body.visualDirection.relations.entries()) {
      addUniqueIssue(
        relation.refs,
        context,
        ['visualDirection', 'relations', relationIndex, 'refs'],
        'Visual relation references must be unique.',
      );
      for (const ref of relation.refs) {
        if (!semanticRefs.has(ref) && !ref.startsWith('capability:')) {
          context.addIssue({
            code: 'custom',
            message: `Visual relation references unknown semantic ref ${ref}.`,
            path: ['visualDirection', 'relations', relationIndex, 'refs'],
          });
        }
      }
    }
    for (const ref of body.visualDirection.accessibility.readingOrderRefs) {
      if (!semanticRefs.has(ref) && !ref.startsWith('capability:')) {
        context.addIssue({
          code: 'custom',
          message: `Accessibility reading order references unknown ref ${ref}.`,
          path: ['visualDirection', 'accessibility', 'readingOrderRefs'],
        });
      }
    }
    rejectPrivateReasoning(body, context);
  });

export type CanonicalContentBodyV1 = z.infer<typeof CanonicalContentBodyV1Schema>;

export const CanonicalContentDocumentV1Schema = z
  .strictObject({
    schemaVersion: z.literal('canonical-content-document-v1'),
    frontmatter: CanonicalContentFrontmatterV1Schema,
    body: CanonicalContentBodyV1Schema,
    rawSha256: Sha256Schema,
    semanticSha256: Sha256Schema,
  })
  .superRefine((document, context) => {
    const capabilities = new Set(
      document.frontmatter.plannedCapabilities.map(({capabilityId}) => capabilityId),
    );
    for (const [beatIndex, beat] of document.body.narrativeBeats.entries()) {
      for (const capabilityId of beat.plannedCapabilityIds) {
        if (!capabilities.has(capabilityId)) {
          context.addIssue({
            code: 'custom',
            message: `RENDERER_UNAVAILABLE: unknown planned capability ${capabilityId}.`,
            path: ['body', 'narrativeBeats', beatIndex, 'plannedCapabilityIds'],
          });
        }
      }
      if (beat.plannedCapabilityIds.length > 0 && beat.stateDisclosure !== 'planned_capability') {
        context.addIssue({
          code: 'custom',
          message: 'Narrative beats using planned capabilities must disclose that state.',
          path: ['body', 'narrativeBeats', beatIndex, 'stateDisclosure'],
        });
      }
      if (beat.plannedCapabilityIds.length === 0 && beat.stateDisclosure === 'planned_capability') {
        context.addIssue({
          code: 'custom',
          message: 'A planned-capability disclosure requires at least one declared capability.',
          path: ['body', 'narrativeBeats', beatIndex, 'stateDisclosure'],
        });
      }
    }
    const plannedRefs = new Set(
      [...capabilities].map((capabilityId) => `capability:${capabilityId}`),
    );
    for (const [relationIndex, relation] of document.body.visualDirection.relations.entries()) {
      for (const ref of relation.refs) {
        if (ref.startsWith('capability:') && !plannedRefs.has(ref)) {
          context.addIssue({
            code: 'custom',
            message: `Visual relation references undeclared planned capability ${ref}.`,
            path: ['body', 'visualDirection', 'relations', relationIndex, 'refs'],
          });
        }
      }
    }
    for (const [
      refIndex,
      ref,
    ] of document.body.visualDirection.accessibility.readingOrderRefs.entries()) {
      if (ref.startsWith('capability:') && !plannedRefs.has(ref)) {
        context.addIssue({
          code: 'custom',
          message: `Accessibility reading order references undeclared planned capability ${ref}.`,
          path: ['body', 'visualDirection', 'accessibility', 'readingOrderRefs', refIndex],
        });
      }
    }
    rejectPrivateReasoning(document, context);
  });

export type CanonicalContentDocumentV1 = z.infer<typeof CanonicalContentDocumentV1Schema>;

export const ResolvedClaimEvidenceV1Schema = z.strictObject({
  claimId: PortableIdSchema,
  authorityId: PortableIdSchema,
  support: CanonicalClaimSupportV1Schema,
  evidenceRole: EvidenceRoleV1Schema,
  materialRef: HashBoundReferenceV1Schema,
  locator: EvidenceLocatorV1Schema,
  fragmentSha256: Sha256Schema,
});

export const SourceFreezeReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('source-freeze-receipt-v1'),
    receiptId: PortableIdSchema,
    manifestId: PortableIdSchema,
    manifestRef: HashBoundReferenceV1Schema,
    contentId: PortableIdSchema,
    contentVersion: VersionSchema,
    contentRef: RelativePathSchema,
    contentRawSha256: Sha256Schema,
    contentSemanticSha256: Sha256Schema,
    baseCommit: GitCommitSchema,
    producerActorInstanceId: ActorIdSchema,
    verifierActorInstanceId: ActorIdSchema,
    readSet: z.array(SourceFreezeReadSetEntryV1Schema).min(1).max(64),
    readSetSha256: Sha256Schema,
    claimBindings: z.array(ResolvedClaimEvidenceV1Schema).min(1).max(32),
    profileBindings: z.strictObject({
      brand: HashBoundReferenceV1Schema,
      voice: HashBoundReferenceV1Schema,
      channel: HashBoundReferenceV1Schema,
      adaptation: HashBoundReferenceV1Schema,
    }),
    coverage: z.strictObject({
      requiredClaimIds: z.array(PortableIdSchema).min(1).max(32),
      groundedClaimIds: z.array(PortableIdSchema).max(32),
      qualifiedClaimIds: z.array(PortableIdSchema).max(32),
      blockedClaimIds: z.array(PortableIdSchema).max(32),
      status: z.enum(['complete', 'qualified', 'blocked']),
    }),
    integrityState: z.literal('frozen'),
    authorityState: z.literal('candidate_limited'),
    scopeLocked: z.literal(true),
    authoredStatus: z.literal('DRAFT'),
    maximumState: z.literal('SCOPED'),
    globalSourceLocked: z.literal(false),
    distributionState: z.literal('NOT_DESIGNED'),
    publicationAuthority: z.literal(false),
    coverageGaps: z.array(PortableIdSchema).min(1).max(32),
    receiptSha256: Sha256Schema,
  })
  .superRefine((receipt, context) => {
    if (receipt.producerActorInstanceId === receipt.verifierActorInstanceId) {
      context.addIssue({
        code: 'custom',
        message: 'OWNERSHIP_CONFLICT: receipt producer and verifier must differ.',
        path: ['verifierActorInstanceId'],
      });
    }
    addUniqueIssue(
      receipt.readSet.map(({bindingId}) => bindingId),
      context,
      ['readSet'],
      'Receipt read-set binding IDs must be unique.',
    );
    addUniqueIssue(
      receipt.claimBindings.map(({claimId}) => claimId),
      context,
      ['claimBindings'],
      'Receipt claim bindings must be unique.',
    );
    rejectPrivateReasoning(receipt, context);
  });

export type SourceFreezeReceiptV1 = z.infer<typeof SourceFreezeReceiptV1Schema>;

export const LegacyCarouselProjectionV1Schema = z.strictObject({
  schemaVersion: z.literal('legacy-carousel-projection-v1'),
  sourceSchemaVersion: z.literal('carousel-editorial-input-v1'),
  legacyInputSha256: Sha256Schema,
  legacySnapshotSha256: Sha256Schema,
  projectId: PortableIdSchema,
  title: ShortTextSchema,
  audience: NonEmptyTextSchema,
  problem: NonEmptyTextSchema,
  promise: NonEmptyTextSchema,
  thesis: NonEmptyTextSchema,
  supports: z.array(CanonicalSupportV1Schema).min(2).max(3),
  claims: z.array(
    z.strictObject({
      claimId: PortableIdSchema,
      sourceId: PortableIdSchema,
      statement: NonEmptyTextSchema,
    }),
  ),
  callToAction: ShortTextSchema,
  legacyNotes: z.array(
    z.strictObject({
      cardId: PortableIdSchema,
      visualCue: ShortTextSchema,
    }),
  ),
  warnings: z.array(PortableIdSchema).min(1),
  legacyReadOnly: z.literal(true),
  authoredStatus: z.literal('DRAFT'),
  maximumState: z.literal('SCOPED'),
  publicationAuthority: z.literal(false),
});

export type LegacyCarouselProjectionV1 = z.infer<typeof LegacyCarouselProjectionV1Schema>;
