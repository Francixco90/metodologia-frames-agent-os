export type FixtureDisposition = 'ACCEPT' | 'QUARANTINE' | 'REJECT';

export type FixtureReasonCode =
  | 'QUARANTINE_UNSUPPORTED_PROFILE'
  | 'QUARANTINE_UNSUPPORTED_TYPOGRAPHY'
  | 'REJECT_PROFILE_AUDIO_PRESENT'
  | 'REJECT_AUDIO_LONGER_THAN_VIDEO'
  | 'REJECT_CAPTION_OVERLAP'
  | 'REJECT_ASSET_CORRUPT'
  | 'REJECT_ASSET_EXPIRED'
  | 'REJECT_ASSET_LICENSE_UNKNOWN'
  | 'REJECT_TRANSITION_NOT_SHORTER_THAN_SCENE'
  | 'REJECT_REMOTE_NETWORK_NOT_DENIED'
  | 'REJECT_ASYNC_TIMEOUT'
  | 'REJECT_ASYNC_ABORTED'
  | 'QUARANTINE_WEBGL_HEADLESS_UNDECLARED'
  | 'REJECT_REMOTE_LOTTIE_ASSET'
  | 'REJECT_LOTTIE_ASSET_CLOSURE'
  | 'REJECT_RUNTIME_LICENSE_UNKNOWN';

interface CaptionWindow {
  readonly startFrame: number;
  readonly endFrame: number;
}

interface FixtureAsset {
  readonly digestMatches: boolean;
  readonly expired: boolean;
  readonly licenseVerdict: 'known' | 'unknown';
}

export interface AudiovisualFixtureCandidate {
  readonly fixtureId: string;
  readonly profile: '16:9' | '9:16' | '1:1';
  readonly typography: 'latin-supported' | 'long-text' | 'rtl' | 'cjk' | 'emoji';
  readonly audio:
    {readonly mode: 'absent'} | {readonly mode: 'present'; readonly durationFrames: number};
  readonly durationFrames: number;
  readonly captions: readonly CaptionWindow[];
  readonly assets: readonly FixtureAsset[];
  readonly minimumSceneFrames: number;
  readonly transitionFrames: number;
  readonly runtime: {
    readonly remoteNetworkDenied: boolean;
    readonly asyncState: 'resolved' | 'timeout' | 'aborted';
    readonly webgl: 'none' | 'headless-required';
    readonly lottie: 'none' | 'local-closed' | 'local-with-external-refs' | 'remote';
    readonly licenseVerdict: 'evaluation-only' | 'unknown';
  };
}

export interface FixtureGateResult {
  readonly fixtureId: string;
  readonly disposition: FixtureDisposition;
  readonly reasonCodes: readonly FixtureReasonCode[];
  readonly stateMustRemain: 'BLOCKED_BEFORE_SOURCE_LOCK';
  readonly outputMustExist: boolean;
  readonly successReceiptExpected: boolean;
}

const hasCaptionOverlap = (captions: readonly CaptionWindow[]): boolean =>
  captions.some((caption, index) => {
    const next = captions[index + 1];
    return (
      caption.endFrame <= caption.startFrame ||
      (next !== undefined && caption.endFrame > next.startFrame)
    );
  });

export const evaluateAudiovisualFixture = (
  candidate: AudiovisualFixtureCandidate,
): FixtureGateResult => {
  const quarantineReasons: FixtureReasonCode[] = [];
  const rejectReasons: FixtureReasonCode[] = [];

  if (candidate.profile !== '9:16') {
    quarantineReasons.push('QUARANTINE_UNSUPPORTED_PROFILE');
  }
  if (candidate.typography !== 'latin-supported') {
    quarantineReasons.push('QUARANTINE_UNSUPPORTED_TYPOGRAPHY');
  }
  if (candidate.audio.mode === 'present') {
    rejectReasons.push('REJECT_PROFILE_AUDIO_PRESENT');
    if (candidate.audio.durationFrames > candidate.durationFrames) {
      rejectReasons.push('REJECT_AUDIO_LONGER_THAN_VIDEO');
    }
  }
  if (hasCaptionOverlap(candidate.captions)) {
    rejectReasons.push('REJECT_CAPTION_OVERLAP');
  }
  for (const asset of candidate.assets) {
    if (!asset.digestMatches) {
      rejectReasons.push('REJECT_ASSET_CORRUPT');
    }
    if (asset.expired) {
      rejectReasons.push('REJECT_ASSET_EXPIRED');
    }
    if (asset.licenseVerdict === 'unknown') {
      rejectReasons.push('REJECT_ASSET_LICENSE_UNKNOWN');
    }
  }
  if (candidate.transitionFrames >= candidate.minimumSceneFrames) {
    rejectReasons.push('REJECT_TRANSITION_NOT_SHORTER_THAN_SCENE');
  }
  if (!candidate.runtime.remoteNetworkDenied) {
    rejectReasons.push('REJECT_REMOTE_NETWORK_NOT_DENIED');
  }
  if (candidate.runtime.asyncState === 'timeout') {
    rejectReasons.push('REJECT_ASYNC_TIMEOUT');
  }
  if (candidate.runtime.asyncState === 'aborted') {
    rejectReasons.push('REJECT_ASYNC_ABORTED');
  }
  if (candidate.runtime.webgl === 'headless-required') {
    quarantineReasons.push('QUARANTINE_WEBGL_HEADLESS_UNDECLARED');
  }
  if (candidate.runtime.lottie === 'remote') {
    rejectReasons.push('REJECT_REMOTE_LOTTIE_ASSET');
  }
  if (candidate.runtime.lottie === 'local-with-external-refs') {
    rejectReasons.push('REJECT_LOTTIE_ASSET_CLOSURE');
  }
  if (candidate.runtime.licenseVerdict === 'unknown') {
    rejectReasons.push('REJECT_RUNTIME_LICENSE_UNKNOWN');
  }

  const reasonCodes = [...new Set([...rejectReasons, ...quarantineReasons])];
  const disposition: FixtureDisposition =
    rejectReasons.length > 0 ? 'REJECT' : quarantineReasons.length > 0 ? 'QUARANTINE' : 'ACCEPT';

  return {
    fixtureId: candidate.fixtureId,
    disposition,
    reasonCodes,
    stateMustRemain: 'BLOCKED_BEFORE_SOURCE_LOCK',
    outputMustExist: disposition === 'ACCEPT',
    successReceiptExpected: disposition === 'ACCEPT',
  };
};
