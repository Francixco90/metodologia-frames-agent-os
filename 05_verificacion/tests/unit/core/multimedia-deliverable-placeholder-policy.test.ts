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

type Document = ReturnType<typeof validDocument>;
const promotedCases: Array<{
  name: string;
  path: string;
  mutate: (document: Document) => void;
}> = [
  {
    name: 'scalar bullet with colon suffix',
    path: 'frontmatter.fields.0.value',
    mutate: (document) => {
      document.frontmatter.fields[0]!.value = '- TODO: completar claim';
    },
  },
  {
    name: 'array bullet with hyphen suffix',
    path: 'frontmatter.fields.0.value',
    mutate: (document) => {
      document.frontmatter.fields[0]!.value = ['Hallazgo verificado.', '* TBD - definir fecha'];
    },
  },
  {
    name: 'section bullet with colon suffix',
    path: 'sections.0.markdown',
    mutate: (document) => {
      document.sections[0]!.markdown = '+ PENDIENTE: aprobación';
    },
  },
  {
    name: 'bare marker with colon suffix',
    path: 'frontmatter.fields.0.value',
    mutate: (document) => {
      document.frontmatter.fields[0]!.value = 'TODO: completar claim';
    },
  },
  {
    name: 'array marker with underscore suffix',
    path: 'frontmatter.fields.0.value',
    mutate: (document) => {
      document.frontmatter.fields[0]!.value = ['UNRESOLVED_definir owner'];
    },
  },
  {
    name: 'section bullet with em dash suffix',
    path: 'sections.0.markdown',
    mutate: (document) => {
      document.sections[0]!.markdown = '- PENDING — aprobar copy';
    },
  },
];

describe('deliverable placeholder policy', () => {
  it.each(promotedCases)('blocks promoted $name at its exact surface', ({mutate, path}) => {
    const document = validDocument();
    mutate(document);
    const result = FramesDeliverableV1Schema.safeParse(document);

    expect(result.success).toBe(false);
    if (result.success) return;
    const expectedPath = path
      .split('.')
      .map((part) => (/^[0-9]+$/u.test(part) ? Number(part) : part));
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
