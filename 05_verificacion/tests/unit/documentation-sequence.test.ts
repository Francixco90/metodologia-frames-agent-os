import {describe, expect, it} from 'vitest';

import {renderMermaid, renderSequenceSvg} from 'workflows/documentation/render.ts';
import {buildSequenceModel} from 'workflows/documentation/workflow-source.ts';

const workflow = {
  schemaVersion: 'workflow-documentation-v1',
  id: 'P03',
  family: 'content',
  title: 'Crear brief',
  purpose: 'Alinear el trabajo antes de producir.',
  command: '/crear-brief',
  source: '02_proceso/workflows/multimedia/p03-crear-brief/workflow.yml',
  inputs: ['intent-envelope'],
  deliverables: ['brief-v1'],
  gates: ['MW_BRIEF_APPROVED'],
  nextWorkflow: 'P05',
  stopRule: 'Detener antes de producir.',
  steps: [
    {
      id: 'S01',
      purpose: 'Interpretar la intención.',
      inputs: ['intent-envelope'],
      primarySkill: 'content-os-router',
      optionalSkills: [],
      verifier: 'RT-09',
      outputs: ['brief-v1'],
      gate: 'MW_BRIEF_APPROVED',
      stopRule: 'Detener ante evidencia insuficiente.',
    },
  ],
} as const;

describe('workflow sequence projections', () => {
  it('derives one work, evidence and decision message per canonical step', () => {
    const sequence = buildSequenceModel(workflow);
    expect(sequence.messages.filter(({kind}) => kind === 'work')).toHaveLength(
      workflow.steps.length,
    );
    expect(sequence.messages.filter(({kind}) => kind === 'evidence')).toHaveLength(
      workflow.steps.length,
    );
    expect(sequence.messages.filter(({kind}) => kind === 'decision')).toHaveLength(
      workflow.steps.length + 1,
    );
    expect(sequence.accessibleSummary).toHaveLength(workflow.steps.length + 2);
  });

  it('renders deterministic Mermaid and SVG from the same sequence', () => {
    const sequence = buildSequenceModel(workflow);
    expect(renderMermaid(sequence)).toBe(renderMermaid(sequence));
    expect(renderSequenceSvg(sequence)).toBe(renderSequenceSvg(sequence));
    expect(renderMermaid(sequence)).toContain('Gate MW_BRIEF_APPROVED');
    expect(renderSequenceSvg(sequence)).toContain('<desc id="seq-desc">');
  });
});
