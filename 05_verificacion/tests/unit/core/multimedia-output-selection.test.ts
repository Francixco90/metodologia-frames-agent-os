import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {stringify} from 'yaml';
import {afterAll, describe, expect, it, vi} from 'vitest';

import {calculateOutputSelectionHash} from 'workflows/multimedia/_runner/output-selection.ts';
import {runWorkflow} from 'workflows/multimedia/_runner/run.ts';

const directory = mkdtempSync(resolve(tmpdir(), 'frames-output-selection-'));
const originalArgv = process.argv;
const originalExitCode = process.exitCode;

afterAll(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  rmSync(directory, {recursive: true, force: true});
});

const selectionFile = (name: string, includeOutputs: string[]): string => {
  const unsigned = {
    schema_version: 'multimedia-output-selection-v1' as const,
    workflow_id: 'P03' as const,
    intent_hash: 'a'.repeat(64),
    work_order_hash: 'b'.repeat(64),
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
    ...(selection ? [`--output-selection=${selection}`] : []),
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
});
