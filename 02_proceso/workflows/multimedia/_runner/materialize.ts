import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';

import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';

const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

const slug = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/giu, '-')
    .replace(/^-|-$/gu, '')
    .toLowerCase();

export type StagedOutput = {
  artifact: string;
  ref: string;
  sha256: string;
  required: boolean;
  materialized: true;
  stagedPath: string;
  finalPath: string;
};

export const stageWorkflowOutputs = (
  root: string,
  workflowDir: string,
  workflow: MultimediaWorkflow,
): {tempDir: string; outputs: StagedOutput[]} => {
  const tempDir = mkdtempSync(join(tmpdir(), `frames-${workflow.workflow_id.toLowerCase()}-`));
  const stageDir = basename(workflowDir);
  const consumer = workflow.next_workflow ? `[${workflow.next_workflow}]` : '[]';
  const outputs = workflow.outputs.map((output, index) => {
    const artifactId = workflow.brief.deliverables[index] ?? slug(output.artifact);
    const ref = `03_artefactos/content/multimedia/${stageDir}/${slug(output.artifact)}.yml`;
    const contents = [
      `artifact_id: ${artifactId}`,
      `display_name: ${JSON.stringify(output.artifact)}`,
      'schema_version: v1',
      `stage: ${workflow.workflow_id}`,
      `producer_stage: ${workflow.workflow_id}`,
      `consumer_stage: ${consumer}`,
      `required: ${output.required}`,
      'content:',
      '  status: RENDERED_DRAFT',
      '  evidence_status: known',
      '  evidence_tags: ["[CONFIG]"]',
      `  template_id: ${output.template_id}`,
      '  limitation: "Declarative candidate only; no approval or publication authority."',
    ].join('\n');
    const stagedPath = resolve(tempDir, `${index}-${slug(output.artifact)}.yml`);
    writeFileSync(stagedPath, `${contents}\n`, 'utf8');
    return {
      artifact: output.artifact,
      ref,
      sha256: sha256(readFileSync(stagedPath)),
      required: output.required,
      materialized: true as const,
      stagedPath,
      finalPath: resolve(root, ref),
    };
  });
  return {tempDir, outputs};
};

export const promoteWorkflowOutputs = (outputs: StagedOutput[]): void => {
  for (const output of outputs) {
    mkdirSync(dirname(output.finalPath), {recursive: true});
    renameSync(output.stagedPath, output.finalPath);
    if (sha256(readFileSync(output.finalPath)) !== output.sha256) {
      throw new Error(`MW-OUTPUT-HASH001 read-back mismatch: ${output.ref}`);
    }
  }
};

export const discardStagedOutputs = (tempDir: string): void => {
  rmSync(tempDir, {recursive: true, force: true});
};
