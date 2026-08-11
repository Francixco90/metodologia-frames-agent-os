import {z} from 'zod';

export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
export const LocaleSchema = z.enum(['es', 'en', 'pt']);
export const LocalizedTextSchema = z.strictObject({
  es: z.string().min(1),
  en: z.string().min(1),
  pt: z.string().min(1),
});

const FORBIDDEN_LOCATION =
  /(?:^|\/)(?:Users|home|private|privado|Desktop|Downloads)(?:\/|$)|^file:/iu;

export const PortableRefSchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith('/') && !value.includes('\\') && !value.includes('..'), {
    message: 'Reference must be a portable repository-relative path.',
  })
  .refine((value) => !FORBIDDEN_LOCATION.test(value), {
    message: 'Private locators are forbidden.',
  });

export const HashBoundRefSchema = z.strictObject({
  ref: PortableRefSchema,
  sha256: Sha256Schema,
});

export const AssetSchema = z.strictObject({
  assetId: z.string().regex(/^[a-z][a-z0-9-]*$/u),
  source: HashBoundRefSchema,
  mediaType: z.enum(['text/css', 'image/svg+xml', 'image/png', 'image/jpeg', 'font/woff2']),
  rights: z.strictObject({
    status: z.literal('cleared'),
    scope: z.string().min(1),
    evidence: HashBoundRefSchema,
  }),
});

export const WorkbookStepSchema = z.strictObject({
  stepId: z.string().regex(/^[a-z][a-z0-9-]*$/u),
  title: LocalizedTextSchema,
  body: LocalizedTextSchema,
  prompt: LocalizedTextSchema,
  evidence: LocalizedTextSchema,
});

export const WorkbookSheetSchema = z.strictObject({
  sheetId: z.string().regex(/^[a-z][a-z0-9-]*$/u),
  label: LocalizedTextSchema,
  purpose: LocalizedTextSchema,
  outcome: LocalizedTextSchema,
  steps: z.array(WorkbookStepSchema).min(1),
});

export const WorkbookSpecSchema = z.strictObject({
  workbookId: z.string().min(1),
  title: LocalizedTextSchema,
  introduction: LocalizedTextSchema,
  sheets: z.array(WorkbookSheetSchema).min(3),
  interactions: z.strictObject({
    tabsKeyboard: z.literal(true),
    copyPrompts: z.literal(true),
    responsePersistence: z.literal('none'),
    preferencePersistence: z.array(z.enum(['theme', 'locale'])),
  }),
  noJs: z.strictObject({
    contentReadable: z.literal(true),
    navigationFallback: z.literal('fragments'),
  }),
  print: z.strictObject({
    enabled: z.literal(true),
    hideInteractiveControls: z.literal(true),
    preserveAllContent: z.literal(true),
  }),
});

export const MasterclassSlideSchema = z.strictObject({
  slideId: z.string().regex(/^[a-z][a-z0-9-]*$/u),
  title: LocalizedTextSchema,
  body: LocalizedTextSchema,
  timing: z.strictObject({
    coreMinutes: z.number().int().nonnegative(),
    extendedMinutes: z.number().int().nonnegative(),
  }),
  facilitatorNote: LocalizedTextSchema,
  workbookTarget: z
    .strictObject({
      sheetId: z.string().min(1),
      stepId: z.string().min(1),
    })
    .optional(),
});

