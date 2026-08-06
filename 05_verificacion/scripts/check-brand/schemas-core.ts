// check-brand/schemas-core.ts — zod contracts for the source bundle, token
// contract, brand profile and voice profile. Contract-dense carve-out (D8
// contracts ≤300). [CÓDIGO]
import {z} from 'zod';

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
export const relativePathSchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith('/') && !value.includes('..'), 'portable relative path');

export const sourceSchema = z.strictObject({
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

export const sourceBundleSchema = z.strictObject({
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

export const tokenSchema = z.strictObject({
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

export const brandProfileSchema = z
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

export const voiceProfileSchema = z
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