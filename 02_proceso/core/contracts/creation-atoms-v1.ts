import {z} from 'zod';

import {HashBoundReferenceV1Schema} from './content-v2.ts';
import {
  CanonicalClaimKindV1Schema,
  CanonicalClaimSupportV1Schema,
  EvidenceLocatorV1Schema,
  EvidenceRoleV1Schema,
  PlannedCapabilityIdV1Schema,
} from './creation-v3.ts';
import {ActorIdSchema, PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';
import {containsProhibitedReasoningText} from './reasoning-safety.ts';

const NonEmptyTextSchema = z.string().trim().min(1).max(4_000);
const ShortTextSchema = z.string().trim().min(1).max(320);
const VersionSchema = z
  .string()
  .regex(/^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?$/u, 'Expected a semantic version');

// `d3` is an authored capability ID accepted by CanonicalContentDocumentV1 even though the
// generic portable-ID contract requires three characters. Keep the exception local to atoms.
const AtomBindingIdV1Schema = z.union([PortableIdSchema, PlannedCapabilityIdV1Schema]);

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
      message: 'Durable atom contracts cannot persist private reasoning or chain-of-thought.',
      path,
    });
  }
};

export const ContentAtomClassV1Schema = z.enum(['narrative', 'visual', 'temporal', 'delivery']);

export const ContentAtomTypeV1Schema = z.enum([
  'title',
  'audience',
  'problem',
  'promise',
  'thesis',
  'support',
  'claim',
  'narrative_beat',
  'call_to_action',
  'visual_brief',
  'visual_relation',
  'planned_capability',
  'narrative_sequence',
  'format_intent',
  'rights_publication_policy',
  'accessibility_policy',
  'scope_limits',
]);

export const AtomGraphRoleV1Schema = z.enum(['source_root', 'intermediate', 'terminal']);

export const AtomOriginKindV1Schema = z.enum([
  'canonical_field',
  'authored_support',
  'authored_claim',
  'narrative_beat',
  'visual_direction',
  'visual_relation',
  'planned_capability',
  'derived_sequence',
  'derived_policy',
]);

export const AtomOriginV1Schema = z.strictObject({
  schemaVersion: z.literal('atom-origin-v1'),
  kind: AtomOriginKindV1Schema,
  contentId: PortableIdSchema,
  contentVersion: VersionSchema,
  authoredId: AtomBindingIdV1Schema.optional(),
  selector: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .regex(/^[A-Za-z0-9_.:[\]-]+$/u, 'Expected a portable authored selector'),
});

export type AtomOriginV1 = z.infer<typeof AtomOriginV1Schema>;

export const AtomEvidenceRightsVerdictV1Schema = z.enum([
  'allowed_internal_grounding',
  'allowed_internal_implementation',
  'candidate_limited',
]);

export const AtomEvidenceBindingV1Schema = z.strictObject({
  schemaVersion: z.literal('atom-evidence-binding-v1'),
  claimId: PortableIdSchema,
  authorityId: PortableIdSchema,
  support: CanonicalClaimSupportV1Schema,
  evidenceRole: EvidenceRoleV1Schema,
  materialRef: HashBoundReferenceV1Schema,
  locator: EvidenceLocatorV1Schema,
  fragmentSha256: Sha256Schema,
  rightsVerdict: AtomEvidenceRightsVerdictV1Schema,
  allowedUseScope: ShortTextSchema,
  restrictions: z.array(ShortTextSchema).max(32),
  bindingSha256: Sha256Schema,
});

export type AtomEvidenceBindingV1 = z.infer<typeof AtomEvidenceBindingV1Schema>;

export const AtomRightsStateV1Schema = z.enum([
  'allowed_internal_derivation',
  'qualified_internal_derivation',
  'planned_only',
  'blocked',
]);

export const AtomAllowedUseScopeV1Schema = z.enum([
  'internal_grounding',
  'internal_derivation',
  'internal_creation_preview',
]);

