import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CaseLongformPreservationLedgerAuthoritySchema} from './case-longform-preservation-ledger-authority.ts';

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u);
const binding = {
  job_id: z.string().min(1),
  plan_sha256: Hash,
  source_set_sha256: Hash,
  graph_sha256: Hash,
  temporal_map_sha256: Hash,
  caption_track_sha256: Hash,
  caption_cleanup_sha256: Hash,
};
export const CaseLongformCaptionLayoutAuthority = z.strictObject({
  schema_version: z.literal('case-longform-caption-layout-authority-v1'),
  kind: z.literal('caption_layout_authority'),
  actor_id: id,
  ...binding,
  fps: z.literal(24),
  width: z.literal(1920),
  height: z.literal(1080),
  fonts: z.array(Ref).min(1),
  font_set_sha256: Hash,
  rules: z
    .array(
      z.strictObject({
        layout_id: id,
        font_sha256: Hash,
        anchor: z.literal('BOTTOM_CENTER'),
        box_width: z.number().int().min(320).max(1728),
        bottom_margin: z.number().int().min(24).max(360),
        line_height: z.number().int().min(24).max(120),
        max_lines: z.number().int().min(1).max(4),
        max_chars_per_line: z.number().int().min(12).max(80),
      }),
    )
    .min(1),
});
const toolAuthority = (kind: 'compositor' | 'verifier') =>
  z.strictObject({
    schema_version: z.literal(`case-longform-caption-${kind}-authority-v1`),
    kind: z.literal(`caption_${kind}_authority`),
    actor_id: id,
    ...binding,
    layout_authority_sha256: Hash,
    executable: Ref,
    command: Ref,
    config: Ref,
  });
export const CaseLongformCaptionCompositorAuthority = toolAuthority('compositor');
export const CaseLongformCaptionVerifierAuthority = toolAuthority('verifier');
export const CaseLongformCaptionToolConfig = z.strictObject({
  schema_version: z.literal('case-longform-caption-tool-config-v1'),
  kind: z.enum(['caption_compositor_config', 'caption_verifier_config']),
  ...binding,
  layout_authority_sha256: Hash,
  fps: z.literal(24),
  width: z.literal(1920),
  height: z.literal(1080),
});
export const CaseLongformCaptionToolCommand = z.strictObject({
  schema_version: z.literal('case-longform-caption-tool-command-v1'),
  kind: z.enum(['caption_compositor_command', 'caption_verifier_command']),
  executable_sha256: Hash,
  config_sha256: Hash,
  argv: z.array(z.string().min(1)).length(7),
});
const placement = z.strictObject({
  cue_id: id,
  layout_id: id,
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().nonnegative(),
  text_sha256: Hash,
  font_sha256: Hash,
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export const CaseLongformCaptionPlacementPlan = z.strictObject({
  schema_version: z.literal('case-longform-caption-placement-plan-v1'),
  kind: z.literal('caption_placement_plan'),
  ...binding,
  layout_authority_sha256: Hash,
  font_set_sha256: Hash,
  placements: z.array(placement).min(1),
});
export const CaseLongformCaptionContractAuthoritySchema =
  CaseLongformPreservationLedgerAuthoritySchema.extend({
    schema_version: z.literal('case-longform-caption-contract-authority-v7a'),
    artifacts: CaseLongformPreservationLedgerAuthoritySchema.shape.artifacts.extend({
      caption_layout_authority: Ref,
      caption_compositor_authority: Ref,
      caption_verifier_authority: Ref,
      caption_placement_plan: Ref,
    }),
    caption_actors: z.strictObject({
      layout_authority: id,
      compositor_authority: id,
      caption_verifier: id,
    }),
    v6_status: CaseLongformPreservationLedgerAuthoritySchema.shape.status,
    status: z.enum(['PRE_RENDER_BLOCKED', 'BLOCKED_PENDING_CAPTION_MATERIAL_LEDGER_CONTRACTS']),
  });
export type CaseLongformCaptionContractAuthority = z.infer<
  typeof CaseLongformCaptionContractAuthoritySchema
>;
export type CaseLongformCaptionLayoutAuthorityValue = z.infer<
  typeof CaseLongformCaptionLayoutAuthority
>;
