import {z} from 'zod';

import {
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
  TimestampSchema,
} from '../../../../core/contracts/primitives.ts';

const UnsupportedSocialScriptSchema = /[\p{Script=Arabic}\p{Script=Han}\p{Script=Hebrew}]/u;
const EmojiSchema = /\p{Extended_Pictographic}/u;

const PublicCopySchema = z
  .string()
  .trim()
  .min(1)
  .max(360)
  .refine((value) => !EmojiSchema.test(value), 'CAR-006: emoji is not an editorial icon')
  .refine(
    (value) => !UnsupportedSocialScriptSchema.test(value),
    'CAR-007: explicit CJK/RTL locale and font profile required',
  );

export const CarouselEvidenceKindSchema = z.enum([
  'first_party_statement',
  'indicator_suggested',
  'signal_to_measure',
  'data_required',
]);

export const CarouselCardV1Schema = z
  .strictObject({
    cardId: PortableIdSchema,
    position: z.int().min(1).max(20),
    role: z.enum(['conclusion', 'tension', 'support', 'evidence', 'action', 'cta']),
    eyebrow: z.string().trim().min(1).max(64).optional(),
    title: PublicCopySchema.pipe(z.string().max(96)),
    body: PublicCopySchema,
    bullets: z.array(z.string().trim().min(1).max(120)).max(3).default([]),
    pillar: z.enum(['P1', 'P2', 'P3']).optional(),
    evidence: z.strictObject({
      kind: CarouselEvidenceKindSchema,
      label: z.string().trim().min(1).max(180),
      shortLabel: z.string().trim().min(1).max(32),
      sourceIds: z.array(PortableIdSchema).min(1).max(8),
      claimIds: z.array(PortableIdSchema).max(8),
      limitation: z.string().trim().min(1).max(240),
    }),
    altText: z.string().trim().min(20).max(700),
    visualCue: z.string().trim().min(1).max(160),
  })
  .superRefine((card, context) => {
    if (card.role === 'support' && card.pillar === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'CAR-004: every support card requires a voice pillar',
        path: ['pillar'],
      });
    }
    if (card.role === 'cta' && card.position < 3) {
      context.addIssue({
        code: 'custom',
        message: 'CAR-005: CTA cannot precede the supporting sequence',
        path: ['position'],
      });
    }
  });

export const CarouselSpecV1Schema = z
  .strictObject({
    schemaVersion: z.literal('carousel-spec-v1'),
    carouselId: PortableIdSchema,
    version: z.string().trim().min(1).max(40),
    status: z.literal('RENDERED_DRAFT'),
    generatedAt: TimestampSchema,
    workOrderRef: RelativePathSchema,
    canonicalUnitRef: RelativePathSchema,
    brandProfileRef: RelativePathSchema,
    voiceProfileRef: RelativePathSchema,
    channelProfileRef: RelativePathSchema,
    bindingHashes: z.strictObject({
      workOrderSha256: Sha256Schema,
      canonicalUnitSha256: Sha256Schema,
      brandProfileSha256: Sha256Schema,
      voiceProfileSha256: Sha256Schema,
      channelProfileSha256: Sha256Schema,
    }),
    locale: z.literal('es-LatAm'),
    theme: z.literal('social-light'),
    dimensions: z.strictObject({
      width: z.int().min(320).max(4096),
      height: z.int().min(320).max(4096),
      aspectRatio: z.string().regex(/^\d+:\d+$/u),
      safeZonePx: z.int().min(24).max(320),
    }),
    cards: z.array(CarouselCardV1Schema).min(3).max(10),
    caption: z.string().trim().min(40).max(2200),
    deckAltText: z.string().trim().min(40).max(2200),
    cta: z.string().trim().min(8).max(180),
    sourceIds: z.array(PortableIdSchema).min(1).max(24),
    claimIds: z.array(PortableIdSchema).max(32),
    rights: z.strictObject({
      assets: z.literal('first_party_procedural_only'),
      fonts: z.literal('OFL-1.1'),
      externalDistributionAuthorized: z.literal(false),
    }),
    renderPolicy: z.strictObject({
      networkAllowed: z.literal(false),
      randomnessAllowed: z.literal(false),
      wallClockAllowed: z.literal(false),
      copyEmbeddedInRenderer: z.literal(false),
    }),
  })
  .superRefine((spec, context) => {
    const positions = spec.cards.map(({position}) => position);
    const expected = spec.cards.map((_, index) => index + 1);
    if (
      new Set(positions).size !== positions.length ||
      positions.some((position, index) => position !== expected[index])
    ) {
      context.addIssue({
        code: 'custom',
        message: 'CAR-001: card positions must be unique and contiguous from one',
        path: ['cards'],
      });
    }

    const cardIds = spec.cards.map(({cardId}) => cardId);
    if (new Set(cardIds).size !== cardIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'CAR-002: card IDs must be unique',
        path: ['cards'],
      });
    }

    if (spec.cards[0]?.role !== 'conclusion' || spec.cards.at(-1)?.role !== 'cta') {
      context.addIssue({
        code: 'custom',
        message: 'CAR-003: sequence must open with a conclusion and close with a CTA',
        path: ['cards'],
      });
    }

    for (const [index, card] of spec.cards.entries()) {
      for (const claimId of card.evidence.claimIds) {
        if (!spec.claimIds.includes(claimId)) {
          context.addIssue({
            code: 'custom',
            message: `CLAIM_MISMATCH: orphan claim ${claimId}`,
            path: ['cards', index, 'evidence', 'claimIds'],
          });
        }
      }
      for (const sourceId of card.evidence.sourceIds) {
        if (!spec.sourceIds.includes(sourceId)) {
          context.addIssue({
            code: 'custom',
            message: `SOURCE_GAP: orphan source ${sourceId}`,
            path: ['cards', index, 'evidence', 'sourceIds'],
          });
        }
      }
    }
  });

export type CarouselSpecV1 = z.infer<typeof CarouselSpecV1Schema>;
export type CarouselCardV1 = z.infer<typeof CarouselCardV1Schema>;