export const AtomRightsV1Schema = z.strictObject({
  schemaVersion: z.literal('atom-rights-v1'),
  state: AtomRightsStateV1Schema,
  allowedUseScopes: z.array(AtomAllowedUseScopeV1Schema).max(3),
  restrictions: z.array(ShortTextSchema).max(32),
  basisIds: z.array(AtomBindingIdV1Schema).max(32),
  distributionAllowed: z.literal(false),
  publicationAllowed: z.literal(false),
});

export type AtomRightsV1 = z.infer<typeof AtomRightsV1Schema>;

const CanonicalFieldPayloadV1Schema = z.strictObject({
  kind: z.literal('canonical_field'),
  field: z.enum(['title', 'audience', 'problem', 'promise', 'thesis', 'call_to_action']),
  value: NonEmptyTextSchema,
});

const SupportPayloadV1Schema = z.strictObject({
  kind: z.literal('support'),
  supportId: PortableIdSchema,
  pillar: z.enum(['P1', 'P2', 'P3']),
  statement: NonEmptyTextSchema,
  claimIds: z.array(PortableIdSchema).min(1).max(8),
});

const ClaimPayloadV1Schema = z.strictObject({
  kind: z.literal('claim'),
  claimId: PortableIdSchema,
  statement: NonEmptyTextSchema,
  claimKind: CanonicalClaimKindV1Schema,
  support: CanonicalClaimSupportV1Schema,
  limitation: NonEmptyTextSchema,
});

const NarrativeBeatPayloadV1Schema = z.strictObject({
  kind: z.literal('narrative_beat'),
  purpose: z.enum([
    'thesis',
    'decision',
    'system',
    'workflow_matrix',
    'process',
    'visual_router',
    'boundary',
    'cta',
    'support',
  ]),
  label: ShortTextSchema,
  statement: NonEmptyTextSchema,
  claimIds: z.array(PortableIdSchema).max(8),
  plannedCapabilityIds: z.array(PlannedCapabilityIdV1Schema).max(16),
  stateDisclosure: z.enum(['not_applicable', 'planned_capability']),
});

const VisualBriefPayloadV1Schema = z.strictObject({
  kind: z.literal('visual_brief'),
  ideaCentral: NonEmptyTextSchema,
  evidenceMode: z.enum(['conceptual', 'categorical', 'quantitative_claims']),
  mustPreserve: z.array(NonEmptyTextSchema).min(1).max(8),
  mustNotImply: z.array(NonEmptyTextSchema).min(1).max(8),
  equivalentMessage: NonEmptyTextSchema,
  nonColorCue: NonEmptyTextSchema,
});

const VisualRelationPayloadV1Schema = z.strictObject({
  kind: z.literal('visual_relation'),
  relationId: PortableIdSchema,
  relationKind: z.enum([
    'sequence',
    'dependency',
    'contrast',
    'hierarchy',
    'grouping',
    'comparison',
    'mapping',
    'boundary',
  ]),
  refs: z.array(PortableIdSchema).min(2).max(8),
  meaning: NonEmptyTextSchema,
});

const PlannedCapabilityPayloadV1Schema = z.strictObject({
  kind: z.literal('planned_capability'),
  capabilityId: PlannedCapabilityIdV1Schema,
  label: z.enum(['D3', 'Three.js', 'Lottie', 'GSAP', 'Remotion']),
  state: z.literal('planned_capability'),
  intendedUse: NonEmptyTextSchema,
  verificationGate: z.literal('H-03'),
});

const NarrativeSequencePayloadV1Schema = z.strictObject({
  kind: z.literal('narrative_sequence'),
  orderedAtomIds: z.array(PortableIdSchema).min(1).max(64),
  durationPolicy: z.literal('not_authored'),
});

const FormatIntentPayloadV1Schema = z.strictObject({
  kind: z.literal('format_intent'),
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
  locale: z.literal('es-LatAm'),
});

