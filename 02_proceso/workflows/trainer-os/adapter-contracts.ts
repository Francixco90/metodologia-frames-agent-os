import {z} from 'zod';

import {HashRefSchema, IdSchema, Sha256Schema, hashModel} from './common.ts';

const Text = z.string().min(1).max(500);
export const TrainerEvidenceIdsSchema = z
  .array(IdSchema)
  .min(1)
  .max(8)
  .refine((items) => new Set(items).size === items.length);
const Cta = z.strictObject({
  label: z
    .string()
    .min(1)
    .max(40)
    .refine((value) => value.trim().split(/\s+/u).length <= 3),
  href: z.string().regex(/^#[a-z][a-z0-9_-]*$/iu),
});
export const TrainerEvidenceSchema = z.strictObject({
  evidenceId: IdSchema,
  source: HashRefSchema,
  authority: z.enum(['primary', 'authored', 'approved-secondary']),
  authorityReceipt: HashRefSchema,
});
const EvidenceIds = TrainerEvidenceIdsSchema;
const Section = z.strictObject({id: IdSchema, title: Text, body: Text, evidenceIds: EvidenceIds});
const Landing = z.strictObject({
  kind: z.literal('landing'),
  title: Text,
  lede: Text,
  evidenceIds: EvidenceIds,
  cta: Cta,
  sections: z
    .array(Section)
    .length(8)
    .refine((items) => new Set(items.map(({id}) => id)).size === 8),
});
const Workbook = z
  .strictObject({
    kind: z.literal('workbook'),
    hero: z.strictObject({title: Text, lede: Text, cta: Cta, evidenceIds: EvidenceIds}),
    preparation: z.array(Section).min(1).max(8),
    routes: z
      .array(
        z.strictObject({
          id: IdSchema,
          title: Text,
          purpose: Text,
          evidenceIds: EvidenceIds,
          steps: z
            .array(z.strictObject({id: IdSchema, prompt: Text, evidenceIds: EvidenceIds}))
            .min(1)
            .max(12),
        }),
      )
      .length(3)
      .refine((items) => new Set(items.map(({id}) => id)).size === 3),
  })
  .superRefine((value, context) => {
    const ids = [
      ...value.preparation.map(({id}) => id),
      ...value.routes.flatMap(({id, steps}) => [id, ...steps.map(({id: stepId}) => stepId)]),
    ];
    if (new Set(ids).size !== ids.length)
      context.addIssue({code: 'custom', message: 'workbook ids must be globally unique'});
  });
const LocaleContent = z.strictObject({landing: Landing, workbook: Workbook});

export const TrainerAdapterContentSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-adapter-content-v1'),
    contentId: IdSchema,
    contentSha256: Sha256Schema,
    routeSpec: HashRefSchema,
    designLock: HashRefSchema,
    evidence: z
      .array(TrainerEvidenceSchema)
      .min(1)
      .refine((items) => new Set(items.map(({evidenceId}) => evidenceId)).size === items.length),
    locales: z.strictObject({
      es: LocaleContent,
      en: LocaleContent.optional(),
      pt: LocaleContent.optional(),
    }),
    requestedLocales: z
      .array(z.enum(['es', 'en', 'pt']))
      .min(1)
      .max(3)
      .refine((items) => new Set(items).size === items.length),
    brandId: z.literal('metodologia'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    const available = Object.entries(value.locales)
      .filter(([, item]) => item)
      .map(([locale]) => locale)
      .sort();
    if (available.join(',') !== [...value.requestedLocales].sort().join(','))
      context.addIssue({
        code: 'custom',
        path: ['requestedLocales'],
        message: 'requested locales must exactly match content',
      });
    if (hashModel(value, 'contentSha256') !== value.contentSha256)
      context.addIssue({code: 'custom', path: ['contentSha256'], message: 'content hash drift'});
    const declared = new Set(value.evidence.map(({evidenceId}) => evidenceId));
    const used = Object.values(value.locales).flatMap((item) =>
      item
        ? [
            ...item.landing.evidenceIds,
            ...item.landing.sections.flatMap(({evidenceIds}) => evidenceIds),
            ...item.workbook.hero.evidenceIds,
            ...item.workbook.preparation.flatMap(({evidenceIds}) => evidenceIds),
            ...item.workbook.routes.flatMap(({evidenceIds, steps}) => [
              ...evidenceIds,
              ...steps.flatMap(({evidenceIds: ids}) => ids),
            ]),
          ]
        : [],
    );
    if (
      used.some((id) => !declared.has(id)) ||
      value.evidence.some(({evidenceId}) => !used.includes(evidenceId))
    )
      context.addIssue({
        code: 'custom',
        path: ['evidence'],
        message: 'evidence ids must resolve and be used',
      });
  });

export const TrainerEvidenceAuthorityReceiptSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-evidence-authority-receipt-v1'),
    evidenceId: IdSchema,
    source: HashRefSchema,
    authority: z.enum(['primary', 'authored', 'approved-secondary']),
    actor: z.enum(['source-registry', 'H01']),
    verdict: z.literal('approved'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    const expected = value.authority === 'approved-secondary' ? 'H01' : 'source-registry';
    if (value.actor !== expected)
      context.addIssue({code: 'custom', path: ['actor'], message: 'authority actor mismatch'});
  });

export type TrainerAdapterContent = z.infer<typeof TrainerAdapterContentSchema>;
export type TrainerLocaleContent = z.infer<typeof LocaleContent>;
