import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';
import {z} from 'zod';

import {renderBrandProjections} from './generate-brand-projections.ts';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const relativePathSchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith('/') && !value.includes('..'), 'portable relative path');

const sourceSchema = z.strictObject({
  source_id: z.string().min(1),
  relative_path: relativePathSchema,
  sha256: sha256Schema,
  dirty: z.boolean(),
  commit_bound: z.boolean(),
  authority_class: z.enum([
    'stable_projection_authority',
    'constitutional_brand_authority',
    'first_party_candidate',
    'observational_only',
  ]),
  use_scope: z.string().min(1),
  section_ref: z.string().min(1).optional(),
});

const sourceBundleSchema = z.strictObject({
  schema_version: z.literal('brand-source-bundle-v1'),
  bundle_id: z.string().min(1),
  source_repo_id: z.literal('metodologia-public-site'),
  observed_commit: z.literal('f53177ff604c936c887a2675d661b65ff97bfef6'),
  locator_policy: z.object({
    durable_locator: z.literal('logical_repo_and_relative_path_only'),
    absolute_path_allowed: z.literal(false),
    raw_content_copied: z.literal(false),
  }),
  authority_policy: z.record(z.string(), z.array(z.string())),
  sources: z.array(sourceSchema).length(10),
  coverage: z.object({
    clean_authority_sources: z.literal(6),
    stable_projection_sources: z.literal(5),
    constitutional_sources: z.literal(1),
    first_party_candidates: z.literal(1),
    dirty_observations: z.literal(3),
    gaps: z.array(z.string()),
  }),
});

const tokenSchema = z.strictObject({
  schema_version: z.literal('brand-tokens-v2'),
  token_set_id: z.literal('metodologia-social-light-v2'),
  brand_id: z.literal('metodologia'),
  authored: z.literal(true),
  default_theme: z.literal('light'),
  source_binding: z.object({
    bundle_ref: relativePathSchema,
    source_id: z.literal('BRAND-SRC-TOKENS'),
    source_sha256: sha256Schema,
  }),
  colors: z.strictObject({
    canvas: z.string(),
    canvas_deep: z.string(),
    ink: z.string(),
    surface: z.string(),
    surface_alt: z.string(),
    gold_fill: z.string(),
    gold_text: z.string(),
    gold_soft: z.string(),
    text_soft: z.string(),
    muted: z.string(),
    border: z.string(),
    border_hover: z.string(),
  }),
  semantic: z.record(z.string(), z.string()),
  css_aliases: z.strictObject({
    brand_navy: z.literal('ink'),
    brand_white: z.literal('surface'),
    brand_white_soft: z.literal('surface_alt'),
    brand_white_muted: z.literal('canvas_deep'),
  }),
  typography: z.object({
    heading: z.object({
      family: z.literal('Poppins'),
      fallback: z.string(),
      allowed_weights: z.tuple([z.literal(600), z.literal(700), z.literal(800), z.literal(900)]),
    }),
    body: z.object({
      family: z.literal('Montserrat'),
      fallback: z.string(),
      allowed_weights: z.tuple([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]),
    }),
  }),
  layout: z.object({
    radius: z.literal('16px'),
    radius_large: z.literal('24px'),
    gutter: z.string(),
  }),
  motion: z.object({
    standard: z.string(),
    spring: z.string(),
    out_expo: z.string(),
  }),
  accessibility: z.object({
    body_text_minimum_contrast: z.literal(4.5),
    large_text_and_ui_minimum_contrast: z.literal(3),
    gold_pairing_rule: z.literal('text_on_gold'),
    forbidden_pairing: z.literal('white_on_gold'),
  }),
  projection_targets: z.tuple([
    z.literal('brand/generated/social-light.tokens.json'),
    z.literal('brand/generated/social-light.css'),
    z.literal('brand/generated/social-light.tokens.ts'),
  ]),
});

