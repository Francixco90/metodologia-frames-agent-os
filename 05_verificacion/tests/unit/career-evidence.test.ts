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

type SurfaceBindingFixture = {
  path: string;
  classification: 'evidence' | 'non_claim';
  evidence_ids: string[];
  evidence_hashes: string[];
  rationale: string | null;
};
const binding = (
  path: string,
  overrides: Partial<SurfaceBindingFixture> = {},
): SurfaceBindingFixture => ({
  path,
  classification: 'evidence',
  evidence_ids: ['EVD-VERIFIED-001'],
  evidence_hashes: [HASH],
  rationale: null,
  ...overrides,
});

const cvBindings = () => [
  binding('/name'),
  binding('/headline'),
  binding('/contact_lines/0'),
  binding('/summary'),
  binding('/experience/0/organization'),
  binding('/experience/0/role'),
  binding('/experience/0/period'),
  binding('/skills/0'),
];

const letterBindings = () => [
  binding('/addressee'),
  binding('/subject'),
  binding('/paragraphs/0'),
  binding('/paragraphs/1'),
];

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
  surface_bindings: cvBindings(),
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
  subject: 'Product Lead',
  paragraphs: ['Párrafo sintético uno.', 'Párrafo sintético dos.'],
  claims: [claim(claimOverrides)],
  source_refs: ['work/private/evidence/result.md'],
  surface_bindings: letterBindings(),
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

  it('rejects a CV whose auxiliary claim is valid but a rendered factual surface is unbound', () => {
    const document = cv();
    document.summary = 'Dirigió una transformación regional no demostrada.';
    document.surface_bindings = document.surface_bindings.filter(
      ({path}: {path: string}) => path !== '/summary',
    );
    expect(() => assertCareerEvidence(document, bank())).toThrow(/UNBOUND_VISIBLE_TEXT/u);
  });

  it('rejects letter paragraphs that make factual claims outside the validated claim array', () => {
    const document = letter();
    document.paragraphs = [
      'Incrementé ingresos un 80% en una región completa.',
      'El claim auxiliar separado sí tiene evidencia.',
    ];
    document.surface_bindings = [binding('/paragraphs/1')];
    expect(() => assertCareerEvidence(document, bank())).toThrow(/UNBOUND_VISIBLE_TEXT/u);
  });

  it.each([
    ['CV name', cv(), '/name'],
    ['CV contact', cv(), '/contact_lines/0'],
    ['letter addressee', letter(), '/addressee'],
    ['letter subject', letter(), '/subject'],
  ])('requires an exact surface binding for rendered %s', (_label, document, path) => {
    document.surface_bindings = document.surface_bindings.filter(
      ({path: candidate}: SurfaceBindingFixture) => candidate !== path,
    );
    expect(() => assertCareerEvidence(document, bank())).toThrow(
      new RegExp(`UNBOUND_VISIBLE_TEXT:${path}`, 'u'),
    );
  });

  it.each([
    ['CV', cv(), '/contact_lines/9'],
    ['letter', letter(), '/paragraphs/9'],
  ])(
    'rejects a valid auxiliary claim plus an extra non-rendered %s binding',
    (_label, document, path) => {
      document.surface_bindings.push(binding(path));
      expect(() => assertCareerEvidence(document, bank())).toThrow(
        new RegExp(`NON_RENDERED_BINDING:${path}`, 'u'),
      );
    },
  );

  it.each([
    ['CV summary', cv(), '/summary'],
    ['letter paragraph', letter(), '/paragraphs/0'],
  ])(
    'does not accept non_claim as an escape hatch for factual %s text',
    (_label, document, path) => {
      document.surface_bindings = document.surface_bindings.map((surface: SurfaceBindingFixture) =>
        surface.path === path
          ? binding(path, {
              classification: 'non_claim',
              evidence_ids: [],
              evidence_hashes: [],
              rationale: 'Declared non-claim despite factual content.',
            })
          : surface,
      );
      expect(() => assertCareerEvidence(document, bank())).toThrow(/NON_CLAIM_VISIBLE_TEXT/u);
    },
  );
});
