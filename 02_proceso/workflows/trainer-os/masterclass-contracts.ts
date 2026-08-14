import {z} from 'zod';

import {HashRefSchema, IdSchema, Sha256Schema, hashModel} from './common.ts';

const Text = z
  .string()
  .min(1)
  .max(500)
  .regex(
    /^[\u0020-\u007E\u00A0-\u00FF]+$/u,
    'text must fit PDF Standard-14 WinAnsi glyph coverage',
  );
const Moment = z.strictObject({
  id: IdSchema,
  title: Text,
  body: Text,
  baseMinutes: z.number().int().positive().max(15),
  extendedMinutes: z.number().int().nonnegative().max(15),
});
const Locale = z.strictObject({title: Text, lede: Text, moments: z.array(Moment).length(18)});

export const TrainerMasterclassContentSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-masterclass-content-v1'),
    contentId: IdSchema,
    contentSha256: Sha256Schema,
    routeSpec: HashRefSchema,
    designLock: HashRefSchema,
    renderAuthority: z.strictObject({
      renderer: z.literal('trainer-native-pdf-v1'),
      browserMode: z.literal('none-native-pdf'),
      browserReceipt: HashRefSchema,
      runtimeReceipt: HashRefSchema,
      fontReceipt: HashRefSchema,
      fontFamily: z.literal('Helvetica'),
    }),
    locales: z.strictObject({es: Locale, en: Locale.optional(), pt: Locale.optional()}),
    requestedLocales: z
      .array(z.enum(['es', 'en', 'pt']))
      .min(1)
      .max(3)
      .refine((items) => new Set(items).size === items.length),
    modes: z.strictObject({baseMinutes: z.literal(90), extendedMinutes: z.literal(120)}),
    qaViewer: z.strictObject({qaOnly: z.literal(true), publicationAuthority: z.literal(false)}),
    officialOutput: z.literal('pdf-only'),
    brandId: z.literal('metodologia'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    const available = Object.entries(value.locales)
      .filter(([, item]) => item)
      .map(([key]) => key)
      .sort();
    if (available.join(',') !== [...value.requestedLocales].sort().join(','))
      context.addIssue({
        code: 'custom',
        path: ['requestedLocales'],
        message: 'masterclass locales must match request',
      });
    for (const [locale, content] of Object.entries(value.locales)) {
      if (!content) continue;
      if (new Set(content.moments.map(({id}) => id)).size !== 18)
        context.addIssue({
          code: 'custom',
          path: ['locales', locale, 'moments'],
          message: 'moment ids must be unique',
        });
      const base = content.moments.reduce((sum, item) => sum + item.baseMinutes, 0);
      const extended = content.moments.reduce((sum, item) => sum + item.extendedMinutes, 0);
      if (base !== 90 || extended !== 30)
        context.addIssue({
          code: 'custom',
          path: ['locales', locale, 'moments'],
          message: 'moments must total 90 + 30 minutes',
        });
    }
    if (hashModel(value, 'contentSha256') !== value.contentSha256)
      context.addIssue({
        code: 'custom',
        path: ['contentSha256'],
        message: 'masterclass content hash drift',
      });
  });

export type TrainerMasterclassContent = z.infer<typeof TrainerMasterclassContentSchema>;

export const TrainerRenderAuthorityReceiptSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    schemaVersion: z.literal('trainer-render-authority-v1'),
    kind: z.literal('browser-policy'),
    name: z.literal('none'),
    version: z.literal('native-pdf-v1'),
    network: z.literal(false),
    publicationAuthority: z.literal(false),
  }),
  z.strictObject({
    schemaVersion: z.literal('trainer-render-authority-v1'),
    kind: z.literal('runtime'),
    name: z.literal('node'),
    version: z.string().regex(/^v\d+\.\d+\.\d+$/u),
    network: z.literal(false),
    publicationAuthority: z.literal(false),
  }),
  z.strictObject({
    schemaVersion: z.literal('trainer-render-authority-v1'),
    kind: z.literal('font'),
    name: z.literal('Helvetica'),
    version: z.literal('PDF-Standard-14'),
    rights: z.literal('PDF-standard'),
    publicationAuthority: z.literal(false),
  }),
]);