const brandProfileSchema = z
  .object({
    schema_version: z.literal('brand-profile-v2'),
    profile_id: z.literal('metodologia-brand-v2'),
    brand_id: z.literal('metodologia'),
    validation_state: z.literal('BRAND_VALIDATED'),
    visible_identity: z.object({
      canonical_name: z.literal('MetodologIA'),
      exact_case_required: z.literal(true),
      exclusive_in_public_artifact: z.literal(true),
      foreign_identity_policy: z.literal('forbidden'),
    }),
    source_bundle_ref: z.literal('registries/brand/source-bundle-v1.yml'),
    token_contract: z.object({
      authored_source_ref: z.literal('brand/tokens/brand-tokens.yml'),
      generated_projections: z.object({
        json: z.literal('brand/generated/social-light.tokens.json'),
        css: z.literal('brand/generated/social-light.css'),
        typescript: z.literal('brand/generated/social-light.tokens.ts'),
      }),
      hardcoded_color_outside_contract: z.literal('forbidden'),
    }),
    font_contract: z.object({
      manifest_ref: z.literal('brand/fonts/font-manifest.yml'),
      rights_receipt_ref: z.literal('brand/fonts/rights-receipt.yml'),
      render_mode: z.literal('offline_local_only'),
      unresolved_font_behavior: z.literal('RIGHTS_GAP'),
    }),
    gate_effect: z.object({
      allows: z.array(z.string()),
      does_not_allow: z.array(z.string()),
    }),
  })
  .passthrough();

const voiceProfileSchema = z
  .object({
    schema_version: z.literal('voice-profile-v2'),
    profile_id: z.literal('metodologia-voice-v2'),
    validation_state: z.literal('VOICE_CANDIDATE'),
    confidence: z.object({
      level: z.literal('medium'),
      basis: z.array(z.string()).min(2),
      promotion_requirement: z.string().min(1),
    }),
    source_bindings: z
      .array(
        z.object({
          source_id: z.string(),
          sha256: sha256Schema,
          authority_class: z.enum(['first_party_candidate', 'constitutional_brand_authority']),
        }),
      )
      .length(2),
    voice_constants: z.array(z.object({id: z.string()})).min(4),
    structure: z.object({
      default_mode: z.literal('minto_complete'),
      modes: z.object({
        minto_complete: z.object({
          conclusion_count: z.literal(1),
          support_count: z.literal(3),
          support_rule: z.literal('MECE'),
          evidence_per_support: z.literal('required'),
          cta_count: z.literal(1),
        }),
        minto_micro: z.object({
          conclusion_count: z.literal(1),
          support_count: z.literal(2),
          support_rule: z.literal('MECE'),
          evidence_per_support: z.literal('required'),
          cta_count: z.literal(1),
        }),
      }),
    }),
    pillars: z.array(z.object({pillar_id: z.string(), name: z.string()})).length(3),
    evidence_policy: z.object({
      strong_claim_requires_one_of: z.array(z.string()).length(4),
      unsupported_claim_behavior: z.literal('fail_closed'),
    }),
    language: z.object({
      default: z.literal('es-LatAm'),
      address: z.literal('tú'),
      regionalisms: z.literal('forbidden'),
    }),
    red_list: z.array(z.string()).length(7),
    cta_contract: z.object({
      required_parts: z.array(z.string()).length(3),
      movements: z.literal(1),
      generic_cta: z.literal('forbidden'),
    }),
    gate_effect: z.object({
      allowed_scope: z.array(z.string()),
      blocked_scope: z.array(z.string()),
    }),
  })
  .passthrough();

const channelSourceSchema = z.strictObject({
  source_id: z.string().min(1),
  authority: z.literal('official_instagram_help_center'),
  canonical_uri: z.string().url(),
  observed_at: z.iso.datetime({offset: true}),
  supports: z
    .array(
      z.enum([
        'static_media_preflight',
        'carousel_item_count_preflight',
        'motion_media_preflight',
        'accessibility_preflight',
      ]),
    )
    .min(1),
});

