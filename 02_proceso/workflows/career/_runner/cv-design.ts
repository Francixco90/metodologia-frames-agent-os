import type {z} from 'zod';

import {
  CareerDesignSystemRefV1Schema,
  CvDesignBriefV1Schema,
  CvDesignDecisionV1Schema,
  type CareerDesignSystemRefV1,
  type CvDesignBriefV1,
  type CvDesignDecisionV1,
} from '../_schema/index.ts';
import {sha256Text, stableStringify} from './canonical.ts';

const withoutKeys = <T extends Record<string, unknown>>(value: T, keys: readonly string[]) =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

export const calculateCareerDesignSystemHash = (system: CareerDesignSystemRefV1): string =>
  sha256Text(stableStringify(withoutKeys(system, ['design_system_sha256'])));

export const parseCareerDesignSystem = (input: unknown): CareerDesignSystemRefV1 => {
  const system = CareerDesignSystemRefV1Schema.parse(input);
  if (calculateCareerDesignSystemHash(system) !== system.design_system_sha256) {
    throw new Error('CV_DESIGN_SYSTEM_HASH_MISMATCH');
  }
  return system;
};

export const calculateCvDesignBriefHash = (brief: CvDesignBriefV1): string =>
  sha256Text(stableStringify(withoutKeys(brief, ['brief_sha256', 'state'])));

export const createCvDesignBrief = (
  draft: Omit<CvDesignBriefV1, 'brief_sha256'>,
): CvDesignBriefV1 => {
  const provisional = {...draft, brief_sha256: '0'.repeat(64)};
  parseCareerDesignSystem(provisional.design_system);
  return CvDesignBriefV1Schema.parse({
    ...draft,
    brief_sha256: calculateCvDesignBriefHash(provisional),
  });
};

export const parseCvDesignBrief = (input: unknown): CvDesignBriefV1 => {
  const brief = CvDesignBriefV1Schema.parse(input);
  parseCareerDesignSystem(brief.design_system);
  if (calculateCvDesignBriefHash(brief) !== brief.brief_sha256) {
    throw new Error('CV_DESIGN_BRIEF_HASH_MISMATCH');
  }
  return brief;
};

export const calculateCvDesignDecisionHash = (decision: CvDesignDecisionV1): string =>
  sha256Text(stableStringify(withoutKeys(decision, ['decision_sha256', 'approval', 'state'])));

export const createCvDesignDecision = (
  draft: Omit<CvDesignDecisionV1, 'decision_sha256'>,
  briefInput: unknown,
): CvDesignDecisionV1 => {
  const brief = parseCvDesignBrief(briefInput);
  if (brief.state !== 'DESIGN_OPTIONS_READY') throw new Error('CV_DESIGN_BRIEF_NOT_READY');
  if (draft.brief_id !== brief.brief_id || draft.brief_sha256 !== brief.brief_sha256) {
    throw new Error('CV_DESIGN_DECISION_BRIEF_STALE');
  }
  if (
    draft.design_system_id !== brief.design_system.design_system_id ||
    draft.design_system_sha256 !== brief.design_system.design_system_sha256
  ) {
    throw new Error('CV_DESIGN_DECISION_SYSTEM_STALE');
  }
  const provisional = {...draft, decision_sha256: '0'.repeat(64)};
  return CvDesignDecisionV1Schema.parse({
    ...draft,
    decision_sha256: calculateCvDesignDecisionHash(provisional),
  });
};

export const approveCvDesignDecision = (
  input: unknown,
  selection: z.input<typeof CvDesignDecisionV1Schema>['selected_composition'],
  approval: {approver_ref: string; approved_at: string},
): CvDesignDecisionV1 => {
  const decision = parseCvDesignDecision(input);
  if (decision.state !== 'DESIGN_OPTIONS_READY') throw new Error('CV_DESIGN_OPTIONS_NOT_READY');
  if (selection === null) throw new Error('CV_DESIGN_SELECTION_REQUIRED');
  const selected = {...decision, state: 'HUMAN_APPROVED' as const, selected_composition: selection};
  const decisionSha256 = calculateCvDesignDecisionHash(selected);
  return CvDesignDecisionV1Schema.parse({
    ...selected,
    decision_sha256: decisionSha256,
    approval: {status: 'HUMAN_APPROVED', approved_decision_sha256: decisionSha256, ...approval},
  });
};

export const parseCvDesignDecision = (
  input: unknown,
  options: {requireApproval?: boolean} = {},
): CvDesignDecisionV1 => {
  const decision = CvDesignDecisionV1Schema.parse(input);
  const calculated = calculateCvDesignDecisionHash(decision);
  if (calculated !== decision.decision_sha256) throw new Error('CV_DESIGN_DECISION_HASH_MISMATCH');
  if (decision.approval?.approved_decision_sha256 !== calculated && decision.approval) {
    throw new Error('CV_DESIGN_DECISION_APPROVAL_STALE');
  }
  if (options.requireApproval && decision.state !== 'HUMAN_APPROVED') {
    throw new Error('CR_CV_DESIGN_APPROVED_REQUIRED');
  }
  return decision;
};

export const assertCvDesignDecisionCurrent = (
  decisionInput: unknown,
  briefInput: unknown,
  systemInput: unknown,
): CvDesignDecisionV1 => {
  const decision = parseCvDesignDecision(decisionInput);
  const brief = parseCvDesignBrief(briefInput);
  const system = parseCareerDesignSystem(systemInput);
  if (decision.brief_id !== brief.brief_id || decision.brief_sha256 !== brief.brief_sha256) {
    throw new Error('CV_DESIGN_DECISION_BRIEF_STALE');
  }
  if (
    decision.design_system_id !== system.design_system_id ||
    decision.design_system_sha256 !== system.design_system_sha256 ||
    brief.design_system.design_system_sha256 !== system.design_system_sha256
  ) {
    throw new Error('CV_DESIGN_DECISION_SYSTEM_STALE');
  }
  return decision;
};
