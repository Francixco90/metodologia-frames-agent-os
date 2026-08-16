import {
  CaseLongformPreservationLedgerAuthoritySchema,
  deriveCaseLongformFrameDiffLedger,
} from 'workflows/video-os/index.ts';

import {writeCaseFixture} from './video-os-case-longform-coverage.fixture.ts';
import {materializeCaseLongformPreservationPlanFixture} from './video-os-case-longform-preservation-plan.fixture.ts';

export const materializeCaseLongformPreservationLedgerFixture = () => {
  const base = materializeCaseLongformPreservationPlanFixture();
  const a = base.preservationContract.artifacts;
  const ledgerValue = deriveCaseLongformFrameDiffLedger({
    projectRoot: base.root,
    job_id: base.preservationContract.job_id,
    plan_ref: a.preservation_plan,
    policy_ref: a.preservation_policy_receipt,
    source_set_sha256: base.preservationContract.source_set_sha256,
    preview_ref: a.preview_media,
    redaction_ref: a.redaction_map,
    plan: base.values.preservationPlan,
    policy: base.values.preservationPolicy,
    source_set: base.values.sourceSet,
    tool_authority: base.preservationOptions.preservationToolAuthority,
  });
  const ledger = writeCaseFixture(base.root, 'frame-diff-ledger.json', ledgerValue);
  const contract = CaseLongformPreservationLedgerAuthoritySchema.parse({
    ...base.preservationContract,
    schema_version: 'case-longform-preservation-ledger-authority-v6',
    artifacts: {...a, frame_diff_ledger: ledger},
    v5a_status: base.preservationContract.status,
    status: 'BLOCKED_PENDING_CAPTION_AND_EXTERNAL_REVIEW_CONTRACTS',
  });
  return {base, contract, ledgerValue};
};
