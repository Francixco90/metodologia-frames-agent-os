import type {
  AtomEdgeV1,
  ContentAtomGraphV1,
  ContentAtomV1,
} from '../../../core/contracts/creation-atoms-v1.ts';
import {ContentAtomGraphV1Schema} from '../../../core/contracts/creation-atoms-v1.ts';
import type {
  CanonicalContentDocumentV1,
  SourceFreezeManifestV1,
} from '../../../core/contracts/index.ts';
import {hashCanonical} from '../../../core/evidence/hash.ts';
import type {LoadedCanonicalContentV1} from '../markdown/parse-canonical-content.ts';

export const ATOMIZER_VERSION_V1 = '1.0.0' as const;
export const ATOM_IDENTITY_ALGORITHM_V1 = 'atom-identity-v1' as const;

export class AtomizationError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = 'AtomizationError';
  }
}

type AtomClass = 'delivery' | 'narrative' | 'temporal' | 'visual';
type GraphRole = 'intermediate' | 'source_root' | 'terminal';
type AtomStatus = 'active' | 'tombstone';
type RightsState =
  'allowed_internal_derivation' | 'blocked' | 'planned_only' | 'qualified_internal_derivation';

type Rights = ContentAtomV1['declaredRights'];
type EvidenceBinding = ContentAtomV1['evidenceBindings'][number];
type Origin = ContentAtomV1['origin'];

type AtomDraft = {
  atomClass: AtomClass;
  atomType: string;
  graphRole: GraphRole;
  primaryIdentity: unknown;
  secondaryDiscriminator?: string;
  origin: Origin;
  payload: ContentAtomV1['payload'];
  evidenceBindings: EvidenceBinding[];
  declaredRights: Rights;
};

type ActiveAtom = ContentAtomV1 & {
  status: 'active';
  atomClass: AtomClass;
  atomType: string;
  graphRole: GraphRole;
  reconciliationKeySha256: string;
  secondaryDiscriminator?: string;
  generation: number;
  revision: number;
  payload: ContentAtomV1['payload'];
  evidenceBindings: EvidenceBinding[];
  declaredRights: Rights;
  effectiveRights: Rights;
  origin: Origin;
  outputSha256: string;
};

type TombstoneAtom = ContentAtomV1 & {
  status: 'tombstone';
  atomClass: AtomClass;
  atomType: string;
  reconciliationKeySha256: string;
  secondaryDiscriminator?: string;
  generation: number;
  revision: number;
  payload: ContentAtomV1['payload'];
  evidenceBindings: EvidenceBinding[];
  declaredRights: Rights;
  effectiveRights: Rights;
  origin: Origin;
  outputSha256: string;
};

type EdgeDraft = {
  kind:
    | 'accessibility_orders'
    | 'composes'
    | 'grounds'
    | 'plans_capability'
    | 'sequences'
    | 'substantiates'
    | 'visualizes';
  sourceKey: string;
  targetKey: string;
  propagationPolicy: 'hard' | 'topology_only';
  ordinal?: number;
};

export type AtomizeCanonicalContentInputV1 = {
  loaded: LoadedCanonicalContentV1;
  parentGraph?: ContentAtomGraphV1;
  atomizerVersion?: string;
};

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const uniqueSorted = <T extends string>(values: readonly T[]): T[] =>
  [...new Set(values)].sort(compareText);

const allowedScopes = [
  'internal_derivation',
  'internal_creation_preview',
  'internal_grounding',
] as const;

const rights = (
  state: RightsState,
  restrictions: readonly string[] = ['no_publication_authority'],
  scopes: readonly string[] = allowedScopes,
  basisIds: readonly string[] = ['pilot-carousel-002'],
): Rights => ({
  schemaVersion: 'atom-rights-v1',
  state,
  allowedUseScopes: uniqueSorted(scopes) as Rights['allowedUseScopes'],
  restrictions: uniqueSorted(restrictions),
  basisIds: uniqueSorted(basisIds),
  distributionAllowed: false,
  publicationAllowed: false,
});

const atomContextSha256 = (
  document: CanonicalContentDocumentV1,
  manifest: SourceFreezeManifestV1,
): string =>
  hashCanonical({
    domain: 'content-atom-v1:context:v1',
    contentId: document.frontmatter.contentId,
    brandId: document.frontmatter.brandId,
    locale: document.frontmatter.locale,
    primaryWorkflow: document.frontmatter.primaryWorkflow,
    surface: document.frontmatter.surface,
    profiles: document.frontmatter.profiles,
    sourceFreezeManifest: document.frontmatter.sourceFreezeManifest,
    manifestId: manifest.manifestId,
  });

const origin = (
  document: CanonicalContentDocumentV1,
  kind: Origin['kind'],
  selector: string,
  authoredId?: string,
): Origin => ({
  schemaVersion: 'atom-origin-v1',
  kind,
  ...(authoredId === undefined ? {} : {authoredId}),
  selector,
  contentId: document.frontmatter.contentId,
  contentVersion: document.frontmatter.version,
});

const singularDraft = (
  document: CanonicalContentDocumentV1,
  field: 'audience' | 'problem' | 'promise' | 'thesis' | 'title',
  value: string,
): AtomDraft => ({
  atomClass: 'narrative',
  atomType: field,
  graphRole: 'source_root',
  primaryIdentity: {kind: 'singular_field', field},
  origin: origin(document, 'canonical_field', `body.${field}`, field),
  payload: {kind: 'canonical_field', field, value},
  evidenceBindings: [],
  declaredRights: rights('allowed_internal_derivation'),
});

const authorityRights = (
  manifest: SourceFreezeManifestV1,
  authorityId: string,
): {binding: SourceFreezeManifestV1['authorities'][number]; rights: Rights} => {
  const binding = manifest.authorities.find((candidate) => candidate.authorityId === authorityId);
  if (binding === undefined) {
    throw new AtomizationError('SOURCE_GAP', `Authority ${authorityId} is absent from the freeze.`);
  }
  const state =
    binding.lifecycleState === 'candidate' || binding.useDecision === 'qualified_candidate'
      ? 'qualified_internal_derivation'
      : 'allowed_internal_derivation';
  return {
    binding,
    rights: rights(state, [...binding.restrictions, 'no_publication_authority'], allowedScopes, [
      binding.authorityId,
    ]),
  };
};

