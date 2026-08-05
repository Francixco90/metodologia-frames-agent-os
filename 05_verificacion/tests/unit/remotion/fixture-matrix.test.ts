import {describe, expect, it} from 'vitest';

import {
  type AudiovisualFixtureCandidate,
  evaluateAudiovisualFixture,
  type FixtureReasonCode,
} from '../../../../renderers/remotion/src/fixture-gate.ts';
import {assertRuntimeRequestAllowed} from '../../../../renderers/remotion/src/network-guard.ts';

const baseFixture: AudiovisualFixtureCandidate = {
  fixtureId: 'FX-09X16-LOCAL-SILENT',
  profile: '9:16',
  typography: 'latin-supported',
  audio: {mode: 'absent'},
  durationFrames: 1231,
  captions: [
    {startFrame: 10, endFrame: 80},
    {startFrame: 100, endFrame: 180},
  ],
  assets: [{digestMatches: true, expired: false, licenseVerdict: 'known'}],
  minimumSceneFrames: 120,
  transitionFrames: 12,
  runtime: {
    remoteNetworkDenied: true,
    asyncState: 'resolved',
    webgl: 'none',
    lottie: 'none',
    licenseVerdict: 'evaluation-only',
  },
};

const candidate = (
  fixtureId: string,
  patch: Partial<AudiovisualFixtureCandidate>,
): AudiovisualFixtureCandidate => ({
  ...baseFixture,
  ...patch,
  fixtureId,
  runtime: {...baseFixture.runtime, ...patch.runtime},
});

const expectedCases: ReadonlyArray<{
  fixture: AudiovisualFixtureCandidate;
  disposition: 'ACCEPT' | 'QUARANTINE' | 'REJECT';
  reasons: readonly FixtureReasonCode[];
}> = [
  {fixture: baseFixture, disposition: 'ACCEPT', reasons: []},
  {
    fixture: candidate('FX-16X09', {profile: '16:9'}),
    disposition: 'QUARANTINE',
    reasons: ['QUARANTINE_UNSUPPORTED_PROFILE'],
  },
  {
    fixture: candidate('FX-01X01', {profile: '1:1'}),
    disposition: 'QUARANTINE',
    reasons: ['QUARANTINE_UNSUPPORTED_PROFILE'],
  },
  ...(['long-text', 'rtl', 'cjk', 'emoji'] as const).map((typography) => ({
    fixture: candidate(`FX-TYPE-${typography.toUpperCase()}`, {typography}),
    disposition: 'QUARANTINE' as const,
    reasons: ['QUARANTINE_UNSUPPORTED_TYPOGRAPHY'] as const,
  })),
  {
    fixture: candidate('FX-AUDIO-LONG', {
      audio: {mode: 'present', durationFrames: 1300},
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_PROFILE_AUDIO_PRESENT', 'REJECT_AUDIO_LONGER_THAN_VIDEO'],
  },
  {
    fixture: candidate('FX-CAPTIONS-OVERLAP', {
      captions: [
        {startFrame: 10, endFrame: 120},
        {startFrame: 100, endFrame: 180},
      ],
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_CAPTION_OVERLAP'],
  },
  {
    fixture: candidate('FX-ASSET-CORRUPT', {
      assets: [{digestMatches: false, expired: false, licenseVerdict: 'known'}],
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_ASSET_CORRUPT'],
  },
  {
    fixture: candidate('FX-ASSET-EXPIRED', {
      assets: [{digestMatches: true, expired: true, licenseVerdict: 'known'}],
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_ASSET_EXPIRED'],
  },
  {
    fixture: candidate('FX-ASSET-LICENSE-UNKNOWN', {
      assets: [{digestMatches: true, expired: false, licenseVerdict: 'unknown'}],
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_ASSET_LICENSE_UNKNOWN'],
  },
  {
    fixture: candidate('FX-TRANSITION-GTE-SCENE', {
      minimumSceneFrames: 12,
      transitionFrames: 12,
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_TRANSITION_NOT_SHORTER_THAN_SCENE'],
  },
  {
    fixture: candidate('FX-NETWORK-NOT-DENIED', {
      runtime: {...baseFixture.runtime, remoteNetworkDenied: false},
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_REMOTE_NETWORK_NOT_DENIED'],
  },
  ...(['timeout', 'aborted'] as const).map((asyncState) => ({
    fixture: candidate(`FX-ASYNC-${asyncState.toUpperCase()}`, {
      runtime: {...baseFixture.runtime, asyncState},
    }),
    disposition: 'REJECT' as const,
    reasons: [asyncState === 'timeout' ? 'REJECT_ASYNC_TIMEOUT' : 'REJECT_ASYNC_ABORTED'] as const,
  })),
  {
    fixture: candidate('FX-WEBGL-HEADLESS', {
      runtime: {...baseFixture.runtime, webgl: 'headless-required'},
    }),
    disposition: 'QUARANTINE',
    reasons: ['QUARANTINE_WEBGL_HEADLESS_UNDECLARED'],
  },
  {
    fixture: candidate('FX-LOTTIE-REMOTE', {
      runtime: {...baseFixture.runtime, lottie: 'remote'},
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_REMOTE_LOTTIE_ASSET'],
  },
  {
    fixture: candidate('FX-LOTTIE-EXTERNAL-REF', {
      runtime: {...baseFixture.runtime, lottie: 'local-with-external-refs'},
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_LOTTIE_ASSET_CLOSURE'],
  },
  {
    fixture: candidate('FX-RUNTIME-LICENSE-UNKNOWN', {
      runtime: {...baseFixture.runtime, licenseVerdict: 'unknown'},
    }),
    disposition: 'REJECT',
    reasons: ['REJECT_RUNTIME_LICENSE_UNKNOWN'],
  },
];

describe('mandatory audiovisual fixture matrix', () => {
  it.each(expectedCases)(
    '$fixture.fixtureId -> $disposition',
    ({fixture, disposition, reasons}) => {
      const result = evaluateAudiovisualFixture(fixture);

      expect(result.disposition).toBe(disposition);
      expect(result.reasonCodes).toEqual(reasons);
      expect(result.stateMustRemain).toBe('BLOCKED_BEFORE_SOURCE_LOCK');
      expect(result.outputMustExist).toBe(disposition === 'ACCEPT');
      expect(result.successReceiptExpected).toBe(disposition === 'ACCEPT');
    },
  );

  it('accepts absent audio and rejects an external request while allowing loopback', () => {
    expect(evaluateAudiovisualFixture(baseFixture).disposition).toBe('ACCEPT');
    expect(() =>
      assertRuntimeRequestAllowed('http://127.0.0.1:3000/bundle.js', 'http://127.0.0.1:3000'),
    ).not.toThrow();
    expect(() =>
      assertRuntimeRequestAllowed('https://example.invalid/remote-canary', 'http://127.0.0.1:3000'),
    ).toThrow(/REMOTE_NETWORK_DENIED/u);
  });
});
