import {describe, expect, it} from 'vitest';

import {missingVerifySteps, verifyScripts} from '../../scripts/check-ci-parity.ts';

const verify = 'pnpm check:repo && pnpm typecheck && pnpm lint && pnpm test && pnpm format:check';
const workflow = (runs: string[]): string =>
  `jobs:\n  quality:\n    steps:\n${runs.map((run) => `      - run: ${run}\n`).join('')}`;

describe('check-ci-parity', () => {
  it('extracts the pnpm scripts of the verify chain', () => {
    expect(verifyScripts(verify)).toEqual([
      'check:repo',
      'typecheck',
      'lint',
      'test',
      'format:check',
    ]);
  });

  it('accepts a workflow that runs the aggregate verify step', () => {
    expect(
      missingVerifySteps(verify, workflow(['pnpm install --frozen-lockfile', 'pnpm verify'])),
    ).toEqual([]);
  });

  it('reports every verify script the workflow does not run', () => {
    expect(missingVerifySteps(verify, workflow(['pnpm check:repo', 'pnpm test']))).toEqual([
      'typecheck',
      'lint',
      'format:check',
    ]);
  });
});
