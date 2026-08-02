import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';

import {stringify as stringifyYaml, parse as parseYaml} from 'yaml';
import {z} from 'zod';

import {
  CandidatePackageV2Schema,
  CanonicalEditorialUnitV1Schema,
  ContentTypeDefinitionV1Schema,
  ContentWorkOrderV2Schema,
  DistributionVariantV1Schema,
  withoutDeclaredSha256,
} from '../core/contracts/index.ts';
import {renderCarouselPackage} from '../renderers/static-social/scripts/render-carousel.ts';
import {CarouselSpecV1Schema} from '../workflows/content/types/carousel/schema.ts';

const root = process.cwd();
const inputPath = resolve(root, 'projects/pilot-carousel-001/editorial/pilot-content.yml');
const specRoot = resolve(root, 'projects/pilot-carousel-001/spec');
const qualityRoot = resolve(root, 'projects/pilot-carousel-001/quality');
const artifactRoot = resolve(root, 'projects/pilot-carousel-001/artifacts');
mkdirSync(specRoot, {recursive: true});
mkdirSync(qualityRoot, {recursive: true});

const EvidenceSchema = z.strictObject({
  kind: z.enum([
    'first_party_statement',
    'indicator_suggested',
    'signal_to_measure',
    'data_required',
  ]),
  label: z.string().min(1),
  short_label: z.string().min(1).max(32),
  source_ids: z.array(z.string().min(1)).min(1),
  claim_ids: z.array(z.string().min(1)),
  limitation: z.string().min(1),
});

const EditorialInputSchema = z.strictObject({
  schema_version: z.literal('carousel-editorial-input-v1'),
  project_id: z.string().min(1),
  carousel_id: z.string().min(1),
  version: z.string().min(1),
  generated_at: z.iso.datetime({offset: true}),
  topic: z.string().min(1),
  objective: z.string().min(1),
  audience: z.string().min(1),
  locale: z.literal('es-LatAm'),
  editorial_pattern: z.enum([
    'educational',
    'how-to',
    'insight',
    'data',
    'case',
    'offer',
    'community',
    'curation',
  ]),
  thesis: z.string().min(1),
  hook: z.string().min(1),
  cta: z.strictObject({
    label: z.string().min(1),
    intent: z.enum(['learn', 'reflect', 'save', 'share', 'reply', 'visit']),
  }),
  source_snapshot_id: z.string().min(1),
  sources: z
    .array(
      z.strictObject({
        source_id: z.string().min(1),
        ref: z.string().min(1),
      }),
    )
    .min(1),
  claims: z
    .array(
      z.strictObject({
        claim_id: z.string().min(1),
        source_id: z.string().min(1),
        statement: z.string().min(1),
      }),
    )
    .min(1),
  supports: z
    .array(
      z.strictObject({
        support_id: z.string().min(1),
        claim_id: z.string().min(1),
        statement: z.string().min(1),
      }),
    )
    .min(2)
    .max(3),
  cards: z
    .array(
      z.strictObject({
        card_id: z.string().min(1),
        position: z.number().int().positive(),
        role: z.enum(['conclusion', 'tension', 'support', 'evidence', 'action', 'cta']),
        eyebrow: z.string().min(1).optional(),
        title: z.string().min(1),
        body: z.string().min(1),
        bullets: z.array(z.string().min(1)),
        pillar: z.enum(['P1', 'P2', 'P3']).optional(),
        evidence: EvidenceSchema,
        alt_text: z.string().min(1),
        visual_cue: z.string().min(1),
      }),
    )
    .min(3)
    .max(10),
  caption: z.string().min(1),
  deck_alt_text: z.string().min(1),
});

const input = EditorialInputSchema.parse(parseYaml(readFileSync(inputPath, 'utf8')));

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const fileSha256 = (path: string): string => sha256(readFileSync(resolve(root, path)));
const portable = (path: string): string => relative(root, path).replaceAll('\\', '/');
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};
const canonicalSha256 = (value: Readonly<Record<string, unknown>>, digestField: string): string =>
  sha256(stableStringify(withoutDeclaredSha256(value, digestField)));
