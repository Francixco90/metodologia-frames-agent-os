import {describe, expect, it} from 'vitest';

import {CAREER_BRIEF_SECTIONS} from 'workflows/career/_schema/brief-v1.schema.ts';
import {
  createCareerBriefMarkdown,
  parseCareerBriefMarkdown,
  type CareerBriefDraftV1,
} from 'workflows/career/_runner/brief-model.ts';
import {
  renderCareerBriefHtml,
  verifyCareerBriefParity,
} from 'workflows/career/_runner/brief-renderer.ts';
import {sha256Text} from 'workflows/career/_runner/canonical.ts';
import {
  calculateCareerDocumentHash,
  parseCareerLetter,
} from 'workflows/career/_runner/document-model.ts';
import {calculateEvidenceBankHash} from 'workflows/career/_runner/evidence-gate.ts';
import {
  renderCareerCvHtml,
  renderCareerLetterHtml,
  verifyCareerDocumentParity,
} from 'workflows/career/_runner/document-renderer.ts';

const HASH = 'a'.repeat(64);
const briefDraft: CareerBriefDraftV1 = {
  schema_version: 'career-brief-v1',
  brief_id: 'CBRIEF-SYNTHETIC-001',
  brief_kind: 'candidate-foundation',
  candidate_id: 'CAND-SYNTHETIC-001',
  application_id: null,
  display_identity: 'candidate-neutral-ats',
  generated_by: 'MetodologIA',
  request: 'Créame un CV basado en evidencia.',
  request_hash: sha256Text('Créame un CV basado en evidencia.'),
  sources: [{ref: 'work/private/evidence/profile.yml', sha256: HASH}],
  language: 'es',
  workflow_selected: ['C00', 'C01', 'C02', 'C06', 'C08'],
  skills: ['career-application-orchestrator', 'evidence-first-cv'],
  state: 'BRIEF_DRAFT',
  next_gate: 'CR_BRIEF_APPROVED',
};
const sectionContent = Object.fromEntries(
  CAREER_BRIEF_SECTIONS.map((section, index) => [section, `Contenido sintético ${index + 1}.`]),
) as Record<(typeof CAREER_BRIEF_SECTIONS)[number], string>;

const claim = {
  claim_id: 'CLM-SYNTHETIC-001',
  text: 'Redujo el ciclo operativo 30% durante un trimestre medido.',
  evidence_ids: ['EVD-SYNTHETIC-001'],
  evidence_hashes: [HASH],
};
const unsignedBank = {
  schema_version: 'evidence-bank-v1' as const,
  candidate_id: 'CAND-SYNTHETIC-001',
  evidence: [
    {
      evidence_id: 'EVD-SYNTHETIC-001',
      claim: claim.text,
      context: 'Contexto sintético.',
      action_method: 'Método sintético.',
      result: 'Resultado sintético.',
      metric: '30% durante un trimestre',
      source_ref: 'work/private/evidence/profile.yml',
      source_sha256: HASH,
      confidence: 'verified' as const,
      allowed_channels: ['cv' as const, 'letter' as const],
      constraints: [],
    },
  ],
};
const evidenceBank = {
  ...unsignedBank,
  bank_sha256: calculateEvidenceBankHash(unsignedBank as never),
};
const surface = (path: string) => ({
  path,
  classification: 'evidence' as const,
  evidence_ids: ['EVD-SYNTHETIC-001'],
  evidence_hashes: [HASH],
  rationale: null,
});
const cvWithoutHash = {
  schema_version: 'career-cv-v1',
  document_id: 'CV-SYNTHETIC-001',
  candidate_id: 'CAND-SYNTHETIC-001',
  application_id: null,
  language: 'es',
  design_profile: 'candidate-neutral-ats',
  authorized_brand: null,
  generated_by: 'MetodologIA',
  name: 'Candidata <Sintética>',
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
  education: ['Programa sintético'],
  skills: ['Product Operations', 'Evidence systems'],
  source_refs: ['work/private/evidence/profile.yml'],
  surface_bindings: [
    '/headline',
    '/summary',
    '/experience/0/organization',
    '/experience/0/role',
    '/experience/0/period',
    '/experience/0/location',
    '/education/0',
    '/skills/0',
    '/skills/1',
  ].map(surface),
} as const;
const cv = {...cvWithoutHash, content_sha256: calculateCareerDocumentHash(cvWithoutHash as never)};

