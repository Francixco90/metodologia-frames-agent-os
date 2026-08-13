import {z} from 'zod';

const Sha = z.string().regex(/^[0-9a-f]{64}$/u);
const Ref = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith('/') && !value.includes('..\\'));
const Component = z.string().regex(/^[a-z][a-z0-9-]+$/u);

export const TrainerTokenAuthoritySchema = z.strictObject({
  schemaVersion: z.literal('trainer-design-tokens-v1'),
  tokenSetId: z.literal('metodologia-trainer-neo-swiss-v1'),
  brandId: z.literal('metodologia'),
  canonicalAuthority: z.strictObject({
    ref: z.literal('../../../brand/tokens/brand-tokens.yml'),
    sha256: Sha,
  }),
  overrideRationale: z.string().min(40),
  defaultTheme: z.literal('light'),
  colors: z.strictObject({
    navy: z.literal('#0a122a'),
    gold: z.literal('#e0b400'),
    goldText: z.literal('#0a122a'),
    lightCanvas: z.literal('#f5f7fa'),
    lightSurface: z.literal('#ffffff'),
    lightText: z.literal('#0a122a'),
    darkCanvas: z.literal('#062f62'),
    darkSurface: z.literal('#093d78'),
    darkText: z.literal('#f4f7fb'),
    lightFocus: z.literal('#765400'),
    darkFocus: z.literal('#ffdb63'),
  }),
  typography: z.strictObject({
    heading: z.literal('Poppins'),
    body: z.literal('Montserrat'),
    fallback: z.literal('system-ui, sans-serif'),
  }),
  spacing: z.array(z.string().regex(/^\d+px$/u)).length(8),
  radius: z.strictObject({
    small: z.literal('8px'),
    medium: z.literal('16px'),
    large: z.literal('24px'),
  }),
  motion: z.strictObject({
    duration: z.literal('180ms'),
    easing: z.literal('cubic-bezier(.4, 0, .2, 1)'),
  }),
  layout: z.strictObject({contentMax: z.literal('1200px'), touchTargetMin: z.literal('44px')}),
  guardrails: z.strictObject({
    contrast: z.literal('WCAG-AA'),
    goldPairing: z.literal('navy-on-gold'),
    forbiddenPairing: z.literal('white-on-gold'),
    reducedMotion: z.literal('required'),
    themes: z.tuple([z.literal('light'), z.literal('dark')]),
  }),
  projections: z.strictObject({jsonSha256: Sha, cssSha256: Sha, tsSha256: Sha}),
});
export type TrainerTokenAuthority = z.infer<typeof TrainerTokenAuthoritySchema>;

const Font = (
  family: 'Poppins' | 'Montserrat',
  weight: string,
  ref: string,
  sha256: string,
  licenseRef: string,
  licenseSha256: string,
) =>
  z.strictObject({
    kind: z.literal('font'),
    family: z.literal(family),
    weight: z.literal(weight),
    ref: z.literal(ref),
    sha256: z.literal(sha256),
    licenseRef: z.literal(licenseRef),
    licenseSha256: z.literal(licenseSha256),
    spdx: z.literal('OFL-1.1'),
  });
export const TrainerAssetRightsSchema = z.strictObject({
  schemaVersion: z.literal('trainer-design-assets-v1'),
  manifestId: z.literal('metodologia-trainer-assets-v1'),
  refBase: z.literal('manifest-directory'),
  brandMark: z.strictObject({
    mode: z.literal('typographic'),
    text: z.literal('MetodologIA'),
    rights: z.string().min(20),
  }),
  authorityReceipts: z.tuple([
    z.strictObject({kind: z.literal('font-rights'), ref: Ref, sha256: Sha}),
    z.strictObject({kind: z.literal('icon-manifest'), ref: Ref, sha256: Sha}),
  ]),
  assets: z.tuple([
    Font(
      'Poppins',
      '400',
      '../../../brand/fonts/vendor/poppins/Poppins-Regular.ttf',
      '7e65201e9b79159e2300267cc885e16c8dcef2424cdfa09a29bfb0980a94a7ba',
      '../../../brand/fonts/vendor/poppins/OFL.txt',
      '6be04893d770899a015649c7aa3b582f871b272f8747a92b78b17c3e5c8b2573',
    ),
    Font(
      'Poppins',
      '700',
      '../../../brand/fonts/vendor/poppins/Poppins-Bold.ttf',
      '983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c',
      '../../../brand/fonts/vendor/poppins/OFL.txt',
      '6be04893d770899a015649c7aa3b582f871b272f8747a92b78b17c3e5c8b2573',
    ),
    Font(
      'Montserrat',
      '400-700',
      '../../../brand/fonts/vendor/montserrat/Montserrat-VariableFont_wght.ttf',
      '0f7b311b2f3279e4eef9b2f968bcdbab6e28f4daeb1f049f4f278a902bcd82f7',
      '../../../brand/fonts/vendor/montserrat/OFL.txt',
      '8b7141c03fa4f8d44e6345d5d4931709290f0f67875e452e95ac1fd3a027802e',
    ),
    z.strictObject({
      kind: z.literal('icons'),
      ref: z.literal('../../../brand/career-design-system/icons/icons.v1.svg'),
      sha256: z.literal('435438958860b2370ff89a60d6c836e8a13eeb41c02511b763b35ba0048a71a2'),
      rights: z.string().min(20),
    }),
  ]),
  networkRequired: z.literal(false),
  publicationAuthority: z.literal(false),
});

const base = {id: z.string(), components: z.array(Component).min(1)};
export const TrainerArtifactProfilesSchema = z.strictObject({
  schemaVersion: z.literal('trainer-artifact-profiles-v1'),
  sharedComponents: z
    .array(Component)
    .min(8)
    .refine((items) => new Set(items).size === items.length),
  profiles: z.tuple([
    z.strictObject({...base, id: z.literal('landing'), sectionCount: z.literal(8)}),
    z.strictObject({...base, id: z.literal('masterclass'), slideCount: z.literal(18)}),
    z.strictObject({...base, id: z.literal('workbook'), sheetCount: z.literal(3)}),
    z.strictObject({
      ...base,
      id: z.literal('playbook'),
      stepMinimum: z.number().int().min(12),
      principleMaximum: z.number().int().max(7),
    }),
    z.strictObject({
      ...base,
      id: z.literal('prompt-library'),
      levels: z.tuple([
        z.literal('essential'),
        z.literal('guided'),
        z.literal('advanced'),
        z.literal('expert'),
      ]),
    }),
  ]),
  interactionGuardrails: z.strictObject({
    keyboard: z.literal(true),
    focusVisible: z.literal(true),
    reducedMotion: z.literal(true),
    minimumTouchTarget: z.literal('44px'),
    noJsCoreContent: z.literal(true),
  }),
  publicationAuthority: z.literal(false),
});

const Locale = z.strictObject({
  open: z.string().min(1),
  continue: z.string().min(1),
  available: z.string().min(1),
  pending: z.string().min(1),
  theme: z.string().min(1),
  language: z.string().min(1),
});
const Term = z.strictObject({
  id: z.string().min(1),
  es: z.string().min(1),
  en: z.string().min(1),
  pt: z.string().min(1),
});
export const TrainerMicrocopySchema = z.strictObject({
  schemaVersion: z.literal('trainer-microcopy-v1'),
  locales: z.strictObject({es: Locale, en: Locale, pt: Locale}),
  glossary: z
    .array(Term)
    .length(4)
    .refine((items) => new Set(items.map(({id}) => id)).size === items.length),
});