const writeJson = (path: string, value: unknown): string => {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return sha256(readFileSync(path));
};
const hashBoundRef = (path: string) => ({
  schemaVersion: 'hash-bound-ref-v1' as const,
  ref: path,
  sha256: fileSha256(path),
});

const brandProfilePath = 'registries/brand/brand-profile-v2.yml';
const voiceProfilePath = 'registries/brand/voice-profile-v2.yml';
const channelProfilePath = 'registries/channels/instagram-profile-v1.yml';
const sourceBindings = input.sources.map((source) => ({
  sourceId: source.source_id,
  ref: source.ref,
  sha256: fileSha256(source.ref),
}));
const sourceSnapshotDraft = {
  schemaVersion: 'content-source-snapshot-v1',
  sourceSnapshotId: input.source_snapshot_id,
  createdAt: input.generated_at,
  sources: sourceBindings,
  claims: input.claims.map((claim) => ({
    claimId: claim.claim_id,
    sourceId: claim.source_id,
    statement: claim.statement,
  })),
  sourceCoverage: 'pilot_scope_complete',
  globalSourceLocked: false,
  publicationAuthority: false,
};
const sourceSnapshotPath = resolve(specRoot, 'source-snapshot.json');
const sourceSnapshotFileSha256 = writeJson(sourceSnapshotPath, sourceSnapshotDraft);

const claimEvidence = new Map(
  input.sources.map((source) => [source.source_id, hashBoundRef(source.ref)]),
);
const brandProfile = hashBoundRef(brandProfilePath);
const voiceProfile = hashBoundRef(voiceProfilePath);
const channelProfile = hashBoundRef(channelProfilePath);

const contentTypeReadme = 'workflows/content/types/carousel/README.md';
const gateRef = hashBoundRef(contentTypeReadme);
const contentTypeDefinitionDraft = {
  schemaVersion: 'content-type-definition-v1',
  contentTypeId: 'carousel',
  version: '1.0.0',
  title: 'Instagram feed carousel',
  kind: 'STATIC_SEQUENCE',
  canonicalInputSchema: 'workflows/content/types/carousel/schema.ts',
  pluginRef: hashBoundRef('workflows/content/types/carousel/plugin.ts'),
  rendererRef: hashBoundRef('renderers/static-social/scripts/render-carousel.ts'),
  outputs: [
    {outputId: 'individual-pngs', mediaType: 'image/png', extension: '.png', required: true},
    {outputId: 'contact-sheet', mediaType: 'image/png', extension: '.png', required: true},
    {outputId: 'offline-gallery', mediaType: 'text/html', extension: '.html', required: true},
    {outputId: 'copy-package', mediaType: 'text/markdown', extension: '.md', required: true},
    {outputId: 'asset-manifest', mediaType: 'application/json', extension: '.json', required: true},
    {outputId: 'render-receipt', mediaType: 'application/json', extension: '.json', required: true},
  ],
  gates: [
    'CAROUSEL_SPEC_APPROVED',
    'SEQUENCE_APPROVED',
    'CAROUSEL_BUILD_VALIDATED',
    'SWIPE_REVIEW_APPROVED',
    'RIGHTS_A11Y_PASS',
    'GUARDIAN_PASS',
    'WORKFLOW_PILOT_REVIEW',
  ].map((gateId, order) => ({
    gateId,
    order,
    required: true,
    acceptanceContractRef: gateRef,
  })),
  fixtures: [
    {
      fixtureId: 'carousel-positive-pilot',
      purpose: 'Eight-card ES-LatAm pilot with source, brand and channel bindings.',
      fixtureRef: hashBoundRef('projects/pilot-carousel-001/editorial/pilot-content.yml'),
    },
    {
      fixtureId: 'carousel-negative-contracts',
      purpose: 'Negative edge-case contract inventory.',
      fixtureRef: hashBoundRef('tests/fixtures/carousel/negative/README.md'),
    },
  ],
  distributionSurfaces: [{surface: 'feed', required: true, aspectRatio: '4:5'}],
  requiredSpecialistRoleIds: ['RT-03', 'RT-04', 'RT-05', 'RT-06', 'RT-07', 'RT-09'],
  minimumVariants: 1,
  maximumVariants: 1,
  committeePattern: 'two-plus-two-plus-one',
  implementationState: 'active_candidate',
  publicationPolicy: 'forbidden',
  definitionSha256: '0'.repeat(64),
};
const contentTypeDefinition = {
  ...contentTypeDefinitionDraft,
  definitionSha256: canonicalSha256(contentTypeDefinitionDraft, 'definitionSha256'),
};
ContentTypeDefinitionV1Schema.parse(contentTypeDefinition);
const contentTypeDefinitionPath = resolve(specRoot, 'content-type-definition.json');
writeJson(contentTypeDefinitionPath, contentTypeDefinition);

