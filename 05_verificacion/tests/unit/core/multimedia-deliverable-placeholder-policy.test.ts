import {describe, expect, it} from 'vitest';

import {
  FRAMES_DELIVERABLE_SECTIONS,
  FramesDeliverableV1Schema,
} from 'workflows/multimedia/_schema/deliverable-v1.schema.ts';

const validDocument = () => ({
  frontmatter: {
    schema_version: 'frames-deliverable-v1' as const,
    instance_id: 'DELIV-P07-PLACEHOLDER-POLICY',
    deliverable_id: 'review-report-v1',
    display_name: 'Reporte de revisión',
    workflow_id: 'P07' as const,
    deliverable_class: 'review' as const,
    touchpoint: 'final' as const,
    identity: {brand: 'MetodologIA' as const, owner: 'Test Author'},
    audience: 'Verifier independiente.',
    purpose: 'Verificar placeholders sin falsos positivos.',
    sources: [
      {
        source_id: 'verified-source',
        ref: 'fixtures/verified-source.txt',
        sha256: 'a'.repeat(64),
        authority: 'verified' as const,
        rights: 'cleared' as const,
      },
    ],
    formats: ['md' as const, 'html' as const],
    piece_families: ['other' as const],
    companion_for: null,
    skills: ['content-os-core'],
    fields: [
      {
        field_id: 'finding',
        label: 'Hallazgo',
        value_type: 'text' as const,
        status: 'observed' as const,
        value: 'Hallazgo verificado.' as string | string[],
        source_refs: ['verified-source'],
      },
    ],
    state: 'RENDERED_DRAFT' as 'DRAFT' | 'RENDERED_DRAFT' | 'BLOCKED',
    next_gate: 'G14',
    content_sha256: 'b'.repeat(64),
  },
  sections: FRAMES_DELIVERABLE_SECTIONS.map((id) => ({
    id,
    markdown: `${id}: contenido verificado.`,
  })),
});

type Surface = 'scalar' | 'array' | 'section';
const promotedCases: Array<[name: string, surface: Surface, value: string]> = [
  ['scalar bullet with colon suffix', 'scalar', '- TODO: completar claim'],
  ['array bullet with hyphen suffix', 'array', '* TBD - definir fecha'],
  ['section bullet with colon suffix', 'section', '+ PENDIENTE: aprobación'],
  ['bare marker with colon suffix', 'scalar', 'TODO: completar claim'],
  ['array marker with underscore suffix', 'array', 'UNRESOLVED_definir owner'],
  ['section bullet with em dash suffix', 'section', '- PENDING — aprobar copy'],
  ['structured scalar', 'scalar', 'Campo: TODO: completar'],
  ['structured scalar bullet', 'scalar', '- Campo: TODO — completar'],
  ['structured array', 'array', 'Campo: TODO: completar'],
  ['structured array bullet', 'array', '- Campo: TODO — completar'],
  ['structured section', 'section', 'Campo: TODO: completar'],
  ['structured section bullet', 'section', '- Campo: TODO — completar'],
];

describe('deliverable placeholder policy', () => {
  it.each(promotedCases)('blocks promoted %s at its exact surface', (_name, surface, value) => {
    const document = validDocument();
    const section = surface === 'section';
    if (section) document.sections[0]!.markdown = value;
    else document.frontmatter.fields[0]!.value = surface === 'array' ? [value] : value;
    const result = FramesDeliverableV1Schema.safeParse(document);

    expect(result.success).toBe(false);
    if (result.success) return;
    const expectedPath = section
      ? ['sections', 0, 'markdown']
      : ['frontmatter', 'fields', 0, 'value'];
    expect(
      result.error.issues.some(
        (issue) =>
          JSON.stringify(issue.path) === JSON.stringify(expectedPath) &&
          issue.message.includes('MW-PLACEHOLDER001'),
      ),
    ).toBe(true);
  });

  it('accepts ordinary prose and completed bullets without marker-root semantics', () => {
    const document = validDocument();
    document.frontmatter.fields[0]!.value =
      'El equipo cerró TODO el alcance previsto y documentó la decisión.';
    document.sections[0]!.markdown = [
      'La revisión cubrió TODO el material declarado sin tareas pendientes.',
      '- Claim verificado',
      '* Fecha definida',
      '+ Aprobación recibida',
    ].join('\n');

    expect(FramesDeliverableV1Schema.safeParse(document).success).toBe(true);
  });

  it.each(['DRAFT', 'BLOCKED'] as const)('allows typed TODO bullets while state is %s', (state) => {
    const document = validDocument();
    document.frontmatter.state = state;
    document.frontmatter.fields[0]!.value = ['- TODO: completar claim', '* TBD - definir fecha'];
    document.sections[0]!.markdown = '+ PENDIENTE: aprobación';

    expect(FramesDeliverableV1Schema.safeParse(document).success).toBe(true);
  });
});
