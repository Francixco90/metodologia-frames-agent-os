import {realpathSync} from 'node:fs';
import {isAbsolute, relative} from 'node:path';
import type {z} from 'zod';

import {
  CaseLongformCaptionTrack,
  CaseLongformOperationGraph,
  CaseLongformTemporalMap,
} from './case-longform-graph-structure.ts';
import {readCaseLongformMaterial} from './case-longform-media.ts';
import {CaseLongformPreflightSchema} from './case-longform-preflight-schema.ts';
import {
  CaseLongformCaptionContractAuthoritySchema,
  CaseLongformCaptionLayoutAuthority,
  CaseLongformCaptionPlacementPlan,
  type CaseLongformCaptionContractAuthority,
} from './case-longform-caption-contract-authority.ts';
import {
  assertCaseLongformCaptionToolAuthority,
  type CaseLongformCaptionTrustPolicy,
} from './case-longform-caption-tool-authority.ts';
import {
  caseLongformCaptionFontSetSha256,
  deriveCaseLongformCaptionPlacements,
} from './case-longform-caption-placement.ts';
import {CaseLongformPreservationLedgerAuthoritySchema} from './case-longform-preservation-ledger-authority.ts';
import {assertCaseLongformPreservationLedgerAuthority} from './case-longform-preservation-ledger-verify.ts';