const channelProfileSchema = z
  .object({
    schema_version: z.literal('channel-profile-v1'),
    profile_id: z.literal('instagram-social-v1'),
    channel_id: z.literal('instagram'),
    channel_state: z.literal('governed_candidate'),
    platform_spec_policy: z.object({
      live_verification_required_before_publish: z.literal(true),
      internal_dimensions_are_project_profiles_not_platform_maxima: z.literal(true),
      source_authority: z.literal('official_only'),
      publish_connector: z.literal('disabled'),
    }),
    source_bindings: z.array(channelSourceSchema).length(4),
    freshness_policy: z.object({
      observed_at: z.iso.datetime({offset: true}),
      stale_after_days: z.literal(30),
      when_fresh: z.object({
        local_tests: z.literal('allowed'),
        ready: z.literal('defer_to_remaining_gates'),
      }),
      when_stale: z.object({
        local_tests: z.literal('allowed'),
        maximum_state: z.literal('RENDERED_DRAFT'),
        ready: z.literal('blocked'),
        publish: z.literal('blocked'),
        required_action: z.literal('reobserve_official_sources'),
      }),
    }),
    brand_profile_ref: z.literal('registries/brand/brand-profile-v2.yml'),
    voice_profile_ref: z.literal('registries/brand/voice-profile-v2.yml'),
    language: z.object({
      default: z.literal('es-LatAm'),
      address: z.literal('tú'),
    }),
    render_profiles: z.object({
      portrait_static: z.object({
        width: z.literal(1080),
        height: z.literal(1350),
        aspect_ratio: z.literal('4:5'),
      }),
      vertical_motion: z.object({
        width: z.literal(1080),
        height: z.literal(1920),
        aspect_ratio: z.literal('9:16'),
      }),
      square_static: z.object({
        width: z.literal(1080),
        height: z.literal(1080),
        aspect_ratio: z.literal('1:1'),
      }),
    }),
    governance: z.object({
      candidate_state: z.literal('RENDERED_DRAFT'),
      guardian_required: z.literal(true),
      human_gate: z.literal('G15'),
      readiness_gate: z.literal('G16'),
      publish_gate: z.literal('G17'),
      automatic_publication: z.literal('forbidden'),
    }),
  })
  .passthrough();

const expectedChannelSources = new Map([
  ['IG-OFFICIAL-PHOTO-RESOLUTION', 'https://www.facebook.com/help/instagram/1631821640426723'],
  ['IG-OFFICIAL-CAROUSEL', 'https://www.facebook.com/help/instagram/269314186824048'],
  ['IG-OFFICIAL-REELS', 'https://www.facebook.com/help/instagram/1038071743007909'],
  ['IG-OFFICIAL-ALT-TEXT', 'https://www.facebook.com/help/instagram/503708446705527'],
]);

const brandAdaptationDecisionSchema = z
  .object({
    schema_version: z.literal('brand-adaptation-decision-v1'),
    decision_id: z.literal('BAD-INSTAGRAM-SOCIAL-001'),
    brand_profile_ref: z.literal('registries/brand/brand-profile-v2.yml'),
    voice_profile_ref: z.literal('registries/brand/voice-profile-v2.yml'),
    channel_profile_ref: z.literal('registries/channels/instagram-profile-v1.yml'),
    decision_state: z.literal('active_candidate'),
    preserve: z.array(z.string()).min(5),
    adapt: z.array(z.object({dimension: z.string().min(1)})).min(4),
    forbid: z.array(z.string()).min(5),
    gate_effect: z.object({
      maximum_state: z.literal('RENDERED_DRAFT'),
      next_required_gate: z.literal('G14'),
      human_gate: z.literal('G15'),
      ready_gate: z.literal('G16'),
      publish_gate: z.literal('G17'),
    }),
    coverage_gaps: z.array(z.string()).min(2),
  })
  .passthrough();

