import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {MultimediaWorkflowSchema} from 'workflows/multimedia/_schema/workflow-v1.schema.ts';
import {verifyDeliverableParity} from 'workflows/multimedia/_runner/deliverable-parity.ts';
import {
  discardStagedOutputs,
  stageWorkflowOutputs,
} from 'workflows/multimedia/_runner/materialize.ts';

const root = process.cwd();
const workflowDir = resolve(root, '02_proceso/workflows/multimedia/p00-definir-sistema');
const workflow = MultimediaWorkflowSchema.parse(
  parse(readFileSync(resolve(workflowDir, 'workflow.yml'), 'utf8')),
);

describe('multimedia deliverable materialization', () => {
  it('stages one typed envelope plus equivalent md/html companions per output', () => {
    const staged = stageWorkflowOutputs(root, workflowDir, workflow);
    try {
      expect(staged.outputs).toHaveLength(workflow.outputs.length);
      for (const output of staged.outputs) {
        expect(output.companions.map(({format}) => format)).toEqual(['md', 'html']);
        expect(output.companions.every(({stagedPath}) => existsSync(stagedPath))).toBe(true);
        const markdown = readFileSync(output.companions[0]!.stagedPath, 'utf8');
        const html = readFileSync(output.companions[1]!.stagedPath, 'utf8');
        expect(verifyDeliverableParity(markdown, html)).toMatchObject({status: 'PASS', issues: []});

        const envelope = parse(readFileSync(output.stagedPath, 'utf8')) as {
          artifact_id: string;
          content: {markdown_ref: string; html_ref: string; content_sha256: string};
        };
        expect(envelope.artifact_id).toMatch(/-v1$/u);
        expect(envelope.content.markdown_ref).toBe(output.companions[0]!.ref);
        expect(envelope.content.html_ref).toBe(output.companions[1]!.ref);
        expect(envelope.content.content_sha256).toMatch(/^[a-f0-9]{64}$/u);
      }
    } finally {
      discardStagedOutputs(staged.tempDir);
    }
  });
});
