import {describe, expect, it} from 'vitest';

import {FRAMES_DELIVERABLE_SECTIONS} from 'workflows/multimedia/_schema/deliverable-v1.schema.ts';
import {
  createFramesDeliverableMarkdown,
  parseFramesDeliverableMarkdown,
  type FramesDeliverableDraftV1,
} from 'workflows/multimedia/_runner/deliverable-model.ts';
import {verifyDeliverableParity} from 'workflows/multimedia/_runner/deliverable-parity.ts';
import {renderFramesDeliverableHtml} from 'workflows/multimedia/_runner/deliverable-renderer.ts';

const draft: FramesDeliverableDraftV1 = {
  schema_version: 'frames-deliverable-v1',
  instance_id: 'DELIV-CAMPAIGN-001',
  deliverable_id: 'campaign-charter-v1',
  display_name: 'Charter de campaña',
  workflow_id: 'P03',
  deliverable_class: 'strategy',
  touchpoint: 'final',
  identity: {brand: 'MetodologIA', owner: 'Content Producer'},
  audience: 'Equipo de campaña y aprobadores.',
  purpose: 'Alinear alcance, resultado, piezas y decisión antes de producir.',
  sources: [
    {
      source_id: 'campaign-source',
      ref: 'fixture://campaign',
      sha256: 'e'.repeat(64),
      authority: 'verified',
      rights: 'cleared',
    },
  ],
  formats: ['md', 'html'],
  piece_families: ['carousel', 'story', 'miniclip'],
  companion_for: null,
  skills: ['content-os-creative'],
  fields: [
    {
      field_id: 'campaign-objective',
      label: 'Objetivo de campaña',
      value_type: 'text',
      status: 'observed',
      value: 'Conseguir una decisión verificable.',
      source_refs: ['campaign-source'],
    },
  ],
  state: 'RENDERED_DRAFT',
  next_gate: 'MW_BRIEF_APPROVED',
};

const sections = FRAMES_DELIVERABLE_SECTIONS.map((id, index) => ({
  id,
  markdown: `Contenido verificable ${index + 1}.`,
}));

describe('FramesDeliverableV1 markdown/html contract', () => {
  it('creates the same ordered contract for every deliverable class', () => {
    const markdown = createFramesDeliverableMarkdown(draft, sections);
    const parsed = parseFramesDeliverableMarkdown(markdown);

    expect(parsed.frontmatter).toMatchObject(draft);
    expect(parsed.sections.map(({id}) => id)).toEqual(FRAMES_DELIVERABLE_SECTIONS);
    expect(parsed.frontmatter.content_sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('renders deterministic MetodologIA HTML with semantic parity', () => {
    const markdown = createFramesDeliverableMarkdown(draft, sections);
    const first = renderFramesDeliverableHtml(markdown);
    const second = renderFramesDeliverableHtml(markdown);

    expect(first).toBe(second);
    expect(verifyDeliverableParity(markdown, first)).toMatchObject({status: 'PASS', issues: []});
    expect(first).toContain('MetodologIA · Entregable canónico');
    expect(first).toContain('id="frames-deliverable-data"');
    expect(first).toContain('data-content-sha256=');
    expect(first).toContain('name="robots" content="noindex,nofollow,noarchive"');
    expect(first).toContain('http-equiv="Content-Security-Policy"');
    expect(first).toContain('name="frames:document-type" content="deliverable"');
    expect(first).toContain(`name="frames:model-id" content="${draft.deliverable_id}"`);
    expect(first).toContain(`name="frames:workflow-id" content="${draft.workflow_id}"`);
    expect(first).toContain('aria-label="Contenido del documento"');
    expect(first).toContain('RENDERED_DRAFT ≠ HUMAN_APPROVED ≠ READY ≠ PUBLISHED');
  });

  it('blocks unknown fields from RENDERED_DRAFT and rejects editorial drift', () => {
    expect(() =>
      createFramesDeliverableMarkdown(
        {
          ...draft,
          fields: [{...draft.fields[0]!, status: 'unknown'}],
        },
        sections,
      ),
    ).toThrow(/forbids unknown fields/u);

    const markdown = createFramesDeliverableMarkdown(draft, sections);
    expect(() =>
      parseFramesDeliverableMarkdown(markdown.replace('Contenido verificable 1.', 'Alterado.')),
    ).toThrow(/content_sha256 mismatch/u);
  });

  it('blocks observed evidence without a declared or referenced source', () => {
    expect(() => createFramesDeliverableMarkdown({...draft, sources: []}, sections)).toThrow(
      /SourceRef must resolve/u,
    );
    expect(() =>
      createFramesDeliverableMarkdown(
        {...draft, fields: [{...draft.fields[0]!, source_refs: []}]},
        sections,
      ),
    ).toThrow(/requires a declared hash-bound source/u);
  });

  it('fails parity when HTML canonical data drifts', () => {
    const markdown = createFramesDeliverableMarkdown(draft, sections);
    const html = renderFramesDeliverableHtml(markdown).replace(
      '"deliverable_class":"strategy"',
      '"deliverable_class":"planning"',
    );
    expect(verifyDeliverableParity(markdown, html).status).toBe('FAIL');
  });
});
