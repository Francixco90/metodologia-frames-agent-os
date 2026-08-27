import {z} from 'zod';

import {add, fixtureRoot, readYaml, unique} from './check-notebooklm-os-common.ts';

const FixtureInputSchema = z.strictObject({
  input_id: z.string().min(1),
  kind: z.enum(['conversation', 'attachment', 'comment']),
  modality: z.enum(['text', 'document', 'image', 'audio', 'video']),
  mime_type: z.string().min(1),
  rights: z.enum(['APPROVED', 'REVIEW', 'BLOCKED']),
  sensitivity: z.enum(['PUBLIC', 'INTERNAL', 'PRIVATE', 'RESTRICTED']),
  content: z.string().min(1),
});

const SyntheticBrandsSchema = z.strictObject({
  schema_version: z.literal('notebooklm-brand-fixtures-v1'),
  fixture_kind: z.literal('synthetic-brand-intake'),
  brands: z
    .array(
      z.strictObject({
        brand_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)+$/u),
        display_name: z.string().min(1),
        primary_locale: z.enum(['en', 'es-419']),
        audiences: z.array(z.string().min(1)).min(1),
        channels: z.array(z.string().min(1)).min(1),
        distinctive_terms: z.array(z.string().min(1)).min(1),
        forbidden_terms: z.array(z.string().min(1)).min(1),
        palette: z.array(z.string().regex(/^#[0-9A-F]{6}$/u)).min(1),
        inputs: z.array(FixtureInputSchema).min(3),
        expected: z.strictObject({
          canonical_phrase: z.string().min(1),
          blocked_phrase: z.string().min(1),
          voice_trait: z.string().min(1),
          status: z.literal('REVIEW'),
        }),
      }),
    )
    .length(2),
});

const StageFixturesSchema = z.strictObject({
  schema_version: z.literal('notebooklm-brand-stage-fixtures-v1'),
  stages: z
    .array(
      z.strictObject({
        stage: z.string().regex(/^N0\d$/u),
        operation: z.string().min(1),
        effect: z.enum(['READ_ONLY', 'LOCAL_REVERSIBLE', 'EXTERNAL_MUTATION']),
        required_output: z.string().min(1),
      }),
    )
    .length(10),
  external_gates: z.record(z.string(), z.string().min(1)),
  stop_rules: z.array(z.string().min(1)).min(5),
});

const AdversarialFixturesSchema = z.strictObject({
  schema_version: z.literal('notebooklm-brand-adversarial-fixtures-v1'),
  cases: z
    .array(
      z.strictObject({
        case_id: z.string().min(1),
        category: z.string().min(1),
        expected: z.enum(['ALLOWED', 'REVIEW', 'BLOCKED']),
        reason_code: z.string().regex(/^[A-Z0-9_]+$/u),
      }),
    )
    .min(16),
});

const TemplateCatalogSchema = z.strictObject({
  schema_version: z.literal('notebooklm-brand-template-catalog-v1'),
  templates: z
    .array(
      z.strictObject({
        template_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
        kind: z.enum(['studio', 'channel']),
      }),
    )
    .length(22),
});

export const brands = SyntheticBrandsSchema.parse(readYaml(`${fixtureRoot}/synthetic-brands.yml`));
add(unique(brands.brands.map(({brand_id: id}) => id)), 'fixtures: brand_id duplicado');
add(
  brands.brands.every(({inputs}) =>
    ['conversation', 'attachment', 'comment'].every((kind) =>
      inputs.some((input) => input.kind === kind),
    ),
  ),
  'fixtures: cada marca debe cubrir conversación, adjunto y comentario',
);
add(
  brands.brands.some(({inputs}) => inputs.some(({rights}) => rights === 'REVIEW')),
  'fixtures: falta un activo sintético con derechos REVIEW',
);

const stages = StageFixturesSchema.parse(readYaml(`${fixtureRoot}/stages.yml`));
const expectedStages = Array.from({length: 10}, (_, index) => `N0${index}`);
add(
  JSON.stringify(stages.stages.map(({stage}) => stage)) === JSON.stringify(expectedStages),
  'fixtures: N00-N09 deben aparecer una vez y en orden',
);
add(stages.external_gates.N04 === 'NLM_PLAN_APPROVED', 'fixtures: N04 debe exigir plan aprobado');
add(
  stages.external_gates.N09_PROFILE === 'NLM_BRAND_PROFILE_APPROVED',
  'fixtures: la promoción del perfil debe tener gate propio',
);

const adversarial = AdversarialFixturesSchema.parse(
  readYaml(`${fixtureRoot}/adversarial-cases.yml`),
);
add(
  unique(adversarial.cases.map(({case_id: id}) => id)),
  'fixtures: case_id adversarial duplicado',
);
for (const category of [
  'determinism',
  'conflict',
  'evolution',
  'isolation',
  'safety',
  'privacy',
  'claims',
  'rights',
  'sources',
  'prompt',
  'templates',
  'governance',
])
  add(
    adversarial.cases.some((testCase) => testCase.category === category),
    `fixtures: falta caso adversarial ${category}`,
  );

export const catalog = TemplateCatalogSchema.parse(
  readYaml(`${fixtureRoot}/prompt-template-catalog.yml`),
);
add(unique(catalog.templates.map(({template_id: id}) => id)), 'catálogo: template_id duplicado');
add(
  catalog.templates.filter(({kind}) => kind === 'studio').length === 9,
  'catálogo: se requieren 9 templates Studio',
);
add(
  catalog.templates.filter(({kind}) => kind === 'channel').length === 13,
  'catálogo: se requieren 13 templates de canal',
);