const words = (prefix: string, count: number): string =>
  Array.from({length: count}, (_, index) => `${prefix}${index + 1}`).join(' ');
const letterWithoutHash = {
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
  addressee: 'Equipo de selección',
  subject: 'Product Operations Lead',
  paragraphs: [words('evidencia', 90), words('impacto', 90)],
  claims: [claim],
  source_refs: ['work/private/evidence/profile.yml'],
  surface_bindings: ['/paragraphs/0', '/paragraphs/1'].map(surface),
} as const;
const letter = {
  ...letterWithoutHash,
  content_sha256: calculateCareerDocumentHash(letterWithoutHash as never),
};

describe('Career Markdown, HTML and document parity', () => {
  it('creates the canonical twelve-section brief and renders byte-identical HTML', () => {
    const markdown = createCareerBriefMarkdown(briefDraft, sectionContent);
    const parsed = parseCareerBriefMarkdown(markdown);
    const first = renderCareerBriefHtml(markdown);
    const second = renderCareerBriefHtml(markdown);

    expect(parsed.sections.map(({id}) => id)).toEqual(CAREER_BRIEF_SECTIONS);
    expect(parsed.frontmatter.content_sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first).toBe(second);
    expect(verifyCareerBriefParity(markdown, first)).toEqual([]);
    expect(first).toContain('id="career-brief-data"');
  });

  it('blocks brief editorial drift and HTML-only content', () => {
    const markdown = createCareerBriefMarkdown(briefDraft, sectionContent);
    expect(() =>
      parseCareerBriefMarkdown(markdown.replace('Contenido sintético 1.', 'Contenido alterado.')),
    ).toThrow(/content_sha256 mismatch/u);
    const html = renderCareerBriefHtml(markdown);
    expect(
      verifyCareerBriefParity(markdown, html.replace('</main>', '<p>Drift</p></main>')),
    ).toContain('HTML_PROJECTION_NOT_DETERMINISTIC');
  });

  it('renders an offline ATS-oriented CV while escaping hostile candidate text', () => {
    const html = renderCareerCvHtml(cv, evidenceBank);
    expect(html).toBe(renderCareerCvHtml(cv, evidenceBank));
    expect(verifyCareerDocumentParity(cv, evidenceBank, html)).toEqual([]);
    expect(html).toContain('<html lang="es">');
    expect(html).toContain('<main>');
    expect(html).toMatch(/@page\s*\{\s*size:\s*A4/iu);
    expect(html).toContain("default-src 'none'");
    expect(html).not.toMatch(/(?:src|href)=["']https?:/iu);
    expect(html).not.toContain('<Sintética>');
    expect(html).toContain('&lt;Sintética&gt;');
    expect(html).toContain('data-claim-id="CLM-SYNTHETIC-001"');
  });

  it('enforces letter channel length before rendering and preserves semantic parity', () => {
    expect(parseCareerLetter(letter).paragraphs.join(' ').split(/\s+/u)).toHaveLength(180);
    const html = renderCareerLetterHtml(letter, evidenceBank);
    expect(verifyCareerDocumentParity(letter, evidenceBank, html)).toEqual([]);
    expect(() => {
      const short = {
        ...letterWithoutHash,
        paragraphs: ['demasiado breve', 'sin evidencia suficiente'],
      };
      renderCareerLetterHtml(
        {...short, content_sha256: calculateCareerDocumentHash(short as never)},
        evidenceBank,
      );
    }).toThrow(/requires 180-280 words/u);
  });

  it('detects canonical model tampering even when visible HTML is unchanged', () => {
    const html = renderCareerCvHtml(cv, evidenceBank);
    const tampered = html.replace('"headline":"Product Operations Lead"', '"headline":"Invented"');
    expect(verifyCareerDocumentParity(cv, evidenceBank, tampered)).toEqual(
      expect.arrayContaining(['SEMANTIC_MODEL_MISMATCH', 'HTML_PROJECTION_NOT_DETERMINISTIC']),
    );
  });
});
