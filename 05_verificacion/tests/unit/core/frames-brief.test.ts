import {describe, expect, it} from 'vitest';

import {FRAMES_BRIEF_SECTIONS} from 'workflows/multimedia/_schema/brief-v1.schema.ts';
import {
  createFramesBriefMarkdown,
  parseFramesBriefMarkdown,
  sha256Text,
  type FramesBriefDraftV1,
} from 'workflows/multimedia/_runner/brief-model.ts';
import {verifyBriefParity} from 'workflows/multimedia/_runner/brief-parity.ts';
import {renderFramesBriefHtml} from 'workflows/multimedia/_runner/brief-renderer.ts';

const draft: FramesBriefDraftV1 = {
  schema_version: 'frames-brief-v1',
  brief_id: 'BRIEF-PIEZA-001',
  identity: {brand: 'MetodologIA', owner: 'Content Producer'},
  intent: {
    request: 'Ayúdame a generar una pieza',
    request_hash: sha256Text('ayúdame a generar una pieza'),
    content_class: 'single',
  },
  sources: [
    {
      source_id: 'SRC-001',
      ref: '03_conocimiento/sources/source-ledger.md',
      sha256: null,
      authority: 'unknown',
      rights: 'unknown',
    },
  ],
  audience: 'Responsables de contenido que requieren una pieza verificable.',
  objective: 'Definir una pieza antes de producirla.',
  format: {medium: 'html', channel: 'web', specification: 'Responsive y accesible.'},
  workflow_selected: ['P03', 'P05', 'P07', 'P08'],
  skills: ['content-os-router', 'content-os-creative'],
  restrictions: ['No publicar sin aprobación humana.'],
  state: 'BRIEF_DRAFT',
  next_gate: 'MW_BRIEF_APPROVED',
};

const sections = FRAMES_BRIEF_SECTIONS.map((id, index) => ({
  id,
  markdown:
    id === 'Diagrama'
      ? '```mermaid\nflowchart LR\n  A[Brief] --> B[Revisión]\n```'
      : `Contenido verificable de la sección ${index + 1}.`,
}));

describe('FramesBriefV1 markdown/html contract', () => {
  it('creates and parses the canonical twelve-section Markdown brief', () => {
    const markdown = createFramesBriefMarkdown(draft, sections);
    const parsed = parseFramesBriefMarkdown(markdown);

    expect(parsed.frontmatter).toMatchObject(draft);
    expect(parsed.frontmatter.content_sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(parsed.sections.map((section) => section.id)).toEqual(FRAMES_BRIEF_SECTIONS);
    expect(parsed.sections).toHaveLength(12);
  });

  it('renders byte-identical HTML and reports semantic parity on repeated runs', () => {
    const markdown = createFramesBriefMarkdown(draft, sections);
    const first = renderFramesBriefHtml(markdown);
    const second = renderFramesBriefHtml(markdown);
    const parity = verifyBriefParity(markdown, first);

    expect(first).toBe(second);
    expect(parity).toEqual({
      status: 'PASS',
      content_sha256: parseFramesBriefMarkdown(markdown).frontmatter.content_sha256,
      issues: [],
    });
    expect(first).toContain('id="frames-brief-data"');
    expect(first).toContain('data-content-sha256=');
    expect(first).toContain('<svg');
  });

  it('rejects editorial drift in Markdown through the hash binding', () => {
    const markdown = createFramesBriefMarkdown(draft, sections);
    const tampered = markdown.replace(
      'Contenido verificable de la sección 1.',
      'Contenido alterado sin rebaseline.',
    );

    expect(() => parseFramesBriefMarkdown(tampered)).toThrow(/content_sha256 mismatch/u);
  });

  it('fails parity when canonical JSON or the HTML hash is altered', () => {
    const markdown = createFramesBriefMarkdown(draft, sections);
    const html = renderFramesBriefHtml(markdown);
    const hash = parseFramesBriefMarkdown(markdown).frontmatter.content_sha256;
    const tampered = html
      .replace('"content_class":"single"', '"content_class":"campaign"')
      .replace(`data-content-sha256="${hash}"`, `data-content-sha256="${'f'.repeat(64)}"`);
    const parity = verifyBriefParity(markdown, tampered);

    expect(parity.status).toBe('FAIL');
    expect(parity.issues).toEqual(
      expect.arrayContaining([
        'HTML_CANONICAL_MODEL_MISMATCH',
        'HTML_CONTENT_HASH_MISMATCH',
        'HTML_PROJECTION_NOT_DETERMINISTIC',
      ]),
    );
  });

  it('rejects missing or reordered sections before rendering', () => {
    expect(() => createFramesBriefMarkdown(draft, sections.slice(1))).toThrow();
    expect(() =>
      createFramesBriefMarkdown(draft, [sections[1]!, sections[0]!, ...sections.slice(2)]),
    ).toThrow(/Expected section 1/u);
  });
});