const evidenceBindingForClaim = (
  loaded: LoadedCanonicalContentV1,
  claimId: string,
): EvidenceBinding => {
  const resolved = loaded.resolvedClaims.find(({claim}) => claim.claimId === claimId);
  if (resolved === undefined) {
    throw new AtomizationError('SOURCE_GAP', `Claim ${claimId} has no resolved evidence.`);
  }
  const authority = loaded.manifest.authorities.find(
    (candidate) => candidate.authorityId === resolved.claim.authorityId,
  );
  if (authority === undefined) {
    throw new AtomizationError(
      'SOURCE_GAP',
      `Claim ${claimId} uses unknown authority ${resolved.claim.authorityId}.`,
    );
  }
  const unsigned = {
    schemaVersion: 'atom-evidence-binding-v1' as const,
    claimId,
    authorityId: resolved.claim.authorityId,
    support: resolved.claim.support,
    evidenceRole: resolved.claim.evidenceRole,
    materialRef: resolved.materialRef,
    locator: resolved.claim.locator,
    fragmentSha256: resolved.fragmentSha256,
    rightsVerdict: authority.rightsVerdict,
    allowedUseScope: authority.allowedUseScope,
    restrictions: uniqueSorted(authority.restrictions),
  };
  return {...unsigned, bindingSha256: hashCanonical(unsigned)};
};

const makeDrafts = (loaded: LoadedCanonicalContentV1): AtomDraft[] => {
  const {document, manifest} = loaded;
  const {body, frontmatter} = document;
  const drafts: AtomDraft[] = [
    singularDraft(document, 'title', body.title),
    singularDraft(document, 'audience', body.audience),
    singularDraft(document, 'problem', body.problem),
    singularDraft(document, 'promise', body.promise),
    singularDraft(document, 'thesis', body.thesis),
  ];

  for (const support of body.supports) {
    drafts.push({
      atomClass: 'narrative',
      atomType: 'support',
      graphRole: 'intermediate',
      primaryIdentity: {kind: 'authored_id', authoredId: support.supportId},
      origin: origin(
        document,
        'authored_support',
        `body.supports:[${support.supportId}]`,
        support.supportId,
      ),
      payload: {kind: 'support', ...support, claimIds: uniqueSorted(support.claimIds)},
      evidenceBindings: [],
      declaredRights: rights('allowed_internal_derivation'),
    });
  }

  for (const claim of body.claims) {
    const {rights: claimRights} = authorityRights(manifest, claim.authorityId);
    drafts.push({
      atomClass: 'narrative',
      atomType: 'claim',
      graphRole: 'source_root',
      primaryIdentity: {kind: 'authored_id', authoredId: claim.claimId},
      origin: origin(document, 'authored_claim', `body.claims:[${claim.claimId}]`, claim.claimId),
      payload: {
        kind: 'claim',
        claimId: claim.claimId,
        statement: claim.statement,
        claimKind: claim.claimKind,
        support: claim.support,
        limitation: claim.limitation,
      },
      evidenceBindings: [evidenceBindingForClaim(loaded, claim.claimId)],
      declaredRights: claimRights,
    });
  }

  for (const beat of body.narrativeBeats) {
    const primaryIdentity = {
      kind: 'narrative_beat',
      purpose: beat.purpose,
      claimIds: uniqueSorted(beat.claimIds),
      capabilityIds: uniqueSorted(beat.plannedCapabilityIds),
      stateDisclosure: beat.stateDisclosure,
    };
    drafts.push({
      atomClass: 'narrative',
      atomType: 'narrative_beat',
      graphRole: 'intermediate',
      primaryIdentity,
      secondaryDiscriminator: beat.label.normalize('NFC').trim(),
      origin: origin(
        document,
        'narrative_beat',
        `body.narrativeBeats:[${hashCanonical(primaryIdentity)}]`,
      ),
      payload: {
        kind: 'narrative_beat',
        label: beat.label,
        purpose: beat.purpose,
        statement: beat.statement,
        claimIds: uniqueSorted(beat.claimIds),
        plannedCapabilityIds: uniqueSorted(beat.plannedCapabilityIds),
        stateDisclosure: beat.stateDisclosure,
      },
      evidenceBindings: [],
      declaredRights: rights('allowed_internal_derivation'),
    });
  }

  drafts.push({
    atomClass: 'narrative',
    atomType: 'call_to_action',
    graphRole: 'source_root',
    primaryIdentity: {kind: 'singular_field', field: 'callToAction'},
    origin: origin(document, 'canonical_field', 'body.callToAction', 'call_to_action'),
    payload: {kind: 'canonical_field', field: 'call_to_action', value: body.callToAction},
    evidenceBindings: [],
    declaredRights: rights('allowed_internal_derivation'),
  });

  drafts.push({
    atomClass: 'visual',
    atomType: 'visual_brief',
    graphRole: 'terminal',
    primaryIdentity: {kind: 'singular_field', field: 'visualDirection'},
    origin: origin(document, 'visual_direction', 'body.visualDirection', 'visualDirection'),
    payload: {
      kind: 'visual_brief',
      ideaCentral: body.visualDirection.ideaCentral,
      evidenceMode: body.visualDirection.evidenceMode,
      mustPreserve: [...body.visualDirection.mustPreserve],
      mustNotImply: [...body.visualDirection.mustNotImply],
      equivalentMessage: body.visualDirection.accessibility.equivalentMessage,
      nonColorCue: body.visualDirection.accessibility.nonColorCue,
    },
    evidenceBindings: [],
    declaredRights: rights('allowed_internal_derivation'),
  });

  for (const relation of body.visualDirection.relations) {
    drafts.push({
      atomClass: 'visual',
      atomType: 'visual_relation',
      graphRole: 'intermediate',
      primaryIdentity: {kind: 'authored_id', authoredId: relation.relationId},
      origin: origin(
        document,
        'visual_relation',
        `body.visualDirection.relations:[${relation.relationId}]`,
        relation.relationId,
      ),
      payload: {
        kind: 'visual_relation',
        relationId: relation.relationId,
        relationKind: relation.kind,
        refs: [...relation.refs],
        meaning: relation.meaning,
      },
      evidenceBindings: [],
      declaredRights: rights('allowed_internal_derivation'),
    });
  }

  for (const capability of frontmatter.plannedCapabilities) {
    drafts.push({
      atomClass: 'visual',
      atomType: 'planned_capability',
      graphRole: 'source_root',
      primaryIdentity: {kind: 'authored_id', authoredId: capability.capabilityId},
      origin: origin(
        document,
        'planned_capability',
        `frontmatter.plannedCapabilities:[${capability.capabilityId}]`,
        capability.capabilityId,
      ),
      payload: {
        kind: 'planned_capability',
        capabilityId: capability.capabilityId,
        label: capability.label,
        state: capability.state,
        intendedUse: capability.intendedUse,
        verificationGate: capability.verificationGate,
      },
      evidenceBindings: [],
      declaredRights: rights(
        'planned_only',
        ['h03_verification_required', 'no_publication_authority'],
        ['internal_creation_preview'],
        [capability.capabilityId],
      ),
    });
  }

  drafts.push({
    atomClass: 'temporal',
    atomType: 'narrative_sequence',
    graphRole: 'terminal',
    primaryIdentity: {kind: 'derived_structure', structure: 'narrative_sequence'},
    origin: origin(document, 'derived_sequence', 'body.narrativeBeats.order'),
    payload: {
      kind: 'narrative_sequence',
      orderedAtomIds: [],
      durationPolicy: 'not_authored',
    },
    evidenceBindings: [],
    declaredRights: rights('allowed_internal_derivation'),
  });

  drafts.push(
    {
      atomClass: 'delivery',
      atomType: 'format_intent',
      graphRole: 'source_root',
      primaryIdentity: {kind: 'policy_projection', policy: 'format_intent'},
      origin: origin(document, 'derived_policy', 'frontmatter.formatIntent'),
      payload: {
        kind: 'format_intent',
        primaryWorkflow: frontmatter.primaryWorkflow,
        surface: frontmatter.surface,
        editorialPattern: frontmatter.editorialPattern,
        locale: frontmatter.locale,
      },
      evidenceBindings: [],
      declaredRights: rights('allowed_internal_derivation'),
    },
    {
      atomClass: 'delivery',
      atomType: 'rights_publication_policy',
      graphRole: 'source_root',
      primaryIdentity: {kind: 'policy_projection', policy: 'rights_publication'},
      origin: origin(document, 'derived_policy', 'frontmatter.rightsAndPublication'),
      payload: {
        kind: 'rights_publication_policy',
        rightsPolicy: frontmatter.rightsPolicy,
        publicationPolicy: frontmatter.publicationPolicy,
        distributionState: frontmatter.distributionState,
        publicationAuthority: frontmatter.publicationAuthority,
        authoredRequirements: [...body.rightsAndAssets],
      },
      evidenceBindings: [],
      declaredRights: rights('blocked', ['no_publication_authority'], []),
    },
    {
      atomClass: 'delivery',
      atomType: 'accessibility_policy',
      graphRole: 'source_root',
      primaryIdentity: {kind: 'policy_projection', policy: 'accessibility'},
      origin: origin(document, 'derived_policy', 'body.accessibility'),
      payload: {
        kind: 'accessibility_policy',
        authoredRequirements: [...body.accessibility],
        readingOrderRefs: [...body.visualDirection.accessibility.readingOrderRefs],
      },
      evidenceBindings: [],
      declaredRights: rights('allowed_internal_derivation'),
    },
    {
      atomClass: 'delivery',
      atomType: 'scope_limits',
      graphRole: 'source_root',
      primaryIdentity: {kind: 'policy_projection', policy: 'limits'},
      origin: origin(document, 'derived_policy', 'body.limits'),
      payload: {kind: 'scope_limits', limits: [...body.limits]},
      evidenceBindings: [],
      declaredRights: rights('allowed_internal_derivation'),
    },
  );

  return drafts;
};

