/**
 * run.ts — shared runner for the multimedia workflow chain (P00–P09).
 *
 * CLI: `pnpm mw:run --workflow PNN [--dry-run]`  (or positional `pnpm mw:run PNN --dry-run`)
 *
 * Each workflow's `build.ts` is a thin shim that calls `runWorkflow('PNN')`.
 * This runner:
 *   1. loads `02_proceso/workflows/multimedia/pNN-{slug}/workflow.yml` and parses
 *      it through `MultimediaWorkflowSchema` (the source-of-truth contract);
 *   2. parses the `prompt-spec.md` frontmatter through `PromptSpecFrontmatterSchema`;
 *   3. parses the `task-template.yaml` through `TaskContractSchema`;
 *   4. emits an append-only `multimedia-workflow-receipt-v1` to
 *      `04_estado/receipts/workflows/WF-PNN/{ISO-timestamp}.yml`;
 *   5. stops at the workflow's first gate — NEVER auto-advances to
 *      HUMAN_APPROVED/READY/PUBLISHED (manual fail-closed gates G13–G17 +
 *      MW_DISTRIBUTION_AUTHORIZED stay human). [CONFIG]
 *   6. before advancing + before writing the success receipt, runs the
 *      declarative quality gate (`02_proceso/governance/multimedia-quality-gate.yml`,
 *      schema `multimedia-quality-gate-v1`) via `evaluateQualityGate`. A
 *      failing MW-Q check writes nothing to the work-product state and
 *      emits a gate-fail receipt instead. [CONFIG]
 *
 * State-machine advance (`02_proceso/core/state-machine/machine.ts`) is a
 * declared coverage_gap in this candidate phase: the runner validates the
 * contract and emits a receipt, but does not mutate the work-product state.
 * The receipt records `work_product_state_to` as the workflow's declared
 * target; the actual transition is gated by human approval. [CONFIG]
 *
 * Source: `MIA-MEDIA-LIB-2.0.0`. [DOC]
 */
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {MultimediaWorkflowSchema} from '../_schema/workflow-v1.schema.ts';
import {PromptSpecFrontmatterSchema} from '../_schema/prompt-spec-v1.schema.ts';
import {TaskContractSchema} from '../../../core/contracts/index.ts';
import {MultimediaWorkflowReceiptSchema} from '../../../../05_verificacion/scripts/lib/multimedia-workflow-receipt-schema.ts';
import {evaluateQualityGate} from './quality-gate.ts';

const ROOT = process.cwd();
const MULTIMEDIA_DIR = resolve(ROOT, '02_proceso/workflows/multimedia');
const RECEIPTS_DIR = resolve(ROOT, '04_estado/receipts/workflows');

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

const isoWithOffset = (date: Date): string => {
  const tzOffsetMin = -date.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(tzOffsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  const pad = (n: number) => String(n).padStart(2, '0');
  const base =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  if (tzOffsetMin === 0) return `${base}Z`;
  return `${base}${sign}${hh}:${mm}`;
};

const parseFrontmatter = (md: string): Record<string, unknown> | null => {
  const m = md.match(/^---\n([\s\S]*?)\n---/u);
  return m && m[1] !== undefined ? (parse(m[1]) as Record<string, unknown>) : null;
};

/** Resolve the workflow dir for a PNN id by globbing pNN-{slug} dirs. */
const resolveWorkflowDir = (workflowId: string): string | null => {
  const prefix = `p${workflowId.slice(1)}-`;
  const entries = readdirSync(MULTIMEDIA_DIR, {withFileTypes: true})
    .filter((e) => e.isDirectory() && e.name.startsWith(prefix))
    .filter((e) => existsSync(resolve(MULTIMEDIA_DIR, e.name, 'workflow.yml')));
  if (entries.length !== 1) return null;
  const e0 = entries[0];
  return e0 ? resolve(MULTIMEDIA_DIR, e0.name) : null;
};

const parseArgs = (argv: string[]): {workflow: string; dryRun: boolean} => {
  const out = {workflow: '', dryRun: false};
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg.startsWith('--workflow=')) out.workflow = arg.slice('--workflow='.length);
    else if (/^P[0-9]{2}$/u.test(arg)) out.workflow = arg;
  }
  return out;
};