export const MasterclassSpecSchema = z
  .strictObject({
    masterclassId: z.string().min(1),
    title: LocalizedTextSchema,
    introduction: LocalizedTextSchema,
    modes: z.tuple([
      z.strictObject({id: z.literal('core'), minutes: z.literal(90)}),
      z.strictObject({id: z.literal('extended'), minutes: z.literal(120)}),
    ]),
    keyboard: z.strictObject({
      next: z.tuple([z.literal('ArrowRight'), z.literal('PageDown'), z.literal('Space')]),
      previous: z.tuple([z.literal('ArrowLeft'), z.literal('PageUp')]),
      first: z.literal('Home'),
      last: z.literal('End'),
      ignoreEditableTargets: z.literal(true),
      buttons: z.literal(true),
      outline: z.literal(true),
    }),
    deepLinkContract: z.strictObject({
      preserveLocale: z.literal(true),
      preserveFragment: z.literal(true),
      missingTarget: z.literal('block'),
    }),
    slides: z.array(MasterclassSlideSchema).min(1),
  })
  .superRefine((masterclass, context) => {
    const core = masterclass.slides.reduce((total, slide) => total + slide.timing.coreMinutes, 0);
    const extended = masterclass.slides.reduce(
      (total, slide) => total + slide.timing.extendedMinutes,
      0,
    );
    if (core !== 90) context.addIssue({code: 'custom', message: 'Core timing must total 90.'});
    if (extended !== 120)
      context.addIssue({code: 'custom', message: 'Extended timing must total 120.'});
    if (!masterclass.slides.some(({workbookTarget}) => workbookTarget !== undefined)) {
      context.addIssue({code: 'custom', message: 'At least one workbook deep link is required.'});
    }
  });

export const OutputTargetSchema = z.strictObject({
  kind: z.enum(['landing', 'workbook', 'masterclass']),
  locale: LocaleSchema,
  path: PortableRefSchema.refine((value) => value.endsWith('.html'), {
    message: 'HTML output path must end in .html.',
  }),
});

export const HtmlLearningKitSpecSchema = z.strictObject({
  schemaVersion: z.literal('html-learning-kit-spec-v1'),
  specId: z.string().min(1),
  specSha256: Sha256Schema,
  designSystemLock: HashBoundRefSchema,
  brandAuthority: HashBoundRefSchema,
  localizedContent: z.strictObject({
    siteTitle: LocalizedTextSchema,
    landingTitle: LocalizedTextSchema,
    landingIntroduction: LocalizedTextSchema,
    libraryTitle: LocalizedTextSchema,
    skipLink: LocalizedTextSchema,
    themeLabel: LocalizedTextSchema,
  }),
  workbook: WorkbookSpecSchema,
  masterclass: MasterclassSpecSchema,
  assets: z.array(AssetSchema).min(1),
  outputs: z.array(OutputTargetSchema).length(9),
  privacy: z.strictObject({
    persistLearnerResponses: z.literal(false),
    allowedLocalStorageKeys: z.array(z.enum(['locale', 'theme'])),
  }),
  maximumState: z.literal('RENDERED_DRAFT'),
});

export const BuildManifestSchema = z.strictObject({
  schemaVersion: z.literal('html-learning-kit-build-manifest-v1'),
  specId: z.string().min(1),
  specSha256: Sha256Schema,
  designSystemSha256: Sha256Schema,
  brandAuthoritySha256: Sha256Schema,
  compilerVersion: z.literal('html-learning-kit-compiler-v1'),
  assets: z.array(
    z.strictObject({
      assetId: z.string().min(1),
      sourceSha256: Sha256Schema,
      outputPath: PortableRefSchema,
      outputSha256: Sha256Schema,
    }),
  ),
  outputs: z.array(
    z.strictObject({
      kind: z.enum(['landing', 'workbook', 'masterclass']),
      locale: LocaleSchema,
      path: PortableRefSchema,
      sha256: Sha256Schema,
    }),
  ),
  manifestSha256: Sha256Schema,
});

export const BuildReceiptSchema = z.strictObject({
  schemaVersion: z.literal('html-learning-kit-build-receipt-v1'),
  receiptId: z.string().min(1),
  specId: z.string().min(1),
  specSha256: Sha256Schema,
  designSystemSha256: Sha256Schema,
  manifestSha256: Sha256Schema,
  outputSetSha256: Sha256Schema,
  state: z.literal('RENDERED_DRAFT'),
  publicationAuthority: z.literal(false),
  receiptSha256: Sha256Schema,
});

export type Locale = z.infer<typeof LocaleSchema>;
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type HtmlLearningKitSpec = z.infer<typeof HtmlLearningKitSpecSchema>;
export type BuildManifest = z.infer<typeof BuildManifestSchema>;
export type BuildReceipt = z.infer<typeof BuildReceiptSchema>;
