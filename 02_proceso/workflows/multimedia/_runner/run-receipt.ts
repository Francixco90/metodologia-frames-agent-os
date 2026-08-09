import {readFileSync} from 'node:fs';

import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';
import type {StagedOutput} from './materialize.ts';
import {sha256} from './workflow-loader.ts';

type InputReceipt = {artifact: string; ref: string; sha256: string};
const uniqueInputs = (inputs: InputReceipt[]): InputReceipt[] => [
  ...new Map(inputs.map((item) => [item.ref, item])).values(),
];

export const buildRunReceiptPayload = (input: {
  workflow: MultimediaWorkflow;
  workflowPath: string;
  promptSpecPath: string;
  taskTemplatePath: string;
  stagedOutputs: StagedOutput[];
  authorityInputs: InputReceipt[];
  gate: string;
  actor: string;
  ranAt: string;
  noRegressionChecklistPath: string;
  relativeToRoot: (path: string) => string;
}): Record<string, unknown> => ({
  schema_version: 'multimedia-workflow-receipt-v1',
  workflow_id: input.workflow.workflow_id,
  command: input.workflow.command,
  mode: input.workflow.modes[0]?.id ?? 'single',
  inputs: uniqueInputs([
    ...[
      ['workflow.yml', input.workflowPath],
      ['prompt-spec.md', input.promptSpecPath],
      ['task-template.yaml', input.taskTemplatePath],
    ].map(([artifact, path]) => ({
      artifact: artifact ?? '',
      ref: input.relativeToRoot(path ?? ''),
      sha256: sha256(readFileSync(path ?? '')),
    })),
    ...input.authorityInputs,
  ]),
  outputs: input.stagedOutputs.map((output) => ({
    artifact: output.artifact,
    ref: output.ref,
    sha256: output.sha256,
    required: output.required,
    materialized: output.materialized,
    companions: output.companions.map(({format, ref, sha256, materialized}) => ({
      format,
      ref,
      sha256,
      materialized,
    })),
  })),
  work_product_state_from: 'INTAKE',
  work_product_state_to: 'RENDERED_DRAFT',
  gate: input.gate,
  actor: input.actor,
  ran_at: input.ranAt,
  append_only: true,
  human_approved: false,
  dry_run: false,
  no_regression_sha256: sha256(readFileSync(input.noRegressionChecklistPath)),
  evidence_tags: ['[CONFIG]'],
  scope: {
    workflow_id: input.workflow.workflow_id,
    mode: input.workflow.modes[0]?.id ?? 'single',
    effect_class: 'local_reversible',
  },
  coverage_gaps: [],
});