const atomLookupKey = (atom: {
  atomClass: string;
  atomType: string;
  reconciliationKeySha256: string;
}): string => `${atom.atomClass}:${atom.atomType}:${atom.reconciliationKeySha256}`;

const draftLookupKey = (draft: AtomDraft): string =>
  `${draft.atomClass}:${draft.atomType}:${hashCanonical({domain: 'atom-reconciliation-key-v1', value: draft.primaryIdentity})}`;

const nextGeneration = (parentAtoms: readonly ContentAtomV1[], key: string): number => {
  const generations = parentAtoms
    .filter((atom) => atomLookupKey(atom as ActiveAtom) === key)
    .map((atom) => (atom as ActiveAtom).generation);
  return generations.length === 0 ? 1 : Math.max(...generations) + 1;
};

const reconcileDraft = (
  contentId: string,
  contextSha256: string,
  draft: AtomDraft,
  parentAtoms: readonly ContentAtomV1[],
  requireSecondary: boolean,
  consumedParentAtomIds: Set<string>,
): ActiveAtom => {
  const reconciliationKeySha256 = hashCanonical({
    domain: 'atom-reconciliation-key-v1',
    value: draft.primaryIdentity,
  });
  const key = `${draft.atomClass}:${draft.atomType}:${reconciliationKeySha256}`;
  const primaryMatches = parentAtoms.filter(
    (atom) =>
      atom.status === 'active' &&
      !consumedParentAtomIds.has(atom.atomId) &&
      atomLookupKey(atom as ActiveAtom) === key,
  ) as ActiveAtom[];
  let matched: ActiveAtom | undefined;
  if (primaryMatches.length === 1 && !requireSecondary) {
    [matched] = primaryMatches;
  } else if (primaryMatches.length > 0) {
    const secondaryMatches = primaryMatches.filter(
      (atom) => atom.secondaryDiscriminator === draft.secondaryDiscriminator,
    );
    if (secondaryMatches.length > 1 || (!requireSecondary && secondaryMatches.length !== 1)) {
      throw new AtomizationError(
        'ATOM_IDENTITY_AMBIGUOUS',
        `Reconciliation key ${key} matched ${primaryMatches.length} parent atoms.`,
      );
    }
    [matched] = secondaryMatches;
  }
  if (matched !== undefined) consumedParentAtomIds.add(matched.atomId);

  const generation = matched?.generation ?? nextGeneration(parentAtoms, key);
  const secondaryIdentityApplied = matched?.secondaryIdentityApplied ?? requireSecondary;
  const atomId =
    matched?.atomId ??
    `ATM-${hashCanonical({
      domain: 'content-atom-v1:identity:v1',
      contentId,
      atomClass: draft.atomClass,
      atomType: draft.atomType,
      reconciliationKeySha256,
      ...(secondaryIdentityApplied ? {secondaryDiscriminator: draft.secondaryDiscriminator} : {}),
      generation,
    })}`;
  const payloadSha256 = hashCanonical({
    domain: 'content-atom-v1:payload:v1',
    atomId,
    atomClass: draft.atomClass,
    atomType: draft.atomType,
    payload: draft.payload,
  });
  // Origin records where the identity first entered the lineage. Reused atoms keep that
  // origin so a document version bump does not invalidate 38 otherwise unchanged atoms.
  const effectiveOrigin = matched?.origin ?? draft.origin;
  const revisionSha256 = hashCanonical({
    domain: 'content-atom-v1:revision:v1',
    payloadSha256,
    origin: effectiveOrigin,
    evidenceBindings: draft.evidenceBindings,
    declaredRights: draft.declaredRights,
    contextSha256,
  });
  const revision =
    matched === undefined
      ? 1
      : matched.revisionSha256 === revisionSha256
        ? matched.revision
        : matched.revision + 1;
  const base = {
    schemaVersion: 'content-atom-v1' as const,
    atomId,
    atomClass: draft.atomClass,
    atomType: draft.atomType,
    graphRole: draft.graphRole,
    identityAlgorithmVersion: ATOM_IDENTITY_ALGORITHM_V1,
    reconciliationKeySha256,
    ...(draft.secondaryDiscriminator === undefined
      ? {}
      : {secondaryDiscriminator: draft.secondaryDiscriminator}),
    secondaryIdentityApplied,
    generation,
    revision,
    status: 'active' as AtomStatus,
    origin: effectiveOrigin,
    payload: draft.payload,
    evidenceBindings: draft.evidenceBindings,
    declaredRights: draft.declaredRights,
    effectiveRights: draft.declaredRights,
    contextSha256,
    payloadSha256,
    revisionSha256,
    inputSha256: hashCanonical({domain: 'content-atom-v1:inputs:v1', dependencies: []}),
    outputSha256: '',
    reuseEligibility: 'eligible' as const,
    reuseFingerprintSha256: hashCanonical({
      domain: 'content-atom-v1:reuse:v1',
      contentId,
      atomClass: draft.atomClass,
      atomType: draft.atomType,
      reconciliationKeySha256,
      ...(secondaryIdentityApplied ? {secondaryDiscriminator: draft.secondaryDiscriminator} : {}),
      generation,
    }),
  };
  return base as unknown as ActiveAtom;
};

