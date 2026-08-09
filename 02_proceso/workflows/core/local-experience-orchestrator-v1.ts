import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {
  RelativePathSchema,
  type AssistanceEnvelopeV1,
  type MaterialReferenceV1,
} from '../../core/contracts/index.ts';
import type {CareerRunnerInput} from '../career/_runner/career-runner.ts';
import {
  createCareerBriefMaterialHandlerV1,
  createContentBriefMaterialHandlerV1,
} from './brief-material-handlers-v1.ts';
import {
  autoPrimeExperienceV1,
  compileExperienceWorkflowPlanV1,
  createFramesWorkOrderV1,
  type AutoPrimeResultV1,
} from './experience-planner-v1.ts';
import {MaterialSkillAdapterV1} from './material-skill-adapter-v1.ts';
import {createProductiveExperienceWorkflowDefinitionsV1} from './productive-workflow-definitions-v1.ts';

interface ContentIntentForBriefV1 {
  request: string;
  request_hash: string;
  content_class: string;
  audience: string | null;
  outcome: string | null;
  selected_stage_path: string[];
  channels: string[];
  restrictions: string[];
}

interface LocalExecutionBaseV1 {
  root: string;
  envelope: AssistanceEnvelopeV1;
  sourceMaterials: MaterialReferenceV1[];
  outputDirectoryRef?: string;
  actorId: string;
  startedAt: string;
  completedAt: string;
}

export type LocalExperienceExecutionInputV1 = LocalExecutionBaseV1 &
  (
    | {routeId: 'R6'; domainIntent: ContentIntentForBriefV1}
    | {
        routeId: 'R7';
        domainIntent: CareerRunnerInput['route'];
      }
  );

export interface LocalExperienceExecutionResultV1 {
  status: 'NEEDS_INPUT' | 'AWAITING_APPROVAL' | 'BLOCKED';
  routeId: 'R6' | 'R7';
  materialized: boolean;
  nextGate: 'EXP_BRIEF_APPROVED';
  autoPrime: AutoPrimeResultV1 | null;
  workOrderSha256: string | null;
  receiptRef: string | null;
  receiptSha256: string | null;
  brief: {markdownRef: string; htmlRef: string} | null;
}

const atomicWrite = (path: string, value: string): void => {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value, 'utf8');
  renameSync(temporary, path);
};

const digestFile = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

export async function orchestrateLocalExperienceV1(
  input: LocalExperienceExecutionInputV1,
): Promise<LocalExperienceExecutionResultV1> {
  if (
    input.envelope.selectedRoute !== input.routeId ||
    input.envelope.state !== 'READY_FOR_BRIEF' ||
    input.envelope.blockingGaps.length > 0
  ) {
    return {
      status: 'NEEDS_INPUT',
      routeId: input.routeId,
      materialized: false,
      nextGate: 'EXP_BRIEF_APPROVED',
      autoPrime: null,
      workOrderSha256: null,
      receiptRef: null,
      receiptSha256: null,
      brief: null,
    };
  }
  const outputDirectoryRef = RelativePathSchema.parse(
    input.outputDirectoryRef ??
      `work/private/experience/${input.envelope.requestHash.slice(0, 16)}`,
  );
  const markdownRef = `${outputDirectoryRef}/brief.md`;
  const htmlRef = `${outputDirectoryRef}/brief.html`;
  const definitions = createProductiveExperienceWorkflowDefinitionsV1({
    briefMarkdownRef: markdownRef,
    briefHtmlRef: htmlRef,
    sourceRefs: input.sourceMaterials.map(({ref}) => ref),
  });
  const plan = compileExperienceWorkflowPlanV1(input.envelope, definitions);
  const autoPrime = autoPrimeExperienceV1(plan);
  const workOrder = createFramesWorkOrderV1(plan, input.envelope, {
    workOrderId: `WO.EXP.${input.envelope.requestHash.slice(0, 16).toUpperCase()}`,
    actorId: input.actorId,
    inputRefs: input.sourceMaterials,
    writeSet: [`${outputDirectoryRef}/**`],
    effectClass: 'LOCAL_REVERSIBLE',
  });
  const handler =
    input.routeId === 'R6'
      ? createContentBriefMaterialHandlerV1({
          root: input.root,
          request: input.domainIntent.request,
          requestHash: input.domainIntent.request_hash,
          contentClass: input.domainIntent.content_class,
          audience: input.domainIntent.audience ?? 'por resolver',
          objective: input.domainIntent.outcome ?? 'por resolver',
          workflowPlan: input.domainIntent.selected_stage_path as Array<
            'P00' | 'P01' | 'P02' | 'P03' | 'P04' | 'P05' | 'P06' | 'P07' | 'P08' | 'P09'
          >,
          channels: input.domainIntent.channels,
          restrictions: input.domainIntent.restrictions,
          sources: input.sourceMaterials,
        })
      : createCareerBriefMaterialHandlerV1({
          root: input.root,
          route: input.domainIntent,
          sources: input.sourceMaterials,
          outputDirectory: resolve(input.root, outputDirectoryRef),
        });
  const adapter = new MaterialSkillAdapterV1(input.root, {[workOrder.skillId]: handler});
  const receipt = await adapter.invoke({
    invocationId: `INV.EXP.${input.envelope.requestHash.slice(0, 16).toUpperCase()}`,
    workOrder,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  });
  const receiptRef = `${outputDirectoryRef}/invocation-receipt.json`;
  const receiptPath = resolve(input.root, receiptRef);
  atomicWrite(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  return {
    status: receipt.status === 'PASS' ? 'AWAITING_APPROVAL' : 'BLOCKED',
    routeId: input.routeId,
    materialized: receipt.status === 'PASS',
    nextGate: 'EXP_BRIEF_APPROVED',
    autoPrime,
    workOrderSha256: workOrder.canonicalSha256,
    receiptRef,
    receiptSha256: digestFile(receiptPath),
    brief: receipt.status === 'PASS' ? {markdownRef, htmlRef} : null,
  };
}
