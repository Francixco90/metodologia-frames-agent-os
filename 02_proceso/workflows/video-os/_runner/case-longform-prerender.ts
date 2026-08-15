import type {z} from 'zod';

import {CaseLongformGraphAuthoritySchema} from './case-longform-graph-evidence.ts';
import {assertCaseLongformGraphAuthority} from './case-longform-graph.ts';
import {readCaseLongformMaterial} from './case-longform-media.ts';
import {
  CaseLongformOperationGraph,
  CaseLongformSourceSet,
} from './case-longform-graph-structure.ts';
import {
  CaseLongformPrerenderGraphAuthoritySchema,
  CaseLongformSemanticPolicyReceipt,
  CaseLongformSourceSegmentMap,
  CaseLongformTransformOrder,
  type CaseLongformPrerenderGraphAuthority,
} from './case-longform-prerender-authority.ts';

type Options = Parameters<typeof assertCaseLongformGraphAuthority>[1];
type Ref = {ref: string; sha256: string; bytes: number};
const material = <T>(root: string, ref: Ref, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));
const baseProjection = (contract: CaseLongformPrerenderGraphAuthority) => {
  const artifacts = CaseLongformGraphAuthoritySchema.shape.artifacts
    .strip()
    .parse(contract.artifacts);
  return {
    schema_version: 'case-longform-graph-authority-v1' as const,
    job_id: contract.job_id,
    source_set_sha256: contract.source_set_sha256,
    artifacts,
    status: 'BLOCKED_PENDING_COVERAGE_CONTRACTS' as const,
  };
};
const validateSegments = (
  segments: z.infer<typeof CaseLongformSourceSegmentMap>,
  graph: z.infer<typeof CaseLongformOperationGraph>,
  sourceFrameCounts: Map<string, number>,
): void => {
  if (new Set(segments.segments.map(({id}) => id)).size !== segments.segments.length)
    throw new Error('VIDEO-OS-CASE-SEGMENT-DUPLICATE');
  const byRole = new Map<string, typeof segments.segments>();
  segments.segments.forEach((item) =>
    byRole.set(item.role, [...(byRole.get(item.role) ?? []), item]),
  );
  if (graph.nodes.some((node) => !byRole.has(node.role)))
    throw new Error('VIDEO-OS-CASE-SEGMENT-ROLE-MISSING');
  const output = [...segments.segments].sort((a, b) => a.output_start_frame - b.output_start_frame);
  if (
    output[0]?.output_start_frame !== 0 ||
    output.at(-1)?.output_end_frame !== graph.frame_count - 1 ||
    output.some(
      (item, index) =>
        index > 0 && item.output_start_frame !== output[index - 1]!.output_end_frame + 1,
    )
  )
    throw new Error('VIDEO-OS-CASE-SEGMENT-OUTPUT-CONTIGUITY');
  for (const node of graph.nodes) {
    const items = byRole
      .get(node.role)!
      .sort((a, b) => a.output_start_frame - b.output_start_frame);
    if (
      items[0]!.output_start_frame !== node.start_frame ||
      items.at(-1)!.output_end_frame !== node.end_frame ||
      items.some(
        (item, index) =>
          index > 0 &&
          (item.source_start_frame <= items[index - 1]!.source_end_frame ||
            item.output_start_frame !== items[index - 1]!.output_end_frame + 1),
      )
    )
      throw new Error('VIDEO-OS-CASE-SEGMENT-NODE-COVERAGE');
    for (const item of items) {
      const sourceDuration = item.source_end_frame - item.source_start_frame + 1;
      const outputDuration = item.output_end_frame - item.output_start_frame + 1;
      if (
        item.node_id !== node.id ||
        item.source_sha256 !== node.source_sha256 ||
        item.source_start_frame > item.source_end_frame ||
        item.output_start_frame > item.output_end_frame ||
        item.output_start_frame < node.start_frame ||
        item.output_end_frame > node.end_frame ||
        item.source_end_frame >= (sourceFrameCounts.get(item.role) ?? 0) ||
        sourceDuration !== outputDuration
      )
        throw new Error('VIDEO-OS-CASE-SOURCE-SEGMENT-DRIFT');
    }
  }
};

export const assertCaseLongformPrerenderGraphAuthority = (
  raw: unknown,
  options: Options,
): CaseLongformPrerenderGraphAuthority => {
  const contract = CaseLongformPrerenderGraphAuthoritySchema.parse(raw);
  const refs = Object.values(contract.artifacts);
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-PRERENDER-REF-ALIAS');
  assertCaseLongformGraphAuthority(baseProjection(contract), options);
  const a = contract.artifacts;
  const graph = material(options.projectRoot, a.operation_graph, CaseLongformOperationGraph);
  const sourceSet = material(options.projectRoot, a.source_set, CaseLongformSourceSet);
  const segments = material(
    options.projectRoot,
    a.source_segment_map,
    CaseLongformSourceSegmentMap,
  );
  const order = material(options.projectRoot, a.transform_order, CaseLongformTransformOrder);
  const policy = material(
    options.trustPolicy.authorityRoot,
    a.semantic_policy_receipt,
    CaseLongformSemanticPolicyReceipt,
  );
  const preflight = JSON.parse(
    readCaseLongformMaterial(options.projectRoot, a.preflight).bytes.toString('utf8'),
  ) as {actors: {authority: string}};
  if (
    segments.job_id !== contract.job_id ||
    segments.graph_sha256 !== a.operation_graph.sha256 ||
    segments.source_set_sha256 !== contract.source_set_sha256 ||
    order.job_id !== contract.job_id ||
    order.graph_sha256 !== a.operation_graph.sha256
  )
    throw new Error('VIDEO-OS-CASE-PRERENDER-AUTHORITY-DRIFT');
  if (
    policy.job_id !== contract.job_id ||
    policy.plan_sha256 !== a.plan.sha256 ||
    policy.source_set_sha256 !== contract.source_set_sha256 ||
    policy.actor_id !== preflight.actors.authority ||
    !options.trustPolicy.trustedAuthorityActorIds.includes(policy.actor_id)
  )
    throw new Error('VIDEO-OS-CASE-SEMANTIC-POLICY-DRIFT');
  const sourceFrameCounts = new Map(
    sourceSet.sources.map((item) => {
      const freeze = JSON.parse(
        readCaseLongformMaterial(options.projectRoot, item.freeze_receipt).bytes.toString('utf8'),
      ) as {measurements: {frame_count: number}};
      return [item.role, freeze.measurements.frame_count] as const;
    }),
  );
  validateSegments(segments, graph, sourceFrameCounts);
  return contract;
};
