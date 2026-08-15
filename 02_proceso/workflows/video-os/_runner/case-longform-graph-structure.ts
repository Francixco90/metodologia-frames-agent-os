import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';

export const CASE_LONGFORM_ROLES = ['intro', 'host', 'body', 'closure', 'outro'] as const;
const [intro, host, body, closure, outro] = CASE_LONGFORM_ROLES;
const source = (value: (typeof CASE_LONGFORM_ROLES)[number]) =>
  z.strictObject({
    role: z.literal(value),
    source_id: z.string().min(1),
    media: Ref,
    provenance_receipt: Ref,
    authority_receipt: Ref,
    freeze_receipt: Ref,
  });
const frameSpan = {
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().nonnegative(),
};

export const CaseLongformSourceSet = z.strictObject({
  schema_version: z.literal('case-longform-source-set-v1'),
  kind: z.literal('source_set'),
  job_id: z.string(),
  sources: z.tuple([source(intro), source(host), source(body), source(closure), source(outro)]),
});
export const CaseLongformRunner = z.strictObject({
  schema_version: z.literal('case-longform-runner-v1'),
  kind: z.literal('runner'),
  job_id: z.string(),
  source_set_sha256: Hash,
  plan_sha256: Hash,
  runner_id: z.string().min(1),
  runner_version: z.string().min(1),
  command_sha256: Hash,
  executable: Ref,
});
export const CaseLongformCompiler = z.strictObject({
  schema_version: z.literal('case-longform-compiler-v1'),
  kind: z.literal('compiler'),
  job_id: z.string(),
  source_set_sha256: Hash,
  plan_sha256: Hash,
  runner_sha256: Hash,
  compiler_id: z.string().min(1),
  compiler_version: z.string().min(1),
  command_sha256: Hash,
  executable: Ref,
});
const node = (
  value: (typeof CASE_LONGFORM_ROLES)[number],
  inputs: readonly string[],
  sink: boolean,
) =>
  z.strictObject({
    id: z.literal(`op:${value}`),
    role: z.literal(value),
    source_sha256: Hash,
    inputs: z.array(z.string()).length(inputs.length),
    sink: z.literal(sink),
    ...frameSpan,
  });
const edge = (
  from: (typeof CASE_LONGFORM_ROLES)[number],
  to: (typeof CASE_LONGFORM_ROLES)[number],
) => z.strictObject({from: z.literal(from), to: z.literal(to)});
export const CaseLongformOperationGraph = z.strictObject({
  schema_version: z.literal('case-longform-operation-graph-v1'),
  kind: z.literal('operation_graph'),
  job_id: z.string(),
  source_set_sha256: Hash,
  plan_sha256: Hash,
  runner_sha256: Hash,
  compiler_sha256: Hash,
  fps: z.literal(24),
  frame_count: z.number().int().positive(),
  order: z.tuple([
    z.literal(intro),
    z.literal(host),
    z.literal(body),
    z.literal(closure),
    z.literal(outro),
  ]),
  nodes: z.tuple([
    node(intro, [], false),
    node(host, ['op:intro'], false),
    node(body, ['op:host'], false),
    node(closure, ['op:body'], false),
    node(outro, ['op:closure'], true),
  ]),
  edges: z.tuple([edge(intro, host), edge(host, body), edge(body, closure), edge(closure, outro)]),
});

const event = z.strictObject({id: z.string().min(1), ...frameSpan});
export const CaseLongformTemporalMap = z.strictObject({
  schema_version: z.literal('case-longform-temporal-map-v1'),
  kind: z.literal('temporal_map'),
  job_id: z.string(),
  graph_sha256: Hash,
  fps: z.literal(24),
  frame_count: z.number().int().positive(),
  layouts: z.array(event).min(1),
  scrolls: z.array(event).min(1),
  fades: z.array(event).min(2),
  boundaries: z
    .array(z.strictObject({id: z.string().min(1), frame: z.number().int().nonnegative()}))
    .length(4),
});
const roi = z.strictObject({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export const CaseLongformRedactionMap = z.strictObject({
  schema_version: z.literal('case-longform-redaction-map-v1'),
  kind: z.literal('redaction_map'),
  job_id: z.string(),
  graph_sha256: Hash,
  fps: z.literal(24),
  frame_count: z.number().int().positive(),
  masks: z
    .array(z.strictObject({id: z.string().min(1), roi, ...frameSpan, reason: z.string().min(1)}))
    .min(1),
  sensitive_spans: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        ...frameSpan,
        dictionary_ids: z.array(z.string().min(1)).min(1),
        mask_ids: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
});
export const CaseLongformCaptionTrack = z.strictObject({
  schema_version: z.literal('case-longform-caption-track-v1'),
  kind: z.literal('caption_track'),
  job_id: z.string(),
  graph_sha256: Hash,
  track_id: z.string().min(1),
  layer_count: z.literal(1),
  cleanup: Ref,
  cues: z
    .array(z.strictObject({id: z.string().min(1), ...frameSpan, text: z.string().min(1)}))
    .min(1),
});
export const CaseLongformCaptionCleanup = z.strictObject({
  schema_version: z.literal('case-longform-caption-cleanup-v1'),
  kind: z.literal('caption_cleanup'),
  job_id: z.string(),
  graph_sha256: Hash,
  track_id: z.string().min(1),
  removed_legacy_layers: z.literal(true),
  replacements: z.array(z.strictObject({from: z.string().min(1), to: z.string()})).min(1),
});

export const CaseLongformGraphStructureRefs = z.strictObject({
  source_set: Ref,
  plan: Ref,
  runner: Ref,
  compiler: Ref,
  operation_graph: Ref,
  temporal_map: Ref,
  redaction_map: Ref,
  caption_track: Ref,
  caption_cleanup: Ref,
});
export type CaseLongformOperationGraphValue = z.infer<typeof CaseLongformOperationGraph>;
