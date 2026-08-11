import {describe, expect, it} from 'vitest';

import {renderCareerCvAtsDocx, validateCareerCvAtsDocx} from 'workflows/career/_runner/cv-docx.ts';
import {calculateCareerDocumentHash} from 'workflows/career/_runner/document-model.ts';
import {calculateEvidenceBankHash} from 'workflows/career/_runner/evidence-gate.ts';

const HASH_A = 'a'.repeat(64);

const evidence = {
  evidence_id: 'EVD-SYNTHETIC-001',
  claim: 'Evidencia profesional sintética.',
  context: 'Fixture público sin datos personales.',
  action_method: 'Aplicó un proceso trazable.',
  result: 'Produjo un resultado verificable.',
  metric: null,
  source_ref: 'tests/fixtures/career/synthetic-evidence.md',
  source_sha256: HASH_A,
  confidence: 'verified' as const,
  allowed_channels: ['cv'],
  constraints: ['No convertir requisitos de vacante en claims.'],
};

const makeBank = () => {
  const draft = {
    schema_version: 'evidence-bank-v1' as const,
    candidate_id: 'CAND-SYNTHETIC-001',
    evidence: [evidence],
    bank_sha256: HASH_A,
  };
  return {...draft, bank_sha256: calculateEvidenceBankHash(draft)};
};

const binding = (path: string) => ({
  path,
  classification: 'evidence' as const,
  evidence_ids: [evidence.evidence_id],
  evidence_hashes: [evidence.source_sha256],
  rationale: null,
});

const makeCv = () => {
  const draft = {
    schema_version: 'career-cv-v1' as const,
    document_id: 'CV-SYNTHETIC-DOCX-001',
    candidate_id: 'CAND-SYNTHETIC-001',
    application_id: null,
    language: 'es' as const,
    design_profile: 'candidate-neutral-ats' as const,
    authorized_brand: null,
    generated_by: 'MetodologIA' as const,
    name: 'Candidata Sintética',
    headline: 'Liderazgo de producto',
    contact_lines: ['Ciudad sintética', 'contacto@example.test'],
    summary: 'Conecta estrategia y ejecución con evidencia verificable.',
    experience: [
      {
        organization: 'Empresa Sintética',
        role: 'Product Lead',
        period: '2024–2026',
        location: 'Remoto',
        achievements: [
          {
            claim_id: 'CLM-SYNTHETIC-001',
            text: 'Produjo un resultado verificable mediante un proceso trazable.',
            evidence_ids: [evidence.evidence_id],
            evidence_hashes: [evidence.source_sha256],
          },
        ],
      },
    ],
    education: ['Programa sintético'],
    skills: ['Product leadership'],
    source_refs: [evidence.source_ref],
    surface_bindings: [
      '/name',
      '/headline',
      '/contact_lines/0',
      '/contact_lines/1',
      '/summary',
      '/experience/0/organization',
      '/experience/0/role',
      '/experience/0/period',
      '/experience/0/location',
      '/education/0',
      '/skills/0',
    ].map(binding),
    content_sha256: HASH_A,
  };
  return {...draft, content_sha256: calculateCareerDocumentHash(draft)};
};

describe('Career ATS DOCX', () => {
  it('renders deterministic bytes and validates ATS-safe XML structure', async () => {
    const cv = makeCv();
    const bank = makeBank();
    const first = await renderCareerCvAtsDocx(cv, bank);
    const second = await renderCareerCvAtsDocx(cv, bank);

    expect(first.equals(second)).toBe(true);
    expect(await validateCareerCvAtsDocx(first, cv)).toEqual([]);
  });

  it('rejects non-ATS design profiles', async () => {
    const cv = makeCv();
    await expect(
      renderCareerCvAtsDocx(
        {...cv, design_profile: 'metodologia-career', content_sha256: HASH_A},
        makeBank(),
      ),
    ).rejects.toThrow();
  });
});
