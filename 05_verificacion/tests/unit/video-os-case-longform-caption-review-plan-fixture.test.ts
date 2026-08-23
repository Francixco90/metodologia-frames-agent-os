import {afterEach, describe, expect, it} from 'vitest';

import {assertCaseLongformCaptionReviewPlanContract} from 'workflows/video-os/index.ts';
import {
  cleanupCaseLongformCaptionReviewPlanFixtures,
  materializeCaseLongformCaptionReviewPlanFixture,
} from '../../../tests/fixtures/video-os-case-longform-caption-review-plan.fixture.ts';

afterEach(cleanupCaseLongformCaptionReviewPlanFixtures);
describe('case-longform V7c0 review-plan fixture', () => {
  it('materializes a pure blocked contract without accrediting the full chain', () => {
    const fixture = materializeCaseLongformCaptionReviewPlanFixture();
    expect(assertCaseLongformCaptionReviewPlanContract(fixture).coverage_gap).toBe(
      'V7C_FULL_CHAIN_FIXTURE_NOT_ACCREDITED',
    );
  });
});
