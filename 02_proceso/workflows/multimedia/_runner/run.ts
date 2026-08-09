/**
 * Shared fail-closed runner for multimedia workflows P00-P09. [CONFIG]
 * Dry-run validates contracts and returns before every material or receipt write.
 */
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import type {MultimediaWorkflowReceipt} from '../../../../05_verificacion/scripts/lib/multimedia-workflow-receipt-schema.ts';
import {evaluateQualityGate} from './quality-gate.ts';
import {discardStagedOutputs, promoteWorkflowOutputs, stageWorkflowOutputs} from './materialize.ts';
import {buildGateFailReceipt, validateReceipt, writeReceipt} from './receipt-io.ts';
import {
  MULTIMEDIA_DIR,
  RECEIPTS_DIR,
  ROOT,
  isoWithOffset,
  loadWorkflowContract,
  parseArgs,
  sha256,
} from './workflow-loader.ts';

const relativeToRoot = (path: string): string => path.replace(`${ROOT}/`, '');

export const runWorkflow = (workflowId: string): void => {
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
  const {workflow, frontmatter, taskTemplate} = contract;
  if (args.dryRun) {
    console.info(
      `[DRY] ${id} ${workflow.command} validated; planned_outputs=${workflow.outputs.length}; writes=0`,
    );
    console.info('  STOP before materialization, receipt, state or gate mutation.');
    return;
  }

  const gate = workflow.gates[0] ?? 'G14';
  const ranAt = isoWithOffset(new Date());
  const staged = stageWorkflowOutputs(ROOT, contract.dir, workflow);
  const noRegressionChecklistPath = resolve(
    MULTIMEDIA_DIR,
    '_assets',
    'no-regression-checklist.md',
  );
  const coverageGaps: string[] = [];
  const receiptPayload = {
    schema_version: 'multimedia-workflow-receipt-v1',
    workflow_id: workflow.workflow_id,
    command: workflow.command,
    mode: workflow.modes[0]?.id ?? 'single',
    inputs: [
      ['workflow.yml', contract.workflowPath],
      ['prompt-spec.md', contract.promptSpecPath],
      ['task-template.yaml', contract.taskTemplatePath],
    ].map(([artifact, path]) => ({
      artifact: artifact ?? '',
      ref: relativeToRoot(path ?? ''),
      sha256: sha256(readFileSync(path ?? '')),
    })),
    outputs: staged.outputs.map((output) => ({
      artifact: output.artifact,
      ref: output.ref,
      sha256: output.sha256,
      required: output.required,
      materialized: output.materialized,
    })),
    work_product_state_from: 'INTAKE',
    work_product_state_to: 'RENDERED_DRAFT',
    gate,
    actor: 'qa',
    ran_at: ranAt,
    append_only: true,
    human_approved: false,
    dry_run: false,
    no_regression_sha256: sha256(readFileSync(noRegressionChecklistPath)),
    evidence_tags: ['[CONFIG]'],
    scope: {
      workflow_id: workflow.workflow_id,
      mode: workflow.modes[0]?.id ?? 'single',
      effect_class: 'local_reversible',
    },
    coverage_gaps: coverageGaps,
  };

  let receipt: MultimediaWorkflowReceipt;
  try {
    receipt = validateReceipt(receiptPayload);
  } catch (error) {
    discardStagedOutputs(staged.tempDir);
    console.error(`[FAIL] ${id}: receipt schema reject: ${String(error)}`);
    process.exitCode = 1;
    return;
  }
  const receiptDir = resolve(RECEIPTS_DIR, `WF-${id}`, ranAt.replace(/[:+]/gu, '-'));
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
    })),
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
    `  frontmatter: prompt_id=${frontmatter.prompt_id} vars=${frontmatter.variables.length} sections=${frontmatter.sections.length}`,
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
