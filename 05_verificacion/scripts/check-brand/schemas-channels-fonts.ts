// check-brand/schemas-channels-fonts.ts — zod contracts for the channel
// profile, brand adaptation decision, font manifest and rights receipt.
// Contract-dense carve-out (D8 contracts ≤300). [CÓDIGO]
import {z} from 'zod';

import {relativePathSchema, sha256Schema} from './schemas-core.ts';

export const channelSourceSchema = z.strictObject({
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

export const channelProfileSchema = z
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

export const brandAdaptationDecisionSchema = z
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

export const fontEntrySchema = z.strictObject({
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

export const fontManifestSchema = z.strictObject({
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

export const rightsReceiptSchema = z
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