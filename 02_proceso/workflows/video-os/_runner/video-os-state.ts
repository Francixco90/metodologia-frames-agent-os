import {createHash} from 'node:crypto';

import {
  VideoOsJobSchema,
  VideoOsStateSchema,
  type VideoOsJob,
  type VideoOsState,
} from '../_schema/index.ts';

const transitions: Readonly<Record<VideoOsState['status'], readonly VideoOsState['status'][]>> = {
  INTAKE: ['SOURCE_FROZEN', 'BLOCKED'],
  SOURCE_FROZEN: ['SPEC_CANDIDATE', 'BLOCKED'],
  SPEC_CANDIDATE: ['SPEC_APPROVED', 'BLOCKED'],
  SPEC_APPROVED: ['PLAN_COMPILED', 'SPEC_CANDIDATE', 'BLOCKED'],
  PLAN_COMPILED: ['RENDERED_DRAFT', 'SPEC_CANDIDATE', 'BLOCKED'],
  RENDERED_DRAFT: ['SPEC_CANDIDATE', 'BLOCKED'],
  VERIFIED: ['SPEC_CANDIDATE', 'BLOCKED'],
  HUMAN_APPROVED: ['SPEC_CANDIDATE', 'BLOCKED'],
  BLOCKED: ['INTAKE', 'SOURCE_FROZEN', 'SPEC_CANDIDATE'],
};

const required = (state: VideoOsState): void => {
  const source = !['INTAKE', 'BLOCKED'].includes(state.status);
  const spec = [
    'SPEC_APPROVED',
    'PLAN_COMPILED',
    'RENDERED_DRAFT',
    'VERIFIED',
    'HUMAN_APPROVED',
  ].includes(state.status);
  const manifest = ['PLAN_COMPILED', 'RENDERED_DRAFT', 'VERIFIED', 'HUMAN_APPROVED'].includes(
    state.status,
  );
  if (source && state.evidence_refs.length === 0)
    throw new Error('VIDEO-OS-SOURCE-EVIDENCE-REQUIRED');
  if (spec && !state.spec_sha256) throw new Error('VIDEO-OS-SPEC-HASH-REQUIRED');
  if (manifest && !state.manifest_sha256) throw new Error('VIDEO-OS-MANIFEST-HASH-REQUIRED');
  if (manifest && !state.visual_evidence) throw new Error('VIDEO-OS-VISUAL-EVIDENCE-REQUIRED');
};

const validateVerification = (state: VideoOsState): void => {
  if (state.secondary_exports_requested.length > 0 && state.primary_verification !== 'PASS') {
    throw new Error('VIDEO-OS-PRIMARY-PASS-REQUIRED');
  }
  if (state.primary_verification === 'NOT_RUN') {
    if (state.primary_verification_receipt)
      throw new Error('VIDEO-OS-PRIMARY-RECEIPT-STATE-MISMATCH');
    return;
  }
  const receipt = state.primary_verification_receipt;
  if (!receipt) throw new Error('VIDEO-OS-PRIMARY-VERIFICATION-RECEIPT-REQUIRED');
  const visualHash = createHash('sha256')
    .update(JSON.stringify(state.visual_evidence), 'utf8')
    .digest('hex');
  if (
    receipt.verdict !== state.primary_verification ||
    receipt.verifier_actor_id !== state.verifier_actor_id ||
    receipt.spec_sha256 !== state.spec_sha256 ||
    receipt.manifest_sha256 !== state.manifest_sha256 ||
    receipt.visual_evidence_sha256 !== visualHash
  ) {
    throw new Error('VIDEO-OS-PRIMARY-VERIFICATION-RECEIPT-MISMATCH');
  }
};

const validateApproval = (state: VideoOsState): void => {
  if (
    ['VERIFIED', 'HUMAN_APPROVED'].includes(state.status) &&
    state.primary_verification !== 'PASS'
  ) {
    throw new Error('VIDEO-OS-VERIFICATION-RECEIPT-REQUIRED');
  }
  if (state.status !== 'HUMAN_APPROVED') {
    if (state.human_approval_receipt)
      throw new Error('VIDEO-OS-HUMAN-APPROVAL-RECEIPT-STATE-MISMATCH');
    return;
  }
  const approval = state.human_approval_receipt;
  if (!approval) throw new Error('VIDEO-OS-HUMAN-APPROVAL-RECEIPT-REQUIRED');
  if (approval.spec_sha256 !== state.spec_sha256)
    throw new Error('VIDEO-OS-HUMAN-APPROVAL-SPEC-MISMATCH');
  if (
    state.primary_verification_receipt &&
    approval.render_sha256 !== state.primary_verification_receipt.render_sha256
  ) {
    throw new Error('VIDEO-OS-HUMAN-APPROVAL-RENDER-MISMATCH');
  }
};

