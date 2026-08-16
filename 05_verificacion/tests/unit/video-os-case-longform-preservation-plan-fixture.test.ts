import {afterEach, describe, expect, it} from 'vitest';

import {cleanupCaseFixtures} from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';
import {materializeCaseLongformPreservationPlanFixture} from '../../../tests/fixtures/video-os-case-longform-preservation-plan.fixture.ts';

export {materializeCaseLongformPreservationPlanFixture};

afterEach(cleanupCaseFixtures);
describe('case-longform preservation plan fixture', () => {
  it('materializes a blocked plan without an RGB ledger', () => {
    expect(materializeCaseLongformPreservationPlanFixture().preservationContract.status).toBe(
      'BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS',
    );
  });
});