export const runWorkflow = (workflowId: string): void => {
  const args = parseArgs(process.argv);
  const id = workflowId || args.workflow;
  const dryRun = args.dryRun;
  if (!/^P[0-9]{2}$/u.test(id)) {
    console.error(`[FAIL] invalid workflow id "${id}" (expected P00–P09)`);
    process.exitCode = 1;
    return;
  }
  const dir = resolveWorkflowDir(id);
  if (dir === null) {
    console.error(`[FAIL] no workflow dir found for ${id}`);
    process.exitCode = 1;
    return;
  }

  const workflowPath = resolve(dir, 'workflow.yml');
  const promptSpecPath = resolve(dir, 'prompt-spec.md');
  const taskTemplatePath = resolve(dir, 'task-template.yaml');

  const workflow = MultimediaWorkflowSchema.parse(
    parse(readFileSync(workflowPath, 'utf8')) as unknown,
  );
  const frontmatter = PromptSpecFrontmatterSchema.parse(
    parseFrontmatter(readFileSync(promptSpecPath, 'utf8')),
  );
  const taskTemplate = TaskContractSchema.parse(
    parse(readFileSync(taskTemplatePath, 'utf8')) as unknown,
  );

  // Prior-workflow input resolutions — the quality gate (MW-Q06) asserts
  // every declared input resolves to an existing file. P00 (root) is exempt.
  // The runner no longer hard-exits here; the gate is the single pre-advance
  // assertion point and emits a gate-fail receipt on missing inputs. [CONFIG]
  const inputResolutions = workflow.inputs.map((input) => {
    const inputPath = resolve(MULTIMEDIA_DIR, input);
    return {input, resolved: inputPath, exists: existsSync(inputPath)};
  });

  const gate = workflow.gates[0] ?? 'G14';
  const date = new Date();
  const ranAt = isoWithOffset(date);

  const inputsReceipt = [
    {
      artifact: 'workflow.yml',
      ref: workflowPath.replace(ROOT + '/', ''),
      sha256: sha256(readFileSync(workflowPath, 'utf8')),
    },
    {
      artifact: 'prompt-spec.md',
      ref: promptSpecPath.replace(ROOT + '/', ''),
      sha256: sha256(readFileSync(promptSpecPath, 'utf8')),
    },
    {
      artifact: 'task-template.yaml',
      ref: taskTemplatePath.replace(ROOT + '/', ''),
      sha256: sha256(readFileSync(taskTemplatePath, 'utf8')),
    },
  ];

  const outputsReceipt = workflow.outputs.map((o) => ({
    artifact: o.artifact,
    ref: `03_artefactos/content/multimedia/${dir.split('/').pop()}/${o.artifact.replace(/[^a-z0-9]+/giu, '-').toLowerCase()}.yml`,
    sha256: sha256(`declared:${o.artifact}:${ranAt}`),
    required: o.required,
  }));

  const coverageGaps = [
    'dry-run: outputs declared but not materialized',
    'state-advance: work-product state machine advance not implemented in candidate phase',
  ];

  const receipt = {
    schema_version: 'multimedia-workflow-receipt-v1' as const,
    workflow_id: workflow.workflow_id,
    command: workflow.command,
    mode: workflow.modes[0]?.id ?? 'single',
    inputs: inputsReceipt,
    outputs: outputsReceipt,
    work_product_state_from: 'INTAKE',
    work_product_state_to: workflow.work_product_state,
    gate,
    actor: 'qa',
    ran_at: ranAt,
    append_only: true as const,
    human_approved: false as const,
    coverage_gaps: coverageGaps,
  };

  const parsed = MultimediaWorkflowReceiptSchema.safeParse(receipt);
  if (!parsed.success) {
    console.error(
      `[FAIL] ${id}: receipt schema reject: ${parsed.error.issues.map((i) => `${i.path.join('.')}:${i.message}`).join('; ')}`,
    );
    process.exitCode = 1;
    return;
  }

  const wfReceiptDir = resolve(RECEIPTS_DIR, `WF-${id}`, ranAt.replace(/[:+]/gu, '-'));
  const noRegressionChecklistPath = resolve(
    MULTIMEDIA_DIR,
    '_assets',
    'no-regression-checklist.md',
  );

  // Quality gate — pre-advance assertion. Runs BEFORE the work-product state
  // advances and BEFORE the success receipt is written. A failing MW-Q check
  // writes nothing to the work-product state and emits a gate-fail receipt
  // instead. Fail-closed: an unverified item is NEVER auto-passed. [CONFIG]
  const gateResult = evaluateQualityGate({
    workflowId: id,
    workflowDir: dir,
    workflowRawYaml: readFileSync(workflowPath, 'utf8'),
    workflowParsed: workflow,
    taskTemplatePath,
    promptSpecPath,
    noRegressionChecklistPath,
    receiptPayload: receipt,
    receiptDir: wfReceiptDir,
    inputResolutions,
    autoAdvance: false,
  });

  if (!gateResult.passed) {
    // Gate-fail: do NOT advance the state, do NOT write a success receipt.
    // Emit a schema-valid gate-fail receipt: state does not advance (to ==
    // from) and the failing checks are recorded in coverage_gaps. The receipt
    // schema is a strict object with no status field, so the gate-fail marker
    // rides in coverage_gaps. [CONFIG]
    for (const fail of gateResult.failures) {
      console.error(`[GATE-FAIL] ${id}: ${fail}`);
    }
    const gateFailReceipt = {
      ...receipt,
      work_product_state_to: receipt.work_product_state_from,
      coverage_gaps: [
        ...receipt.coverage_gaps,
        'gate-fail: quality gate blocked state advance',
        ...gateResult.failures.map((f) => `gate-fail: ${f}`),
      ],
    };
    const failParsed = MultimediaWorkflowReceiptSchema.safeParse(gateFailReceipt);
    if (failParsed.success) {
      mkdirSync(wfReceiptDir, {recursive: true});
      const failReceiptPath = resolve(wfReceiptDir, 'receipt.yml');
      const failYml = [
        `schema_version: multimedia-workflow-receipt-v1`,
        `workflow_id: ${gateFailReceipt.workflow_id}`,
        `command: ${gateFailReceipt.command}`,
        `mode: ${gateFailReceipt.mode}`,
        `inputs:`,
        ...gateFailReceipt.inputs.map(
          (i) =>
            `  - artifact: ${JSON.stringify(i.artifact)}\n    ref: ${i.ref}\n    sha256: ${i.sha256}`,
        ),
        `outputs:`,
        ...gateFailReceipt.outputs.map(
          (o) =>
            `  - artifact: ${JSON.stringify(o.artifact)}\n    ref: ${o.ref}\n    sha256: ${o.sha256}\n    required: ${o.required}`,
        ),
        `work_product_state_from: ${gateFailReceipt.work_product_state_from}`,
        `work_product_state_to: ${gateFailReceipt.work_product_state_to}`,
        `gate: ${gateFailReceipt.gate}`,
        `actor: ${gateFailReceipt.actor}`,
        `ran_at: ${JSON.stringify(gateFailReceipt.ran_at)}`,
        `append_only: true`,
        `human_approved: false`,
        `coverage_gaps:`,
        ...gateFailReceipt.coverage_gaps.map((c) => `  - ${JSON.stringify(c)}`),
      ].join('\n');
      writeFileSync(failReceiptPath, `${failYml}\n`, 'utf8');
      console.error(
        `[GATE-FAIL] ${id}: gate-fail receipt written to ${failReceiptPath.replace(ROOT + '/', '')}`,
      );
    } else {
      console.error(
        `[GATE-FAIL] ${id}: gate-fail receipt rejected by schema: ${failParsed.error.issues.map((i) => `${i.path.join('.')}:${i.message}`).join('; ')}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  const gateSummary = `gate=PASS ${gateResult.checks.filter((c) => c.passed).length}/${gateResult.checks.length}`;
  mkdirSync(wfReceiptDir, {recursive: true});
  const receiptPath = resolve(wfReceiptDir, 'receipt.yml');
  const yml = [
    `schema_version: multimedia-workflow-receipt-v1`,
    `workflow_id: ${receipt.workflow_id}`,
    `command: ${receipt.command}`,
    `mode: ${receipt.mode}`,
    `inputs:`,
    ...receipt.inputs.map(
      (i) =>
        `  - artifact: ${JSON.stringify(i.artifact)}\n    ref: ${i.ref}\n    sha256: ${i.sha256}`,
    ),
    `outputs:`,
    ...receipt.outputs.map(
      (o) =>
        `  - artifact: ${JSON.stringify(o.artifact)}\n    ref: ${o.ref}\n    sha256: ${o.sha256}\n    required: ${o.required}`,
    ),
    `work_product_state_from: ${receipt.work_product_state_from}`,
    `work_product_state_to: ${receipt.work_product_state_to}`,
    `gate: ${receipt.gate}`,
    `actor: ${receipt.actor}`,
    `ran_at: ${JSON.stringify(receipt.ran_at)}`,
    `append_only: true`,
    `human_approved: false`,
    `coverage_gaps:`,
    ...receipt.coverage_gaps.map((c) => `  - ${JSON.stringify(c)}`),
  ].join('\n');
  writeFileSync(receiptPath, `${yml}\n`, 'utf8');

  console.info(
    `[${dryRun ? 'DRY' : 'RUN'}] ${id} ${workflow.command} → state=${workflow.work_product_state} gate=${gate} dry_run=${dryRun}`,
  );
  console.info(
    `  frontmatter: prompt_id=${frontmatter.prompt_id} vars=${frontmatter.variables.length} sections=${frontmatter.sections.length}`,
  );
  console.info(
    `  task: ${taskTemplate.task_id} responsable=${taskTemplate.responsable} gate_target=${taskTemplate.gate_target}`,
  );
  console.info(`  receipt: ${receiptPath.replace(ROOT + '/', '')}`);
  console.info(`  coverage_gaps: ${coverageGaps.length} (state-advance + dry-run outputs)`);
  console.info(`  ${gateSummary}`);

  // Always stop at the gate — never advance. [CONFIG]
  console.info(
    `  STOP at gate ${gate} (manual approval required; RENDERED_DRAFT != HUMAN_APPROVED).`,
  );
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
    } catch (err) {
      console.error(err);
      process.exitCode = 1;
    }
  }
}
