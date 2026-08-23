import type {CaseLongformCaptionExecutionLedgerValue} from './case-longform-caption-execution-authority.ts';
import {
  CASE_LONGFORM_CAPTION_REVIEW_CHECKS,
  CaseLongformCaptionExternalReviewPlan,
  type CaseLongformCaptionExternalReviewPlanValue,
  type CaseLongformCaptionReviewPlanContract,
} from './case-longform-caption-review-plan-authority.ts';

export const deriveCaseLongformCaptionExternalReviewPlan = (input: {
  contract: CaseLongformCaptionReviewPlanContract;
  ledger: CaseLongformCaptionExecutionLedgerValue;
}): CaseLongformCaptionExternalReviewPlanValue => {
  const {contract, ledger} = input;
  const a = contract.artifacts;
  const tasks = ledger.entries.flatMap((entry) =>
    CASE_LONGFORM_CAPTION_REVIEW_CHECKS.map((check, checkIndex) => ({
      task_id: `${entry.sequence}.${check.toLowerCase()}`,
      sequence: entry.sequence * CASE_LONGFORM_CAPTION_REVIEW_CHECKS.length + checkIndex,
      ledger_sequence: entry.sequence,
      check,
      caption_entry_sha256: entry.entry_sha256,
      cue_id: entry.cue_id,
      layout_id: entry.layout_id,
      start_frame: entry.start_frame,
      end_frame: entry.end_frame,
      text_sha256: entry.text_sha256,
      font_sha256: entry.font_sha256,
      geometry: entry.geometry,
    })),
  );
  return CaseLongformCaptionExternalReviewPlan.parse({
    schema_version: 'case-longform-caption-external-review-plan-v1',
    kind: 'caption_external_review_plan',
    plan_scope: 'PLANNING_ONLY_NO_OUTCOME',
    actor_id: contract.review_actors.planner,
    job_id: contract.job_id,
    source_set_sha256: contract.source_set_sha256,
    graph_sha256: a.operation_graph.sha256,
    temporal_map_sha256: a.temporal_map.sha256,
    caption_track_sha256: a.caption_track.sha256,
    caption_cleanup_sha256: a.caption_cleanup.sha256,
    placement_plan_sha256: a.caption_placement_plan.sha256,
    execution_ledger_sha256: a.caption_execution_ledger.sha256,
    layout_authority_sha256: a.caption_layout_authority.sha256,
    compositor_authority_sha256: a.caption_compositor_authority.sha256,
    caption_verifier_authority_sha256: a.caption_verifier_authority.sha256,
    reviewers: [
      {role: 'CAPTION_VERIFIER', actor_id: contract.review_actors.caption_verifier},
      {role: 'GUARDIAN', actor_id: contract.review_actors.guardian},
    ],
    checks: CASE_LONGFORM_CAPTION_REVIEW_CHECKS,
    tasks,
  });
};
