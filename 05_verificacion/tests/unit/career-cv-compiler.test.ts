import {describe, expect, it} from 'vitest';

import {
  calculateCandidateProfileHash,
  compileCareerCvV2,
} from 'workflows/career/_runner/cv-compiler.ts';
import {calculateEvidenceBankHash} from 'workflows/career/_runner/evidence-gate.ts';
import {approveCvSpec, createCvSpec} from 'workflows/career/_runner/cv-spec.ts';
import {buildApprovedGeneralSpec, HASH_A} from './career-cv-spec-fixtures.ts';

describe('CV Spec-First compiler', () => {
  it('compiles only selected localized evidence and carries policy into v2', () => {
    const item = {
      evidence_id: 'EVD-RESULT-001',
      claim: 'Claim sintético.',
      context: 'Contexto sintético.',
      action_method: 'Método verificable.',
      result: 'Resultado verificable.',
      metric: null,
      source_ref: 'work/private/career/source.md',
      source_sha256: HASH_A,
      confidence: 'verified' as const,
      allowed_channels: ['cv'],
      constraints: [],
      cv_content: [
        {
          language: 'es' as const,
          section: 'summary' as const,
          text: 'Resumen verificable.',
          organization: null,
          role: null,
          period: null,
          location: null,
        },
        {
          language: 'es' as const,
          section: 'experience' as const,
          text: 'Logro verificable.',
          organization: 'Organización sintética',
          role: 'Rol sintético',
          period: '2024–2026',
          location: null,
        },
        {
          language: 'es' as const,
          section: 'skills' as const,
          text: 'Product operations',
          organization: null,
          role: null,
          period: null,
          location: null,
        },
      ],
    };
    const bankDraft = {
      schema_version: 'evidence-bank-v1' as const,
      candidate_id: 'CAND-SYNTHETIC-001',
      evidence: [item],
      bank_sha256: HASH_A,
    };
    const bank = {...bankDraft, bank_sha256: calculateEvidenceBankHash(bankDraft)};
    const profile = {
      schema_version: 'candidate-profile-v1',
      candidate_id: 'CAND-SYNTHETIC-001',
      display_name: 'Candidata Sintética',
      headline: 'Headline fuente',
      role_families: ['Product'],
      languages: ['es'],
      private_profile_ref: 'work/private/career/profile.json',
      source_hashes: [HASH_A],
    };
    const profileHash = calculateCandidateProfileHash(profile);
    const approved = buildApprovedGeneralSpec();
    const {spec_sha256: ignoredHash, approval: ignoredApproval, ...draft} = approved;
    void ignoredHash;
    void ignoredApproval;
    const selections = ['summary', 'experience', 'skills'].map((section_id) => ({
      section_id,
      evidence_ids: ['EVD-RESULT-001'],
      evidence_hashes: [HASH_A],
      rationale: 'Selección explícita.',
    }));
    const spec = approveCvSpec(
      createCvSpec({
        ...draft,
        candidate_profile_sha256: profileHash,
        evidence_bank_sha256: bank.bank_sha256,
        evidence_selection: selections,
        state: 'DRAFT',
        approval: null,
      }),
      {approver_ref: 'H01', approved_at: '2026-08-11T10:40:00-05:00'},
    );
    const observedBindings = {
      candidate_profile_ref: spec.candidate_profile_ref,
      candidate_profile_sha256: profileHash,
      evidence_bank_ref: spec.evidence_bank_ref,
      evidence_bank_sha256: bank.bank_sha256,
      positioning_ref: spec.positioning_ref,
      positioning_sha256: spec.positioning_sha256,
      application_brief_ref: null,
      requirement_evidence_map_ref: null,
      job_snapshot_ref: null,
      fit_scorecard_ref: null,
      application_decision_ref: null,
    };
    const cv = compileCareerCvV2({
      spec,
      evidenceBank: bank,
      candidateProfile: profile,
      candidateProfileSha256: profileHash,
      observedBindings,
      variantId: 'CVVAR-ATS-ES-001',
      contactBinding: {
        binding_id: spec.contact_binding.binding_id,
        lines: ['contact@example.test'],
      },
      applicationId: null,
    });
    expect(cv).toMatchObject({
      summary: 'Resumen verificable.',
      skills: ['Product operations'],
      section_order: spec.section_order,
      keyword_policy: spec.keyword_policy,
      page_budget: 2,
    });
    expect(
      [
        cv.summary,
        ...cv.skills,
        ...cv.experience.flatMap(({achievements}) => achievements.map(({text}) => text)),
      ].join(' '),
    ).not.toContain('machine learning engineer');
    expect(() =>
      compileCareerCvV2({
        spec,
        evidenceBank: {...bank, evidence: [{...item, cv_content: []}]},
        candidateProfile: profile,
        candidateProfileSha256: profileHash,
        observedBindings,
        variantId: 'CVVAR-ATS-ES-001',
        contactBinding: {binding_id: spec.contact_binding.binding_id, lines: ['x']},
        applicationId: null,
      }),
    ).toThrow(/EVIDENCE_BANK_HASH_MISMATCH|CV_COMPILE_CONTENT_MISSING/u);
    expect(() =>
      compileCareerCvV2({
        spec,
        evidenceBank: bank,
        candidateProfile: profile,
        candidateProfileSha256: profileHash,
        observedBindings: {...observedBindings, positioning_sha256: HASH_A},
        variantId: 'CVVAR-ATS-ES-001',
        contactBinding: {binding_id: spec.contact_binding.binding_id, lines: ['x']},
        applicationId: null,
      }),
    ).toThrow(/POSITIONING_STALE/u);
    const missingRef = {...observedBindings};
    delete (missingRef as Partial<typeof missingRef>).positioning_ref;
    expect(() =>
      compileCareerCvV2({
        spec,
        evidenceBank: bank,
        candidateProfile: profile,
        candidateProfileSha256: profileHash,
        observedBindings: missingRef,
        variantId: 'CVVAR-ATS-ES-001',
        contactBinding: {binding_id: spec.contact_binding.binding_id, lines: ['x']},
        applicationId: null,
      }),
    ).toThrow('CV_COMPILE_OBSERVED_REFS_REQUIRED');
    expect(() =>
      compileCareerCvV2({
        spec,
        evidenceBank: bank,
        candidateProfile: profile,
        candidateProfileSha256: profileHash,
        observedBindings: {
          ...observedBindings,
          positioning_ref: undefined,
        } as unknown as typeof observedBindings,
        variantId: 'CVVAR-ATS-ES-001',
        contactBinding: {binding_id: spec.contact_binding.binding_id, lines: ['x']},
        applicationId: null,
      }),
    ).toThrow('CV_COMPILE_OBSERVED_REFS_REQUIRED');
  });
});