const fontEntrySchema = z.strictObject({
  family: z.enum(['Poppins', 'Montserrat']),
  style: z.literal('normal'),
  weight: z.string(),
  path: relativePathSchema,
  sha256: sha256Schema,
  license_path: relativePathSchema,
  license_sha256: sha256Schema,
  source_url: z.string().url(),
  source_commit: z.literal('389b770410cc0b7c21c85673bfa2077420fe7f65'),
  rights_verdict: z.literal('cleared_OFL-1.1'),
});

const fontManifestSchema = z.strictObject({
  schema_version: z.literal('brand-font-manifest-v1'),
  manifest_id: z.string().min(1),
  source_repository: z.literal('google/fonts'),
  source_commit: z.literal('389b770410cc0b7c21c85673bfa2077420fe7f65'),
  render_mode: z.literal('offline_local_only'),
  fallback_policy: z.literal('fail_with_RIGHTS_GAP'),
  fonts: z.array(fontEntrySchema).length(4),
  licenses: z
    .array(
      z.strictObject({
        family: z.enum(['Poppins', 'Montserrat']),
        path: relativePathSchema,
        sha256: sha256Schema,
        source_url: z.string().url(),
        spdx_expression: z.literal('OFL-1.1'),
      }),
    )
    .length(2),
});

const rightsReceiptSchema = z
  .object({
    schema_version: z.literal('brand-font-rights-receipt-v1'),
    manifest_ref: z.literal('brand/fonts/font-manifest.yml'),
    source_repository: z.literal('google/fonts'),
    source_commit: z.literal('389b770410cc0b7c21c85673bfa2077420fe7f65'),
    license: z.literal('OFL-1.1'),
    rights_verdict: z.literal('cleared_for_local_bundling_and_rendering'),
    network_runtime_required: z.literal(false),
    files_verified: z.literal(6),
    producer_actor_id: z.string().min(1),
    verifier_actor_id: z.string().min(1),
    guardian_actor_id: z.literal('pending-independent-guardian'),
  })
  .passthrough();

const expectedSources = new Map<
  string,
  {path: string; sha256: string; dirty: boolean; commitBound: boolean; authority: string}
