import type {CampaignCopy} from './model.ts';

export interface DerivedCaption {
  readonly captionId: string;
  readonly beatId: string;
  readonly text: string;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly wordCount: number;
  readonly readingFrames: number;
  readonly effectiveWordsPerMinute: number;
}

export interface DerivedBeat {
  readonly beatId: string;
  readonly question: CampaignCopy['beats'][number]['question'];
  readonly eyebrow: string;
  readonly headline: string;
  readonly body: string;
  readonly claimIds: readonly string[];
  readonly configRefs: readonly string[];
  readonly layout: CampaignCopy['beats'][number]['layout'];
  readonly visualAction: string;
  readonly components: CampaignCopy['beats'][number]['components'];
  readonly mood: CampaignCopy['beats'][number]['mood'];
  readonly transition: CampaignCopy['beats'][number]['transition'];
  readonly accessibility: CampaignCopy['beats'][number]['accessibility'];
  readonly fromFrame: number;
  readonly toFrame: number;
  readonly durationFrames: number;
  readonly incomingTransitionFrames: number;
  readonly outgoingTransitionFrames: number;
  readonly caption: DerivedCaption;
}

export interface DerivedTransition {
  readonly transitionId: string;
  readonly fromBeatId: string;
  readonly toBeatId: string;
  readonly fromFrame: number;
  readonly toFrameExclusive: number;
  readonly durationFrames: number;
  readonly reviewFrames: {
    readonly pre: number;
    readonly during: number;
    readonly post: number;
  };
  readonly boundaryFrames: readonly number[];
}

export interface DerivedTimeline {
  readonly fps: number;
  readonly durationInFrames: number;
  readonly durationSeconds: number;
  readonly beats: readonly DerivedBeat[];
  readonly transitions: readonly DerivedTransition[];
  readonly captions: readonly DerivedCaption[];
}

export const countReadableWords = (text: string): number =>
  text.match(/[\p{L}\p{N}]+(?:[/-][\p{L}\p{N}]+)*/gu)?.length ?? 0;

const framesToMs = (frame: number, fps: number): number => Math.round((frame / fps) * 1000);

export const deriveTimeline = (copy: CampaignCopy): DerivedTimeline => {
  const {
    profile: {fps},
    timingPolicy: {
      captionLeadFrames,
      captionTrailFrames,
      playbackMargin,
      transitionFrames,
      wordsPerMinute,
    },
  } = copy;

  const beats: DerivedBeat[] = [];

  for (const [index, beat] of copy.beats.entries()) {
    const incomingTransitionFrames = index === 0 ? 0 : transitionFrames;
    const outgoingTransitionFrames = index === copy.beats.length - 1 ? 0 : transitionFrames;
    const wordCount = countReadableWords(beat.caption);
    if (wordCount === 0) {
      throw new Error(`Caption ${beat.beatId} has no readable words.`);
    }

    const readingFrames = Math.ceil(((wordCount * 60) / wordsPerMinute) * playbackMargin * fps);
    const minimumHoldFrames = Math.ceil(beat.minimumHoldSeconds * fps);
    const durationFrames = Math.max(
      minimumHoldFrames,
      incomingTransitionFrames +
        captionLeadFrames +
        readingFrames +
        captionTrailFrames +
        outgoingTransitionFrames,
    );
    const previous = beats.at(-1);
    const fromFrame = previous === undefined ? 0 : previous.toFrame - incomingTransitionFrames;
    const toFrame = fromFrame + durationFrames;
    const startFrame = fromFrame + incomingTransitionFrames + captionLeadFrames;
    const endFrame = startFrame + readingFrames;
    const latestCaptionEnd = toFrame - outgoingTransitionFrames - captionTrailFrames;

    if (endFrame > latestCaptionEnd) {
      throw new Error(`Caption ${beat.beatId} exceeds its derived readable window.`);
    }

    const effectiveWordsPerMinute = (wordCount / ((endFrame - startFrame) / fps)) * 60;
    const caption: DerivedCaption = {
      captionId: `CAP-${beat.beatId}`,
      beatId: beat.beatId,
      text: beat.caption,
      startFrame,
      endFrame,
      startMs: framesToMs(startFrame, fps),
      endMs: framesToMs(endFrame, fps),
      wordCount,
      readingFrames,
      effectiveWordsPerMinute: Number(effectiveWordsPerMinute.toFixed(2)),
    };

    beats.push({
      beatId: beat.beatId,
      question: beat.question,
      eyebrow: beat.eyebrow,
      headline: beat.headline,
      body: beat.body,
      claimIds: beat.claimIds,
      configRefs: beat.configRefs,
      layout: beat.layout,
      visualAction: beat.visualAction,
      components: beat.components,
      mood: beat.mood,
      transition: beat.transition,
      accessibility: beat.accessibility,
      fromFrame,
      toFrame,
      durationFrames,
      incomingTransitionFrames,
      outgoingTransitionFrames,
      caption,
    });
  }

  const transitions: DerivedTransition[] = beats.slice(1).map((beat, index) => {
    const previous = beats[index];
    if (previous === undefined) {
      throw new Error(`Missing previous beat for ${beat.beatId}.`);
    }

    const fromFrame = beat.fromFrame;
    const toFrameExclusive = previous.toFrame;
    const durationFrames = toFrameExclusive - fromFrame;
    if (durationFrames !== transitionFrames) {
      throw new Error(`Transition into ${beat.beatId} is not ${transitionFrames} frames.`);
    }

    return {
      transitionId: `TR-${previous.beatId}-${beat.beatId}`,
      fromBeatId: previous.beatId,
      toBeatId: beat.beatId,
      fromFrame,
      toFrameExclusive,
      durationFrames,
      reviewFrames: {
        pre: fromFrame - 1,
        during: fromFrame + Math.floor(durationFrames / 2),
        post: toFrameExclusive,
      },
      boundaryFrames: [
        fromFrame - 1,
        fromFrame,
        fromFrame + 1,
        toFrameExclusive - 1,
        toFrameExclusive,
        toFrameExclusive + 1,
      ],
    };
  });

  const durationInFrames = beats.at(-1)?.toFrame ?? 0;
  if (durationInFrames <= 0) {
    throw new Error('Derived duration must be positive.');
  }

  return {
    fps,
    durationInFrames,
    durationSeconds: Number((durationInFrames / fps).toFixed(3)),
    beats,
    transitions,
    captions: beats.map(({caption}) => caption),
  };
};
