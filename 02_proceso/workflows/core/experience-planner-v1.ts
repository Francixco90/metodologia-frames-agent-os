import {
  FramesWorkOrderV1Schema,
  hashExperienceValue,
  type AssistanceEnvelopeV1,
  type FramesWorkOrderV1,
} from '../../core/contracts/index.ts';

export interface ExperienceStepDefinitionV1 {
  stepId: string;
  primarySkillId: string;
  verifierSkillId?: string;
  templateRef: string;
  sourceRefs: string[];
  expectedOutputs: string[];
  acceptanceCriteria: string[];
  stopRule: string;
}

export interface ExperienceWorkflowDefinitionV1 {
  routeId: 'R6' | 'R7';
  workflowId: string;
  actorId: string;
  steps: ExperienceStepDefinitionV1[];
}

export interface ExperienceWorkflowPlanV1 {
  routeId: 'R6' | 'R7';
  workflowId: string;
  activeStep: string;
  steps: ExperienceStepDefinitionV1[];
}

export interface AutoPrimeResultV1 {
  routeId: 'R6' | 'R7';
  workflowId: string;
  activeStep: string;
  loadedRefs: string[];
  deferredStepIds: string[];
  primarySkillId: string;
  verifierSkillId: string | null;
  contextBudget: {targetFiles: number; maxFiles: number; targetTokens: number; maxTokens: number};
}

export function compileExperienceWorkflowPlanV1(
  envelope: AssistanceEnvelopeV1,
  definitions: readonly ExperienceWorkflowDefinitionV1[],
): ExperienceWorkflowPlanV1 {
  if (envelope.selectedRoute === null || envelope.state !== 'READY_FOR_BRIEF') {
    throw new Error('A route-locked READY_FOR_BRIEF envelope is required.');
  }
  const definition = definitions.find(({routeId}) => routeId === envelope.selectedRoute);
  if (definition === undefined || definition.steps.length === 0) {
    throw new Error(`No executable workflow resolves route ${envelope.selectedRoute}.`);
  }
  const selectedIds = new Set(envelope.workflowPlan);
  const steps = definition.steps.filter(({stepId}) => selectedIds.has(stepId));
  if (steps.length !== selectedIds.size || steps[0]?.stepId !== envelope.activeStep) {
    throw new Error('Envelope steps do not resolve exactly to the registered workflow.');
  }
  return {
    routeId: definition.routeId,
    workflowId: definition.workflowId,
    activeStep: steps[0].stepId,
    steps,
  };
}

export function autoPrimeExperienceV1(plan: ExperienceWorkflowPlanV1): AutoPrimeResultV1 {
  const step = plan.steps[0];
  if (step === undefined) {
    throw new Error('Cannot prime an empty workflow plan.');
  }
  const loadedRefs = [...new Set([step.templateRef, ...step.sourceRefs])];
  if (loadedRefs.length > 14) {
    throw new Error('Auto-prime hard maximum of 14 files exceeded.');
  }
  return {
    routeId: plan.routeId,
    workflowId: plan.workflowId,
    activeStep: step.stepId,
    loadedRefs,
    deferredStepIds: plan.steps.slice(1).map(({stepId}) => stepId),
    primarySkillId: step.primarySkillId,
    verifierSkillId: step.verifierSkillId ?? null,
    contextBudget: {targetFiles: 8, maxFiles: 14, targetTokens: 8_000, maxTokens: 14_000},
  };
}

export function createFramesWorkOrderV1(
  plan: ExperienceWorkflowPlanV1,
  envelope: AssistanceEnvelopeV1,
  input: {workOrderId: string; actorId: string; inputRefs: Array<{ref: string; sha256: string}>},
): FramesWorkOrderV1 {
  const step = plan.steps[0];
  if (step === undefined || envelope.selectedRoute !== plan.routeId) {
    throw new Error('Work order requires an active step bound to the selected route.');
  }
  const draft = {
    schemaVersion: 'frames-work-order-v1' as const,
    workOrderId: input.workOrderId,
    requestHash: envelope.requestHash,
    routeId: plan.routeId,
    workflowId: plan.workflowId,
    stepId: step.stepId,
    skillId: step.primarySkillId,
    actorId: input.actorId,
    readSet: [...new Set([step.templateRef, ...step.sourceRefs])],
    writeSet: [],
    inputs: input.inputRefs,
    expectedOutputs: step.expectedOutputs,
    tools: [],
    effectClass: 'READ_ONLY' as const,
    budget: {targetFiles: 8, maxFiles: 14, targetTokens: 8_000, maxTokens: 14_000},
    acceptanceCriteria: step.acceptanceCriteria,
    stopRule: step.stopRule,
  };
  return FramesWorkOrderV1Schema.parse({...draft, canonicalSha256: hashExperienceValue(draft)});
}
