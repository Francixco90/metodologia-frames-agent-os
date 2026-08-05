import {z} from 'zod';

import {
  LegacyCarouselProjectionV1Schema,
  type LegacyCarouselProjectionV1,
} from '../../../core/contracts/creation-v3.ts';
import {
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
} from '../../../core/contracts/primitives.ts';
import {parseStrictSnakeCaseYaml} from './parse-canonical-content.ts';

const TextSchema = z.string().trim().min(1).max(4_000);

const LegacyEvidenceSchema = z.strictObject({
  kind: z.enum([
    'first_party_statement',
    'indicator_suggested',
    'signal_to_measure',
    'data_required',
  ]),
  label: TextSchema,
  shortLabel: TextSchema,
  sourceIds: z.array(PortableIdSchema).min(1),
  claimIds: z.array(PortableIdSchema),
  limitation: TextSchema,
});

const LegacyCardSchema = z.strictObject({
  cardId: PortableIdSchema,
  position: z.number().int().positive(),
  role: z.enum(['conclusion', 'tension', 'support', 'evidence', 'action', 'cta']),
  eyebrow: TextSchema,
  title: TextSchema,
  body: TextSchema,
  bullets: z.array(TextSchema),
  pillar: z.enum(['P1', 'P2', 'P3']).optional(),
  evidence: LegacyEvidenceSchema,
  altText: TextSchema,
  visualCue: TextSchema,
});

export const LegacyCarouselEditorialInputV1Schema = z.strictObject({
  schemaVersion: z.literal('carousel-editorial-input-v1'),
  projectId: PortableIdSchema,
  carouselId: PortableIdSchema,
  version: z.string().trim().min(1),
  generatedAt: z.string().trim().min(1),
  topic: TextSchema,
  objective: TextSchema,
  audience: TextSchema,
  locale: z.string().trim().min(2),
  editorialPattern: z.string().trim().min(1),
  thesis: TextSchema,
  hook: TextSchema,
  cta: z.strictObject({
    label: TextSchema,
    intent: z.enum(['learn', 'reflect', 'save', 'share', 'reply', 'visit']),
  }),
  sourceSnapshotId: PortableIdSchema,
  sources: z.array(
    z.strictObject({
      sourceId: PortableIdSchema,
      ref: RelativePathSchema,
    }),
  ),
  claims: z.array(
    z.strictObject({
      claimId: PortableIdSchema,
      sourceId: PortableIdSchema,
      statement: TextSchema,
    }),
  ),
  supports: z.array(
    z.strictObject({
      supportId: PortableIdSchema,
      claimId: PortableIdSchema,
      statement: TextSchema,
    }),
  ),
  cards: z.array(LegacyCardSchema).min(3),
  caption: TextSchema,
  deckAltText: TextSchema,
});

export const LegacyCarouselSourceSnapshotV1Schema = z.strictObject({
  schemaVersion: z.literal('content-source-snapshot-v1'),
  sourceSnapshotId: PortableIdSchema,
  createdAt: z.string().trim().min(1),
  sources: z.array(
    z.strictObject({
      sourceId: PortableIdSchema,
      ref: RelativePathSchema,
      sha256: Sha256Schema,
    }),
  ),
  claims: z.array(
    z.strictObject({
      claimId: PortableIdSchema,
      sourceId: PortableIdSchema,
      statement: TextSchema,
    }),
  ),
  sourceCoverage: z.string().trim().min(1),
  globalSourceLocked: z.literal(false),
  publicationAuthority: z.literal(false),
});

export type LegacyCarouselEditorialInputV1 = z.infer<typeof LegacyCarouselEditorialInputV1Schema>;
export type LegacyCarouselSourceSnapshotV1 = z.infer<typeof LegacyCarouselSourceSnapshotV1Schema>;

export const parseLegacyCarouselEditorialYaml = (raw: string): LegacyCarouselEditorialInputV1 =>
  LegacyCarouselEditorialInputV1Schema.parse(parseStrictSnakeCaseYaml(raw));

const normalizeTitle = (value: string): string =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase('es')
    .replace(/[.!?]+$/u, '')
    .trim();