const originKey = (atom: ActiveAtom): string => {
  if (atom.payload.kind === 'narrative_beat') {
    return `beat:${atom.reconciliationKeySha256}:${atom.secondaryDiscriminator ?? ''}`;
  }
  if (atom.atomType === 'call_to_action') return 'cta';
  if (atom.atomType === 'visual_brief') return 'visual_brief';
  const authoredId = atom.origin.authoredId;
  if (authoredId !== undefined) {
    if (atom.atomType === 'planned_capability') return `capability:${authoredId}`;
    return authoredId;
  }
  return atom.atomType;
};

const beatIdentity = (
  beat: CanonicalContentDocumentV1['body']['narrativeBeats'][number],
): unknown => ({
  kind: 'narrative_beat',
  purpose: beat.purpose,
  claimIds: uniqueSorted(beat.claimIds),
  capabilityIds: uniqueSorted(beat.plannedCapabilityIds),
  stateDisclosure: beat.stateDisclosure,
});

const beatLookupKey = (
  beat: CanonicalContentDocumentV1['body']['narrativeBeats'][number],
): string =>
  `beat:${hashCanonical({domain: 'atom-reconciliation-key-v1', value: beatIdentity(beat)})}:${beat.label.normalize('NFC').trim()}`;

const makeEdgeDrafts = (
  document: CanonicalContentDocumentV1,
  atoms: readonly ActiveAtom[],
): EdgeDraft[] => {
  const byOriginKey = new Map(atoms.map((atom) => [originKey(atom), atom]));
  const requireKey = (key: string): string => {
    if (!byOriginKey.has(key)) {
      throw new AtomizationError('ATOM_ORPHAN', `Unable to resolve authored ref ${key}.`);
    }
    return key;
  };
  const edges: EdgeDraft[] = [];
  for (const support of document.body.supports) {
    for (const claimId of support.claimIds) {
      edges.push({
        kind: 'substantiates',
        sourceKey: requireKey(claimId),
        targetKey: requireKey(support.supportId),
        propagationPolicy: 'hard',
      });
    }
  }
  for (const beat of document.body.narrativeBeats) {
    for (const claimId of beat.claimIds) {
      edges.push({
        kind: 'grounds',
        sourceKey: requireKey(claimId),
        targetKey: requireKey(beatLookupKey(beat)),
        propagationPolicy: 'hard',
      });
    }
    if (beat.purpose === 'cta') {
      edges.push({
        kind: 'grounds',
        sourceKey: requireKey('cta'),
        targetKey: requireKey(beatLookupKey(beat)),
        propagationPolicy: 'hard',
      });
    }
    for (const capabilityId of beat.plannedCapabilityIds) {
      edges.push({
        kind: 'plans_capability',
        sourceKey: requireKey(`capability:${capabilityId}`),
        targetKey: requireKey(beatLookupKey(beat)),
        propagationPolicy: 'hard',
      });
    }
  }
  for (const relation of document.body.visualDirection.relations) {
    for (const ref of relation.refs) {
      edges.push({
        kind: 'visualizes',
        sourceKey: requireKey(ref),
        targetKey: requireKey(relation.relationId),
        propagationPolicy: 'hard',
      });
    }
    edges.push({
      kind: 'composes',
      sourceKey: requireKey(relation.relationId),
      targetKey: requireKey('visual_brief'),
      propagationPolicy: 'hard',
    });
  }
  document.body.visualDirection.accessibility.readingOrderRefs.forEach((ref, index) => {
    edges.push({
      kind: 'accessibility_orders',
      sourceKey: requireKey(ref),
      targetKey: requireKey('visual_brief'),
      propagationPolicy: 'topology_only',
      ordinal: index + 1,
    });
  });
  document.body.narrativeBeats.forEach((beat, index) => {
    edges.push({
      kind: 'sequences',
      sourceKey: requireKey(beatLookupKey(beat)),
      targetKey: requireKey('narrative_sequence'),
      propagationPolicy: 'topology_only',
      ordinal: index + 1,
    });
  });
  return edges;
};

