import {createHash} from 'node:crypto';

import {
  EfficiencyReceiptV1Schema,
  OperatorJobV1Schema,
  SessionCapsuleV1Schema,
  type OperatorJobV1,
  type SessionCapsuleV1,
} from '../_schema/operator-v1.schema.ts';
import {FRAMES_SAFE_LAPTOP_PROFILE} from '../profiles-v1.ts';

const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');

const assertActors = (job: OperatorJobV1): void => {
  const actors = [job.producer_actor_id, job.verifier_actor_id, job.guardian_actor_id];
  if (new Set(actors).size !== actors.length) throw new Error('OPERATOR-ACTORS-MUST-BE-DISTINCT');
};

const assertWorkUnits = (job: OperatorJobV1): void => {
  const active = job.work_units.filter(({status}) => status === 'ACTIVE');
  if (active.length > FRAMES_SAFE_LAPTOP_PROFILE.max_active_semantic_work_units)
    throw new Error('OPERATOR-ONE-ACTIVE-WORK-UNIT');
  const ids = new Set(job.work_units.map(({work_unit_id}) => work_unit_id));
  if (ids.size !== job.work_units.length) throw new Error('OPERATOR-DUPLICATE-WORK-UNIT');
  for (const unit of job.work_units) {
    if (unit.depends_on.some((dependency) => !ids.has(dependency)))
      throw new Error('OPERATOR-UNKNOWN-DEPENDENCY');
    if (unit.status === 'ACTIVE') {
      const passed = new Set(
        job.work_units
          .filter(({status}) => status === 'PASS')
          .map(({work_unit_id}) => work_unit_id),
      );
      if (unit.depends_on.some((dependency) => !passed.has(dependency)))
        throw new Error('OPERATOR-DEPENDENCY-NOT-PASS');
    }
  }
  const tags = active.flatMap(({resource_tags}) => resource_tags);
  for (const [left, right] of FRAMES_SAFE_LAPTOP_PROFILE.exclusive_pairs) {
    const occurrences = tags.filter((tag) => tag === left || tag === right).length;
    if (
      (left === right && occurrences > 1) ||
      (left !== right && tags.includes(left) && tags.includes(right))
    )
      throw new Error(`OPERATOR-RESOURCE-CONFLICT:${left}:${right}`);
  }
};

const assertArtifact = (job: OperatorJobV1): void => {
  if (job.domain === 'VIDEO' && job.secondary_exports.some(({state}) => state === 'COMPILED')) {
    if (job.primary_verification?.verdict !== 'PASS')
      throw new Error('OPERATOR-PRIMARY-BEFORE-DERIVATIVE');
  }
  const artifactRequired = ['RENDERED_DRAFT', 'VERIFIED', 'HUMAN_ACCEPTED'].includes(job.state);
  if (artifactRequired && !job.artifact) throw new Error('OPERATOR-ARTIFACT-REQUIRED');
  if (!job.artifact && (job.primary_verification || job.human_acceptance))
    throw new Error('OPERATOR-RECEIPT-WITHOUT-ARTIFACT');
  if (!job.artifact) return;
  if (
    job.artifact.state !== job.state &&
    !(job.state === 'HUMAN_ACCEPTED' && job.artifact.state === 'HUMAN_ACCEPTED')
  )
    throw new Error('OPERATOR-ARTIFACT-STATE-MISMATCH');
  if (job.primary_verification) {
    if (
      job.primary_verification.verifier_actor_id !== job.verifier_actor_id ||
      job.primary_verification.artifact_id !== job.artifact.artifact_id ||
      job.primary_verification.manifest_sha256 !== job.artifact.manifest_sha256
    )
      throw new Error('OPERATOR-VERIFICATION-BINDING-MISMATCH');
  }
  if (
    ['VERIFIED', 'HUMAN_ACCEPTED'].includes(job.state) &&
    job.primary_verification?.verdict !== 'PASS'
  )
    throw new Error('OPERATOR-PRIMARY-PASS-REQUIRED');
  if (job.human_acceptance) {
    if (
      job.state !== 'HUMAN_ACCEPTED' ||
      job.human_acceptance.artifact_id !== job.artifact.artifact_id ||
      job.human_acceptance.manifest_sha256 !== job.artifact.manifest_sha256
    )
      throw new Error('OPERATOR-HUMAN-ACCEPTANCE-BINDING-MISMATCH');
  } else if (job.state === 'HUMAN_ACCEPTED') throw new Error('OPERATOR-HUMAN-ACCEPTANCE-REQUIRED');
};

