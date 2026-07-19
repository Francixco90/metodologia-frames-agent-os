import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {campaignCopySchema} from '../../../networks/content/src/model.ts';
import {deriveTimeline} from '../../../networks/content/src/timing.ts';

const root = process.cwd();
const copy = campaignCopySchema.parse(
  JSON.parse(
    readFileSync(
      resolve(root, 'projects/vs-001-source-to-campaign/content/campaign-copy.json'),
      'utf8',
    ),
  ),
);

describe('A07 derived timing', () => {
  it('derives duration from seven captions rather than a 36 second default', () => {
    const timeline = deriveTimeline(copy);

    expect(timeline.beats).toHaveLength(7);
    expect(timeline.captions).toHaveLength(7);
    expect(timeline.durationInFrames).toBe(1231);
    expect(timeline.durationInFrames).not.toBe(copy.profile.fps * 36);
    expect(timeline.durationSeconds).toBe(41.033);
  });

  it('keeps captions monotonic, bounded and below the configured effective WPM', () => {
    const timeline = deriveTimeline(copy);
    const maximumWpm = copy.timingPolicy.wordsPerMinute / copy.timingPolicy.playbackMargin;

    for (const [index, caption] of timeline.captions.entries()) {
      const beat = timeline.beats[index];
      expect(beat).toBeDefined();
      expect(caption.startFrame).toBeGreaterThanOrEqual(
        (beat?.fromFrame ?? 0) + (beat?.incomingTransitionFrames ?? 0),
      );
      expect(caption.endFrame).toBeLessThanOrEqual(
        (beat?.toFrame ?? 0) - (beat?.outgoingTransitionFrames ?? 0),
      );
      expect(caption.effectiveWordsPerMinute).toBeLessThanOrEqual(Number(maximumWpm.toFixed(2)));

      const next = timeline.captions[index + 1];
      if (next !== undefined) {
        expect(caption.endFrame).toBeLessThanOrEqual(next.startFrame);
      }
    }
  });

  it('declares every transition overlap and T-1/T/T+1 bounds', () => {
    const timeline = deriveTimeline(copy);

    expect(timeline.transitions).toHaveLength(6);
    for (const transition of timeline.transitions) {
      expect(transition.durationFrames).toBe(copy.timingPolicy.transitionFrames);
      expect(transition.reviewFrames.pre).toBe(transition.fromFrame - 1);
      expect(transition.reviewFrames.during).toBeGreaterThan(transition.fromFrame);
      expect(transition.reviewFrames.during).toBeLessThan(transition.toFrameExclusive);
      expect(transition.reviewFrames.post).toBe(transition.toFrameExclusive);
      expect(transition.boundaryFrames).toEqual([
        transition.fromFrame - 1,
        transition.fromFrame,
        transition.fromFrame + 1,
        transition.toFrameExclusive - 1,
        transition.toFrameExclusive,
        transition.toFrameExclusive + 1,
      ]);
      for (const frame of transition.boundaryFrames) {
        expect(frame).toBeGreaterThanOrEqual(0);
        expect(frame).toBeLessThan(timeline.durationInFrames);
      }
    }
  });
});
