import {afterEach, describe, expect, it} from 'vitest';

import {cleanupCaseFixtures} from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';
import {materializeCaseLongformSemanticFixture} from '../../../tests/fixtures/video-os-case-longform-semantic.fixture.ts';

export {materializeCaseLongformSemanticFixture};

afterEach(cleanupCaseFixtures);
describe('case-longform semantic fixture', () => {
  it('materializes Danilo as pre-render blocked with an operational appointment gap', () => {
    expect(materializeCaseLongformSemanticFixture().semanticContract.status).toBe(
      'PRE_RENDER_BLOCKED',
    );
  });
});