const RightsPublicationPolicyPayloadV1Schema = z.strictObject({
  kind: z.literal('rights_publication_policy'),
  rightsPolicy: z.literal('source_freeze_and_first_party_assets_only'),
  publicationPolicy: z.literal('forbidden'),
  distributionState: z.literal('NOT_DESIGNED'),
  publicationAuthority: z.literal(false),
  authoredRequirements: z.array(NonEmptyTextSchema).min(1).max(16),
});

const AccessibilityPolicyPayloadV1Schema = z.strictObject({
  kind: z.literal('accessibility_policy'),
  authoredRequirements: z.array(NonEmptyTextSchema).min(1).max(16),
  readingOrderRefs: z.array(PortableIdSchema).min(1).max(32),
});

const ScopeLimitsPayloadV1Schema = z.strictObject({
  kind: z.literal('scope_limits'),
  limits: z.array(NonEmptyTextSchema).min(1).max(32),
});

export const ContentAtomPayloadV1Schema = z.discriminatedUnion('kind', [
  CanonicalFieldPayloadV1Schema,
  SupportPayloadV1Schema,
  ClaimPayloadV1Schema,
  NarrativeBeatPayloadV1Schema,
  VisualBriefPayloadV1Schema,
  VisualRelationPayloadV1Schema,
  PlannedCapabilityPayloadV1Schema,
  NarrativeSequencePayloadV1Schema,
  FormatIntentPayloadV1Schema,
  RightsPublicationPolicyPayloadV1Schema,
  AccessibilityPolicyPayloadV1Schema,
  ScopeLimitsPayloadV1Schema,
]);

export type ContentAtomPayloadV1 = z.infer<typeof ContentAtomPayloadV1Schema>;

export const AtomTombstoneV1Schema = z.strictObject({
  schemaVersion: z.literal('atom-tombstone-v1'),
  retiredInContentVersion: VersionSchema,
  reason: z.enum(['deleted', 'split', 'merge', 'identity_changed']),
  priorOutputSha256: Sha256Schema,
  replacementAtomIds: z.array(PortableIdSchema).max(16),
  tombstoneSha256: Sha256Schema,
});

export type AtomTombstoneV1 = z.infer<typeof AtomTombstoneV1Schema>;

const ContentAtomV1BaseSchema = z.strictObject({
  schemaVersion: z.literal('content-atom-v1'),
  atomId: PortableIdSchema,
  atomClass: ContentAtomClassV1Schema,
  atomType: ContentAtomTypeV1Schema,
  graphRole: AtomGraphRoleV1Schema,
  identityAlgorithmVersion: z.literal('atom-identity-v1'),
  reconciliationKeySha256: Sha256Schema,
  secondaryDiscriminator: ShortTextSchema.optional(),
  secondaryIdentityApplied: z.boolean(),
  generation: z.number().int().positive(),
  revision: z.number().int().positive(),
  status: z.enum(['active', 'tombstone']),
  tombstone: AtomTombstoneV1Schema.optional(),
  origin: AtomOriginV1Schema,
  payload: ContentAtomPayloadV1Schema,
  evidenceBindings: z.array(AtomEvidenceBindingV1Schema).max(32),
  declaredRights: AtomRightsV1Schema,
  effectiveRights: AtomRightsV1Schema,
  contextSha256: Sha256Schema,
  payloadSha256: Sha256Schema,
  revisionSha256: Sha256Schema,
  inputSha256: Sha256Schema,
  outputSha256: Sha256Schema,
  reuseEligibility: z.enum([
    'eligible',
    'ineligible_tombstone',
    'ineligible_rights',
    'ineligible_context',
  ]),
  reuseFingerprintSha256: Sha256Schema,
});