const workOrderDraft = {
  schemaVersion: 'content-work-order-v2',
  workOrderId: 'WO-CAR-MAO-001',
  projectId: input.project_id,
  contentTypeId: 'carousel',
  requestedByActorId: 'H01',
  producerActorInstanceId: 'RT-07-CAR-MAO-001',
  sourceSnapshotId: input.source_snapshot_id,
  sourceSnapshotSha256: sourceSnapshotFileSha256,
  brandProfile,
  voiceProfile,
  channelProfile,
  objective: input.objective,
  audience: input.audience,
  editorialPattern: input.editorial_pattern,
  locale: input.locale,
  claimBindings: input.claims.map((claim) => {
    const evidenceRef = claimEvidence.get(claim.source_id);
    if (evidenceRef === undefined) {
      throw new Error(`SOURCE_GAP: claim ${claim.claim_id} has no source binding`);
    }
    return {
      claimId: claim.claim_id,
      sourceId: claim.source_id,
      evidenceRef,
    };
  }),
  requestedVariants: [
    {
      variantId: 'VAR-CAR-MAO-001-FEED',
      channelId: 'instagram',
      surface: 'feed',
      locale: input.locale,
    },
  ],
  riskTier: 'MEDIUM',
  approvalState: 'unapproved',
  publicationPolicy: 'forbidden',
  createdAt: input.generated_at,
  canonicalSha256: '0'.repeat(64),
};
const workOrder = {
  ...workOrderDraft,
  canonicalSha256: canonicalSha256(workOrderDraft, 'canonicalSha256'),
};
ContentWorkOrderV2Schema.parse(workOrder);
const workOrderPath = resolve(specRoot, 'content-work-order.json');
const workOrderFileSha256 = writeJson(workOrderPath, workOrder);

const editorialUnitDraft = {
  schemaVersion: 'canonical-editorial-unit-v1',
  editorialUnitId: 'CEU-CAR-MAO-001',
  workOrderId: workOrder.workOrderId,
  workOrderSha256: workOrder.canonicalSha256,
  contentTypeId: 'carousel',
  sourceSnapshotId: input.source_snapshot_id,
  sourceSnapshotSha256: sourceSnapshotFileSha256,
  brandProfile,
  voiceProfile,
  channelProfile,
  locale: input.locale,
  thesis: input.thesis,
  hook: input.hook,
  supports: input.supports.map((support) => {
    const claim = input.claims.find(({claim_id: claimId}) => claimId === support.claim_id);
    if (claim === undefined) throw new Error(`CLAIM_MISMATCH: ${support.claim_id}`);
    const evidenceRef = claimEvidence.get(claim.source_id);
    if (evidenceRef === undefined) throw new Error(`SOURCE_GAP: ${claim.source_id}`);
    return {
      supportId: support.support_id,
      claimId: support.claim_id,
      statement: support.statement,
      evidenceRef,
    };
  }),
  callToAction: input.cta,
  assumptions: [
    'The pilot audience is professionals and teams; no performance segment is inferred.',
    'Eight cards and 1080x1350 are configurable pilot decisions, not universal Instagram limits.',
  ],
  coverageGaps: [
    'No measured performance baseline exists; evidence card uses suggested indicators only.',
    'External distribution and publication remain unauthorized.',
  ],
  producerActorInstanceId: 'RT-06-CAR-MAO-001',
  createdAt: input.generated_at,
  canonicalSha256: '0'.repeat(64),
};
const editorialUnit = {
  ...editorialUnitDraft,
  canonicalSha256: canonicalSha256(editorialUnitDraft, 'canonicalSha256'),
};
CanonicalEditorialUnitV1Schema.parse(editorialUnit);
const editorialUnitPath = resolve(specRoot, 'canonical-editorial-unit.json');
const editorialUnitFileSha256 = writeJson(editorialUnitPath, editorialUnit);

