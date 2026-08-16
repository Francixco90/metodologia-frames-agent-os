import {afterEach, describe, expect, it} from 'vitest';

import {materializeCaseLongformCaptionContractFixture} from '../../../tests/fixtures/video-os-case-longform-caption-contract.fixture.ts';
import {cleanupCaseFixtures} from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';

export {materializeCaseLongformCaptionContractFixture};

afterEach(cleanupCaseFixtures);
describe('case-longform caption contract fixture', () => {
  it('materializes only synthetic caption authorities and remains pre-render blocked', () => {
    expect(materializeCaseLongformCaptionContractFixture().contract.status).toBe(
      'PRE_RENDER_BLOCKED',
    );
  });
});