export const assertVideoOsState = (raw: unknown): VideoOsState => {
  const state = VideoOsStateSchema.parse(raw);
  const stage: Partial<Record<VideoOsState['status'], VideoOsState['active_stage']>> = {
    INTAKE: 'V00',
    SOURCE_FROZEN: 'V01',
    SPEC_CANDIDATE: 'V02',
    SPEC_APPROVED: 'V02',
    PLAN_COMPILED: 'V03',
    RENDERED_DRAFT: 'V04',
    VERIFIED: 'V04',
    HUMAN_APPROVED: 'V04',
  };
  if (state.decisions_used > 5) throw new Error('VIDEO-OS-DECISION-BUDGET');
  required(state);
  if (stage[state.status] && state.active_stage !== stage[state.status])
    throw new Error('VIDEO-OS-STAGE-STATE-MISMATCH');
  const actors = [state.producer_actor_id, state.verifier_actor_id, state.guardian_actor_id];
  if (new Set(actors).size !== actors.length) throw new Error('VIDEO-OS-ACTORS-MUST-BE-DISTINCT');
  if (state.manifest_sha256 && state.manifest_spec_sha256 !== state.spec_sha256)
    throw new Error('VIDEO-OS-STALE-MANIFEST');
  validateVerification(state);
  validateApproval(state);
  return state;
};

export const advanceVideoOs = (stateInput: unknown, next: VideoOsState['status']): VideoOsState => {
  const state = assertVideoOsState(stateInput);
  if (next === 'VERIFIED' || next === 'HUMAN_APPROVED')
    throw new Error('VIDEO-OS-MANUAL-GATE-EXTERNAL');
  if (!transitions[state.status].includes(next))
    throw new Error(`VIDEO-OS-ILLEGAL-TRANSITION:${state.status}->${next}`);
  const progress: Partial<
    Record<VideoOsState['status'], Pick<VideoOsState, 'active_stage' | 'next_gate'>>
  > = {
    SOURCE_FROZEN: {active_stage: 'V01', next_gate: 'VO_DIRECTION_APPROVED'},
    SPEC_CANDIDATE: {active_stage: 'V02', next_gate: 'VO_DIRECTION_APPROVED'},
    SPEC_APPROVED: {active_stage: 'V02', next_gate: 'VO_DIRECTION_APPROVED'},
    PLAN_COMPILED: {active_stage: 'V03', next_gate: 'VO_PRINCIPAL_VERIFIED'},
    RENDERED_DRAFT: {active_stage: 'V04', next_gate: 'VO_PRINCIPAL_VERIFIED'},
  };
  return assertVideoOsState({
    ...state,
    ...(progress[next] ?? {}),
    status: next,
    decisions_used: state.decisions_used + (next === 'SPEC_APPROVED' ? 1 : 0),
  });
};

export const validateVideoOsJob = (input: unknown): VideoOsJob => {
  const job = VideoOsJobSchema.parse(input);
  assertVideoOsState(job.state);
  return job;
};

export const buildResumeCapsule = (stateInput: unknown): string => {
  const state = assertVideoOsState(stateInput);
  const body = [
    '# Video OS resume capsule',
    `job: ${state.job_id}`,
    `state: ${state.status}`,
    `stage: ${state.active_stage}`,
    `spec_sha256: ${state.spec_sha256 ?? 'coverage_gap'}`,
    `decisions: ${state.decisions_used}/5`,
    `next_gate: ${state.next_gate}`,
    `evidence: ${state.evidence_refs.slice(0, 12).join(', ') || 'coverage_gap'}`,
    `gaps: ${state.gaps.slice(0, 8).join(' | ') || 'none'}`,
  ].join('\n');
  const estimatedTokens = Math.ceil(body.length / 4);
  if (estimatedTokens > 1_800) throw new Error('VIDEO-OS-CONTEXT-BUDGET');
  return `${body}\nestimated_tokens: ${estimatedTokens}/1800`;
};