const materializeEdges = (
  drafts: readonly EdgeDraft[],
  atoms: readonly ActiveAtom[],
): AtomEdgeV1[] => {
  const byKey = new Map(atoms.map((atom) => [originKey(atom), atom]));
  return drafts
    .map((draft) => {
      const sourceAtomId = byKey.get(draft.sourceKey)?.atomId;
      const targetAtomId = byKey.get(draft.targetKey)?.atomId;
      if (sourceAtomId === undefined || targetAtomId === undefined) {
        throw new AtomizationError('ATOM_ORPHAN', `Edge ${draft.kind} has an unresolved endpoint.`);
      }
      const unsigned = {
        schemaVersion: 'atom-edge-v1' as const,
        edgeId: `AED-${hashCanonical({
          domain: 'atom-edge-v1:identity:v1',
          kind: draft.kind,
          sourceAtomId,
          targetAtomId,
          propagationPolicy: draft.propagationPolicy,
          ordinal: draft.ordinal ?? null,
        })}`,
        kind: draft.kind,
        sourceAtomId,
        targetAtomId,
        propagationPolicy: draft.propagationPolicy,
        ...(draft.ordinal === undefined ? {} : {ordinal: draft.ordinal}),
      };
      return {...unsigned, edgeSha256: hashCanonical(unsigned)};
    })
    .sort((left, right) => compareText(left.edgeId, right.edgeId));
};

const rightsRank: Record<RightsState, number> = {
  allowed_internal_derivation: 0,
  qualified_internal_derivation: 1,
  planned_only: 2,
  blocked: 3,
};

const intersectRights = (values: readonly Rights[]): Rights => {
  if (values.length === 0) return rights('blocked', ['missing_rights'], []);
  const [first, ...rest] = values;
  if (first === undefined) return rights('blocked', ['missing_rights'], []);
  const allowedUseScopes = first.allowedUseScopes.filter((scope) =>
    rest.every((candidate) => candidate.allowedUseScopes.includes(scope)),
  );
  const state = values.reduce<RightsState>(
    (worst, candidate) =>
      rightsRank[candidate.state] > rightsRank[worst] ? candidate.state : worst,
    first.state,
  );
  return rights(
    allowedUseScopes.length === 0 ? 'blocked' : state,
    values.flatMap(({restrictions}) => restrictions),
    allowedUseScopes,
    values.flatMap(({basisIds}) => basisIds),
  );
};

const hydrateDependencyHashes = (
  atoms: readonly ActiveAtom[],
  edges: readonly AtomEdgeV1[],
  atomizerVersion: string,
): ActiveAtom[] => {
  const byId = new Map(atoms.map((atom) => [atom.atomId, {...atom}] as const));
  const incoming = new Map<string, AtomEdgeV1[]>();
  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>(atoms.map((atom) => [atom.atomId, 0]));
  for (const edge of edges) {
    incoming.set(edge.targetAtomId, [...(incoming.get(edge.targetAtomId) ?? []), edge]);
    outgoing.set(edge.sourceAtomId, [
      ...(outgoing.get(edge.sourceAtomId) ?? []),
      edge.targetAtomId,
    ]);
    indegree.set(edge.targetAtomId, (indegree.get(edge.targetAtomId) ?? 0) + 1);
  }
  const queue = [...indegree.entries()]
    .filter(([, count]) => count === 0)
    .map(([atomId]) => atomId)
    .sort(compareText);
  const ordered: string[] = [];
  while (queue.length > 0) {
    const atomId = queue.shift();
    if (atomId === undefined) break;
    ordered.push(atomId);
    for (const targetId of outgoing.get(atomId) ?? []) {
      const next = (indegree.get(targetId) ?? 0) - 1;
      indegree.set(targetId, next);
      if (next === 0) {
        queue.push(targetId);
        queue.sort(compareText);
      }
    }
  }
  if (ordered.length !== atoms.length) {
    throw new AtomizationError('ATOM_GRAPH_CYCLE', 'Graph contains at least one directed cycle.');
  }
  for (const atomId of ordered) {
    const atom = byId.get(atomId);
    if (atom === undefined) throw new AtomizationError('ATOM_ORPHAN', `Unknown atom ${atomId}.`);
    const dependencies = [...(incoming.get(atomId) ?? [])].sort((left, right) =>
      compareText(left.edgeId, right.edgeId),
    );
    const inputTokens = dependencies.map((edge) => {
      const upstream = byId.get(edge.sourceAtomId);
      if (upstream === undefined) {
        throw new AtomizationError('ATOM_ORPHAN', `Unknown source atom ${edge.sourceAtomId}.`);
      }
      return edge.propagationPolicy === 'hard'
        ? {
            edgeId: edge.edgeId,
            sourceAtomId: edge.sourceAtomId,
            outputSha256: upstream.outputSha256,
          }
        : {
            edgeId: edge.edgeId,
            sourceAtomId: edge.sourceAtomId,
            ordinal: edge.ordinal,
          };
    });
    const hardRights = dependencies
      .filter((edge) => edge.propagationPolicy === 'hard')
      .map((edge) => byId.get(edge.sourceAtomId)?.effectiveRights)
      .filter((value): value is Rights => value !== undefined);
    const effectiveRights = intersectRights([atom.declaredRights, ...hardRights]);
    const inputSha256 = hashCanonical({
      domain: 'content-atom-v1:inputs:v1',
      dependencies: inputTokens,
    });
    const outputSha256 = hashCanonical({
      domain: 'content-atom-v1:output:v1',
      atomizerVersion,
      revision: atom.revision,
      revisionSha256: atom.revisionSha256,
      inputSha256,
      effectiveRights,
    });
    byId.set(atomId, {...atom, effectiveRights, inputSha256, outputSha256});
  }
  return [...byId.values()].sort((left, right) => compareText(left.atomId, right.atomId));
};

