import {mkdirSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {runCareerBriefFirst, type CareerRunnerInput} from '../career/_runner/career-runner.ts';
import type {FRAMES_BRIEF_SECTIONS, FramesBriefV1} from '../multimedia/_schema/brief-v1.schema.ts';
import {createFramesBriefMarkdown, sha256Text} from '../multimedia/_runner/brief-model.ts';
import {verifyBriefParity} from '../multimedia/_runner/brief-parity.ts';
import {renderFramesBriefHtml} from '../multimedia/_runner/brief-renderer.ts';
import type {MaterialSkillHandlerV1} from './material-skill-adapter-v1.ts';

const atomicWrite = (path: string, value: string): void => {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value, 'utf8');
  renameSync(temporary, path);
};

const section = (id: (typeof FRAMES_BRIEF_SECTIONS)[number], markdown: string) => ({
  id,
  markdown,
});

export function createContentBriefMaterialHandlerV1(input: {
  root: string;
  request: string;
  requestHash: string;
  contentClass: string;
  audience: string;
  objective: string;
  workflowPlan: Array<
    'P00' | 'P01' | 'P02' | 'P03' | 'P04' | 'P05' | 'P06' | 'P07' | 'P08' | 'P09'
  >;
  channels: string[];
  restrictions: string[];
  sources: Array<{ref: string; sha256: string}>;
}): MaterialSkillHandlerV1 {
  return (workOrder) => {
    const markdownRef = workOrder.expectedOutputs.find((ref) => ref.endsWith('.md'));
    const htmlRef = workOrder.expectedOutputs.find((ref) => ref.endsWith('.html'));
    if (!markdownRef || !htmlRef) throw new Error('CONTENT_BRIEF_OUTPUTS_UNRESOLVED');
    const sourceLines = input.sources.length
      ? input.sources.map(({ref, sha256}) => `- ${ref} · sha256:${sha256}`).join('\n')
      : '- Sin fuente material; no se incorporan claims.';
    const skills = [...new Set(workOrder.skillId ? [workOrder.skillId] : [])];
    const sections: FramesBriefV1['sections'] = [
      section('Resultado esperado', `Preparar un brief gobernado para: ${input.request}`),
      section('Pedido interpretado', `Clase: ${input.contentClass}. Estado: BRIEF_DRAFT.`),
      section(
        'Audiencia, problema y acción',
        `Audiencia: ${input.audience}. Acción: ${input.objective}.`,
      ),
      section(
        'Evidencia, fuentes y supuestos',
        `${sourceLines}\n- No se infieren claims ausentes.`,
      ),
      section(
        'Propuesta creativa',
        'Dirección por aprobar; se limitará al objetivo y evidencia declarados.',
      ),
      section('Steps y milestones', input.workflowPlan.map((step) => `- ${step}`).join('\n')),
      section('Deliverables', `- ${markdownRef}\n- ${htmlRef}`),
      section('Skills y responsabilidades', skills.map((skill) => `- ${skill}`).join('\n')),
      section(
        'Riesgos, límites y casos borde',
        '- Sin distribución.\n- Evidencia insuficiente bloquea claims.',
      ),
      section(
        'Criterios de aceptación',
        '- Paridad MD/HTML.\n- Hashes materiales.\n- Aprobación humana.',
      ),
      section('Diagrama', '```mermaid\nflowchart LR\n  A[Brief] --> B{EXP_BRIEF_APPROVED}\n```'),
      section(
        'Decisión y siguiente gate',
        'BRIEF_DRAFT → EXP_BRIEF_APPROVED. Detener antes de producir.',
      ),
    ];
    const markdown = createFramesBriefMarkdown(
      {
        schema_version: 'frames-brief-v1',
        brief_id: `BRIEF-${input.requestHash.slice(0, 16).toUpperCase()}`,
        identity: {brand: 'MetodologIA', owner: 'Frames ContentOS'},
        intent: {
          request: input.request,
          request_hash: input.requestHash,
          content_class: input.contentClass,
        },
        sources: input.sources.map(({ref, sha256}, index) => ({
          source_id: `SRC-${index + 1}`,
          ref,
          sha256,
          authority: 'verified',
          rights: 'unknown',
        })),
        audience: input.audience,
        objective: input.objective,
        format: {
          medium: input.contentClass,
          channel: input.channels[0] ?? 'por-definir',
          specification: 'Brief previo a producción; sin efectos externos.',
        },
        workflow_selected: input.workflowPlan,
        skills,
        restrictions: input.restrictions,
        state: 'BRIEF_DRAFT',
        next_gate: 'EXP_BRIEF_APPROVED',
      },
      sections,
    );
    const html = renderFramesBriefHtml(markdown);
    if (verifyBriefParity(markdown, html).status !== 'PASS')
      throw new Error('CONTENT_BRIEF_PARITY_FAILED');
    atomicWrite(resolve(input.root, markdownRef), markdown);
    atomicWrite(resolve(input.root, htmlRef), html);
    const outputs = [
      {ref: markdownRef, sha256: sha256Text(markdown)},
      {ref: htmlRef, sha256: sha256Text(html)},
    ];
    return {
      status: 'PASS',
      outputs,
      evidence: input.sources.length > 0 ? input.sources : [outputs[0]!],
      publicSummary: 'Brief materializado.',
    };
  };
}

export function createCareerBriefMaterialHandlerV1(
  input: CareerRunnerInput,
): MaterialSkillHandlerV1 {
  return (workOrder) => {
    const result = runCareerBriefFirst({...input, dryRun: false});
    const outputs = [
      {ref: result.brief.markdown_ref, sha256: result.brief.content_sha256},
      {ref: result.brief.html_ref, sha256: result.brief.html_sha256},
    ];
    if (outputs.some(({ref}) => !workOrder.expectedOutputs.includes(ref))) {
      throw new Error('CAREER_BRIEF_OUTPUT_MISMATCH');
    }
    return {
      status: 'PASS',
      outputs,
      evidence: workOrder.inputs.length > 0 ? workOrder.inputs : [outputs[0]!],
      publicSummary: 'Career brief materializado.',
    };
  };
}
