import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {
  validateContentMatrix,
  validateContentMatrixObject,
} from '../../scripts/check-content-matrix.ts';

const root = process.cwd();

const matrixFixture = (): unknown =>
  parse(
    readFileSync(resolve(root, 'registries/content-types/instagram-workflow-matrix.yml'), 'utf8'),
  ) as unknown;

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected object record');
  }
  return value as Record<string, unknown>;
};

const workflowsOf = (matrix: unknown): unknown[] => {
  const workflows = record(matrix).workflows;
  if (!Array.isArray(workflows)) throw new Error('Expected workflows array');
  return workflows;
};

describe('Instagram workflow matrix V2', () => {
  it('defines exactly eight workflows with carousel as the only active candidate', () => {
    expect(validateContentMatrix(root)).toStrictEqual([]);
    const workflows = workflowsOf(matrixFixture());
    expect(workflows).toHaveLength(8);
    expect(
      workflows.filter((workflow) => record(workflow).lifecycle_state === 'active_candidate'),
    ).toHaveLength(1);
    expect(
      workflows.map((workflow) => ({
        workflow_id: record(workflow).workflow_id,
        content_type: record(workflow).content_type,
      })),
    ).toStrictEqual([
      {workflow_id: 'IG-CAROUSEL-V1', content_type: 'carousel'},
      {workflow_id: 'IG-FEED-TEXT-V1', content_type: 'feed-text'},
      {workflow_id: 'IG-FEED-PHOTO-V1', content_type: 'feed-photo'},
      {workflow_id: 'IG-INFOGRAPHIC-V1', content_type: 'infographic'},
      {workflow_id: 'IG-STORY-SEQUENCE-V1', content_type: 'story-sequence'},
      {workflow_id: 'IG-REEL-MOTION-V1', content_type: 'reel-motion'},
      {workflow_id: 'IG-MICROCOPY-V1', content_type: 'microcopy'},
      {workflow_id: 'IG-LIVE-KIT-V1', content_type: 'live-kit'},
    ]);
  });

  it('returns SOC errors when a planned workflow pretends to be active', () => {
    const matrix = structuredClone(matrixFixture());
    const feedText = workflowsOf(matrix).find(
      (workflow) => record(workflow).content_type === 'feed-text',
    );
    if (feedText === undefined) throw new Error('Expected feed-text workflow');
    record(feedText).lifecycle_state = 'active_candidate';
    expect(validateContentMatrixObject(matrix).some((error) => error.startsWith('SOC'))).toBe(true);
  });

  it('rejects workflow order drift', () => {
    const matrix = structuredClone(matrixFixture());
    const workflows = workflowsOf(matrix);
    [workflows[1], workflows[2]] = [workflows[2], workflows[1]];
    expect(validateContentMatrixObject(matrix)).toContain(
      'SOC007 exact workflow identity or order drift',
    );
  });

  it('returns CAR errors for carousel slide bounds outside the governed contract', () => {
    const matrix = structuredClone(matrixFixture());
    const carousel = workflowsOf(matrix).find(
      (workflow) => record(workflow).content_type === 'carousel',
    );
    if (carousel === undefined) throw new Error('Expected carousel workflow');
    record(record(carousel).content_contract).slide_count_min = 0;
    expect(validateContentMatrixObject(matrix).some((error) => error.startsWith('CAR002'))).toBe(
      true,
    );
  });

  it('rejects a carousel pilot that is not exactly eight cards', () => {
    const matrix = structuredClone(matrixFixture());
    const carousel = workflowsOf(matrix).find(
      (workflow) => record(workflow).content_type === 'carousel',
    );
    if (carousel === undefined) throw new Error('Expected carousel workflow');
    record(record(carousel).content_contract).pilot_slide_count = 7;
    expect(validateContentMatrixObject(matrix)).toContain(
      'CAR002 carousel slide bounds must be 3..10 with an exact 8-card pilot',
    );
  });

  it('rejects publication bypasses through the SOC contract', () => {
    const matrix = structuredClone(matrixFixture());
    record(record(matrix).publication).automatic_publication = 'allowed';
    expect(validateContentMatrixObject(matrix).some((error) => error.startsWith('SOC'))).toBe(true);
  });
});
