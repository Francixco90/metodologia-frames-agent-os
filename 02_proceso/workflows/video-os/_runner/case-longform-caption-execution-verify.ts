import type {z} from 'zod';

import {
  CaseLongformCaptionCompositorAuthority,
  CaseLongformCaptionContractAuthoritySchema,
  CaseLongformCaptionPlacementPlan,
} from './case-longform-caption-contract-authority.ts';
import {assertCaseLongformCaptionContractAuthority} from './case-longform-caption-contract.ts';
import {
  CaseLongformCaptionExecutionAuthoritySchema,
  CaseLongformCaptionExecutionLedger,
  type CaseLongformCaptionExecutionAuthority,
  type CaseLongformCaptionExecutionLedgerValue,
} from './case-longform-caption-execution-authority.ts';
import {deriveCaseLongformCaptionExecutionLedger} from './case-longform-caption-execution.ts';
import {readCaseLongformMaterial} from './case-longform-media.ts';

type Ref = {ref: string; sha256: string; bytes: number};
type Options = Parameters<typeof assertCaseLongformCaptionContractAuthority>[1];
type Placement = z.infer<typeof CaseLongformCaptionPlacementPlan>;
type Compositor = z.infer<typeof CaseLongformCaptionCompositorAuthority>;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const material = <T>(root: string, ref: Ref, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));
const v7aProjection = (contract: CaseLongformCaptionExecutionAuthority) => ({
  schema_version: 'case-longform-caption-contract-authority-v7a' as const,
  job_id: contract.job_id,
  source_set_sha256: contract.source_set_sha256,
  artifacts: CaseLongformCaptionContractAuthoritySchema.shape.artifacts
    .strip()
    .parse(contract.artifacts),
  caption_actors: contract.caption_actors,
  v4_status: contract.v4_status,
  v5a_status: contract.v5a_status,
  v6_status: contract.v6_status,
  status: contract.v7a_status,
});

export const assertCaseLongformCaptionExecutionLedgerProjection = (input: {
  contract: CaseLongformCaptionExecutionAuthority;
  placement: Placement;
  compositor: Compositor;
  ledger: CaseLongformCaptionExecutionLedgerValue;
}): CaseLongformCaptionExecutionAuthority => {
  const refs = Object.values(input.contract.artifacts);
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-CAPTION-EXECUTION-REF-ALIAS');
  const expected = deriveCaseLongformCaptionExecutionLedger(input);
  if (!same(input.ledger, expected))
    throw new Error('VIDEO-OS-CASE-CAPTION-EXECUTION-LEDGER-DRIFT');
  const expectedStatus =
    input.contract.v4_status === 'PRE_RENDER_BLOCKED'
      ? 'PRE_RENDER_BLOCKED'
      : 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
  if (input.contract.status !== expectedStatus)
    throw new Error('VIDEO-OS-CASE-CAPTION-EXECUTION-STATUS-DRIFT');
  return input.contract;
};

export const assertCaseLongformCaptionExecutionAuthority = (
  raw: unknown,
  options: Options,
): CaseLongformCaptionExecutionAuthority => {
  const contract = CaseLongformCaptionExecutionAuthoritySchema.parse(raw);
  assertCaseLongformCaptionContractAuthority(v7aProjection(contract), options);
  const a = contract.artifacts;
  return assertCaseLongformCaptionExecutionLedgerProjection({
    contract,
    placement: material(
      options.projectRoot,
      a.caption_placement_plan,
      CaseLongformCaptionPlacementPlan,
    ),
    compositor: material(
      options.captionTrustPolicy.compositorAuthorityRoot,
      a.caption_compositor_authority,
      CaseLongformCaptionCompositorAuthority,
    ),
    ledger: material(
      options.projectRoot,
      a.caption_execution_ledger,
      CaseLongformCaptionExecutionLedger,
    ),
  });
};
