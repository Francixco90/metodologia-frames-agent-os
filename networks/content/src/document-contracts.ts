import {z} from 'zod';

import {claimIdSchema, configRefSchema} from './model.ts';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const relativePathSchema = z
  .string()
  .min(1)
  .refine((path) => !path.startsWith('/'));
const componentSchema = z.enum([
  'BeatScene',
  'Breadcrumb',
  'CaptionBand',
  'LayoutGuard',
  'PersistentChrome',
  'SceneGlyph',
  'SignalRail',
  'StatusBadge',
]);

export const videoSpecDocumentSchema = z.strictObject({
  schema_version: z.literal(1),
  spec_version: z.literal('1.0.0'),
  spec_id: z.literal('VIDEO-SPEC-VS001-001'),
  content_id: z.literal('REMOTION-VS001'),
  project_id: z.literal('vs-001-source-to-campaign'),
  objective: z.string().min(1),
  audience: z.array(z.string().min(1)).min(1),
  narrative_thesis: z.string().min(1),
  format: z.literal('vertical_video'),
  platform: z.literal('local_remotion_review'),
  script_ref: relativePathSchema,
  duration: z.strictObject({
    target_frames: z.number().int().positive(),
    target_seconds: z.number().positive(),
    provenance: z.literal(
      'caption words + reading WPM + playback margin + lead/trail - transition overlaps',
    ),
  }),
  resolution_profile: z.strictObject({
    width: z.literal(1080),
    height: z.literal(1920),
    fps: z.number().int().positive(),
    codec: z.literal('h264'),
    pixel_format: z.literal('yuv420p'),
    safe_zones_px: z.strictObject({
      top: z.number().int().positive(),
      right: z.number().int().positive(),
      bottom: z.number().int().positive(),
      left: z.number().int().positive(),
    }),
    provenance: z.literal('project profile; not a universal default'),
    universal_default: z.literal(false),
  }),
  central_metaphor: z.strictObject({
    value: z.literal('cadena causal visible'),
    rationale: z.string().min(1),
  }),
  emotional_visual_arc: z.tuple([
    z.literal('claridad inicial'),
    z.literal('confianza por evidencia'),
    z.literal('límite deliberado'),
  ]),
  design_system_ref: relativePathSchema,
  component_registry_ref: relativePathSchema,
  accessibility: z.strictObject({
    reduced_motion: z.literal(true),
    state_redundancy: z.literal('text + shape + pattern'),
    safe_zone_runtime_guard: z.literal(true),
    contrast_target: z.literal('WCAG AA or stronger for material text'),
  }),
  captions: z.strictObject({
    ref: relativePathSchema,
    mode: z.literal('open captions'),
    overlap_allowed: z.literal(false),
    maximum_effective_wpm: z.number().positive(),
  }),
  sources: z
    .array(
      z.strictObject({
        source_id: z.literal('SRC-SYNTH-VS001'),
        snapshot_id: z.literal('synthetic-vs-001-v1'),
        normalized_sha256: sha256Schema,
        allowed_use_scope: z.literal('local_contract_testing_only'),
      }),
    )
    .length(1),
  claims: z
    .array(
      z.strictObject({
        claim_id: claimIdSchema,
        source_id: z.literal('SRC-SYNTH-VS001'),
      }),
    )
    .length(3),
  rights: z.strictObject({
    procedural_code: z.literal('locally_authored_first_party_code'),
    fonts: z.literal('bundled OFL-1.1 with license files'),
    audio: z.literal('absent_no_rights_receipt'),
    external_distribution_authorized: z.literal(false),
  }),
  assets: z.strictObject({
    manifest_ref: relativePathSchema,
    remote_assets_allowed: z.literal(false),
    expected_binary_assets: z.literal(4),
    expected_audio_assets: z.literal(0),
  }),
  props: z.strictObject({
    ref: relativePathSchema,
    schema_ref: relativePathSchema,
    strict: z.literal(true),
  }),
  risks: z.array(z.string().min(1)).min(1),
  human_approval_required: z.literal(true),
  source_snapshot_id: z.literal('synthetic-vs-001-v1'),
  allowed_claim_ids: z.tuple([
    z.literal('CLM-VS001-001'),
    z.literal('CLM-VS001-002'),
    z.literal('CLM-VS001-003'),
  ]),
  requested_state: z.literal('RENDERED_DRAFT'),
  governed_workflow_state: z.literal('BLOCKED_BEFORE_SOURCE_LOCK'),
  coverage_gaps: z.array(z.string().min(1)).min(1),
});

