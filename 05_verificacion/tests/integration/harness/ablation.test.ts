// ablation.test.ts — integration test for the ablation harness (S15).
//
// Runs all 6 variants (H0..H-F) via runner + fixed oracle, asserts each
// returns a result, and verifies H0 baseline accepted=true. Does NOT assert
// causal claims — records results for the benchmark. SPEC §10: n=1,
// single-session, single-agent, Wilson 95% CI (non-informative at n=1).
// [CÓDIGO]

import {describe, expect, it} from 'vitest';

import {runVariant} from '../../../evals/ablation/runner.ts';

const VARIANTS = ['H0', 'H-I', 'H-T', 'H-E', 'H-S', 'H-F'] as const;

describe('ablation harness (S15) — 6 variants via runner + fixed oracle', () => {
  it.each(VARIANTS)(
    'variant %s runs and returns a well-formed result (n=1, no causal claim)',
    (variantId) => {
      const result = runVariant(variantId);
      expect(result.variant_id).toBe(variantId);
      expect(typeof result.accepted).toBe('boolean');
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    },
  );

  it('H0 baseline is accepted (full harness, no subsystem excluded)', () => {
    const result = runVariant('H0');
    expect(result.accepted).toBe(true);
  });

  it('records benchmark results for all 6 variants (n=1, Wilson 95% CI non-informative)', () => {
    // Benchmark record only. At n=1 per variant the Wilson 95% CI is
    // non-informative; no causal attribution is made (see ablation/README.md
    // SPEC §10 disclaimer). This assertion guards that all variants execute
    // and the accepted-count is within the valid [0,6] range. [DOC]
    const results = VARIANTS.map((v) => runVariant(v));
    const accepted = results.filter((r) => r.accepted).length;

    expect(results).toHaveLength(6);
    expect(accepted).toBeGreaterThanOrEqual(0);
    expect(accepted).toBeLessThanOrEqual(6);
  });
});
