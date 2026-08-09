import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {stringify} from 'yaml';
import {afterAll, describe, expect, it, vi} from 'vitest';

import {
  calculateMultimediaWorkOrderHash,
  calculateOutputSelectionHash,
} from 'workflows/multimedia/_runner/output-selection.ts';
import {runWorkflow} from 'workflows/multimedia/_runner/run.ts';

const directory = mkdtempSync(resolve(tmpdir(), 'frames-output-selection-'));
const originalArgv = process.argv;
const originalExitCode = process.exitCode;
const digest = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
const textDigest = (value: string): string => createHash('sha256').update(value).digest('hex');

const intentPath = resolve(directory, 'intent.yml');
const request = 'Crear una campaña.';
writeFileSync(
  intentPath,
  stringify({
    schema_version: 'content-intent-v2',
    request,
    request_hash: textDigest(request),
    content_class: 'campaign',
    audience: 'Equipo de contenidos.',
    outcome: 'Campaña definida.',
    sources: [],
    source_authority: 'unknown',
    channels: ['web'],
    restrictions: ['No publicar.'],
    effect_class: 'local_reversible',
    brief_sufficiency: 'complete',
    blocking_questions: [],
    route_candidates: [{route_id: 'R6', score: 1, reason_codes: ['CONTENT_REQUEST']}],
    selected_stage_path: ['P03'],
    brief_ref: null,
    next_gate: 'MW_BRIEF_APPROVED',
    decision: 'ROUTED',
  }),
  'utf8',
);
const intentHash = digest(intentPath);
const workOrderPath = resolve(directory, 'work-order.yml');
const unsignedWorkOrder = {
  schema_version: 'multimedia-work-order-v1' as const,
  work_order_id: 'WO-P03-TEST',
  workflow_id: 'P03' as const,
  intent_hash: intentHash,
  allowed_outputs: ['campaign-charter-v1', 'executive-presentation-v1'],
  effect_class: 'local_reversible' as const,
  publication_policy: 'forbidden' as const,
};
writeFileSync(
  workOrderPath,
  stringify({
    ...unsignedWorkOrder,
    canonical_sha256: calculateMultimediaWorkOrderHash(unsignedWorkOrder),
  }),
  'utf8',
);
const workOrderHash = digest(workOrderPath);

afterAll(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  rmSync(directory, {recursive: true, force: true});
});

const selectionFile = (
  name: string,
  includeOutputs: string[],
  hashes: {intent: string; workOrder: string} = {intent: intentHash, workOrder: workOrderHash},
): string => {
  const unsigned = {
    schema_version: 'multimedia-output-selection-v1' as const,
    workflow_id: 'P03' as const,
    intent_hash: hashes.intent,
    work_order_hash: hashes.workOrder,
    include_outputs: includeOutputs,
  };
  const path = resolve(directory, `${name}.yml`);
  writeFileSync(
    path,
    stringify({...unsigned, canonical_sha256: calculateOutputSelectionHash(unsigned)}),
    'utf8',
  );
  return path;
};

const runP03Dry = (selection?: string): {errors: string[]; info: string[]} => {
  const errors: string[] = [];
  const info: string[] = [];
  const error = vi
    .spyOn(console, 'error')
    .mockImplementation((value) => errors.push(String(value)));
  const log = vi.spyOn(console, 'info').mockImplementation((value) => info.push(String(value)));
  process.exitCode = undefined;
  process.argv = [
    'node',
    'run.ts',
    '--workflow=P03',
    '--dry-run',
    ...(selection
      ? [
          `--output-selection=${selection}`,
          `--intent=${intentPath}`,
          `--work-order=${workOrderPath}`,
        ]
      : []),
  ];
  try {
    runWorkflow('P03');
  } finally {
    error.mockRestore();
    log.mockRestore();
  }
  return {errors, info};
};

describe('runner output selection contract', () => {
  it('blocks a conditional workflow when selection is absent', () => {
    const result = runP03Dry();
    expect(process.exitCode).toBe(1);
    expect(result.errors.join('\n')).toContain('MW-OUTPUT-CONDITION001');
  });

  it('blocks a signed selection containing a non-conditional output', () => {
    const result = runP03Dry(selectionFile('unknown', ['brief-campaign-map-v1']));
    expect(process.exitCode).toBe(1);
    expect(result.errors.join('\n')).toContain('MW-OUTPUT-SELECTION004');
  });

  it('accepts a hash-bound selection and plans only required plus selected outputs', () => {
    const result = runP03Dry(selectionFile('campaign', ['campaign-charter-v1']));
    expect(process.exitCode).toBeUndefined();
    expect(result.info.join('\n')).toContain('planned_outputs=4; writes=0');
    expect(result.info.join('\n')).toContain('STOP before materialization');
  });

  it('blocks an internally valid selection bound to foreign authority hashes', () => {
    const result = runP03Dry(
      selectionFile('foreign', ['campaign-charter-v1'], {
        intent: 'c'.repeat(64),
        workOrder: 'd'.repeat(64),
      }),
    );
    expect(process.exitCode).toBe(1);
    expect(result.errors.join('\n')).toContain('MW-OUTPUT-AUTHORITY003');
  });
});