const makeTombstones = (
  parentAtoms: readonly ContentAtomV1[],
  active: readonly ActiveAtom[],
  contentVersion: string,
): TombstoneAtom[] => {
  const activeIds = new Set(active.map(({atomId}) => atomId));
  return parentAtoms
    .flatMap((atom) => {
      const previous = atom as ActiveAtom | TombstoneAtom;
      if (previous.status === 'tombstone') return [previous];
      if (activeIds.has(previous.atomId)) return [];
      const unsignedTombstone = {
        schemaVersion: 'atom-tombstone-v1' as const,
        retiredInContentVersion: contentVersion,
        reason: 'deleted' as const,
        priorOutputSha256: previous.outputSha256,
        replacementAtomIds: [],
      };
      const tombstone = {
        ...unsignedTombstone,
        tombstoneSha256: hashCanonical({
          domain: 'atom-tombstone-v1:integrity:v1',
          tombstone: unsignedTombstone,
        }),
      };
      const revision = previous.revision + 1;
      const revisionSha256 = hashCanonical({
        domain: 'content-atom-v1:tombstone-revision:v1',
        atomId: previous.atomId,
        payloadSha256: previous.payloadSha256,
        origin: previous.origin,
        evidenceBindings: previous.evidenceBindings,
        declaredRights: previous.declaredRights,
        contextSha256: previous.contextSha256,
        revision,
        tombstone,
      });
      return [
        {
          ...previous,
          status: 'tombstone' as const,
          graphRole: 'source_root' as const,
          revision,
          revisionSha256,
          tombstone,
          outputSha256: hashCanonical({
            domain: 'content-atom-v1:tombstone-output:v1',
            atomId: previous.atomId,
            revisionSha256,
            priorOutputSha256: tombstone.priorOutputSha256,
          }),
          reuseEligibility: 'ineligible_tombstone' as const,
        },
      ];
    })
    .sort((left, right) => compareText(left.atomId, right.atomId));
};

