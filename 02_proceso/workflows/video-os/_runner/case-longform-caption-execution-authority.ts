import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CaseLongformCaptionContractAuthoritySchema} from './case-longform-caption-contract-authority.ts';

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u);
const geometry = z.strictObject({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export const CaseLongformCaptionExecutionEntry = z.strictObject({
  sequence: z.number().int().nonnegative(),
  cue_id: id,
  layout_id: id,
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().nonnegative(),
  text_sha256: Hash,
  font_sha256: Hash,
  geometry,
  graph_sha256: Hash,
  temporal_map_sha256: Hash,
  caption_track_sha256: Hash,
  caption_cleanup_sha256: Hash,
  layout_authority_sha256: Hash,
  compositor_authority_sha256: Hash,
  compositor_executable_sha256: Hash,
  compositor_command_sha256: Hash,
  compositor_config_sha256: Hash,
  previous_entry_sha256: Hash.nullable(),
  entry_sha256: Hash,
});
export const CaseLongformCaptionExecutionLedger = z.strictObject({
  schema_version: z.literal('case-longform-caption-execution-ledger-v1'),
  kind: z.literal('caption_execution_ledger'),
  execution_scope: z.literal('CAPTION_DATA_GRAPH_ONLY'),
  job_id: z.string().min(1),
  source_set_sha256: Hash,
  placement_plan_sha256: Hash,
  graph_sha256: Hash,
  temporal_map_sha256: Hash,
  caption_track_sha256: Hash,
  caption_cleanup_sha256: Hash,
  layout_authority_sha256: Hash,
  compositor_authority_sha256: Hash,
  compositor_executable_sha256: Hash,
  compositor_command_sha256: Hash,
  compositor_config_sha256: Hash,
  entries: z.array(CaseLongformCaptionExecutionEntry).min(1),
  chain_sha256: Hash,
});
export const CaseLongformCaptionExecutionAuthoritySchema =
  CaseLongformCaptionContractAuthoritySchema.extend({
    schema_version: z.literal('case-longform-caption-execution-authority-v7b'),
    artifacts: CaseLongformCaptionContractAuthoritySchema.shape.artifacts.extend({
      caption_execution_ledger: Ref,
    }),
    v7a_status: CaseLongformCaptionContractAuthoritySchema.shape.status,
    status: z.enum(['PRE_RENDER_BLOCKED', 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS']),
  });
export type CaseLongformCaptionExecutionAuthority = z.infer<
  typeof CaseLongformCaptionExecutionAuthoritySchema
>;
export type CaseLongformCaptionExecutionLedgerValue = z.infer<
  typeof CaseLongformCaptionExecutionLedger
>;
