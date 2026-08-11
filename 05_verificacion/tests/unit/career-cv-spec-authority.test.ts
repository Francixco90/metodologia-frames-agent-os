import {describe, expect, it} from 'vitest';

import {CvSpecV1Schema} from 'workflows/career/_schema/index.ts';
import {
  assertCvSpecBindings,
  approveCvSpec,
  createCvSpec,
  migrateCareerCvV1ToV2,
  parseCvSpec,
} from 'workflows/career/_runner/cv-spec.ts';
import {
  buildApprovedGeneralSpec,
  buildLegacyCv,
  HASH_A,
  HASH_B,
  HASH_C,
} from './career-cv-spec-fixtures.ts';

describe('CV Spec-First authority', () => {
  it('accepts a hash-bound general spec and rejects targeted fields on it', () => {
    const spec = buildApprovedGeneralSpec();
    expect(parseCvSpec(spec, {requireApproval: true})).toEqual(spec);
    expect(
      CvSpecV1Schema.safeParse({
        ...spec,
        job_id: 'JOB-SYNTHETIC-001',
        job_snapshot_ref: 'work/private/jobs/job.md',
        job_snapshot_sha256: HASH_A,
      }).success,
    ).toBe(false);
  });

  it('requires all targeted bindings and never fills them by inference', () => {
    const spec = buildApprovedGeneralSpec();
    expect(CvSpecV1Schema.safeParse({...spec, intent: 'targeted'}).success).toBe(false);
    const {spec_sha256: ignoredHash, approval: ignoredApproval, ...base} = spec;
    void ignoredHash;
    void ignoredApproval;
    const draft = createCvSpec({
      ...base,
      intent: 'targeted',
      application_brief_ref: 'work/private/career/application-brief.json',
      application_brief_sha256: HASH_A,
      requirement_evidence_map_ref: 'work/private/career/requirement-map.json',
      requirement_evidence_map_sha256: HASH_B,
      job_id: 'JOB-SYNTHETIC-001',
      job_snapshot_ref: 'work/private/career/job-snapshot.json',
      job_snapshot_sha256: HASH_C,
      targeted_workflow: {
        scoring_workflow: 'C04',
        application_design_workflow: 'C05',
        fit_scorecard_ref: 'work/private/career/fit-scorecard.json',
        fit_scorecard_sha256: HASH_A,
        application_decision_ref: 'work/private/career/application-decision.json',
        application_decision_sha256: HASH_B,
      },
      state: 'DRAFT',
      approval: null,
    });
    expect(
      parseCvSpec(
        approveCvSpec(draft, {
          approver_ref: 'H01',
          approved_at: '2026-08-11T10:30:00-05:00',
        }),
        {requireApproval: true},
      ),
    ).toMatchObject({intent: 'targeted', state: 'HUMAN_APPROVED'});
  });

  it('detects stale hashes, approvals and source bindings', () => {
    const spec = buildApprovedGeneralSpec();
    expect(() => parseCvSpec({...spec, target_role: 'Changed role'})).toThrow(
      'CV_SPEC_HASH_MISMATCH',
    );
    expect(() =>
      parseCvSpec({...spec, approval: {...spec.approval, approved_spec_sha256: HASH_A}}),
    ).toThrow('CV_SPEC_APPROVAL_STALE');
    expect(() =>
      assertCvSpecBindings(spec, {
        candidate_profile_sha256: HASH_A,
        evidence_bank_sha256: HASH_C,
        positioning_sha256: HASH_C,
      }),
    ).toThrow(/EVIDENCE_BANK_STALE/u);
  });

  it('migrates v1 only through an approved declared variant', () => {
    const spec = buildApprovedGeneralSpec();
    expect(migrateCareerCvV1ToV2(buildLegacyCv(), spec, 'CVVAR-ATS-ES-001')).toMatchObject({
      schema_version: 'career-cv-v2',
      spec_sha256: spec.spec_sha256,
      variant_id: 'CVVAR-ATS-ES-001',
    });
    expect(() => migrateCareerCvV1ToV2(buildLegacyCv(), spec, 'CVVAR-MISSING-001')).toThrow(
      'CV_SPEC_VARIANT_MISSING',
    );
    expect(() =>
      migrateCareerCvV1ToV2(
        {...buildLegacyCv(), summary: 'Mutación no hasheada.'},
        spec,
        'CVVAR-ATS-ES-001',
      ),
    ).toThrow('CAREER_CV_V1_HASH_MISMATCH');
  });
});