export const validateContentAtomGraphV1 = (graph: ContentAtomGraphV1): void => {
  const atoms = graph.atoms;
  const active = atoms.filter(({status}) => status === 'active') as ActiveAtom[];
  const activeIds = new Set(active.map(({atomId}) => atomId));
  if (activeIds.size !== active.length) {
    throw new AtomizationError('ATOM_ID_REUSED', 'Atom IDs must be unique.');
  }
  if (atoms.some((atom, index) => index > 0 && atoms[index - 1]!.atomId > atom.atomId)) {
    throw new AtomizationError('NON_CANONICAL_ORDER', 'Atoms must be ordered by atomId.');
  }
  if (
    graph.edges.some((edge, index) => index > 0 && graph.edges[index - 1]!.edgeId > edge.edgeId)
  ) {
    throw new AtomizationError('NON_CANONICAL_ORDER', 'Edges must be ordered by edgeId.');
  }
  const signatures = new Set<string>();
  const degree = new Map<string, number>(active.map(({atomId}) => [atomId, 0]));
  for (const edge of graph.edges) {
    if (edge.sourceAtomId === edge.targetAtomId) {
      throw new AtomizationError('ATOM_SELF_EDGE', `Edge ${edge.edgeId} is a self-edge.`);
    }
    if (!activeIds.has(edge.sourceAtomId) || !activeIds.has(edge.targetAtomId)) {
      throw new AtomizationError('ATOM_ORPHAN', `Edge ${edge.edgeId} has an unknown endpoint.`);
    }
    const signature = `${edge.kind}:${edge.sourceAtomId}:${edge.targetAtomId}:${edge.ordinal ?? ''}`;
    if (signatures.has(signature)) {
      throw new AtomizationError('ATOM_EDGE_DUPLICATE', `Duplicate edge ${signature}.`);
    }
    signatures.add(signature);
    degree.set(edge.sourceAtomId, (degree.get(edge.sourceAtomId) ?? 0) + 1);
    degree.set(edge.targetAtomId, (degree.get(edge.targetAtomId) ?? 0) + 1);
  }
  for (const atom of active) {
    if ((degree.get(atom.atomId) ?? 0) === 0 && atom.graphRole !== 'source_root') {
      throw new AtomizationError(
        'ATOM_ORPHAN',
        `Degree-zero atom ${atom.atomId} must be an intentional source_root.`,
      );
    }
    if (atom.origin.contentId !== graph.contentId || atom.origin.selector.trim() === '') {
      throw new AtomizationError('ATOM_ORPHAN', `Atom ${atom.atomId} has an unresolved origin.`);
    }
    if (atom.contextSha256 !== graph.contextSha256) {
      throw new AtomizationError('ATOM_CONTEXT_STALE', `Atom ${atom.atomId} has stale context.`);
    }
    const expectedPayloadSha256 = hashCanonical({
      domain: 'content-atom-v1:payload:v1',
      atomId: atom.atomId,
      atomClass: atom.atomClass,
      atomType: atom.atomType,
      payload: atom.payload,
    });
    if (atom.payloadSha256 !== expectedPayloadSha256) {
      throw new AtomizationError('ATOM_PAYLOAD_HASH_STALE', `Atom ${atom.atomId} payload drifted.`);
    }
    const expectedRevisionSha256 = hashCanonical({
      domain: 'content-atom-v1:revision:v1',
      payloadSha256: atom.payloadSha256,
      origin: atom.origin,
      evidenceBindings: atom.evidenceBindings,
      declaredRights: atom.declaredRights,
      contextSha256: atom.contextSha256,
    });
    if (atom.revisionSha256 !== expectedRevisionSha256) {
      throw new AtomizationError(
        'ATOM_REVISION_HASH_STALE',
        `Atom ${atom.atomId} revision drifted.`,
      );
    }
    const expectedReuseFingerprint = hashCanonical({
      domain: 'content-atom-v1:reuse:v1',
      contentId: graph.contentId,
      atomClass: atom.atomClass,
      atomType: atom.atomType,
      reconciliationKeySha256: atom.reconciliationKeySha256,
      ...(atom.secondaryIdentityApplied
        ? {secondaryDiscriminator: atom.secondaryDiscriminator}
        : {}),
      generation: atom.generation,
    });
    if (atom.reuseFingerprintSha256 !== expectedReuseFingerprint) {
      throw new AtomizationError(
        'ATOM_IDENTITY_STALE',
        `Atom ${atom.atomId} reuse binding drifted.`,
      );
    }
    const expectedAtomId = `ATM-${hashCanonical({
      domain: 'content-atom-v1:identity:v1',
      contentId: graph.contentId,
      atomClass: atom.atomClass,
      atomType: atom.atomType,
      reconciliationKeySha256: atom.reconciliationKeySha256,
      ...(atom.secondaryIdentityApplied
        ? {secondaryDiscriminator: atom.secondaryDiscriminator}
        : {}),
      generation: atom.generation,
    })}`;
    if (atom.atomId !== expectedAtomId) {
      throw new AtomizationError(
        'ATOM_ID_RECYCLED',
        `Atom ${atom.atomId} has incompatible identity inputs.`,
      );
    }
  }
  for (const atom of atoms.filter(({status}) => status === 'tombstone')) {
    if (atom.tombstone === undefined) {
      throw new AtomizationError('ATOM_TOMBSTONE_INVALID', `${atom.atomId} lacks a tombstone.`);
    }
    const expectedAtomId = `ATM-${hashCanonical({
      domain: 'content-atom-v1:identity:v1',
      contentId: graph.contentId,
      atomClass: atom.atomClass,
      atomType: atom.atomType,
      reconciliationKeySha256: atom.reconciliationKeySha256,
      ...(atom.secondaryIdentityApplied
        ? {secondaryDiscriminator: atom.secondaryDiscriminator}
        : {}),
      generation: atom.generation,
    })}`;
    if (atom.atomId !== expectedAtomId) {
      throw new AtomizationError('ATOM_ID_RECYCLED', `Tombstone ${atom.atomId} changed identity.`);
    }
    const {tombstoneSha256, ...unsignedTombstone} = atom.tombstone;
    const expectedTombstoneSha256 = hashCanonical({
      domain: 'atom-tombstone-v1:integrity:v1',
      tombstone: unsignedTombstone,
    });
    if (tombstoneSha256 !== expectedTombstoneSha256) {
      throw new AtomizationError('ATOM_TOMBSTONE_STALE', `${atom.atomId} tombstone drifted.`);
    }
    const expectedRevisionSha256 = hashCanonical({
      domain: 'content-atom-v1:tombstone-revision:v1',
      atomId: atom.atomId,
      payloadSha256: atom.payloadSha256,
      origin: atom.origin,
      evidenceBindings: atom.evidenceBindings,
      declaredRights: atom.declaredRights,
      contextSha256: atom.contextSha256,
      revision: atom.revision,
      tombstone: atom.tombstone,
    });
    const expectedOutputSha256 = hashCanonical({
      domain: 'content-atom-v1:tombstone-output:v1',
      atomId: atom.atomId,
      revisionSha256: expectedRevisionSha256,
      priorOutputSha256: atom.tombstone.priorOutputSha256,
    });
    if (atom.revisionSha256 !== expectedRevisionSha256) {
      throw new AtomizationError('ATOM_TOMBSTONE_STALE', `${atom.atomId} revision drifted.`);
    }
    if (atom.outputSha256 !== expectedOutputSha256) {
      throw new AtomizationError('ATOM_TOMBSTONE_STALE', `${atom.atomId} output drifted.`);
    }
  }
  for (const edge of graph.edges) {
    const {edgeSha256, ...unsignedEdge} = edge;
    if (edgeSha256 !== hashCanonical(unsignedEdge)) {
      throw new AtomizationError('ATOM_EDGE_HASH_STALE', `Edge ${edge.edgeId} drifted.`);
    }
  }
  const hydrated = hydrateDependencyHashes(active, graph.edges, graph.atomizerVersion);
  for (const derived of hydrated) {
    const persisted = active.find(({atomId}) => atomId === derived.atomId);
    if (
      persisted === undefined ||
      persisted.inputSha256 !== derived.inputSha256 ||
      persisted.outputSha256 !== derived.outputSha256 ||
      JSON.stringify(persisted.effectiveRights) !== JSON.stringify(derived.effectiveRights)
    ) {
      throw new AtomizationError(
        'ATOM_OUTPUT_HASH_STALE',
        `Atom ${derived.atomId} effective inputs, rights or output drifted.`,
      );
    }
  }
  const expectedSemanticGraphSha256 = hashCanonical({
    domain: 'content-atom-graph-v1:semantic:v1',
    contentId: graph.contentId,
    contextSha256: graph.contextSha256,
    atoms: active.map(({atomId, outputSha256}) => ({atomId, outputSha256})),
    edges: graph.edges.map(({edgeId, edgeSha256}) => ({edgeId, edgeSha256})),
  });
  if (graph.semanticGraphSha256 !== expectedSemanticGraphSha256) {
    throw new AtomizationError('ATOM_GRAPH_HASH_STALE', 'Semantic graph hash drifted.');
  }
  const {graphSha256, ...unsignedGraph} = graph;
  if (
    graphSha256 !== hashCanonical({domain: 'content-atom-graph-v1:record:v1', ...unsignedGraph})
  ) {
    throw new AtomizationError('ATOM_GRAPH_HASH_STALE', 'Graph record hash drifted.');
  }
  const expectedGraphId = `ATG-${hashCanonical({
    domain: 'content-atom-graph-v1:identity:v1',
    contentId: graph.contentId,
    contentVersion: graph.contentVersion,
    semanticGraphSha256: graph.semanticGraphSha256,
  })}`;
  if (graph.graphId !== expectedGraphId) {
    throw new AtomizationError(
      'ATOM_GRAPH_ID_STALE',
      'Graph ID does not match its identity inputs.',
    );
  }
};

