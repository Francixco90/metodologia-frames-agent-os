import {
  AssistanceEnvelopeV1Schema,
  FramesWorkOrderV1Schema,
  assertDecisionSelectionV1,
  hashExperienceValue,
  type AssistanceEnvelopeV1,
  type DecisionFunnelV1,
  type DecisionSelectionV1,
  type FramesWorkOrderV1,
  type MaterialReferenceV1,
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
  decisionFunnelSha256: string;
  decisionSelectionSha256: string;
  selectedOptionId: string;
}

export interface ExperienceDecisionContextV1 {
  funnel: DecisionFunnelV1;
  selection: DecisionSelectionV1;
}

export interface ExperienceDecisionReferencesV1 {
  funnel: MaterialReferenceV1;
  selection: MaterialReferenceV1;
}

const verifyDecisionBinding = (
  envelopeInput: AssistanceEnvelopeV1,
  decision: ExperienceDecisionContextV1,
) => {
  const envelope = AssistanceEnvelopeV1Schema.parse(envelopeInput);
  const verified = assertDecisionSelectionV1(decision.funnel, decision.selection);
  if (
    verified.funnel.requestHash !== envelope.requestHash ||
    verified.funnel.canonicalSha256 !== envelope.decisionFunnelSha256 ||
    verified.selection.canonicalSha256 !== envelope.decisionSelectionSha256
  ) {
    throw new Error('EXPERIENCE-DECISION-BINDING-DRIFT');
  }
  return verified;
};

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
  decision: ExperienceDecisionContextV1,
): ExperienceWorkflowPlanV1 {
  if (envelope.selectedRoute === null || envelope.state !== 'READY_FOR_BRIEF') {
    throw new Error('A route-locked READY_FOR_BRIEF envelope is required.');
  }
  const definition = definitions.find(({routeId}) => routeId === envelope.selectedRoute);
  if (definition === undefined || definition.steps.length === 0) {
    throw new Error(`No executable workflow resolves route ${envelope.selectedRoute}.`);
  }
  const verified = verifyDecisionBinding(envelope, decision);
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
    decisionFunnelSha256: verified.funnel.canonicalSha256,
    decisionSelectionSha256: verified.selection.canonicalSha256,
    selectedOptionId: verified.selection.selectedOptionId,
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
  input: {
    workOrderId: string;
    actorId: string;
    inputRefs: Array<{ref: string; sha256: string}>;
    decisionRefs: ExperienceDecisionReferencesV1;
    decision: ExperienceDecisionContextV1;
    writeSet?: string[];
    effectClass?: 'READ_ONLY' | 'LOCAL_REVERSIBLE';
  },
): FramesWorkOrderV1 {
  const step = plan.steps[0];
  if (step === undefined || envelope.selectedRoute !== plan.routeId) {
    throw new Error('Work order requires an active step bound to the selected route.');
  }
  const verified = verifyDecisionBinding(envelope, input.decision);
  if (verified.selection.selectedOptionId !== plan.selectedOptionId) {
    throw new Error('EXPERIENCE-DECISION-PLAN-DRIFT');
  }
  if (
    input.decisionRefs.funnel.sha256 !== plan.decisionFunnelSha256 ||
    input.decisionRefs.selection.sha256 !== plan.decisionSelectionSha256
  ) {
    throw new Error('EXPERIENCE-DECISION-REF-DRIFT');
  }
  const inputRefs = [input.decisionRefs.funnel, input.decisionRefs.selection, ...input.inputRefs];
  if (new Set(inputRefs.map(({ref}) => ref)).size !== inputRefs.length) {
    throw new Error('EXPERIENCE-DECISION-REF-ALIAS');
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
    writeSet: input.writeSet ?? [],
    inputs: inputRefs,
    expectedOutputs: step.expectedOutputs,
    tools: [],
    effectClass: input.effectClass ?? ('READ_ONLY' as const),
    budget: {targetFiles: 8, maxFiles: 14, targetTokens: 8_000, maxTokens: 14_000},
    acceptanceCriteria: step.acceptanceCriteria,
    stopRule: step.stopRule,
  };
  return FramesWorkOrderV1Schema.parse({...draft, canonicalSha256: hashExperienceValue(draft)});
}
