import {describe, expect, it} from 'vitest';

import {
  CareerClaimV1Schema,
  EvidenceItemV1Schema,
  RequirementEvidenceMapV1Schema,
} from 'workflows/career/_schema/index.ts';
import {
  assertCareerEvidence,
  calculateEvidenceBankHash,
} from 'workflows/career/_runner/evidence-gate.ts';

const HASH = 'a'.repeat(64);
const OTHER_HASH = 'b'.repeat(64);

const evidence = (overrides: Record<string, unknown> = {}) => ({
  evidence_id: 'EVD-VERIFIED-001',
  claim: 'Resultado profesional sintético.',
  context: 'Contexto sintético.',
  action_method: 'Método sintético.',
  result: 'Resultado sintético.',
  metric: null,
  source_ref: 'work/private/evidence/result.md',
  source_sha256: HASH,
  confidence: 'verified',
  allowed_channels: ['cv', 'letter'],
  constraints: [],
  ...overrides,
});

const bank = (item = evidence()) => {
  const unsigned = {
    schema_version: 'evidence-bank-v1' as const,
    candidate_id: 'CAND-SYNTHETIC-001',
    evidence: [item],
  };
  return {...unsigned, bank_sha256: calculateEvidenceBankHash(unsigned as never)};
};

const claim = (overrides: Record<string, unknown> = {}) => ({
  claim_id: 'CLM-SYNTHETIC-001',
  text: 'Claim con evidencia.',
  evidence_ids: ['EVD-VERIFIED-001'],
  evidence_hashes: [HASH],
  ...overrides,
});

const cv = (claimOverrides: Record<string, unknown> = {}) => ({
  schema_version: 'career-cv-v1',
  document_id: 'CV-SYNTHETIC-001',
  candidate_id: 'CAND-SYNTHETIC-001',
  application_id: null,
  language: 'es',
  design_profile: 'candidate-neutral-ats',
  authorized_brand: null,
  generated_by: 'MetodologIA',
  name: 'Candidata Sintética',
  headline: 'Product Lead',
  contact_lines: ['Contacto privado'],
  summary: 'Perfil sintético.',
  experience: [
    {
      organization: 'Synthetic Co',
      role: 'Lead',
      period: '2024',
      location: null,
      achievements: [claim(claimOverrides)],
    },
  ],
  education: [],
  skills: ['Product Operations'],
  source_refs: ['work/private/evidence/result.md'],
  content_sha256: OTHER_HASH,
});

const letter = (claimOverrides: Record<string, unknown> = {}) => ({
  schema_version: 'career-letter-v1',
  document_id: 'LETTER-SYNTHETIC-001',
  candidate_id: 'CAND-SYNTHETIC-001',
  application_id: 'APP-SYNTHETIC-001',
  job_id: 'JOB-SYNTHETIC-001',
  language: 'es',
  channel: 'letter',
  design_profile: 'candidate-neutral-ats',
  authorized_brand: null,
  generated_by: 'MetodologIA',
  addressee: 'Hiring team',
  subject: null,
  paragraphs: ['Párrafo sintético uno.', 'Párrafo sintético dos.'],
  claims: [claim(claimOverrides)],
  source_refs: ['work/private/evidence/result.md'],
  content_sha256: OTHER_HASH,
});

describe('Career evidence boundary', () => {
  it.each(['verified', 'user_confirmed'] as const)(
    'allows %s evidence to remain explicitly classified',
    (confidence) => {
      const material = EvidenceItemV1Schema.parse({
        evidence_id: `EVD-${confidence.toUpperCase().replace('_', '-')}-001`,
        claim: 'Resultado profesional sintético.',
        context: 'Contexto sintético.',
        action_method: 'Método sintético.',
        result: 'Resultado sintético.',
        metric: null,
        source_ref: confidence === 'verified' ? 'work/private/evidence/result.md' : null,
        source_sha256: confidence === 'verified' ? HASH : null,
        confidence,
        allowed_channels: ['cv'],
        constraints: [],
      });
      expect(material.confidence).toBe(confidence);
    },
  );

  it.each(['inferred', 'missing'] as const)(
    'requires %s to be treated as a gap rather than a proven claim',
    (confidence) => {
      const evidence = EvidenceItemV1Schema.parse({
        evidence_id: `EVD-${confidence.toUpperCase()}-001`,
        claim: 'Capacidad todavía no demostrada.',
        context: 'Contexto incompleto.',
        action_method: 'No verificado.',
        result: 'No verificado.',
        metric: null,
        source_ref: null,
        source_sha256: null,
        confidence,
        allowed_channels: [],
        constraints: ['No usar como claim demostrado.'],
      });
      expect(evidence.constraints).toContain('No usar como claim demostrado.');
      expect(evidence.allowed_channels).toEqual([]);
    },
  );

  it('requires every document claim to bind evidence ids and hashes', () => {
    expect(
      CareerClaimV1Schema.parse({
        claim_id: 'CLM-SYNTHETIC-001',
        text: 'Claim con evidencia.',
        evidence_ids: ['EVD-VERIFIED-001'],
        evidence_hashes: [HASH],
      }),
    ).toMatchObject({evidence_ids: ['EVD-VERIFIED-001'], evidence_hashes: [HASH]});
    expect(
      CareerClaimV1Schema.safeParse({
        claim_id: 'CLM-SYNTHETIC-001',
        text: 'Claim huérfano.',
        evidence_ids: [],
        evidence_hashes: [],
      }).success,
    ).toBe(false);
  });

  it('records an unsupported mandatory requirement as blocked rather than inventing evidence', () => {
    const map = RequirementEvidenceMapV1Schema.parse({
      schema_version: 'requirement-evidence-map-v1',
      job_id: 'JOB-SYNTHETIC-001',
      mappings: [
        {
          requirement_id: 'REQ-MANDATORY-001',
          evidence_ids: [],
          fit: 'blocked',
          treatment: 'block',
          rationale: 'No existe evidencia autorizada para este requisito obligatorio.',
        },
      ],
    });
    expect(map.mappings[0]).toMatchObject({evidence_ids: [], fit: 'blocked', treatment: 'block'});
  });

  it.each([
    ['CV', cv],
    ['letter', letter],
  ] as const)('blocks %s claims backed by inferred or missing evidence', (_label, document) => {
    for (const confidence of ['inferred', 'missing'] as const) {
      const item = evidence({
        confidence,
        source_ref: null,
        source_sha256: null,
        allowed_channels: [],
      });
      expect(() => assertCareerEvidence(document(), bank(item))).toThrow(
        /CONFIDENCE_NOT_PROMOTABLE/u,
      );
    }
  });

  it.each([
    ['unresolved id', cv({evidence_ids: ['EVD-UNKNOWN-001']}), bank(), /EVIDENCE_MISSING/u],
    ['stale hash', cv({evidence_hashes: [OTHER_HASH]}), bank(), /EVIDENCE_HASH_MISMATCH/u],
    [
      'unauthorized channel',
      letter(),
      bank(evidence({allowed_channels: ['cv']})),
      /CHANNEL_NOT_ALLOWED/u,
    ],
  ])('fails closed on %s', (_label, document, evidenceBank, message) => {
    expect(() => assertCareerEvidence(document, evidenceBank)).toThrow(message);
  });
});