export const atomizeCanonicalContentV1 = (
  input: AtomizeCanonicalContentInputV1,
): ContentAtomGraphV1 => {
  const {document, manifest} = input.loaded;
  const parentAtoms = input.parentGraph?.atoms ?? [];
  if (
    input.parentGraph !== undefined &&
    input.parentGraph.contentId !== document.frontmatter.contentId
  ) {
    throw new AtomizationError(
      'PARENT_GRAPH_MISMATCH',
      `Parent ${input.parentGraph.contentId} does not match ${document.frontmatter.contentId}.`,
    );
  }
  if (input.parentGraph !== undefined) {
    const parsedParent = ContentAtomGraphV1Schema.parse(input.parentGraph);
    validateContentAtomGraphV1(parsedParent);
  }
  if (input.parentGraph !== undefined) {
    const semanticChanged = input.parentGraph.contentSemanticSha256 !== document.semanticSha256;
    const versionChanged = input.parentGraph.contentVersion !== document.frontmatter.version;
    if (semanticChanged && !versionChanged) {
      throw new AtomizationError(
        'CONTENT_VERSION_NOT_ADVANCED',
        'Semantic content changed without advancing the authored version.',
      );
    }
    // H-01's semantic hash intentionally includes the authored version. A no-op bump can only be
    // identified after rebuilding the version-independent atom graph below.
  }
  const contextSha256 = atomContextSha256(document, manifest);
  const drafts = makeDrafts(input.loaded);
  const draftKeys = drafts.map(draftLookupKey);
  const duplicateDraftKeys = new Set(
    draftKeys.filter((key, index) => draftKeys.indexOf(key) !== index),
  );
  for (const duplicateKey of duplicateDraftKeys) {
    const duplicateDrafts = drafts.filter((draft) => draftLookupKey(draft) === duplicateKey);
    const discriminators = duplicateDrafts.map(
      ({secondaryDiscriminator}) => secondaryDiscriminator,
    );
    if (
      discriminators.some((value) => value === undefined) ||
      new Set(discriminators).size !== discriminators.length
    ) {
      throw new AtomizationError(
        'ATOM_IDENTITY_AMBIGUOUS',
        `Current document repeats identity ${duplicateKey} without unique labels.`,
      );
    }
  }
  const duplicatedParentKeys = new Set<string>();
  for (const atom of parentAtoms.filter(({status}) => status === 'active')) {
    const key = atomLookupKey(atom);
    if (
      parentAtoms.filter(
        (candidate) => candidate.status === 'active' && atomLookupKey(candidate) === key,
      ).length > 1
    ) {
      duplicatedParentKeys.add(key);
    }
  }
  const requiresSecondary = (draft: AtomDraft): boolean => {
    const key = draftLookupKey(draft);
    return duplicateDraftKeys.has(key) || duplicatedParentKeys.has(key);
  };
  const consumedParentAtomIds = new Set<string>();
  const sequenceDraft = drafts.find(({atomType}) => atomType === 'narrative_sequence');
  if (sequenceDraft === undefined || sequenceDraft.payload.kind !== 'narrative_sequence') {
    throw new AtomizationError('ATOM_ORPHAN', 'Narrative sequence draft is missing.');
  }
  const nonSequenceDrafts = drafts.filter(({atomType}) => atomType !== 'narrative_sequence');
  let active = nonSequenceDrafts.map((draft) =>
    reconcileDraft(
      document.frontmatter.contentId,
      contextSha256,
      draft,
      parentAtoms,
      requiresSecondary(draft),
      consumedParentAtomIds,
    ),
  );
  const atomsByOrigin = new Map(active.map((atom) => [originKey(atom), atom]));
  sequenceDraft.payload = {
    ...sequenceDraft.payload,
    orderedAtomIds: document.body.narrativeBeats.map((beat) => {
      const atom = atomsByOrigin.get(beatLookupKey(beat));
      if (atom === undefined) {
        throw new AtomizationError('ATOM_ORPHAN', `Beat ${beat.label} did not reconcile.`);
      }
      return atom.atomId;
    }),
  };
  active.push(
    reconcileDraft(
      document.frontmatter.contentId,
      contextSha256,
      sequenceDraft,
      parentAtoms,
      requiresSecondary(sequenceDraft),
      consumedParentAtomIds,
    ),
  );
  const edgeDrafts = makeEdgeDrafts(document, active);
  const edges = materializeEdges(edgeDrafts, active);
  const atomizerVersion = input.atomizerVersion ?? ATOMIZER_VERSION_V1;
  active = hydrateDependencyHashes(active, edges, atomizerVersion);
  const tombstones = makeTombstones(parentAtoms, active, document.frontmatter.version);
  const atoms = [...active, ...tombstones].sort((left, right) =>
    compareText(left.atomId, right.atomId),
  );
  const semanticGraphSha256 = hashCanonical({
    domain: 'content-atom-graph-v1:semantic:v1',
    contentId: document.frontmatter.contentId,
    contextSha256,
    atoms: active.map(({atomId, outputSha256}) => ({atomId, outputSha256})),
    edges: edges.map(({edgeId, edgeSha256}) => ({edgeId, edgeSha256})),
  });
  if (
    input.parentGraph !== undefined &&
    input.parentGraph.contentVersion !== document.frontmatter.version &&
    input.parentGraph.semanticGraphSha256 === semanticGraphSha256
  ) {
    throw new AtomizationError(
      'UNNECESSARY_CONTENT_VERSION_BUMP',
      'The authored version changed without an atom or topology change.',
    );
  }
  const graphBase = {
    schemaVersion: 'content-atom-graph-v1' as const,
    graphId: `ATG-${hashCanonical({
      domain: 'content-atom-graph-v1:identity:v1',
      contentId: document.frontmatter.contentId,
      contentVersion: document.frontmatter.version,
      semanticGraphSha256,
    })}`,
    contentId: document.frontmatter.contentId,
    contentVersion: document.frontmatter.version,
    contentSemanticSha256: document.semanticSha256,
    contextSha256,
    ...(input.parentGraph === undefined
      ? {}
      : {
          parentGraph: {
            graphId: input.parentGraph.graphId,
            contentVersion: input.parentGraph.contentVersion,
            graphSha256: input.parentGraph.graphSha256,
          },
        }),
    atomizerVersion,
    atoms,
    edges,
    evidenceState: 'QUALIFIED' as const,
    structuralState: 'ATOMIZED' as const,
    semanticGraphSha256,
    readinessEligible: false as const,
    distributionState: 'NOT_DESIGNED' as const,
    publicationAuthority: false as const,
  };
  const graph = {
    ...graphBase,
    graphSha256: hashCanonical({domain: 'content-atom-graph-v1:record:v1', ...graphBase}),
  } as unknown as ContentAtomGraphV1;
  const parsed = ContentAtomGraphV1Schema.parse(graph);
  validateContentAtomGraphV1(parsed);
  return parsed;
};
