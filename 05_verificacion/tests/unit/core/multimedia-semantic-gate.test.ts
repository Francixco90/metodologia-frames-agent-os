import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {MultimediaWorkflowSchema} from 'workflows/multimedia/_schema/workflow-v1.schema.ts';
import {
  inspectMaterialEvidence,
  inspectOutputIntegrity,
} from 'workflows/multimedia/_runner/material-integrity.ts';
import {
  discardStagedOutputs,
  stageWorkflowOutputs,
} from 'workflows/multimedia/_runner/materialize.ts';
import type {QualityGateContext} from 'workflows/multimedia/_runner/quality-gate-types.ts';

const root = process.cwd();
const workflowDir = resolve(root, '02_proceso/workflows/multimedia/p00-definir-sistema');
const workflow = MultimediaWorkflowSchema.parse(
  parse(readFileSync(resolve(workflowDir, 'workflow.yml'), 'utf8')),
);
const digest = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const contextFor = (staged: ReturnType<typeof stageWorkflowOutputs>): QualityGateContext => ({
  workflowId: 'P00',
  workflowDir,
  workflowRawYaml: '',
  workflowParsed: workflow,
  taskTemplatePath: '',
  promptSpecPath: '',
  noRegressionChecklistPath: '',
  receiptDir: '',
  inputResolutions: [],
  autoAdvance: false,
  receiptPayload: {
    evidence_tags: ['[CONFIG]'],
    coverage_gaps: [],
    outputs: staged.outputs.map((output) => ({
      artifact: output.artifact,
      ref: output.ref,
      sha256: output.sha256,
      required: output.required,
      materialized: true,
      companions: output.companions.map(({format, ref, sha256}) => ({
        format,
        ref,
        sha256,
        materialized: true,
      })),
    })),
  },
  outputResolutions: staged.outputs.map((output) => ({
    ref: output.ref,
    stagedPath: output.stagedPath,
    exists: true,
    sha256: output.sha256,
    companions: output.companions.map(({format, ref, stagedPath, sha256}) => ({
      format,
      ref,
      stagedPath,
      exists: true,
      sha256,
    })),
  })),
});

describe('multimedia semantic companion gate', () => {
  it('blocks scaffold fields that remain unknown behind a declarative envelope', () => {
    const staged = stageWorkflowOutputs(root, workflowDir, workflow);
    try {
      const context = contextFor(staged);
      for (const [index, resolution] of context.outputResolutions.entries()) {
        writeFileSync(
          resolution.stagedPath,
          readFileSync(resolution.stagedPath, 'utf8')
            .replace('evidence_status: unknown', 'evidence_status: known')
            .replace('[SUPUESTO]', '[CONFIG]'),
          'utf8',
        );
        resolution.sha256 = digest(resolution.stagedPath);
        const receiptOutput = (context.receiptPayload.outputs as Array<{sha256: string}>)[index]!;
        receiptOutput.sha256 = resolution.sha256;
      }
      const evidence = inspectMaterialEvidence(context);
      expect(evidence.passed).toBe(false);
      expect(evidence.detail).toContain('deliverable evidence unresolved');
    } finally {
      discardStagedOutputs(staged.tempDir);
    }
  });

  it('rejects divergent HTML even when receipt and byte hashes are recalculated', () => {
    const staged = stageWorkflowOutputs(root, workflowDir, workflow);
    try {
      const context = contextFor(staged);
      const html = context.outputResolutions[0]!.companions.find(({format}) => format === 'html')!;
      writeFileSync(
        html.stagedPath,
        readFileSync(html.stagedPath, 'utf8').replace('MetodologIA', 'Drift'),
        'utf8',
      );
      html.sha256 = digest(html.stagedPath);
      const receiptOutput = (
        context.receiptPayload.outputs as Array<{
          companions: Array<{format: string; sha256: string}>;
        }>
      )[0]!;
      receiptOutput.companions.find(({format}) => format === 'html')!.sha256 = html.sha256;

      const integrity = inspectOutputIntegrity(context);
      expect(integrity.passed).toBe(false);
      expect(integrity.detail).toContain('semantic companion mismatch');
    } finally {
      discardStagedOutputs(staged.tempDir);
    }
  });
});