type Ref = {ref: string; sha256: string; bytes: number};
type V6Options = Parameters<typeof assertCaseLongformPreservationLedgerAuthority>[1];
type Options = V6Options & {
  captionTrustPolicy: CaseLongformCaptionTrustPolicy;
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const material = <T>(root: string, ref: Ref, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));
const overlaps = (a: string, b: string): boolean => {
  const path = relative(a, b);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
};
const binding = (
  contract: CaseLongformCaptionContractAuthority,
  value: {
    job_id: string;
    plan_sha256: string;
    source_set_sha256: string;
    graph_sha256: string;
    temporal_map_sha256: string;
    caption_track_sha256: string;
    caption_cleanup_sha256: string;
  },
): boolean => {
  const a = contract.artifacts;
  return (
    value.job_id === contract.job_id &&
    value.plan_sha256 === a.plan.sha256 &&
    value.source_set_sha256 === contract.source_set_sha256 &&
    value.graph_sha256 === a.operation_graph.sha256 &&
    value.temporal_map_sha256 === a.temporal_map.sha256 &&
    value.caption_track_sha256 === a.caption_track.sha256 &&
    value.caption_cleanup_sha256 === a.caption_cleanup.sha256
  );
};
const v6Projection = (contract: CaseLongformCaptionContractAuthority) => ({
  schema_version: 'case-longform-preservation-ledger-authority-v6' as const,
  job_id: contract.job_id,
  source_set_sha256: contract.source_set_sha256,
  artifacts: CaseLongformPreservationLedgerAuthoritySchema.shape.artifacts
    .strip()
    .parse(contract.artifacts),
  v4_status: contract.v4_status,
  v5a_status: contract.v5a_status,
  status: contract.v6_status,
});
export const assertCaseLongformCaptionContractAuthority = (
  raw: unknown,
  options: Options,
): CaseLongformCaptionContractAuthority => {
  const contract = CaseLongformCaptionContractAuthoritySchema.parse(raw);
  assertCaseLongformPreservationLedgerAuthority(v6Projection(contract), options);
  const roots = [
    options.projectRoot,
    options.trustPolicy.authorityRoot,
    options.trustPolicy.previewVerifierRoot,
    options.captionTrustPolicy.layoutAuthorityRoot,
    options.captionTrustPolicy.compositorAuthorityRoot,
    options.captionTrustPolicy.captionVerifierRoot,
  ].map((root) => realpathSync(root));
  if (roots.some((root, index) => roots.some((other, at) => index !== at && overlaps(root, other))))
    throw new Error('VIDEO-OS-CASE-CAPTION-TRUST-ROOT-OVERLAP');
  const a = contract.artifacts;
  const preflight = material(options.projectRoot, a.preflight, CaseLongformPreflightSchema);
  const captionActors = Object.values(contract.caption_actors);
  if (new Set([...Object.values(preflight.actors), ...captionActors]).size !== 6)
    throw new Error('VIDEO-OS-CASE-CAPTION-ACTORS-NOT-INDEPENDENT');
  const layout = material(
    options.captionTrustPolicy.layoutAuthorityRoot,
    a.caption_layout_authority,
    CaseLongformCaptionLayoutAuthority,
  );
  if (
    !binding(contract, layout) ||
    layout.actor_id !== contract.caption_actors.layout_authority ||
    !options.captionTrustPolicy.trustedLayoutActorIds.includes(layout.actor_id)
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-LAYOUT-AUTHORITY-DRIFT');
  if (new Set(layout.fonts.map(({ref}) => ref)).size !== layout.fonts.length)
    throw new Error('VIDEO-OS-CASE-CAPTION-FONT-ALIAS');
  layout.fonts.forEach(
    (font) => void readCaseLongformMaterial(options.captionTrustPolicy.layoutAuthorityRoot, font),
  );
  if (layout.font_set_sha256 !== caseLongformCaptionFontSetSha256(layout.fonts))
    throw new Error('VIDEO-OS-CASE-CAPTION-FONT-SET-DRIFT');
  const graph = material(options.projectRoot, a.operation_graph, CaseLongformOperationGraph);
  const temporal = material(options.projectRoot, a.temporal_map, CaseLongformTemporalMap);
  const layoutIds = temporal.layouts.map(({id}) => id).sort();
  const ruleIds = layout.rules.map(({layout_id}) => layout_id).sort();
  if (
    !same(layoutIds, ruleIds) ||
    new Set(ruleIds).size !== ruleIds.length ||
    layout.rules.some(({font_sha256}) => !layout.fonts.some(({sha256}) => sha256 === font_sha256))
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-LAYOUT-RULE-DRIFT');
  assertCaseLongformCaptionToolAuthority({
    kind: 'compositor',
    root: options.captionTrustPolicy.compositorAuthorityRoot,
    ref: a.caption_compositor_authority,
    expectedActor: contract.caption_actors.compositor_authority,
    trustedActors: options.captionTrustPolicy.trustedCompositorActorIds,
    trustedExecutable: options.captionTrustPolicy.trustedCompositorExecutableSha256,
    contract,
  });
  assertCaseLongformCaptionToolAuthority({
    kind: 'verifier',
    root: options.captionTrustPolicy.captionVerifierRoot,
    ref: a.caption_verifier_authority,
    expectedActor: contract.caption_actors.caption_verifier,
    trustedActors: options.captionTrustPolicy.trustedCaptionVerifierActorIds,
    trustedExecutable: options.captionTrustPolicy.trustedCaptionVerifierExecutableSha256,
    contract,
  });
  const expected = deriveCaseLongformCaptionPlacements({
    contract,
    graph,
    temporal,
    track: material(options.projectRoot, a.caption_track, CaseLongformCaptionTrack),
    layout,
  });
  const planned = material(
    options.projectRoot,
    a.caption_placement_plan,
    CaseLongformCaptionPlacementPlan,
  );
  if (!same(planned, expected)) throw new Error('VIDEO-OS-CASE-CAPTION-PLACEMENT-DRIFT');
  const status =
    contract.v4_status === 'PRE_RENDER_BLOCKED'
      ? 'PRE_RENDER_BLOCKED'
      : 'BLOCKED_PENDING_CAPTION_MATERIAL_LEDGER_CONTRACTS';
  if (contract.status !== status) throw new Error('VIDEO-OS-CASE-CAPTION-STATUS-DRIFT');
  return contract;
};