export const beatMapDocumentSchema = z.strictObject({
  schema_version: z.literal(1),
  beat_map_id: z.literal('BEAT-MAP-VS001-001'),
  work_product_id: z.literal('REMOTION-VS001'),
  governed_workflow_state: z.literal('BLOCKED_BEFORE_SOURCE_LOCK'),
  creative_direction: z.strictObject({
    proposalId: z.literal('PROP-VS001-02-RT04'),
    title: z.literal('Cadena visible'),
    synthesisId: z.literal('SYNTHESIS-VS001-MOTION-01'),
    incorporatedElements: z.tuple([
      z.literal('three-question-breadcrumb'),
      z.literal('text-shape-pattern-reduced-motion-rights-first'),
      z.literal('zero-of-four-claims-hash-custody'),
      z.literal('persistent-signal-web-motion-fork'),
    ]),
  }),
  source_snapshot_id: z.literal('synthetic-vs-001-v1'),
  source_normalized_sha256: sha256Schema,
  timing: z.strictObject({
    fps: z.number().int().positive(),
    duration_in_frames: z.number().int().positive(),
    duration_seconds: z.number().positive(),
    range_contract: z.literal('[from_frame, to_frame)'),
    derivation: z.strictObject({
      words_per_minute: z.number().int().positive(),
      playback_margin: z.number().positive(),
      caption_lead_frames: z.number().int().positive(),
      caption_trail_frames: z.number().int().positive(),
      transition_frames: z.number().int().positive(),
      fixed_36_second_default: z.literal(false),
    }),
  }),
  audio: z.strictObject({
    mode: z.literal('silent-first'),
    streams: z.tuple([]),
    reason: z.literal('no-audio-rights-receipt'),
  }),
  beats: z
    .array(
      z.strictObject({
        beat_id: z.string().regex(/^B0[1-7]-[a-z0-9-]+$/u),
        purpose: z.string().min(1),
        duration_frames: z.number().int().positive(),
        narration: z.string().min(1),
        visible_copy: z.strictObject({
          eyebrow: z.string().min(1),
          headline: z.string().min(1),
          body: z.string().min(1),
        }),
        visual_action: z.string().min(1),
        components: z.array(componentSchema).min(3),
        claim_ids: z.array(claimIdSchema).max(3),
        data: z.array(z.string().min(1)).min(1),
        audio: z.literal('none'),
        mood: z.string().min(1),
        transition: z.strictObject({
          kind: z.literal('overlap-opacity-translate-y'),
          incoming_frames: z.number().int().nonnegative(),
          outgoing_frames: z.number().int().nonnegative(),
          reduced_motion: z.literal('opacity-only-with-persistent-layout'),
        }),
        accessibility: z.array(z.string().min(1)).min(3),
        acceptance: z.array(z.string().min(1)).min(4),
        config_refs: z.array(configRefSchema).max(3),
        from_frame: z.number().int().nonnegative(),
        to_frame: z.number().int().positive(),
        layout: z.enum(['opening', 'source', 'committee', 'custody', 'fork', 'gate', 'closing']),
        caption_id: z.string().regex(/^CAP-B0[1-7]-[a-z0-9-]+$/u),
      }),
    )
    .length(7),
  transitions: z
    .array(
      z.strictObject({
        transition_id: z.string().min(1),
        from_beat_id: z.string().min(1),
        to_beat_id: z.string().min(1),
        from_frame: z.number().int().nonnegative(),
        to_frame_exclusive: z.number().int().positive(),
        duration_frames: z.number().int().positive(),
        review_frames: z.strictObject({
          pre: z.number().int().nonnegative(),
          during: z.number().int().nonnegative(),
          post: z.number().int().nonnegative(),
        }),
        boundary_test_frames: z.array(z.number().int().nonnegative()).length(6),
      }),
    )
    .length(6),
});
