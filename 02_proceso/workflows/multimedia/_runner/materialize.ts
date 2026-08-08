import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';

import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';
import {createDeliverableMaterial, loadDeliverableDefinitions} from './deliverable-material.ts';

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
  companions: Array<{
    format: 'md' | 'html';
    ref: string;
    sha256: string;
    materialized: true;
    stagedPath: string;
    finalPath: string;
  }>;
};

export const stageWorkflowOutputs = (
  root: string,
  workflowDir: string,
  workflow: MultimediaWorkflow,
  selectedConditional?: ReadonlySet<string>,
): {tempDir: string; outputs: StagedOutput[]} => {
  const conditional = workflow.outputs.filter(({condition}) => condition !== undefined);
  if (conditional.length > 0 && selectedConditional === undefined) {
    throw new Error(
      `MW-OUTPUT-CONDITION001 unresolved: ${conditional.map(({deliverable_id}) => deliverable_id).join(', ')}`,
    );
  }
  const selectedOutputs = workflow.outputs.filter(
    ({deliverable_id, required}) => required || selectedConditional?.has(deliverable_id),
  );
  const tempDir = mkdtempSync(join(tmpdir(), `frames-${workflow.workflow_id.toLowerCase()}-`));
  const stageDir = basename(workflowDir);
  const consumer = workflow.next_workflow ? `[${workflow.next_workflow}]` : '[]';
  const definitions = loadDeliverableDefinitions(root);
  const outputs = selectedOutputs.map((output, index) => {
    const artifactId = output.deliverable_id;
    const definition = definitions.get(artifactId);
    if (!definition) throw new Error(`MW-DELIVERABLE001 unresolved ${artifactId}`);
    const baseRef = `03_artefactos/content/multimedia/${stageDir}/${slug(output.artifact)}`;
    const ref = `${baseRef}.yml`;
    const {markdown, html, contentSha256} = createDeliverableMaterial(
      definition,
      workflow,
      output.artifact,
    );
    const companionData = [
      {format: 'md' as const, ref: `${baseRef}.md`, contents: markdown},
      {format: 'html' as const, ref: `${baseRef}.html`, contents: html},
    ];
    const companions = companionData.map(({format, ref: companionRef, contents}) => {
      const stagedPath = resolve(tempDir, `${index}-${slug(output.artifact)}.${format}`);
      writeFileSync(stagedPath, contents, 'utf8');
      return {
        format,
        ref: companionRef,
        sha256: sha256(readFileSync(stagedPath)),
        materialized: true as const,
        stagedPath,
        finalPath: resolve(root, companionRef),
      };
    });
    const contents = [
      `artifact_id: ${artifactId}`,
      `display_name: ${JSON.stringify(output.artifact)}`,
      'schema_version: v1',
      `stage: ${workflow.workflow_id}`,
      `producer_stage: ${workflow.workflow_id}`,
      `consumer_stage: ${consumer}`,
      `required: ${output.required}`,
      'content:',
      '  status: DRAFT',
      '  evidence_status: unknown',
      '  evidence_tags: ["[SUPUESTO]"]',
      `  template_id: ${output.template_id}`,
      '  limitation: "Declarative candidate only; no approval or publication authority."',
      `  markdown_ref: ${companions[0]?.ref}`,
      `  html_ref: ${companions[1]?.ref}`,
      `  content_sha256: ${contentSha256}`,
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
      companions,
    };
  });
  return {tempDir, outputs};
};

export const promoteWorkflowOutputs = (outputs: StagedOutput[]): void => {
  for (const output of outputs) {
    for (const companion of output.companions) {
      mkdirSync(dirname(companion.finalPath), {recursive: true});
      renameSync(companion.stagedPath, companion.finalPath);
      if (sha256(readFileSync(companion.finalPath)) !== companion.sha256) {
        throw new Error(`MW-OUTPUT-HASH001 read-back mismatch: ${companion.ref}`);
      }
    }
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
