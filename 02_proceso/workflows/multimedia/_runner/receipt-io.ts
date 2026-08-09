import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  MultimediaWorkflowReceiptSchema,
  type MultimediaWorkflowReceipt,
} from '../../../../05_verificacion/scripts/lib/multimedia-workflow-receipt-schema.ts';

const renderArtifacts = (
  label: 'inputs' | 'outputs',
  artifacts: MultimediaWorkflowReceipt['inputs'] | MultimediaWorkflowReceipt['outputs'],
): string[] => {
  if (label === 'inputs') {
    return (artifacts as MultimediaWorkflowReceipt['inputs']).map(
      (item) =>
        `  - artifact: ${JSON.stringify(item.artifact)}\n    ref: ${item.ref}\n    sha256: ${item.sha256}`,
    );
  }
  return (artifacts as MultimediaWorkflowReceipt['outputs']).map(
    (item) =>
      `  - artifact: ${JSON.stringify(item.artifact)}\n    ref: ${item.ref}\n    sha256: ${item.sha256}\n    required: ${item.required}\n    materialized: ${item.materialized}`,
  );
};

export const serializeReceipt = (receipt: MultimediaWorkflowReceipt): string =>
  [
    `schema_version: ${receipt.schema_version}`,
    `workflow_id: ${receipt.workflow_id}`,
    `command: ${receipt.command}`,
    `mode: ${receipt.mode}`,
    `inputs:`,
    ...renderArtifacts('inputs', receipt.inputs),
    `outputs:`,
    ...renderArtifacts('outputs', receipt.outputs),
    `work_product_state_from: ${receipt.work_product_state_from}`,
    `work_product_state_to: ${receipt.work_product_state_to}`,
    `gate: ${receipt.gate}`,
    `actor: ${receipt.actor}`,
    `ran_at: ${JSON.stringify(receipt.ran_at)}`,
    `append_only: true`,
    `human_approved: false`,
    `dry_run: false`,
    `no_regression_sha256: ${receipt.no_regression_sha256}`,
    `evidence_tags: ${JSON.stringify(receipt.evidence_tags)}`,
    `scope:`,
    `  workflow_id: ${receipt.scope.workflow_id}`,
    `  mode: ${JSON.stringify(receipt.scope.mode)}`,
    `  effect_class: ${receipt.scope.effect_class}`,
    `coverage_gaps:`,
    ...receipt.coverage_gaps.map((gap) => `  - ${JSON.stringify(gap)}`),
  ].join('\n') + '\n';

export const validateReceipt = (payload: unknown): MultimediaWorkflowReceipt =>
  MultimediaWorkflowReceiptSchema.parse(payload);

export const writeReceipt = (receiptDir: string, receipt: MultimediaWorkflowReceipt): string => {
  mkdirSync(receiptDir, {recursive: true});
  const receiptPath = resolve(receiptDir, 'receipt.yml');
  writeFileSync(receiptPath, serializeReceipt(receipt), 'utf8');
  return receiptPath;
};

export const buildGateFailReceipt = (
  receipt: MultimediaWorkflowReceipt,
  failures: string[],
): MultimediaWorkflowReceipt =>
  validateReceipt({
    ...receipt,
    outputs: [],
    work_product_state_to: receipt.work_product_state_from,
    coverage_gaps: [
      ...receipt.coverage_gaps,
      'gate-fail: quality gate blocked state advance',
      ...failures.map((failure) => `gate-fail: ${failure}`),
    ],
  });
