import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

import type {MultimediaWorkflowReceipt} from '../../../../05_verificacion/scripts/lib/multimedia-workflow-receipt-schema.ts';
import {evaluateQualityGate} from './quality-gate.ts';
import {discardStagedOutputs, promoteWorkflowOutputs, stageWorkflowOutputs} from './materialize.ts';
import {resolveMaterialInput} from './material-input.ts';
import {resolveOutputSelection} from './output-selection.ts';
import {buildGateFailReceipt, validateReceipt, writeReceipt} from './receipt-io.ts';
import {buildRunReceiptPayload} from './run-receipt.ts';
import {
  MULTIMEDIA_DIR,
  RECEIPTS_DIR,
  ROOT,
  isoWithOffset,
  loadWorkflowContract,
  parseArgs,
} from './workflow-loader.ts';

const relativeToRoot = (path: string): string => path.replace(`${ROOT}/`, '');
export type RunWorkflowOptions = {artifactRoot?: string; receiptsRoot?: string; now?: Date};

export const runWorkflow = (workflowId: string, options: RunWorkflowOptions = {}): void => {
  const args = parseArgs(process.argv);
  const id = workflowId || args.workflow;
  if (!/^P[0-9]{2}$/u.test(id)) {
    console.error(`[FAIL] invalid workflow id "${id}" (expected P00-P09)`);
    process.exitCode = 1;
    return;
  }
  const contract = loadWorkflowContract(id);
  if (contract === null) {
    console.error(`[FAIL] no workflow dir found for ${id}`);
    process.exitCode = 1;
    return;
  }
  const {workflow, taskTemplate} = contract;
  let selection: ReturnType<typeof resolveOutputSelection>;
  try {
    selection = resolveOutputSelection(args.outputSelection, workflow, {
      ...(args.intent === undefined ? {} : {intentPath: args.intent}),
      ...(args.workOrder === undefined ? {} : {workOrderPath: args.workOrder}),
    });
  } catch (error) {
    console.error(`[FAIL] ${id}: ${String(error)}`);
    process.exitCode = 1;
    return;
  }
  const plannedOutputs = workflow.outputs.filter(
    ({deliverable_id, required}) => required || selection.selected?.has(deliverable_id),
  );
  let materialInput: ReturnType<typeof resolveMaterialInput>;
  try {
    materialInput = resolveMaterialInput(
      args.materialManifest,
      workflow,
      plannedOutputs.map(({deliverable_id}) => deliverable_id),
      {
        ...(args.intent === undefined ? {} : {intentPath: args.intent}),
        ...(args.workOrder === undefined ? {} : {workOrderPath: args.workOrder}),
        ...(options.now === undefined ? {} : {now: options.now}),
      },
    );
  } catch (error) {
    console.error(`[FAIL] ${id}: ${String(error)}`);
    process.exitCode = 1;
    return;
  }
  if (!materialInput && (!args.dryRun || id === 'P02')) {
    console.error(`[FAIL] ${id}: MW-MATERIAL-AUTHORITY001 --material-manifest is required`);
    process.exitCode = 1;
    return;
  }
  if (args.dryRun) {
    console.info(
      `[DRY] ${id} ${workflow.command} validated; planned_outputs=${plannedOutputs.length}; writes=0`,
    );
    console.info('  STOP before materialization, receipt, state or gate mutation.');
    return;
  }
  if (!materialInput) throw new Error('unreachable material input state');

  const gate = workflow.gates[0] ?? 'G14';
  const ranAt = isoWithOffset(options.now ?? new Date());
  const artifactRoot = options.artifactRoot ?? ROOT;
  const staged = stageWorkflowOutputs(
    artifactRoot,
    contract.dir,
    workflow,
    selection.selected,
    materialInput.materials,
    ROOT,
  );
  const noRegressionChecklistPath = resolve(
    MULTIMEDIA_DIR,
    '_assets',
    'no-regression-checklist.md',
  );
  const receiptPayload = buildRunReceiptPayload({
    workflow,
    workflowPath: contract.workflowPath,
    promptSpecPath: contract.promptSpecPath,
    taskTemplatePath: contract.taskTemplatePath,
    stagedOutputs: staged.outputs,
    authorityInputs: [...selection.inputs, ...materialInput.inputs],
    gate,
    producerActorId: materialInput.actorId,
    ingestorActorId: 'local-material-ingestor',
    ranAt,
    noRegressionChecklistPath,
    relativeToRoot,
  });

  let receipt: MultimediaWorkflowReceipt;
  try {
    receipt = validateReceipt(receiptPayload);
  } catch (error) {
    discardStagedOutputs(staged.tempDir);
    console.error(`[FAIL] ${id}: receipt schema reject: ${String(error)}`);
    process.exitCode = 1;
    return;
  }
  const receiptDir = resolve(
    options.receiptsRoot ?? RECEIPTS_DIR,
    `WF-${id}`,
    ranAt.replace(/[:+]/gu, '-'),
  );
  const gateResult = evaluateQualityGate({
    workflowId: id,
    workflowDir: contract.dir,
    workflowRawYaml: contract.workflowRawYaml,
    workflowParsed: workflow,
    taskTemplatePath: contract.taskTemplatePath,
    promptSpecPath: contract.promptSpecPath,
    noRegressionChecklistPath,
    receiptPayload: receipt,
    receiptDir,
    inputResolutions: contract.inputResolutions,
    outputResolutions: staged.outputs.map((output) => ({
      ref: output.ref,
      stagedPath: output.stagedPath,
      exists: existsSync(output.stagedPath),
      sha256: output.sha256,
      companions: output.companions.map((companion) => ({
        format: companion.format,
        ref: companion.ref,
        stagedPath: companion.stagedPath,
        exists: existsSync(companion.stagedPath),
        sha256: companion.sha256,
      })),
    })),
    effectiveOutputIds: plannedOutputs.map(({deliverable_id}) => deliverable_id),
    autoAdvance: false,
  });

  if (!gateResult.passed) {
    gateResult.failures.forEach((failure) => console.error(`[GATE-FAIL] ${id}: ${failure}`));
    discardStagedOutputs(staged.tempDir);
    try {
      const path = writeReceipt(receiptDir, buildGateFailReceipt(receipt, gateResult.failures));
      console.error(`[GATE-FAIL] ${id}: gate-fail receipt written to ${relativeToRoot(path)}`);
    } catch (error) {
      console.error(`[GATE-FAIL] ${id}: gate-fail receipt rejected: ${String(error)}`);
    }
    process.exitCode = 1;
    return;
  }

  promoteWorkflowOutputs(staged.outputs);
  discardStagedOutputs(staged.tempDir);
  const receiptPath = writeReceipt(receiptDir, receipt);
  console.info(
    `[RUN] ${id} ${workflow.command} -> candidate=RENDERED_DRAFT declared_target=${workflow.work_product_state} gate=${gate} dry_run=false`,
  );
  console.info(
    `  task: ${taskTemplate.task_id} responsable=${taskTemplate.responsable} gate_target=${taskTemplate.gate_target}`,
  );
  console.info(`  receipt: ${relativeToRoot(receiptPath)}`);
  console.info('  governed_state_transition: not attempted; manual approval evidence required');
  console.info(`  gate=PASS ${gateResult.checks.length}/${gateResult.checks.length}`);
  console.info(`  STOP at gate ${gate} (manual approval required).`);
};

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(import.meta.url.replace(/^file:\/\//u, ''));
if (isMain) {
  const args = parseArgs(process.argv);
  if (args.workflow === '') {
    console.error('[FAIL] --workflow PNN (or positional PNN) required');
    process.exitCode = 1;
  } else {
    try {
      runWorkflow(args.workflow);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  }
}
