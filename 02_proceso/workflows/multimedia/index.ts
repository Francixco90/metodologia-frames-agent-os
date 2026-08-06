/**
 * index.ts — chain entrypoint for the multimedia workflow library (P00–P09).
 *
 * Re-exports the shared schemas and the runner, and exposes
 * `runMultimediaWorkflow(id)` so callers can drive any stage of the chain
 * programmatically. Each stage's `build.ts` is a thin shim over
 * `_runner/run.ts`. [CÓDIGO]
 *
 * Chain order (sequential by work-product state):
 *   P00 definir-sistema → P01 curar-material → P02 investigar →
 *   P03 crear-brief → P04 calendarizar → P05 disenar-pieza →
 *   P06 crear-activos → P07 revisar → P08 editar → P09 distribuir
 *
 * Source: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato. [DOC]
 */
export {MultimediaWorkflowSchema, MultimediaWorkflowIdSchema} from './_schema/workflow-v1.schema.ts';
export {PromptSpecFrontmatterSchema} from './_schema/prompt-spec-v1.schema.ts';
export {runWorkflow as runMultimediaWorkflow} from './_runner/run.ts';

import {runWorkflow} from './_runner/run.ts';

/** Ordered chain of workflow ids P00→P09. [CONFIG] */
export const MULTIMEDIA_CHAIN = ['P00', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09'] as const;

/** Run every stage in chain order (dry-run by default; never auto-advances). */
export const runMultimediaChain = (dryRun = true): void => {
  for (const id of MULTIMEDIA_CHAIN) {
    if (dryRun) process.argv.push('--dry-run');
    runWorkflow(id);
    if (dryRun) {
      const idx = process.argv.lastIndexOf('--dry-run');
      if (idx >= 0) process.argv.splice(idx, 1);
    }
  }
};