import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {FRAMES_DELIVERABLE_SECTIONS} from 'workflows/multimedia/_schema/deliverable-v1.schema.ts';
import type {MultimediaWorkflow} from 'workflows/multimedia/_schema/workflow-v1.schema.ts';
import {
  createFramesDeliverableMarkdown,
  parseFramesDeliverableMarkdown,
} from 'workflows/multimedia/_runner/deliverable-model.ts';
import {renderFramesDeliverableHtml} from 'workflows/multimedia/_runner/deliverable-renderer.ts';

const digest = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

export const writeVerifiedCompanions = (
  directory: string,
  index: number,
  workflow: MultimediaWorkflow,
): {
  contentSha256: string;
  companions: Array<{
    format: 'md' | 'html';
    ref: string;
    stagedPath: string;
    exists: boolean;
    sha256: string;
  }>;
} => {
  const output = workflow.outputs[index]!;
  const sourceSha = 'e'.repeat(64);
  const markdown = createFramesDeliverableMarkdown(
    {
      schema_version: 'frames-deliverable-v1',
      instance_id: `DELIV-${workflow.workflow_id}-TEST-${index + 1}`,
      deliverable_id: output.deliverable_id,
      display_name: output.artifact,
      workflow_id: workflow.workflow_id,
      deliverable_class: 'brand',
      touchpoint: 'final',
      identity: {brand: 'MetodologIA', owner: 'Test Author'},
      audience: 'Verifier de contrato.',
      purpose: 'Fixture material con evidencia resuelta.',
      sources: [
        {
          source_id: 'fixture-verified',
          ref: 'fixture://verified',
          sha256: sourceSha,
          authority: 'verified',
          rights: 'cleared',
        },
      ],
      formats: ['md', 'html'],
      piece_families: ['other'],
      companion_for: null,
      skills: ['content-os-core'],
      fields: [
        {
          field_id: 'verified-field',
          label: 'Verified field',
          value_type: 'text',
          status: 'observed',
          value: 'Verified value',
          source_refs: ['fixture-verified'],
        },
      ],
      state: 'RENDERED_DRAFT',
      next_gate: workflow.execution_steps.at(-1)!.gate,
    },
    FRAMES_DELIVERABLE_SECTIONS.map((id) => ({id, markdown: `${id}: verified.`})),
  );
  const html = renderFramesDeliverableHtml(markdown);
  const companions = (
    [
      ['md', markdown],
      ['html', html],
    ] as const
  ).map(([format, contents]) => {
    const stagedPath = resolve(directory, `output-${index + 1}.${format}`);
    writeFileSync(stagedPath, contents, 'utf8');
    return {
      format,
      ref: `03_artefactos/content/multimedia/p00/output-${index + 1}.${format}`,
      stagedPath,
      exists: true,
      sha256: digest(stagedPath),
    };
  });
  return {
    contentSha256: parseFramesDeliverableMarkdown(markdown).frontmatter.content_sha256,
    companions,
  };
};