const AtomTypeByPayloadKind = {
  canonical_field: new Set(['title', 'audience', 'problem', 'promise', 'thesis', 'call_to_action']),
  support: new Set(['support']),
  claim: new Set(['claim']),
  narrative_beat: new Set(['narrative_beat']),
  visual_brief: new Set(['visual_brief']),
  visual_relation: new Set(['visual_relation']),
  planned_capability: new Set(['planned_capability']),
  narrative_sequence: new Set(['narrative_sequence']),
  format_intent: new Set(['format_intent']),
  rights_publication_policy: new Set(['rights_publication_policy']),
  accessibility_policy: new Set(['accessibility_policy']),
  scope_limits: new Set(['scope_limits']),
} as const;

const AtomClassByType: Record<z.infer<typeof ContentAtomTypeV1Schema>, string> = {
  title: 'narrative',
  audience: 'narrative',
  problem: 'narrative',
  promise: 'narrative',
  thesis: 'narrative',
  support: 'narrative',
  claim: 'narrative',
  narrative_beat: 'narrative',
  call_to_action: 'narrative',
  visual_brief: 'visual',
  visual_relation: 'visual',
  planned_capability: 'visual',
  narrative_sequence: 'temporal',
  format_intent: 'delivery',
  rights_publication_policy: 'delivery',
  accessibility_policy: 'delivery',
  scope_limits: 'delivery',
};

const RightsStateRank: Record<z.infer<typeof AtomRightsStateV1Schema>, number> = {
  allowed_internal_derivation: 0,
  qualified_internal_derivation: 1,
  planned_only: 2,
  blocked: 3,
};

export const ContentAtomV1Schema = ContentAtomV1BaseSchema.superRefine((atom, context) => {
  if (!AtomTypeByPayloadKind[atom.payload.kind].has(atom.atomType)) {
    context.addIssue({
      code: 'custom',
      message: `Atom type ${atom.atomType} is incompatible with payload ${atom.payload.kind}.`,
      path: ['atomType'],
    });
  }
  if (AtomClassByType[atom.atomType] !== atom.atomClass) {
    context.addIssue({
      code: 'custom',
      message: `Atom type ${atom.atomType} requires class ${AtomClassByType[atom.atomType]}.`,
      path: ['atomClass'],
    });
  }
  if (atom.status === 'active' && atom.tombstone !== undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Active atoms cannot carry tombstones.',
      path: ['tombstone'],
    });
  }
  if (atom.secondaryIdentityApplied && atom.secondaryDiscriminator === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Secondary identity requires an explicit discriminator.',
      path: ['secondaryIdentityApplied'],
    });
  }
  if (atom.status === 'tombstone' && atom.tombstone === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Retired atoms require a tombstone.',
      path: ['tombstone'],
    });
  }
  if (atom.status === 'tombstone' && atom.reuseEligibility !== 'ineligible_tombstone') {
    context.addIssue({
      code: 'custom',
      message: 'Tombstoned identities cannot be reuse eligible.',
      path: ['reuseEligibility'],
    });
  }
  if (atom.payload.kind === 'canonical_field' && atom.payload.field !== atom.atomType) {
    context.addIssue({
      code: 'custom',
      message: 'Canonical field payload must match its atom type.',
      path: ['payload', 'field'],
    });
  }
  if (atom.payload.kind === 'claim') {
    if (atom.evidenceBindings.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'SOURCE_GAP: claim atoms require an exact evidence binding.',
        path: ['evidenceBindings'],
      });
    }
    for (const [index, binding] of atom.evidenceBindings.entries()) {
      if (binding.claimId !== atom.payload.claimId) {
        context.addIssue({
          code: 'custom',
          message: 'CLAIM_MISMATCH: evidence binding belongs to another claim.',
          path: ['evidenceBindings', index, 'claimId'],
        });
      }
    }
  }
  if (RightsStateRank[atom.effectiveRights.state] < RightsStateRank[atom.declaredRights.state]) {
    context.addIssue({
      code: 'custom',
      message: 'RIGHTS_GAP: effective rights cannot promote declared rights.',
      path: ['effectiveRights', 'state'],
    });
  }
  const declaredScopes = new Set(atom.declaredRights.allowedUseScopes);
  for (const scope of atom.effectiveRights.allowedUseScopes) {
    if (!declaredScopes.has(scope)) {
      context.addIssue({
        code: 'custom',
        message: 'RIGHTS_GAP: effective use scopes must be an intersection of declared scopes.',
        path: ['effectiveRights', 'allowedUseScopes'],
      });
    }
  }
  const effectiveRestrictions = new Set(atom.effectiveRights.restrictions);
  for (const restriction of atom.declaredRights.restrictions) {
    if (!effectiveRestrictions.has(restriction)) {
      context.addIssue({
        code: 'custom',
        message: 'RIGHTS_GAP: effective restrictions must preserve declared restrictions.',
        path: ['effectiveRights', 'restrictions'],
      });
    }
  }
  addUniqueIssue(
    atom.evidenceBindings.map(({claimId}) => claimId),
    context,
    ['evidenceBindings'],
    'Evidence bindings must use unique claim IDs.',
  );
  addUniqueIssue(
    atom.declaredRights.allowedUseScopes,
    context,
    ['declaredRights', 'allowedUseScopes'],
    'Declared rights scopes must be unique.',
  );
  addUniqueIssue(
    atom.effectiveRights.allowedUseScopes,
    context,
    ['effectiveRights', 'allowedUseScopes'],
    'Effective rights scopes must be unique.',
  );
  rejectPrivateReasoning(atom, context);
});

