import {describe, expect, it} from 'vitest';

import {
  cleanupCaseFixtures,
  materializeCaseLongformGraphFixture,
} from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';

export * from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';

describe('case-longform coverage fixture authority', () => {
  it('materializes an exact blocked GraphAuthority', () => {
    try {
      expect(materializeCaseLongformGraphFixture().contract.status).toBe(
        'BLOCKED_PENDING_PRERENDER_REVIEW_CONTRACTS',
      );
    } finally {
      cleanupCaseFixtures();
    }
  });
});