>([
  [
    'BRAND-SRC-TOKENS',
    {
      path: 'design-system/tokens.css',
      sha256: '32cc6576323aae325160c589cac500f6965b897070aecbc048278c363ed25f19',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-SKILL',
    {
      path: 'design-system/brand-html-skill/SKILL.md',
      sha256: 'bc68a6ef3607ca6cb2af15b365cf59fa5e8fd846519a99ec027b4d85f41316b8',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-CONTRACTS',
    {
      path: 'design-system/brand-html-skill/references/contracts.json',
      sha256: '5cb7f8cd429ae50ea1aa9e4c96eb0a9e6388db17d37a88cfd68b03097c37eb76',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-RULES',
    {
      path: 'design-system/brand-html-skill/references/brand-rules.md',
      sha256: '55514b363186dd64a8ee327ac83d7eb1a4a1c06655c2c96029e0dcc3c5afee0e',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-NAMING',
    {
      path: 'docs/BRAND_NAMES.md',
      sha256: 'c3023e3464515a1b2a87a0a75aa9ff806f246667be277d5bcfbea95d89a4e39e',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-CONSTITUTION-XI',
    {
      path: 'CONSTITUTION.md',
      sha256: 'a506427360513d2026b16a1fea3d79b1423d33ff3bf397398ec029aeaaf0a8b4',
      dirty: false,
      commitBound: true,
      authority: 'constitutional_brand_authority',
    },
  ],
  [
    'BRAND-SRC-VOICE-V3',
    {
      path: '.local/pristino-alfa/references/brand/brand-voice-v3.0.md',
      sha256: 'd415571ed41f49ee186f2fc70faa91e91862142175ad89c39454a41bf295168f',
      dirty: false,
      commitBound: false,
      authority: 'first_party_candidate',
    },
  ],
  [
    'BRAND-SRC-LLMS-DIRTY',
    {
      path: 'llms.txt',
      sha256: 'a7f9893b49f5ee2de12844e4759413066bc61ace69b4c9f12717b08b6a1efead',
      dirty: true,
      commitBound: false,
      authority: 'observational_only',
    },
  ],
  [
    'BRAND-SRC-MANIFEST-DIRTY',
    {
      path: 'manifest.json',
      sha256: '801bef55000af6486aa149cdfdf15fae5bbd0545ed1e2169ed5edfe1c26bf5c5',
      dirty: true,
      commitBound: false,
      authority: 'observational_only',
    },
  ],
  [
    'BRAND-SRC-NEOSWISS-DIRTY',
    {
      path: 'estilos/neoswiss-v5.css',
      sha256: '83d10053cccac1cc50e3515f609727c927b80f127064f4bf49e7988e8814e614',
      dirty: true,
      commitBound: false,
      authority: 'observational_only',
    },
  ],
]);

const readYaml = (root: string, relativePath: string): unknown =>
  parse(readFileSync(resolve(root, relativePath), 'utf8')) as unknown;

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

export const validateSourceBundleObject = (input: unknown): string[] => {
  const parsed = sourceBundleSchema.safeParse(input);
  if (!parsed.success) return [`BR001 invalid source bundle: ${parsed.error.message}`];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const source of parsed.data.sources) {
    if (seen.has(source.source_id)) errors.push(`BR002 duplicate source_id ${source.source_id}`);
    seen.add(source.source_id);
    const expected = expectedSources.get(source.source_id);
    if (expected === undefined) {
      errors.push(`BR002 unexpected source ${source.source_id}`);
      continue;
    }
    if (
      source.relative_path !== expected.path ||
      source.sha256 !== expected.sha256 ||
      source.dirty !== expected.dirty ||
      source.commit_bound !== expected.commitBound ||
      source.authority_class !== expected.authority
    ) {
      errors.push(`BR002 source binding drift ${source.source_id}`);
    }
    if (source.dirty && source.authority_class !== 'observational_only') {
      errors.push(`BR003 dirty source promoted as authority ${source.source_id}`);
    }
    if (
      source.authority_class === 'stable_projection_authority' &&
      (source.dirty || !source.commit_bound)
    ) {
      errors.push(`BR003 unstable source promoted as stable ${source.source_id}`);
    }
  }
  for (const expectedId of expectedSources.keys()) {
    if (!seen.has(expectedId)) errors.push(`BR002 missing source ${expectedId}`);
  }
  return errors;
};

export const validateVoiceProfileObject = (input: unknown): string[] => {
  const parsed = voiceProfileSchema.safeParse(input);
  if (!parsed.success) return [`VOICE001 invalid voice profile: ${parsed.error.message}`];
  const errors: string[] = [];
  const pillarIds = parsed.data.pillars.map(({pillar_id: id}) => id).sort();
  if (pillarIds.join(',') !== 'P1,P2,P3') errors.push('VOICE002 pillars must be P1,P2,P3');
  const expectedEvidence = ['dato_real', 'dato_requerido', 'indicador_sugerido', 'señal_a_medir'];
  if (
    parsed.data.evidence_policy.strong_claim_requires_one_of.slice().sort().join(',') !==
    expectedEvidence.sort().join(',')
  ) {
    errors.push('VOICE003 evidence taxonomy drift');
  }
  const expectedCta = ['contexto', 'objeto', 'verbo'];
  if (
    parsed.data.cta_contract.required_parts.slice().sort().join(',') !==
    expectedCta.sort().join(',')
  ) {
    errors.push('VOICE003 CTA must require verbo, objeto and contexto');
  }
  const voiceCandidate = parsed.data.source_bindings.find(
    ({source_id: sourceId}) => sourceId === 'BRAND-SRC-VOICE-V3',
  );
  if (voiceCandidate?.authority_class !== 'first_party_candidate') {
    errors.push('VOICE004 voice candidate promoted beyond source authority');
  }
  for (const forbidden of ['HUMAN_APPROVED', 'READY', 'PUBLISHED']) {
    if (!parsed.data.gate_effect.blocked_scope.includes(forbidden)) {
      errors.push(`VOICE004 candidate voice must block ${forbidden}`);
    }
  }
  return errors;
};

export const validateChannelProfileObject = (input: unknown): string[] => {
  const parsed = channelProfileSchema.safeParse(input);
  if (!parsed.success) return [`CHANNEL001 invalid channel profile: ${parsed.error.message}`];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const source of parsed.data.source_bindings) {
    if (seen.has(source.source_id)) {
      errors.push(`CHANNEL002 duplicate official source ${source.source_id}`);
    }
    seen.add(source.source_id);
    const expectedUri = expectedChannelSources.get(source.source_id);
    if (expectedUri === undefined || source.canonical_uri !== expectedUri) {
      errors.push(`CHANNEL002 official source binding drift ${source.source_id}`);
    }
    if (source.observed_at !== parsed.data.freshness_policy.observed_at) {
      errors.push(`CHANNEL003 source observation timestamp drift ${source.source_id}`);
    }
  }
  for (const sourceId of expectedChannelSources.keys()) {
    if (!seen.has(sourceId)) errors.push(`CHANNEL002 official source missing ${sourceId}`);
  }
  return errors;
};

export const evaluateChannelFreshness = (
  input: unknown,
  referenceTime = new Date(),
): {
  state: 'fresh' | 'stale';
  local_tests: 'allowed';
  ready: 'defer_to_remaining_gates' | 'blocked';
} => {
  const profile = channelProfileSchema.parse(input);
  const observedAt = new Date(profile.freshness_policy.observed_at).getTime();
  const expiresAt = observedAt + profile.freshness_policy.stale_after_days * 24 * 60 * 60 * 1000;
  if (referenceTime.getTime() > expiresAt) {
    return {
      state: 'stale',
      local_tests: profile.freshness_policy.when_stale.local_tests,
      ready: profile.freshness_policy.when_stale.ready,
    };
  }
  return {
    state: 'fresh',
    local_tests: profile.freshness_policy.when_fresh.local_tests,
    ready: profile.freshness_policy.when_fresh.ready,
  };
};

type TokenContract = z.infer<typeof tokenSchema>;

export const validateBrand = (root = process.cwd()): string[] => {
  const errors: string[] = [];
  let tokens: TokenContract | undefined;
  try {
    const bundle = readYaml(root, 'registries/brand/source-bundle-v1.yml');
    errors.push(...validateSourceBundleObject(bundle));
  } catch (error) {
    errors.push(`BR001 source bundle unreadable: ${String(error)}`);
  }
  try {
    const brandProfile = brandProfileSchema.parse(
      readYaml(root, 'registries/brand/brand-profile-v2.yml'),
    );
    for (const forbiddenState of ['HUMAN_APPROVED', 'READY', 'PUBLISHED']) {
      if (!brandProfile.gate_effect.does_not_allow.includes(forbiddenState)) {
        errors.push(`BR008 BRAND_VALIDATED must not allow ${forbiddenState}`);
      }
    }
  } catch (error) {
    errors.push(`BR008 invalid BRAND_VALIDATED profile: ${String(error)}`);
  }
  try {
    const voice = readYaml(root, 'registries/brand/voice-profile-v2.yml');
    errors.push(...validateVoiceProfileObject(voice));
  } catch (error) {
    errors.push(`VOICE001 voice profile unreadable: ${String(error)}`);
  }
  try {
    errors.push(
      ...validateChannelProfileObject(
        readYaml(root, 'registries/channels/instagram-profile-v1.yml'),
      ),
    );
  } catch (error) {
    errors.push(`CHANNEL001 channel profile unreadable: ${String(error)}`);
  }
  try {
    brandAdaptationDecisionSchema.parse(
      readYaml(root, 'registries/brand/brand-adaptation-decision-v1.yml'),
    );
  } catch (error) {
    errors.push(`VOICE005 invalid channel adaptation contract: ${String(error)}`);
  }
  try {
    tokens = tokenSchema.parse(readYaml(root, 'brand/tokens/brand-tokens.yml'));
  } catch (error) {
    errors.push(`BR005 authored token contract invalid: ${String(error)}`);
  }

  if (tokens !== undefined) {
    const projections = renderBrandProjections(tokens);
    for (const [relativePath, expected] of Object.entries(projections)) {
      const actual = readFileSync(resolve(root, relativePath), 'utf8');
      if (actual !== expected) {
        errors.push(`BR005 byte-level token projection drift ${relativePath}`);
      }
    }
  }

  try {
    const manifest = fontManifestSchema.parse(readYaml(root, 'brand/fonts/font-manifest.yml'));
    const rawPrefix = `https://raw.githubusercontent.com/google/fonts/${manifest.source_commit}/`;
    for (const font of manifest.fonts) {
      if (!font.source_url.startsWith(rawPrefix)) {
        errors.push(`BR007 RIGHTS_GAP unpinned or non-official URL ${font.path}`);
      }
      const fontPath = resolve(root, font.path);
      const licensePath = resolve(root, font.license_path);
      if (!existsSync(fontPath)) {
        errors.push(`BR007 RIGHTS_GAP missing font ${font.path}`);
      } else if (sha256(readFileSync(fontPath)) !== font.sha256) {
        errors.push(`BR007 RIGHTS_GAP font hash mismatch ${font.path}`);
      }
      if (!existsSync(licensePath)) {
        errors.push(`BR007 RIGHTS_GAP missing license ${font.license_path}`);
      } else {
        const licenseBytes = readFileSync(licensePath);
        if (sha256(licenseBytes) !== font.license_sha256) {
          errors.push(`BR007 RIGHTS_GAP license hash mismatch ${font.license_path}`);
        }
        if (!licenseBytes.toString('utf8').includes('SIL OPEN FONT LICENSE Version 1.1')) {
          errors.push(`BR007 RIGHTS_GAP unexpected license text ${font.license_path}`);
        }
      }
    }
    rightsReceiptSchema.parse(readYaml(root, 'brand/fonts/rights-receipt.yml'));
  } catch (error) {
    errors.push(`BR007 RIGHTS_GAP invalid font evidence: ${String(error)}`);
  }

  const rawColorAllowed = new Set([
    'brand/tokens/brand-tokens.yml',
    'brand/generated/social-light.tokens.json',
    'brand/generated/social-light.css',
    'brand/generated/social-light.tokens.ts',
  ]);
  const governedTextPaths = ['docs/program/instagram-content-network-v2.md'];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(resolve(root, directory), {withFileTypes: true})) {
      const child = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(child);
      } else if (entry.isFile()) {
        governedTextPaths.push(child);
      }
    }
  };
  for (const directory of [
    'brand',
    'registries/brand',
    'registries/channels',
    'registries/content-types',
  ]) {
    walk(directory);
  }
  for (const relativePath of governedTextPaths) {
    const bytes = readFileSync(resolve(root, relativePath));
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(text)) {
      errors.push(`BR009 non-portable locator in ${relativePath}`);
    }
    if (!rawColorAllowed.has(relativePath) && /#[0-9a-f]{3,8}\b/iu.test(text)) {
      errors.push(`BR004 raw color outside token projection in ${relativePath}`);
    }
  }

  return errors;
};

const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const errors = validateBrand();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      'PASS BRAND/CHANNEL V2: authority, voice, official freshness, tokens, offline fonts and rights are governed.',
    );
  }
}
