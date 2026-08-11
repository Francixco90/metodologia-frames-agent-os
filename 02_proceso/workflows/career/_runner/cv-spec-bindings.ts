import type {CvSpecV1} from '../_schema/cv-spec-v1.schema.ts';
import {parseCvSpec} from './cv-spec.ts';

export type CvSpecObservedBindings = {
  candidate_profile_ref?: string;
  candidate_profile_sha256: string;
  evidence_bank_ref?: string;
  evidence_bank_sha256: string;
  positioning_ref?: string;
  positioning_sha256: string;
  application_brief_ref?: string | null;
  application_brief_sha256?: string | null;
  requirement_evidence_map_ref?: string | null;
  requirement_evidence_map_sha256?: string | null;
  job_snapshot_ref?: string | null;
  job_snapshot_sha256?: string | null;
  fit_scorecard_ref?: string | null;
  fit_scorecard_sha256?: string | null;
  application_decision_ref?: string | null;
  application_decision_sha256?: string | null;
};

export const assertCompleteCvCompileRefs = (observed: CvSpecObservedBindings): void => {
  const general = ['candidate_profile_ref', 'evidence_bank_ref', 'positioning_ref'] as const;
  const conditional = [
    'application_brief_ref',
    'requirement_evidence_map_ref',
    'job_snapshot_ref',
    'fit_scorecard_ref',
    'application_decision_ref',
  ] as const;
  const invalidGeneral = general.some(
    (key) => typeof observed[key] !== 'string' || observed[key].length === 0,
  );
  const invalidConditional = conditional.some(
    (key) =>
      !Object.hasOwn(observed, key) ||
      (observed[key] !== null && (typeof observed[key] !== 'string' || observed[key].length === 0)),
  );
  if (invalidGeneral || invalidConditional) {
    throw new Error('CV_COMPILE_OBSERVED_REFS_REQUIRED');
  }
};

/** Compara bindings observados; los refs opcionales permiten compatibilidad, el compiler los exige. */
export const assertCvSpecBindings = (
  specInput: unknown,
  observed: CvSpecObservedBindings,
): CvSpecV1 => {
  const spec = parseCvSpec(specInput, {requireApproval: true});
  const issues: string[] = [];
  const compare = (label: string, expected: unknown, actual: unknown) => {
    if (expected !== actual) issues.push(`${label}_STALE`);
  };
  compare('CANDIDATE_PROFILE', spec.candidate_profile_sha256, observed.candidate_profile_sha256);
  compare('EVIDENCE_BANK', spec.evidence_bank_sha256, observed.evidence_bank_sha256);
  compare('POSITIONING', spec.positioning_sha256, observed.positioning_sha256);
  compare(
    'APPLICATION_BRIEF',
    spec.application_brief_sha256,
    observed.application_brief_sha256 ?? null,
  );
  compare(
    'REQUIREMENT_EVIDENCE_MAP',
    spec.requirement_evidence_map_sha256,
    observed.requirement_evidence_map_sha256 ?? null,
  );
  compare('JOB_SNAPSHOT', spec.job_snapshot_sha256, observed.job_snapshot_sha256 ?? null);
  compare(
    'FIT_SCORECARD',
    spec.targeted_workflow?.fit_scorecard_sha256 ?? null,
    observed.fit_scorecard_sha256 ?? null,
  );
  compare(
    'APPLICATION_DECISION',
    spec.targeted_workflow?.application_decision_sha256 ?? null,
    observed.application_decision_sha256 ?? null,
  );
  const refs: Array<[string, unknown, unknown]> = [
    ['CANDIDATE_PROFILE_REF', spec.candidate_profile_ref, observed.candidate_profile_ref],
    ['EVIDENCE_BANK_REF', spec.evidence_bank_ref, observed.evidence_bank_ref],
    ['POSITIONING_REF', spec.positioning_ref, observed.positioning_ref],
    ['APPLICATION_BRIEF_REF', spec.application_brief_ref, observed.application_brief_ref],
    [
      'REQUIREMENT_EVIDENCE_MAP_REF',
      spec.requirement_evidence_map_ref,
      observed.requirement_evidence_map_ref,
    ],
    ['JOB_SNAPSHOT_REF', spec.job_snapshot_ref, observed.job_snapshot_ref],
    [
      'FIT_SCORECARD_REF',
      spec.targeted_workflow?.fit_scorecard_ref ?? null,
      observed.fit_scorecard_ref,
    ],
    [
      'APPLICATION_DECISION_REF',
      spec.targeted_workflow?.application_decision_ref ?? null,
      observed.application_decision_ref,
    ],
  ];
  for (const [label, expected, actual] of refs)
    if (actual !== undefined) compare(label, expected, actual);
  if (issues.length) throw new Error(`CV_SPEC_BINDING_BLOCKED:${issues.join(',')}`);
  return spec;
};
