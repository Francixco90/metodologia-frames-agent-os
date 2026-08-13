import {z} from 'zod';

import {HashRefSchema, IdSchema, Sha256Schema, hashModel} from './common.ts';

const Text = z.string().min(1).max(500);
const Cta = z.strictObject({
  label: z
    .string()
    .min(1)
    .max(40)
    .refine((value) => value.trim().split(/\s+/u).length <= 3, 'CTA must contain 1-3 words'),
  href: z.string().regex(/^(?:https:\/\/[^\s]+|\/[a-z0-9][a-z0-9/_-]*)$/iu),
});
const Landing = z.strictObject({
  kind: z.literal('landing'),
  title: Text,
  lede: Text,
  cta: Cta,
  sections: z
    .array(z.strictObject({id: IdSchema, title: Text, body: Text}))
    .length(8)
    .refine((items) => new Set(items.map(({id}) => id)).size === 8),
});
const Workbook = z
  .strictObject({
    kind: z.literal('workbook'),
    hero: z.strictObject({title: Text, lede: Text, cta: Cta}),
    preparation: z
      .array(z.strictObject({id: IdSchema, title: Text, body: Text}))
      .min(1)
      .max(8),
    routes: z
      .array(
        z.strictObject({
          id: IdSchema,
          title: Text,
          purpose: Text,
          steps: z
            .array(z.strictObject({id: IdSchema, prompt: Text}))
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
  });

export type TrainerAdapterContent = z.infer<typeof TrainerAdapterContentSchema>;
export type TrainerLocaleContent = z.infer<typeof LocaleContent>;