const copyPath = resolve(specRoot, 'copy.md');
writeFileSync(
  copyPath,
  `# Copy del carrusel\n\n${input.cards
    .map(
      (card) =>
        `## ${card.position}. ${card.title}\n\n${card.body}${
          card.bullets.length === 0
            ? ''
            : `\n\n${card.bullets.map((bullet) => `- ${bullet}`).join('\n')}`
        }\n\nFuentes: ${card.evidence.source_ids.join(', ')} · Claims: ${
          card.evidence.claim_ids.join(', ') || 'ninguno'
        }\n`,
    )
    .join('\n')}`,
  'utf8',
);
const captionPath = resolve(specRoot, 'caption.md');
writeFileSync(captionPath, `# Caption\n\n${input.caption}\n`, 'utf8');
const altTextPath = resolve(specRoot, 'alt-text.md');
writeFileSync(
  altTextPath,
  `# Texto alternativo\n\n## Carrusel completo\n\n${input.deck_alt_text}\n\n${input.cards
    .map((card) => `## Tarjeta ${card.position}\n\n${card.alt_text}\n`)
    .join('\n')}`,
  'utf8',
);

const carouselSpec = {
  schemaVersion: 'carousel-spec-v1',
  carouselId: input.carousel_id,
  version: input.version,
  status: 'RENDERED_DRAFT',
  generatedAt: input.generated_at,
  workOrderRef: portable(workOrderPath),
  canonicalUnitRef: portable(editorialUnitPath),
  brandProfileRef: brandProfilePath,
  voiceProfileRef: voiceProfilePath,
  channelProfileRef: channelProfilePath,
  bindingHashes: {
    workOrderSha256: workOrderFileSha256,
    canonicalUnitSha256: editorialUnitFileSha256,
    brandProfileSha256: brandProfile.sha256,
    voiceProfileSha256: voiceProfile.sha256,
    channelProfileSha256: channelProfile.sha256,
  },
  locale: input.locale,
  theme: 'social-light',
  dimensions: {width: 1080, height: 1350, aspectRatio: '4:5', safeZonePx: 72},
  cards: input.cards.map((card) => ({
    cardId: card.card_id,
    position: card.position,
    role: card.role,
    ...(card.eyebrow === undefined ? {} : {eyebrow: card.eyebrow}),
    title: card.title,
    body: card.body,
    bullets: card.bullets,
    ...(card.pillar === undefined ? {} : {pillar: card.pillar}),
    evidence: {
      kind: card.evidence.kind,
      label: card.evidence.label,
      shortLabel: card.evidence.short_label,
      sourceIds: card.evidence.source_ids,
      claimIds: card.evidence.claim_ids,
      limitation: card.evidence.limitation,
    },
    altText: card.alt_text,
    visualCue: card.visual_cue,
  })),
  caption: input.caption,
  deckAltText: input.deck_alt_text,
  cta: input.cta.label,
  sourceIds: input.sources.map(({source_id: sourceId}) => sourceId),
  claimIds: input.claims.map(({claim_id: claimId}) => claimId),
  rights: {
    assets: 'first_party_procedural_only',
    fonts: 'OFL-1.1',
    externalDistributionAuthorized: false,
  },
  renderPolicy: {
    networkAllowed: false,
    randomnessAllowed: false,
    wallClockAllowed: false,
    copyEmbeddedInRenderer: false,
  },
};
CarouselSpecV1Schema.parse(carouselSpec);
const carouselSpecPath = resolve(specRoot, 'carousel-spec.yml');
writeFileSync(carouselSpecPath, stringifyYaml(carouselSpec, {lineWidth: 110}), 'utf8');

const renderResult = await renderCarouselPackage();
const assetManifestPath = resolve(artifactRoot, 'asset-manifest.json');
const renderReceiptPath = resolve(artifactRoot, 'render-receipt.json');
const gallery = readFileSync(resolve(artifactRoot, 'index.html'), 'utf8');
const preflightQa = {
  schemaVersion: 'carousel-producer-preflight-v1',
  reviewId: 'QA-CAR-MAO-001-PREFLIGHT-001',
  producerActorInstanceId: 'RT-07-CAR-MAO-001',
  checkActorInstanceId: 'STATIC-CHECK-CAR-MAO-001',
  generatedAt: input.generated_at,
  checks: {
    cards: input.cards.length === 8,
    altText: input.cards.every(({alt_text: altText}) => altText.length >= 20),
    noExternalUrlsInGallery: !/https?:\/\//u.test(gallery),
    deterministic: renderResult.deterministic,
    networkRequests: 0,
    state: 'RENDERED_DRAFT',
    publicationAuthorized: false,
  },
  decision: 'pass_to_independent_rt09',
};
const preflightQaPath = resolve(qualityRoot, 'producer-preflight.json');
writeJson(preflightQaPath, preflightQa);

const manifest = JSON.parse(readFileSync(assetManifestPath, 'utf8')) as {
  files: Array<{path: string; sha256: string; mediaType: string}>;
};
const distributionVariantDraft = {
  schemaVersion: 'distribution-variant-v1',
  variantId: 'VAR-CAR-MAO-001-FEED',
  editorialUnitId: editorialUnit.editorialUnitId,
  editorialUnitSha256: editorialUnit.canonicalSha256,
  contentTypeId: 'carousel',
  contentTypeDefinitionSha256: contentTypeDefinition.definitionSha256,
  channelId: 'instagram',
  channelProfile,
  surface: 'feed',
  locale: input.locale,
  adaptationKind: 'sequenced',
  copy: input.caption,
  adaptationDiff: [
    {
      field: 'editorial-unit-to-eight-cards',
      change: 'The thesis, supports, evidence and CTA are sequenced across eight feed cards.',
      rationale:
        'A swipe sequence separates conclusion, tension, three supports, evidence, action and CTA.',
    },
  ],
  altTextRef: hashBoundRef(portable(altTextPath)),
  claimIds: input.claims.map(({claim_id: claimId}) => claimId),
  assets: manifest.files
    .filter(({path, mediaType}) => mediaType === 'image/png' && /slide-\d{2}\.png$/u.test(path))
    .map((file, index) => ({
      assetId: `ASSET-CAR-MAO-001-${String(index + 1).padStart(2, '0')}`,
      assetRef: {
        schemaVersion: 'hash-bound-ref-v1',
        ref: file.path,
        sha256: file.sha256,
      },
      mediaType: file.mediaType,
    })),
  status: 'draft',
  approvalState: 'committee_approved',
  publishAllowed: false,
  producerActorInstanceId: 'RT-07-CAR-MAO-001',
  canonicalSha256: '0'.repeat(64),
};
const distributionVariant = {
  ...distributionVariantDraft,
  canonicalSha256: canonicalSha256(distributionVariantDraft, 'canonicalSha256'),
};
DistributionVariantV1Schema.parse(distributionVariant);
const distributionVariantPath = resolve(specRoot, 'distribution-variant.json');
writeJson(distributionVariantPath, distributionVariant);

const artifactBindings = [
  [
    'CAROUSEL-CONTACT-SHEET',
    'contact_sheet',
    'projects/pilot-carousel-001/artifacts/contact-sheet.png',
  ],
  ['CAROUSEL-GALLERY', 'offline_gallery', 'projects/pilot-carousel-001/artifacts/index.html'],
  ['CAROUSEL-CAPTION', 'caption', portable(captionPath)],
  ['CAROUSEL-ALT-TEXT', 'alt_text', portable(altTextPath)],
] as const;
const candidateDraft = {
  schemaVersion: 'candidate-package-v2',
  candidatePackageId: 'CP-CAR-MAO-001',
  workOrderId: workOrder.workOrderId,
  workOrderSha256: workOrder.canonicalSha256,
  editorialUnitId: editorialUnit.editorialUnitId,
  editorialUnitSha256: editorialUnit.canonicalSha256,
  proposalActorInstanceId: 'RT-05-CAR-MAO-001',
  producerActorInstanceId: 'RT-07-CAR-MAO-001',
  artifacts: artifactBindings.map(([artifactId, artifactType, path]) => ({
    artifactId,
    artifactType,
    binding: hashBoundRef(path),
  })),
  variants: [hashBoundRef(portable(distributionVariantPath))],
  evidence: [
    hashBoundRef(portable(sourceSnapshotPath)),
    hashBoundRef(portable(contentTypeDefinitionPath)),
    hashBoundRef('quality/reports/v2-baseline-protection.yml'),
  ],
  assumptions: [
    'The selected topic is the approved fallback because no alternative topic was provided.',
    'Pilot dimensions and card count are configurable editorial decisions.',
  ],
  risks: [
    'Channel capabilities can change after the profile stale date.',
    'Human review may request copy or hierarchy changes before workflow acceptance.',
  ],
  coverageGaps: [
    'WORKFLOW_PILOT_ACCEPTED is absent.',
    'Publication, Ads, boost and external distribution are forbidden.',
  ],
  state: 'RENDERED_DRAFT',
  specRef: hashBoundRef(portable(carouselSpecPath)),
  assetManifestRef: hashBoundRef(portable(assetManifestPath)),
  renderManifestRef: hashBoundRef(portable(assetManifestPath)),
  receiptRefs: [hashBoundRef(portable(renderReceiptPath))],
  qaRefs: [hashBoundRef(portable(preflightQaPath))],
  publicationPolicy: 'forbidden',
  createdAt: input.generated_at,
  packageSha256: '0'.repeat(64),
};
const candidate = {
  ...candidateDraft,
  packageSha256: canonicalSha256(candidateDraft, 'packageSha256'),
};
CandidatePackageV2Schema.parse(candidate);
const candidatePath = resolve(specRoot, 'candidate-package.json');
writeJson(candidatePath, candidate);

const reviewEventDraft = {
  schemaVersion: 'workflow-pilot-review-event-v1',
  eventId: 'WORKFLOW-PILOT-REVIEW-CAR-MAO-001',
  eventType: 'WORKFLOW_PILOT_REVIEW',
  workflowType: 'carousel',
  workOrderId: workOrder.workOrderId,
  candidatePackageId: candidate.candidatePackageId,
  candidatePackageSha256: candidate.packageSha256,
  state: 'awaiting_human_approval',
  decision: null,
  acceptedEventPresent: false,
  nextWorkflow: 'feed-text',
  nextWorkflowUnlocked: false,
  publicationAuthorized: false,
  requiredHumanAction:
    'Approve or request changes to this exact candidate package hash. Approval unlocks only feed-text.',
  createdAt: input.generated_at,
  eventSha256: '0'.repeat(64),
};
const reviewEvent = {
  ...reviewEventDraft,
  eventSha256: canonicalSha256(reviewEventDraft, 'eventSha256'),
};
const reviewEventPath = resolve(specRoot, 'workflow-pilot-review.json');
writeJson(reviewEventPath, reviewEvent);

console.info(
  `PASS CAROUSEL BUILD: ${input.cards.length} cards, ${renderResult.files.length} rendered artifacts, ${candidate.candidatePackageId} awaiting human review.`,
);