export type ContentAtomV1 = z.infer<typeof ContentAtomV1Schema>;

export const AtomEdgeKindV1Schema = z.enum([
  'substantiates',
  'grounds',
  'plans_capability',
  'visualizes',
  'composes',
  'sequences',
  'accessibility_orders',
]);

export const AtomEdgeV1Schema = z
  .strictObject({
    schemaVersion: z.literal('atom-edge-v1'),
    edgeId: PortableIdSchema,
    kind: AtomEdgeKindV1Schema,
    sourceAtomId: PortableIdSchema,
    targetAtomId: PortableIdSchema,
    propagationPolicy: z.enum(['hard', 'topology_only']),
    ordinal: z.number().int().positive().optional(),
    edgeSha256: Sha256Schema,
  })
  .superRefine((edge, context) => {
    const topologyKind = edge.kind === 'sequences' || edge.kind === 'accessibility_orders';
    if (
      topologyKind &&
      (edge.propagationPolicy !== 'topology_only' || edge.ordinal === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Topology edges require topology_only propagation and an ordinal.',
      });
    }
    if (!topologyKind && (edge.propagationPolicy !== 'hard' || edge.ordinal !== undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic edges require hard propagation and cannot carry an ordinal.',
      });
    }
  });

export type AtomEdgeV1 = z.infer<typeof AtomEdgeV1Schema>;

const ParentAtomGraphV1Schema = z.strictObject({
  graphId: PortableIdSchema,
  contentVersion: VersionSchema,
  graphSha256: Sha256Schema,
});

