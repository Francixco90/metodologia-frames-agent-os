// Integration test — runs the 3 executable evals of the harness v2 evals
// tree (H-E002, H-E005, H-E008) and asserts each passes its oracle.
// This file does NOT re-implement the evals; it imports each runner's
// top-level describe so vitest executes them under the integration suite.
// [CÓDIGO]

import {describe, expect, it} from 'vitest';

// Importing the runner modules registers their top-level describe blocks
// with vitest. The side-effecting import is intentional: the runners are
// self-contained vitest suites. [CÓDIGO]
import '../../../evals/H-E002/runner.ts';
import '../../../evals/H-E005/runner.ts';
import '../../../evals/H-E008/runner.ts';

describe('harness v2 evals — executable runners', () => {
  it('imports the 3 executable eval runners without error', () => {
    // The runners register their own describe/it blocks at import time.
    // This assertion guards the import wiring; the actual oracle assertions
    // live in each runner. If an import threw, this file would fail to load.
    expect(true).toBe(true);
  });
});
