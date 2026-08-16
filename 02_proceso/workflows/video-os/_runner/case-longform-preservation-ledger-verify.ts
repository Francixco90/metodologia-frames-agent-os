import type {z} from 'zod';

import {
  readCaseLongformMaterial,
  type CaseLongformMediaSnapshotHooks,
} from './case-longform-media.ts';
import {CaseLongformSourceSet} from './case-longform-graph-structure.ts';
import {deriveCaseLongformFrameDiffLedger} from './case-longform-preservation-ledger.ts';
import {
  CaseLongformFrameDiffLedger,
  CaseLongformPreservationLedgerAuthoritySchema,
  type CaseLongformPreservationLedgerAuthority,
} from './case-longform-preservation-ledger-authority.ts';
import {
  CaseLongformPreservationPlan,
  CaseLongformPreservationPlanAuthoritySchema,
  CaseLongformPreservationPolicyReceipt,
} from './case-longform-preservation-plan-authority.ts';
import {assertCaseLongformPreservationPlanAuthority} from './case-longform-preservation-plan.ts';
import {assertCaseLongformRgbRegionPreserved} from './case-longform-preservation-rgb-compare.ts';

type Ref = {ref: string; sha256: string; bytes: number};
type V5Options = Parameters<typeof assertCaseLongformPreservationPlanAuthority>[1];
type Options = V5Options & {rgbMaterialHooks?: CaseLongformMediaSnapshotHooks};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const material = <T>(root: string, ref: Ref, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));
const v5Projection = (contract: CaseLongformPreservationLedgerAuthority) => ({
  schema_version: 'case-longform-preservation-plan-authority-v5a' as const,
  job_id: contract.job_id,
  source_set_sha256: contract.source_set_sha256,
  artifacts: CaseLongformPreservationPlanAuthoritySchema.shape.artifacts
    .strip()
    .parse(contract.artifacts),
  v4_status: contract.v4_status,
  status: contract.v5a_status,
});

export const assertCaseLongformPreservationLedgerAuthority = (
  raw: unknown,
  options: Options,
): CaseLongformPreservationLedgerAuthority => {
  const contract = CaseLongformPreservationLedgerAuthoritySchema.parse(raw);
  const refs = Object.values(contract.artifacts);
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-RGB-REF-ALIAS');
  assertCaseLongformPreservationPlanAuthority(v5Projection(contract), options);
  const a = contract.artifacts;
  const plan = material(options.projectRoot, a.preservation_plan, CaseLongformPreservationPlan);
  const policy = material(
    options.trustPolicy.authorityRoot,
    a.preservation_policy_receipt,
    CaseLongformPreservationPolicyReceipt,
  );
  const ledger = material(options.projectRoot, a.frame_diff_ledger, CaseLongformFrameDiffLedger);
  const expected = deriveCaseLongformFrameDiffLedger({
    projectRoot: options.projectRoot,
    job_id: contract.job_id,
    plan_ref: a.preservation_plan,
    policy_ref: a.preservation_policy_receipt,
    source_set_sha256: contract.source_set_sha256,
    preview_ref: a.preview_media,
    redaction_ref: a.redaction_map,
    plan,
    policy,
    source_set: material(options.projectRoot, a.source_set, CaseLongformSourceSet),
    tool_authority: options.preservationToolAuthority,
    tool_hooks: options.preservationToolHooks,
    ...(options.rgbMaterialHooks ? {material_hooks: options.rgbMaterialHooks} : {}),
  });
  if (!same(ledger, expected)) throw new Error('VIDEO-OS-CASE-RGB-LEDGER-DRIFT');
  ledger.regions.forEach(assertCaseLongformRgbRegionPreserved);
  return contract;
};
