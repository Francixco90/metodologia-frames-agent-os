import {describe, expect, it} from 'vitest';

import {
  CandidateProfileV1Schema,
  CareerCvV1Schema,
  CareerIntentV1Schema,
  CareerLetterV1Schema,
  EvidenceItemV1Schema,
  JobRecordV1Schema,
  RequirementEvidenceMapV1Schema,
} from 'workflows/career/_schema/index.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

const verifiedEvidence = {
  evidence_id: 'EVD-RESULT-001',
  claim: 'Redujo el tiempo de entrega del proceso.',
  context: 'Operación editorial con un flujo manual.',
  action_method: 'Estandarizó el intake y la revisión.',
  result: 'El ciclo pasó de diez a siete días.',
  metric: '30% de reducción, medido durante un trimestre.',
  source_ref: 'work/private/evidence/result-001.md',
  source_sha256: HASH_A,
  confidence: 'verified',
  allowed_channels: ['cv', 'cover_letter'],
  constraints: ['Conservar el periodo de medición.'],
} as const;
const surfaceBinding = (path: string) => ({
  path,
  classification: 'evidence' as const,
  evidence_ids: [verifiedEvidence.evidence_id],
  evidence_hashes: [HASH_A],
  rationale: null,
});

describe('Career OS strict contracts', () => {
  it('accepts a portable candidate profile and rejects undeclared fields', () => {
    const profile = {
      schema_version: 'candidate-profile-v1',
      candidate_id: 'CAND-SYNTHETIC-001',
      display_name: 'Candidata Sintética',
      headline: 'Liderazgo de producto basado en evidencia',
      role_families: ['Product Operations'],
      languages: ['es', 'en'],
      private_profile_ref: 'work/private/candidates/synthetic/profile.yml',
      source_hashes: [HASH_A],
    };
    expect(CandidateProfileV1Schema.parse(profile)).toMatchObject(profile);
    expect(
      CandidateProfileV1Schema.safeParse({...profile, email: 'private@example.test'}).success,
    ).toBe(false);
  });

  it('requires a material source for verified evidence', () => {
    expect(EvidenceItemV1Schema.parse(verifiedEvidence).confidence).toBe('verified');
    expect(
      EvidenceItemV1Schema.safeParse({
        ...verifiedEvidence,
        source_ref: null,
        source_sha256: null,
      }).success,
    ).toBe(false);
    expect(
      EvidenceItemV1Schema.safeParse({
        ...verifiedEvidence,
        confidence: 'missing',
        source_ref: null,
      }).success,
    ).toBe(false);
  });

  it('keeps job requirements separate from candidate evidence', () => {
    const job = JobRecordV1Schema.parse({
      schema_version: 'job-record-v1',
      job_id: 'JOB-SYNTHETIC-001',
      title: 'Product Operations Lead',
      company: 'Empresa Sintética',
      canonical_url: 'https://jobs.example.test/product-operations',
      captured_description_ref: 'work/private/jobs/job-001.md',
      captured_sha256: HASH_B,
      status: 'open',
      location: 'Bogotá',
      modality: 'hybrid',
      language: 'es',
      requirements: [
        {
          requirement_id: 'REQ-LEADERSHIP-001',
          text: 'Experiencia liderando operaciones de producto.',
          mandatory: true,
          category: 'experience',
        },
      ],
    });
    const mapping = RequirementEvidenceMapV1Schema.parse({
      schema_version: 'requirement-evidence-map-v1',
      job_id: job.job_id,
      mappings: [
        {
          requirement_id: job.requirements[0]!.requirement_id,
          evidence_ids: [verifiedEvidence.evidence_id],
          fit: 'transferable',
          treatment: 'qualify',
          rationale: 'La evidencia es transferible, no idéntica al requisito.',
        },
      ],
    });
    expect(mapping.mappings[0]).toMatchObject({fit: 'transferable', treatment: 'qualify'});
    expect(job.requirements[0]).not.toHaveProperty('evidence_ids');
  });

  it('enforces the maximum of three blocking questions in CareerIntentV1', () => {
    const intent = {
      schema_version: 'career-intent-v1',
      request: 'Créame un CV',
      request_hash: HASH_A,
      intent_class: 'general_cv',
      candidate_id: null,
      application_id: null,
      target_role: null,
      language: 'unknown',
      job_ref: null,
      sources: [],
      constraints: [],
      effect_class: 'local_reversible',
      brief_sufficiency: 'insufficient',
      blocking_questions: ['¿Para quién?', '¿Qué rol?', '¿Qué fuentes?'],
      reason_codes: ['GENERAL_CV'],
      selected_stage_path: ['C00', 'C01', 'C02', 'C06', 'C08'],
      brief_ref: 'work/private/career/candidate-foundation-brief.md',
      next_gate: 'CR_BRIEF_APPROVED',
      decision: 'NEEDS_INPUT',
    };
    expect(CareerIntentV1Schema.parse(intent).blocking_questions).toHaveLength(3);
    expect(
      CareerIntentV1Schema.safeParse({
        ...intent,
        blocking_questions: [...intent.blocking_questions, '¿Qué diseño?'],
      }).success,
    ).toBe(false);
  });

  it('accepts traceable CV and letter models and rejects unbound claims', () => {
    const claim = {
      claim_id: 'CLM-RESULT-001',
      text: verifiedEvidence.claim,
      evidence_ids: [verifiedEvidence.evidence_id],
      evidence_hashes: [HASH_A],
    };
    const cv = CareerCvV1Schema.parse({
      schema_version: 'career-cv-v1',
      document_id: 'CV-SYNTHETIC-001',
      candidate_id: 'CAND-SYNTHETIC-001',
      application_id: 'APP-SYNTHETIC-001',
      language: 'es',
      design_profile: 'candidate-neutral-ats',
      authorized_brand: null,
      generated_by: 'MetodologIA',
      name: 'Candidata Sintética',
      headline: 'Product Operations Lead',
      contact_lines: ['Bogotá · contacto privado'],
      summary: 'Lidera sistemas operativos de producto con evidencia verificable.',
      experience: [
        {
          organization: 'Empresa Sintética',
          role: 'Product Operations Manager',
          period: '2024–2026',
          location: 'Bogotá',
          achievements: [claim],
        },
      ],
      education: ['Programa sintético verificable'],
      skills: ['Product Operations'],
      source_refs: [verifiedEvidence.source_ref],
      surface_bindings: [
        '/headline',
        '/summary',
        '/experience/0/organization',
        '/experience/0/role',
        '/experience/0/period',
        '/experience/0/location',
        '/education/0',
        '/skills/0',
      ].map(surfaceBinding),
      content_sha256: HASH_B,
    });
    const letter = CareerLetterV1Schema.parse({
      schema_version: 'career-letter-v1',
      document_id: 'LETTER-SYNTHETIC-001',
      candidate_id: cv.candidate_id,
      application_id: cv.application_id,
      job_id: 'JOB-SYNTHETIC-001',
      language: 'es',
      channel: 'letter',
      design_profile: 'candidate-neutral-ats',
      authorized_brand: null,
      generated_by: 'MetodologIA',
      addressee: 'Equipo de selección',
      subject: null,
      paragraphs: ['Presento el ajuste principal.', 'Lo respaldo con evidencia trazable.'],
      claims: [claim],
      source_refs: [verifiedEvidence.source_ref],
      surface_bindings: ['/paragraphs/0', '/paragraphs/1'].map(surfaceBinding),
      content_sha256: HASH_A,
    });
    expect(cv.experience[0]!.achievements[0]!.evidence_ids).toEqual([verifiedEvidence.evidence_id]);
    expect(letter.claims[0]!.evidence_hashes).toEqual([HASH_A]);
    expect(CareerCvV1Schema.safeParse({...cv, source_refs: []}).success).toBe(false);
    expect(CareerLetterV1Schema.safeParse({...letter, claims: []}).success).toBe(false);
  });
});