const assertEfficiency = (job: OperatorJobV1): void => {
  const receipt = job.efficiency;
  const values = [
    receipt.baseline_tokens,
    receipt.candidate_tokens,
    receipt.baseline_prompts,
    receipt.candidate_prompts,
  ];
  if (receipt.status === 'UNMEASURED') {
    if (
      values.some((value) => value !== null) ||
      receipt.reduction_percent !== null ||
      receipt.target_half_cost_met
    )
      throw new Error('OPERATOR-EFFICIENCY-UNMEASURED-CLAIM');
    return;
  }
  if (values.some((value) => value === null) || receipt.reduction_percent === null)
    throw new Error('OPERATOR-EFFICIENCY-MEASUREMENT-INCOMPLETE');
  const baseline = receipt.baseline_tokens as number;
  const candidate = receipt.candidate_tokens as number;
  const expected = Number(Math.max(0, ((baseline - candidate) / baseline) * 100).toFixed(2));
  const expectedHalfCost = candidate <= baseline / 2;
  if (receipt.reduction_percent !== expected || receipt.target_half_cost_met !== expectedHalfCost)
    throw new Error('OPERATOR-EFFICIENCY-MEASUREMENT-MISMATCH');
};

const assertCapsule = (job: OperatorJobV1): void => {
  if (
    job.capsule.job_id !== job.job_id ||
    job.capsule.domain !== job.domain ||
    job.capsule.state !== job.state
  )
    throw new Error('OPERATOR-CAPSULE-BINDING-MISMATCH');
  const active = job.work_units.find(({status}) => status === 'ACTIVE')?.work_unit_id ?? null;
  if (job.capsule.active_work_unit_id !== active)
    throw new Error('OPERATOR-CAPSULE-ACTIVE-WORK-MISMATCH');
  const estimatedTokens = Math.ceil(JSON.stringify(job.capsule).length / 4);
  if (estimatedTokens > 1_800) throw new Error('OPERATOR-CAPSULE-TOKEN-BUDGET');
};

export const assertOperatorJobV1 = (input: unknown): OperatorJobV1 => {
  const job = OperatorJobV1Schema.parse(input);
  assertActors(job);
  assertWorkUnits(job);
  assertArtifact(job);
  assertCapsule(job);
  assertEfficiency(job);
  return job;
};

export const buildOperatorCapsuleV1 = (input: unknown): string => {
  const capsule = SessionCapsuleV1Schema.parse(input);
  const text = [
    '# Frames Operator resume capsule',
    `job: ${capsule.job_id}`,
    `domain: ${capsule.domain}`,
    `state: ${capsule.state}`,
    `outcome: ${capsule.outcome}`,
    `active: ${capsule.active_work_unit_id ?? 'none'}`,
    `decisions: ${capsule.decisions.join(' | ') || 'none'}`,
    `evidence: ${capsule.evidence_refs.map(({ref, sha256}) => `${ref}@${sha256.slice(0, 12)}`).join(', ') || 'none'}`,
    `gaps: ${capsule.gaps.join(' | ') || 'none'}`,
    `next_gate: ${capsule.next_gate}`,
  ].join('\n');
  const estimatedTokens = Math.ceil(text.length / 4);
  if (estimatedTokens > 1_800) throw new Error('OPERATOR-CAPSULE-TOKEN-BUDGET');
  return `${text}\nestimated_tokens: ${estimatedTokens}/1800`;
};

export const measureOperatorEfficiencyV1 = (input: {
  baseline_tokens?: number;
  candidate_tokens?: number;
  baseline_prompts?: number;
  candidate_prompts?: number;
}): ReturnType<typeof EfficiencyReceiptV1Schema.parse> => {
  const measured = [
    input.baseline_tokens,
    input.candidate_tokens,
    input.baseline_prompts,
    input.candidate_prompts,
  ].every((value) => typeof value === 'number');
  if (!measured)
    return EfficiencyReceiptV1Schema.parse({
      schema_version: 'efficiency-receipt-v1',
      status: 'UNMEASURED',
      baseline_tokens: null,
      candidate_tokens: null,
      baseline_prompts: null,
      candidate_prompts: null,
      reduction_percent: null,
      target_half_cost_met: false,
    });
  const baseline = input.baseline_tokens as number;
  const candidate = input.candidate_tokens as number;
  const reduction = Math.max(0, ((baseline - candidate) / baseline) * 100);
  return EfficiencyReceiptV1Schema.parse({
    schema_version: 'efficiency-receipt-v1',
    status: 'MEASURED',
    baseline_tokens: baseline,
    candidate_tokens: candidate,
    baseline_prompts: input.baseline_prompts,
    candidate_prompts: input.candidate_prompts,
    reduction_percent: Number(reduction.toFixed(2)),
    target_half_cost_met: candidate <= baseline / 2,
  });
};

export const operatorValueSha256 = (value: SessionCapsuleV1): string => hash(value);
