import {describe, expect, it} from 'vitest';

import {
  BACKFILL_EPOCH,
  DETERMINISTIC_EPOCH,
  FIXTURE_NOW,
  SCAFFOLD_EPOCH,
} from '../../scripts/lib/deterministic-epoch.ts';

describe('deterministic-epoch constants', () => {
  it('each epoch is a fixed ISO-8601 string (value-preserving, hash-bound)', () => {
    expect(DETERMINISTIC_EPOCH).toBe('2026-08-01T00:00:00+00:00');
    expect(BACKFILL_EPOCH).toBe('2026-08-02T00:00:00+00:00');
    expect(SCAFFOLD_EPOCH).toBe('2026-08-05T00:00:00+00:00');
    expect(FIXTURE_NOW).toBe('2026-07-19T12:00:00Z');
  });

  it('all epochs parse as valid dates (sanity, not used at runtime)', () => {
    for (const epoch of [DETERMINISTIC_EPOCH, BACKFILL_EPOCH, SCAFFOLD_EPOCH, FIXTURE_NOW]) {
      const d = new Date(epoch);
      expect(Number.isNaN(d.getTime())).toBe(false);
    }
  });

  it('fixtures.ts re-exports FIXTURE_NOW as NOW (contract: no drift)', async () => {
    const mod = await import('../../tests/unit/core/fixtures.ts');
    expect(mod.NOW).toBe(FIXTURE_NOW);
  });
});
