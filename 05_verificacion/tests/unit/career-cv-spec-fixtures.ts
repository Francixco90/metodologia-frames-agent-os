import {CareerCvV1Schema, CvSpecV1Schema} from 'workflows/career/_schema/index.ts';
import {calculateCareerDocumentHash} from 'workflows/career/_runner/document-model.ts';
import {calculateCvSpecHash} from 'workflows/career/_runner/cv-spec.ts';

export const HASH_A = 'a'.repeat(64);
export const HASH_B = 'b'.repeat(64);
export const HASH_C = 'c'.repeat(64);

export const buildApprovedGeneralSpec = () => {
  const provisional = CvSpecV1Schema.parse({
    schema_version: 'cv-spec-v1',
    spec_id: 'CVSPEC-SYNTHETIC-001',
    intent: 'general',
    candidate_id: 'CAND-SYNTHETIC-001',
    candidate_profile_ref: 'work/private/career/profile.yml',
    candidate_profile_sha256: HASH_A,
    evidence_bank_ref: 'work/private/career/evidence.json',
    evidence_bank_sha256: HASH_B,
    positioning_ref: 'work/private/career/positioning.md',
    positioning_sha256: HASH_C,
    application_brief_ref: null,
    application_brief_sha256: null,
    requirement_evidence_map_ref: null,
    requirement_evidence_map_sha256: null,
    job_id: null,
    job_snapshot_ref: null,
    job_snapshot_sha256: null,
    targeted_workflow: null,
    target_role: 'Product Operations Lead',
    role_family: 'Product leadership',
    positioning: 'Conecta estrategia, producto y ejecución con evidencia verificable.',
    section_order: ['summary', 'experience', 'skills', 'education'],
    evidence_selection: [
      {
        section_id: 'experience',
        evidence_ids: ['EVD-RESULT-001'],
        evidence_hashes: [HASH_A],
        rationale: 'Evidencia sintética y verificable para el canal CV.',
      },
    ],
    keyword_policy: {
      allowed: ['product operations'],
      omitted: ['machine learning engineer'],
      rule: 'visible-and-evidence-bound',
    },
    deliberate_omissions: ['No presentar requisitos como experiencia propia.'],
    gaps: [],
    attribution_limits: ['Conservar atribución compartida.'],
    contact_binding: {
      binding_id: 'CONTACT-SYNTHETIC-001',
      required: true,
      storage: 'private-runtime',
    },
    authorized_brand: null,
    variants: [
      {
        variant_id: 'CVVAR-ATS-ES-001',
        language: 'es',
        audience: 'ats',
        output_kinds: ['ats-html', 'ats-docx', 'ats-pdf'],
        page_budget: 2,
        design_profile: 'candidate-neutral-ats',
      },
      {
        variant_id: 'CVVAR-EXEC-EN-001',
        language: 'en',
        audience: 'hiring_manager',
        output_kinds: ['executive-html'],
        page_budget: 3,
        design_profile: 'metodologia-career',
      },
    ],
    acceptance: {
      ats: ['Orden lineal y texto extraíble.'],
      recruiter: ['Rol y propuesta claros.'],
      hiring_manager: ['Evidencia contextualizada.'],
      accessibility: ['Teclado y reflow a 320 px.'],
      parity: ['Fechas, cifras y significado equivalentes.'],
    },
    state: 'HUMAN_APPROVED',
    next_gate: 'CR_CV_SPEC_APPROVED',
    approval: {
      status: 'HUMAN_APPROVED',
      approved_spec_sha256: HASH_A,
      approver_ref: 'H01',
      approved_at: '2026-08-11T10:00:00-05:00',
    },
    spec_sha256: HASH_A,
  });
  const specSha256 = calculateCvSpecHash(provisional);
  return CvSpecV1Schema.parse({
    ...provisional,
    spec_sha256: specSha256,
    approval: {...provisional.approval, approved_spec_sha256: specSha256},
  });
};

export const buildLegacyCv = () => {
  const draft = CareerCvV1Schema.parse({
    schema_version: 'career-cv-v1',
    document_id: 'CV-SYNTHETIC-001',
    candidate_id: 'CAND-SYNTHETIC-001',
    application_id: null,
    language: 'es',
    design_profile: 'candidate-neutral-ats',
    authorized_brand: null,
    generated_by: 'MetodologIA',
    name: '[NO-CLAIM] Candidata Sintética',
    headline: 'Product Operations Lead',
    contact_lines: ['[NO-CLAIM] contacto privado'],
    summary: 'Lidera operaciones de producto con evidencia verificable.',
    experience: [
      {
        organization: 'Empresa Sintética',
        role: 'Product Operations Manager',
        period: '2024–2026',
        location: null,
        achievements: [
          {
            claim_id: 'CLM-RESULT-001',
            text: 'Mejoró un flujo operativo verificable.',
            evidence_ids: ['EVD-RESULT-001'],
            evidence_hashes: [HASH_A],
          },
        ],
      },
    ],
    education: [],
    skills: ['Product Operations'],
    source_refs: ['work/private/career/evidence.md'],
    surface_bindings: [
      '/name',
      '/headline',
      '/contact_lines/0',
      '/summary',
      '/experience/0/organization',
      '/experience/0/role',
      '/experience/0/period',
      '/skills/0',
    ].map((path) => ({
      path,
      classification: 'evidence',
      evidence_ids: ['EVD-RESULT-001'],
      evidence_hashes: [HASH_A],
      rationale: null,
    })),
    content_sha256: HASH_C,
  });
  return {...draft, content_sha256: calculateCareerDocumentHash(draft)};
};