const assertUnique = (values: readonly string[], label: string): void => {
  if (new Set(values).size !== values.length) {
    throw new Error(`CLAIM_MISMATCH: legacy ${label} must be unique.`);
  }
};

export const adaptLegacyCarouselEditorialInputV1 = (
  input: LegacyCarouselEditorialInputV1,
  snapshot: LegacyCarouselSourceSnapshotV1,
  provenance: {legacyInputSha256: string; legacySnapshotSha256: string},
): LegacyCarouselProjectionV1 => {
  if (input.sourceSnapshotId !== snapshot.sourceSnapshotId) {
    throw new Error('SOURCE_GAP: legacy input and snapshot IDs differ.');
  }
  if (normalizeTitle(input.hook) !== normalizeTitle(input.topic)) {
    throw new Error('CLAIM_MISMATCH: legacy hook and topic diverge materially.');
  }
  const tensionCards = input.cards.filter(({role}) => role === 'tension');
  if (tensionCards.length !== 1) {
    throw new Error('SOURCE_GAP: legacy projection requires exactly one tension card.');
  }
  if (input.cards.some(({position}, index) => position !== index + 1)) {
    throw new Error('CLAIM_MISMATCH: legacy card positions must be contiguous and ordered.');
  }
  assertUnique(
    input.cards.map(({cardId}) => cardId),
    'card IDs',
  );
  assertUnique(
    input.sources.map(({sourceId}) => sourceId),
    'source IDs',
  );
  assertUnique(
    snapshot.sources.map(({sourceId}) => sourceId),
    'snapshot source IDs',
  );
  assertUnique(
    input.claims.map(({claimId}) => claimId),
    'claim IDs',
  );
  assertUnique(
    snapshot.claims.map(({claimId}) => claimId),
    'snapshot claim IDs',
  );
  assertUnique(
    input.supports.map(({supportId}) => supportId),
    'support IDs',
  );

  const snapshotClaims = new Map(snapshot.claims.map((claim) => [claim.claimId, claim]));
  const snapshotSources = new Map(snapshot.sources.map((source) => [source.sourceId, source]));
  for (const source of input.sources) {
    if (snapshotSources.get(source.sourceId)?.ref !== source.ref) {
      throw new Error(`SOURCE_GAP: legacy source ${source.sourceId} is not snapshot-bound.`);
    }
  }
  for (const claim of input.claims) {
    const frozen = snapshotClaims.get(claim.claimId);
    if (
      frozen?.sourceId !== claim.sourceId ||
      frozen.statement !== claim.statement ||
      !snapshotSources.has(claim.sourceId)
    ) {
      throw new Error(`SOURCE_GAP: legacy claim ${claim.claimId} is not snapshot-bound.`);
    }
  }

  const sourceClaimIds = new Set(input.claims.map(({claimId}) => claimId));
  for (const support of input.supports) {
    if (!sourceClaimIds.has(support.claimId)) {
      throw new Error(`CLAIM_MISMATCH: legacy support ${support.supportId} is orphaned.`);
    }
  }

  return LegacyCarouselProjectionV1Schema.parse({
    schemaVersion: 'legacy-carousel-projection-v1',
    sourceSchemaVersion: 'carousel-editorial-input-v1',
    legacyInputSha256: Sha256Schema.parse(provenance.legacyInputSha256),
    legacySnapshotSha256: Sha256Schema.parse(provenance.legacySnapshotSha256),
    projectId: input.projectId,
    title: input.hook,
    audience: input.audience,
    problem: tensionCards[0]!.body,
    promise: input.objective,
    thesis: input.thesis,
    supports: input.supports.map((support, index) => ({
      supportId: support.supportId,
      statement: support.statement,
      claimIds: [support.claimId],
      pillar: (['P1', 'P2', 'P3'] as const)[index] ?? 'P3',
    })),
    claims: input.claims,
    callToAction: input.cta.label,
    legacyNotes: input.cards.map(({cardId, visualCue}) => ({cardId, visualCue})),
    warnings: [
      'legacy_visual_direction_requires_authored_v3',
      'legacy_snapshot_is_provenance_not_authority',
      'legacy_claims_are_not_promoted',
    ],
    legacyReadOnly: true,
    authoredStatus: 'DRAFT',
    maximumState: 'SCOPED',
    publicationAuthority: false,
  });
};
