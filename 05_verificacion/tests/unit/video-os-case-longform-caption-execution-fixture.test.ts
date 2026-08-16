import {afterEach, describe, expect, it} from 'vitest';

import {
  cleanupCaseLongformCaptionExecutionFixtures,
  materializeCaseLongformCaptionExecutionFixture,
} from '../../../tests/fixtures/video-os-case-longform-caption-execution.fixture.ts';

afterEach(cleanupCaseLongformCaptionExecutionFixtures);
describe('case-longform caption execution fixture', () => {
  it('uses only synthetic JSON and binary refs and keeps Danilo blocked', () => {
    expect(materializeCaseLongformCaptionExecutionFixture().contract.status).toBe(
      'PRE_RENDER_BLOCKED',
    );
  });
});
