import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse as parseYaml} from 'yaml';

import {
  NotebookPlanV2Schema,
  StudioBriefV2Schema,
} from '../../../02_proceso/core/contracts/index.ts';
import {errorDetail, portableRelative, readStructured, sameSet, walkFiles} from './io.ts';
import {GroundingSuiteV1Schema} from './schemas.ts';

export const validateImportPlan = (
  root: string,
  manifestIds: Set<string>,
): {errors: string[]; sourceCount: number} => {
  const errors: string[] = [];
  const plan = NotebookPlanV2Schema.parse(
    parseYaml(readFileSync(resolve(root, 'notebook-import-plan-v2.yml'), 'utf8')) as unknown,
  );
  if (!sameSet(plan.sourceIds, manifestIds))
    errors.push('notebook-import-plan-v2.yml: sourceIds must exactly equal the source manifest.');
  if (plan.targetNotebookDigest !== null)
    errors.push('notebook-import-plan-v2.yml: pre-create targetNotebookDigest must remain null.');
  if (sameSet(plan.activeSourceIds, manifestIds))
    errors.push('notebook-import-plan-v2.yml: activeSourceIds selects the full manifest.');
  const forbiddenActions = new Set(['studio', 'share', 'sync', 'delete', 'archive']);
  for (const operation of plan.operations)
    if (forbiddenActions.has(operation.action))
      errors.push(
        `notebook-import-plan-v2.yml: ${operation.action} is outside this materialization plan.`,
      );
  return {errors, sourceCount: plan.sourceIds.length};
};

export const validateGroundingSuite = (
  root: string,
  manifestIds: Set<string>,
): {errors: string[]; testCount: number} => {
  const errors: string[] = [];
  const suite = GroundingSuiteV1Schema.parse(
    parseYaml(readFileSync(resolve(root, 'grounding-suite-v1.yml'), 'utf8')) as unknown,
  );
  const testIds = suite.tests.map(({test_id: testId}) => testId);
  if (new Set(testIds).size !== testIds.length)
    errors.push('grounding-suite-v1.yml: test_id values must be unique.');
  for (const test of suite.tests) {
    if (new Set(test.source_ids).size !== test.source_ids.length)
      errors.push(`grounding-suite-v1.yml: ${test.test_id} source_ids must be unique.`);
    for (const sourceId of test.source_ids)
      if (!manifestIds.has(sourceId))
        errors.push(`grounding-suite-v1.yml: ${test.test_id} uses unknown ${sourceId}.`);
    if (sameSet(test.source_ids, manifestIds))
      errors.push(`grounding-suite-v1.yml: ${test.test_id} selects the full manifest.`);
  }
  return {errors, testCount: suite.tests.length};
};

export const validateEmbeddedPlansAndBriefs = (
  root: string,
  manifestIds: Set<string>,
): string[] => {
  const errors: string[] = [];
  for (const path of walkFiles(root).filter((candidate) => /\.(?:json|ya?ml)$/u.test(candidate))) {
    let value: unknown;
    try {
      value = readStructured(path);
    } catch {
      continue;
    }
    if (typeof value !== 'object' || value === null) continue;
    const schemaVersion = (value as {schemaVersion?: unknown}).schemaVersion;
    try {
      if (schemaVersion === 'studio-brief-v2') {
        const brief = StudioBriefV2Schema.parse(value);
        if (manifestIds.size > 0 && sameSet(brief.activeSourceIds, manifestIds))
          errors.push(
            `${portableRelative(root, path)}: activeSourceIds selects the full manifest.`,
          );
      } else if (schemaVersion === 'notebook-plan-v2') {
        const plan = NotebookPlanV2Schema.parse(value);
        if (manifestIds.size > 0 && sameSet(plan.activeSourceIds, manifestIds))
          errors.push(
            `${portableRelative(root, path)}: activeSourceIds selects the full manifest.`,
          );
      }
    } catch (error) {
      errors.push(`${portableRelative(root, path)}: ${errorDetail(error)}`);
    }
  }
  return errors;
};
