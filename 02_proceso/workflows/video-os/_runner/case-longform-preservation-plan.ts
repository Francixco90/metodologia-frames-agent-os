import type {z} from 'zod';

import {readCaseLongformMaterial} from './case-longform-media.ts';
import {
  CaseLongformCaptionTrack,
  CaseLongformRedactionMap,
  CaseLongformSourceSet,
} from './case-longform-graph-structure.ts';
import {CaseLongformSourceSegmentMap} from './case-longform-prerender-authority.ts';
import {
  CaseLongformPreservationPlan,
  CaseLongformPreservationPlanAuthoritySchema,
  CaseLongformPreservationPolicyReceipt,
  type CaseLongformPreservationPlanAuthority,
} from './case-longform-preservation-plan-authority.ts';
import {assertCaseLongformPreservationPlanGeometry} from './case-longform-preservation-plan-geometry.ts';
import {
  withCaseLongformPreservationTools,
  type CaseLongformPreservationToolAuthority,
} from './case-longform-preservation-tool.ts';
import {assertCaseLongformSemanticAuthority} from './case-longform-semantic.ts';
import {
  CaseLongformSemanticAuthoritySchema,
  CaseLongformSemanticClaimMap,
  CaseLongformSemanticPolicyReceiptV3,
} from './case-longform-semantic-authority.ts';

type BaseOptions = Parameters<typeof assertCaseLongformSemanticAuthority>[1];
type Ref = {ref: string; sha256: string; bytes: number};
type Options = BaseOptions & {
  preservationToolAuthority: CaseLongformPreservationToolAuthority;
  preservationToolHooks?: Parameters<typeof withCaseLongformPreservationTools>[2];
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const material = <T>(root: string, ref: Ref, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));
const v4Projection = (contract: CaseLongformPreservationPlanAuthority) => ({
  schema_version: 'case-longform-semantic-authority-v4' as const,
  job_id: contract.job_id,
  source_set_sha256: contract.source_set_sha256,
  artifacts: CaseLongformSemanticAuthoritySchema.shape.artifacts.strip().parse(contract.artifacts),
  status: contract.v4_status,
});

export const assertCaseLongformPreservationPlanAuthority = (
  raw: unknown,
  options: Options,
): CaseLongformPreservationPlanAuthority => {
  const contract = CaseLongformPreservationPlanAuthoritySchema.parse(raw);
  const refs = Object.values(contract.artifacts);
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-PRESERVATION-PLAN-REF-ALIAS');
  assertCaseLongformSemanticAuthority(v4Projection(contract), options);
  withCaseLongformPreservationTools(
    options.preservationToolAuthority,
    () => undefined,
    options.preservationToolHooks,
  );
  const a = contract.artifacts;
  const policyV3 = material(
    options.trustPolicy.authorityRoot,
    a.semantic_policy_receipt_v3,
    CaseLongformSemanticPolicyReceiptV3,
  );
  const policy = material(
    options.trustPolicy.authorityRoot,
    a.preservation_policy_receipt,
    CaseLongformPreservationPolicyReceipt,
  );
  const plan = material(options.projectRoot, a.preservation_plan, CaseLongformPreservationPlan);
  const claims = material(options.projectRoot, a.semantic_claim_map, CaseLongformSemanticClaimMap);
  const sourceSet = material(options.projectRoot, a.source_set, CaseLongformSourceSet);
  const segments = material(
    options.projectRoot,
    a.source_segment_map,
    CaseLongformSourceSegmentMap,
  );
  const redaction = material(options.projectRoot, a.redaction_map, CaseLongformRedactionMap);
  const captions = material(options.projectRoot, a.caption_track, CaseLongformCaptionTrack);
  const identities = policy.participants.map(({participant_id, public_name}) => ({
    participant_id,
    public_name,
  }));
  const expectedIdentities = policyV3.participants.map(({participant_id, public_name}) => ({
    participant_id,
    public_name,
  }));
  if (
    policy.job_id !== contract.job_id ||
    policy.plan_sha256 !== a.plan.sha256 ||
    policy.source_set_sha256 !== contract.source_set_sha256 ||
    policy.previous_policy_sha256 !== a.semantic_policy_receipt_v3.sha256 ||
    policy.actor_id !== policyV3.actor_id ||
    !options.trustPolicy.trustedAuthorityActorIds.includes(policy.actor_id) ||
    new Set(policy.participants.map(({participant_id}) => participant_id)).size !== 3 ||
    !same(identities, expectedIdentities)
  )
    throw new Error('VIDEO-OS-CASE-PRESERVATION-POLICY-DRIFT');
  if (
    plan.job_id !== contract.job_id ||
    plan.participant_id !== claims.participant_id ||
    plan.graph_sha256 !== a.operation_graph.sha256 ||
    plan.source_set_sha256 !== contract.source_set_sha256 ||
    plan.policy_sha256 !== a.preservation_policy_receipt.sha256 ||
    plan.source_segment_map_sha256 !== a.source_segment_map.sha256 ||
    plan.redaction_map_sha256 !== a.redaction_map.sha256 ||
    plan.caption_track_sha256 !== a.caption_track.sha256
  )
    throw new Error('VIDEO-OS-CASE-PRESERVATION-PLAN-BINDING-DRIFT');
  assertCaseLongformPreservationPlanGeometry(policy, plan, {
    sourceSet,
    segments,
    redaction,
    captions,
  });
  return contract;
};
