import type {ExperienceWorkflowDefinitionV1} from './experience-planner-v1.ts';

const R6_SKILLS: Record<string, string> = {
  P00: 'content-os-core',
  P01: 'content-os-media',
  P02: 'content-os-core',
  P03: 'content-os-creative',
  P04: 'content-os-core',
  P05: 'content-os-creative',
  P06: 'content-os-media',
  P07: 'content-os-core',
  P08: 'content-os-creative',
  P09: 'content-os-core',
};

const contentStep = (
  stepId: string,
  outputs: string[],
  sourceRefs: string[],
): ExperienceWorkflowDefinitionV1['steps'][number] => ({
  stepId,
  primarySkillId: R6_SKILLS[stepId] ?? 'content-os-core',
  verifierSkillId: 'RT-09',
  templateRef: `02_proceso/workflows/multimedia/${stepId.toLowerCase()}-${
    {
      P00: 'definir-sistema',
      P01: 'curar-material',
      P02: 'investigar',
      P03: 'crear-brief',
      P04: 'calendarizar',
      P05: 'disenar-pieza',
      P06: 'crear-activos',
      P07: 'revisar',
      P08: 'editar',
      P09: 'distribuir',
    }[stepId]
  }/task-template.yaml`,
  sourceRefs,
  expectedOutputs: outputs,
  acceptanceCriteria: ['Brief Markdown/HTML material, determinista y sin claims no respaldados.'],
  stopRule: 'Detener en EXP_BRIEF_APPROVED; sin distribución ni publicación.',
});

const careerStep = (
  stepId: string,
  outputs: string[],
  sourceRefs: string[],
): ExperienceWorkflowDefinitionV1['steps'][number] => ({
  stepId,
  primarySkillId: 'career-application-orchestrator',
  verifierSkillId: 'RT-09',
  templateRef: `02_proceso/workflows/career/${stepId.toLowerCase()}-${
    {
      C00: 'intake',
      C01: 'evidence',
      C02: 'positioning',
      C03: 'discovery',
      C04: 'scoring',
      C05: 'application-design',
      C06: 'cv',
      C07: 'cover-letter',
      C08: 'package-qa',
      C09: 'submission',
    }[stepId]
  }/workflow.yml`,
  sourceRefs,
  expectedOutputs: outputs,
  acceptanceCriteria: ['Career brief Markdown/HTML evidence-first con paridad determinista.'],
  stopRule: 'Detener en EXP_BRIEF_APPROVED; sin postulación ni efectos externos.',
});

export function createProductiveExperienceWorkflowDefinitionsV1(input: {
  briefMarkdownRef: string;
  briefHtmlRef: string;
  sourceRefs: string[];
}): ExperienceWorkflowDefinitionV1[] {
  const outputs = [input.briefMarkdownRef, input.briefHtmlRef];
  return [
    {
      routeId: 'R6',
      workflowId: 'FRAMES.CONTENT.BRIEF',
      actorId: 'RT-04',
      steps: Object.keys(R6_SKILLS).map((stepId) => contentStep(stepId, outputs, input.sourceRefs)),
    },
    {
      routeId: 'R7',
      workflowId: 'FRAMES.CAREER.BRIEF',
      actorId: 'RT-04',
      steps: ['C00', 'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09'].map((stepId) =>
        careerStep(stepId, outputs, input.sourceRefs),
      ),
    },
  ];
}