export const ContentAtomGraphV1Schema = z
  .strictObject({
    schemaVersion: z.literal('content-atom-graph-v1'),
    graphId: PortableIdSchema,
    contentId: PortableIdSchema,
    contentVersion: VersionSchema,
    contentSemanticSha256: Sha256Schema,
    contextSha256: Sha256Schema,
    parentGraph: ParentAtomGraphV1Schema.optional(),
    atomizerVersion: VersionSchema,
    atoms: z.array(ContentAtomV1Schema).min(1).max(2_048),
    edges: z.array(AtomEdgeV1Schema).max(8_192),
    evidenceState: z.literal('QUALIFIED'),
    structuralState: z.literal('ATOMIZED'),
    semanticGraphSha256: Sha256Schema,
    graphSha256: Sha256Schema,
    readinessEligible: z.literal(false),
    distributionState: z.literal('NOT_DESIGNED'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((graph, context) => {
    addUniqueIssue(
      graph.atoms.map(({atomId}) => atomId),
      context,
      ['atoms'],
      'Atom IDs must be unique.',
    );
    addUniqueIssue(
      graph.edges.map(({edgeId}) => edgeId),
      context,
      ['edges'],
      'Edge IDs must be unique.',
    );

    const sortedAtomIds = graph.atoms.map(({atomId}) => atomId).toSorted();
    if (graph.atoms.some(({atomId}, index) => atomId !== sortedAtomIds[index])) {
      context.addIssue({
        code: 'custom',
        message: 'Atoms must use canonical atomId order.',
        path: ['atoms'],
      });
    }
    const sortedEdgeIds = graph.edges.map(({edgeId}) => edgeId).toSorted();
    if (graph.edges.some(({edgeId}, index) => edgeId !== sortedEdgeIds[index])) {
      context.addIssue({
        code: 'custom',
        message: 'Edges must use canonical edgeId order.',
        path: ['edges'],
      });
    }

    const atomsById = new Map(graph.atoms.map((atom) => [atom.atomId, atom]));
    const incidentActiveIds = new Set<string>();
    const signatures = new Set<string>();
    const adjacency = new Map<string, string[]>();
    const topologyOrdinals = new Set<string>();

    for (const [index, atom] of graph.atoms.entries()) {
      if (atom.origin.contentId !== graph.contentId) {
        context.addIssue({
          code: 'custom',
          message: 'ATOM_ORIGIN_MISMATCH: atom origin belongs to another content document.',
          path: ['atoms', index, 'origin', 'contentId'],
        });
      }
    }

    for (const [index, edge] of graph.edges.entries()) {
      const source = atomsById.get(edge.sourceAtomId);
      const target = atomsById.get(edge.targetAtomId);
      if (source === undefined || target === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'ATOM_EDGE_ENDPOINT_UNKNOWN: edges must reference known atom IDs.',
          path: ['edges', index],
        });
        continue;
      }
      if (edge.sourceAtomId === edge.targetAtomId) {
        context.addIssue({
          code: 'custom',
          message: 'ATOM_SELF_EDGE: self-edges are forbidden.',
          path: ['edges', index],
        });
      }
      if (source.status !== 'active' || target.status !== 'active') {
        context.addIssue({
          code: 'custom',
          message: 'ATOM_TOMBSTONE_EDGE: edges cannot bind retired identities.',
          path: ['edges', index],
        });
      }
      incidentActiveIds.add(edge.sourceAtomId);
      incidentActiveIds.add(edge.targetAtomId);
      const signature = `${edge.kind}:${edge.sourceAtomId}:${edge.targetAtomId}:${edge.ordinal ?? '-'}`;
      if (signatures.has(signature)) {
        context.addIssue({
          code: 'custom',
          message: 'ATOM_EDGE_DUPLICATE: duplicate semantic edge.',
          path: ['edges', index],
        });
      }
      signatures.add(signature);
      const neighbors = adjacency.get(edge.sourceAtomId) ?? [];
      neighbors.push(edge.targetAtomId);
      adjacency.set(edge.sourceAtomId, neighbors);
      if (edge.ordinal !== undefined) {
        const ordinalKey = `${edge.kind}:${edge.targetAtomId}:${edge.ordinal}`;
        if (topologyOrdinals.has(ordinalKey)) {
          context.addIssue({
            code: 'custom',
            message: 'Topology ordinals must be unique per target.',
            path: ['edges', index, 'ordinal'],
          });
        }
        topologyOrdinals.add(ordinalKey);
      }
    }

    for (const [index, atom] of graph.atoms.entries()) {
      if (
        atom.status === 'active' &&
        atom.graphRole !== 'source_root' &&
        !incidentActiveIds.has(atom.atomId)
      ) {
        context.addIssue({
          code: 'custom',
          message: `ATOM_ORPHAN: ${atom.atomId} has no graph incidence and is not an explicit source root.`,
          path: ['atoms', index],
        });
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (atomId: string): boolean => {
      if (visiting.has(atomId)) return true;
      if (visited.has(atomId)) return false;
      visiting.add(atomId);
      for (const targetId of adjacency.get(atomId) ?? []) {
        if (visit(targetId)) return true;
      }
      visiting.delete(atomId);
      visited.add(atomId);
      return false;
    };
    for (const atom of graph.atoms) {
      if (atom.status === 'active' && visit(atom.atomId)) {
        context.addIssue({
          code: 'custom',
          message: 'ATOM_GRAPH_CYCLE: graph must be acyclic.',
          path: ['edges'],
        });
        break;
      }
    }
    rejectPrivateReasoning(graph, context);
  });

export type ContentAtomGraphV1 = z.infer<typeof ContentAtomGraphV1Schema>;

export const AtomizationReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('atomization-receipt-v1'),
    receiptId: PortableIdSchema,
    graphId: PortableIdSchema,
    graphRef: HashBoundReferenceV1Schema,
    contentId: PortableIdSchema,
    contentVersion: VersionSchema,
    contentRef: RelativePathSchema,
    contentRawSha256: Sha256Schema,
    contentSemanticSha256: Sha256Schema,
    sourceFreezeReceiptRef: HashBoundReferenceV1Schema,
    parentGraphRef: HashBoundReferenceV1Schema.optional(),
    atomizerVersion: VersionSchema,
    producerActorInstanceId: ActorIdSchema,
    verifierActorInstanceId: ActorIdSchema,
    atomCount: z.number().int().positive(),
    edgeCount: z.number().int().nonnegative(),
    semanticGraphSha256: Sha256Schema,
    graphSha256: Sha256Schema,
    inputSha256: Sha256Schema,
    outputSha256: Sha256Schema,
    evidenceState: z.literal('QUALIFIED'),
    structuralState: z.literal('ATOMIZED'),
    maximumState: z.literal('ATOMIZED'),
    simulationOnly: z.literal(false),
    readinessEligible: z.literal(false),
    distributionState: z.literal('NOT_DESIGNED'),
    publicationAuthority: z.literal(false),
    coverageGaps: z.array(PortableIdSchema).max(64),
    receiptSha256: Sha256Schema,
  })
  .superRefine((receipt, context) => {
    if (receipt.producerActorInstanceId === receipt.verifierActorInstanceId) {
      context.addIssue({
        code: 'custom',
        message: 'OWNERSHIP_CONFLICT: atom producer and verifier must differ.',
        path: ['verifierActorInstanceId'],
      });
    }
    rejectPrivateReasoning(receipt, context);
  });

export type AtomizationReceiptV1 = z.infer<typeof AtomizationReceiptV1Schema>;

export const AtomGraphLineageEntryV1Schema = z.strictObject({
  graphId: PortableIdSchema,
  contentVersion: VersionSchema,
  contentSemanticSha256: Sha256Schema,
  semanticGraphSha256: Sha256Schema,
  graphSha256: Sha256Schema,
  parentGraphSha256: Sha256Schema.nullable(),
  atomizationReceiptRef: HashBoundReferenceV1Schema,
  state: z.enum(['current', 'superseded', 'simulation']),
  simulationOnly: z.boolean(),
});

export const AtomGraphInvalidationV1Schema = z.strictObject({
  schemaVersion: z.literal('atom-graph-invalidation-v1'),
  fromGraphSha256: Sha256Schema,
  toGraphSha256: Sha256Schema,
  changeKind: z.enum(['raw_only', 'semantic_patch', 'topology_minor', 'identity_major']),
  changedAtomIds: z.array(PortableIdSchema).max(2_048),
  unchangedAtomIds: z.array(PortableIdSchema).max(2_048),
  addedAtomIds: z.array(PortableIdSchema).max(2_048),
  tombstonedAtomIds: z.array(PortableIdSchema).max(2_048),
  stableTopologyAtomIds: z.array(PortableIdSchema).max(2_048),
  invalidatedApprovalRefs: z.array(HashBoundReferenceV1Schema).max(64),
  priorApprovalState: z.enum(['not_applicable', 'STALE']),
  simulationOnly: z.boolean(),
  invalidationSha256: Sha256Schema,
});

export type AtomGraphInvalidationV1 = z.infer<typeof AtomGraphInvalidationV1Schema>;

export const GraphBoundApprovalSimulationV1Schema = z.strictObject({
  schemaVersion: z.literal('graph-bound-approval-simulation-v1'),
  approvalId: PortableIdSchema,
  graphSha256: Sha256Schema,
  state: z.literal('VALID_BEFORE_SIMULATION'),
  simulationOnly: z.literal(true),
  distributionState: z.literal('NOT_DESIGNED'),
  publicationAuthority: z.literal(false),
});

export type GraphBoundApprovalSimulationV1 = z.infer<typeof GraphBoundApprovalSimulationV1Schema>;

export const AtomInvalidationSimulationV1Schema = z.strictObject({
  schemaVersion: z.literal('atom-invalidation-simulation-v1'),
  simulationId: PortableIdSchema,
  simulationOnly: z.literal(true),
  fromContentVersion: VersionSchema,
  toContentVersion: VersionSchema,
  mutation: z.strictObject({
    fromText: ShortTextSchema,
    toText: ShortTextSchema,
  }),
  simulatedSourceReceipt: z.strictObject({
    receiptId: PortableIdSchema,
    contentRawSha256: Sha256Schema,
    contentSemanticSha256: Sha256Schema,
    receiptSha256: Sha256Schema,
  }),
  priorBeatAtomId: PortableIdSchema,
  currentBeatAtomId: PortableIdSchema,
  changedAtomCount: z.literal(1),
  unchangedAtomCount: z.literal(38),
  sequenceOutputStable: z.literal(true),
  approvalState: z.literal('STALE'),
  invalidation: AtomGraphInvalidationV1Schema,
  distributionState: z.literal('NOT_DESIGNED'),
  publicationAuthority: z.literal(false),
  simulationSha256: Sha256Schema,
});

export type AtomInvalidationSimulationV1 = z.infer<typeof AtomInvalidationSimulationV1Schema>;

export const AtomGraphLineageV1Schema = z
  .strictObject({
    schemaVersion: z.literal('atom-graph-lineage-v1'),
    lineageId: PortableIdSchema,
    contentId: PortableIdSchema,
    entries: z.array(AtomGraphLineageEntryV1Schema).min(1).max(1_024),
    invalidations: z.array(AtomGraphInvalidationV1Schema).max(1_024),
    currentGraphSha256: Sha256Schema,
    distributionState: z.literal('NOT_DESIGNED'),
    publicationAuthority: z.literal(false),
    lineageSha256: Sha256Schema,
  })
  .superRefine((lineage, context) => {
    addUniqueIssue(
      lineage.entries.map(({graphSha256}) => graphSha256),
      context,
      ['entries'],
      'Lineage graph hashes must be unique.',
    );
    const current = lineage.entries.filter(({state}) => state === 'current');
    if (current.length !== 1 || current[0]?.graphSha256 !== lineage.currentGraphSha256) {
      context.addIssue({
        code: 'custom',
        message: 'Lineage must identify exactly one current graph matching currentGraphSha256.',
        path: ['currentGraphSha256'],
      });
    }
    for (const [index, entry] of lineage.entries.entries()) {
      if (entry.state === 'simulation' && !entry.simulationOnly) {
        context.addIssue({
          code: 'custom',
          message: 'Simulation lineage entries must be explicit.',
          path: ['entries', index, 'simulationOnly'],
        });
      }
      if (entry.state !== 'simulation' && entry.simulationOnly) {
        context.addIssue({
          code: 'custom',
          message: 'Only simulation lineage entries may be marked simulation-only.',
          path: ['entries', index, 'simulationOnly'],
        });
      }
    }
    rejectPrivateReasoning(lineage, context);
  });

export type AtomGraphLineageV1 = z.infer<typeof AtomGraphLineageV1Schema>;
