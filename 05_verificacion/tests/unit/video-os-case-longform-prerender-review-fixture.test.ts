import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {deriveCaseLongformPcmDonorEvidence} from 'workflows/video-os/index.ts';
import {
  caseFixtureRef,
  cleanupCaseFixtures,
} from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';
import {materializeCaseLongformPrerenderReviewFixture} from '../../../tests/fixtures/video-os-case-longform-prerender-review.fixture.ts';

export {materializeCaseLongformPrerenderReviewFixture};

afterEach(cleanupCaseFixtures);
describe('case-longform PR1c0b1a fixture', () => {
  it('materializes a blocked audio authority', () => {
    expect(materializeCaseLongformPrerenderReviewFixture().reviewContract.status).toBe(
      'BLOCKED_PENDING_TRANSCRIPT_SEMANTIC_PRESERVATION_REVIEW_CONTRACTS',
    );
  });
  it('blocks a:0 starting about 0.478 seconds after video', () => {
    const fixture = materializeCaseLongformPrerenderReviewFixture();
    const output = resolve(fixture.root, 'delayed-audio.mp4');
    // prettier-ignore
    const built = spawnSync(fixture.options.audioToolAuthority.ffmpeg_path, [
      '-v', 'error', '-f', 'lavfi', '-i', 'color=s=1920x1080:r=24:d=1', '-itsoffset', '0.5',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1', '-map', '0:v:0',
      '-map', '1:a:0', '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', '-y', output]);
    expect(built.status).toBe(0);
    const media = caseFixtureRef(fixture.root, 'delayed-audio.mp4');
    // prettier-ignore
    expect(() => deriveCaseLongformPcmDonorEvidence(readFileSync(output), media, media.sha256,
      0, 0, fixture.options.audioToolAuthority)).toThrow(/START-PTS-DRIFT/u);
  });
});
