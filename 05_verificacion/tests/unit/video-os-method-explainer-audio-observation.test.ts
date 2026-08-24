import {describe, expect, it} from 'vitest';

import {
  inspectMethodExplainerAudioObservation,
  parseMethodExplainerFfprobeOutput,
  parseMethodExplainerLoudnormSummary,
} from 'workflows/video-os/_runner/method-explainer-audio-observation-policy.ts';
import {
  isPlainObservationData,
  MethodExplainerAudioObservationPolicyV1Schema,
} from 'workflows/video-os/_schema/method-explainer-audio-observation-v1.schema.ts';
import {
  type AudioObservationFixture,
  FFMPEG_8_1_1_LOUDNORM_SUMMARY,
  ffprobeOutput,
  loudnormSummary,
  makeAudioObservationFixture,
  makeAudioObservationLimitFixtures,
  rebindAudioObservationFixture,
} from '../fixtures/method-explainer-audio-observation.fixture.ts';

const inspect = (fixture: unknown) => inspectMethodExplainerAudioObservation(fixture);
const mutate = (change: (fixture: AudioObservationFixture) => void) => {
  const fixture = makeAudioObservationFixture();
  change(fixture);
  rebindAudioObservationFixture(fixture);
  return inspect(fixture);
};
const expectOut = (result: ReturnType<typeof inspect>, reason: string) => {
  expect(result.policy_status).toBe('OUT_OF_POLICY');
  expect(result.material_status).toBe('NOT_MATERIAL');
  expect(result.promotion_authorized).toBe(false);
  expect(result.reasons).toContain(reason);
};

describe('method-explainer audio observation policy', () => {
  it('evaluates a hash-bound declaration without claiming material evidence', () => {
    const fixture = makeAudioObservationFixture();
    expect(isPlainObservationData(fixture)).toBe(true);
    const before = JSON.stringify(fixture);
    const first = inspect(fixture);
    const second = inspect(fixture);
    expect(second).toEqual(first);
    expect(JSON.stringify(fixture)).toBe(before);
    expect(first).toMatchObject({
      scope: 'MEASUREMENT_POLICY',
      policy_status: 'WITHIN_POLICY',
      material_status: 'NOT_MATERIAL',
      promotion_authorized: false,
      reasons: [],
      measurements: {
        codec_name: 'aac',
        sample_rate_hz: 48_000,
        channels: 1,
        channel_layout: 'mono',
        duration_seconds: 75,
        integrated_lufs: -16,
        true_peak_dbtp: -1.5,
      },
    });
    expect(JSON.stringify(first)).not.toMatch(/receipt|RENDERED_DRAFT|READY|PUBLISHED/u);
  });

  it('parses strict single-audio ffprobe JSON', () => {
    const stream = {
      codec_name: 'aac',
      codec_type: 'audio',
      sample_rate: '48000',
      channels: 1,
      channel_layout: 'mono',
      duration: '75.000',
    };
    expect(parseMethodExplainerFfprobeOutput(ffprobeOutput())).toMatchObject({
      codec_name: 'aac',
      sample_rate_hz: 48_000,
      duration_seconds: 75,
    });
    const invalid = [
      '',
      '{',
      '{}',
      '{"streams":[]}',
      '{"streams":[{},{}]}',
      ffprobeOutput({codec_type: 'video'}),
      ffprobeOutput({sample_rate: '48,000'}),
      ffprobeOutput({sample_rate: '-0'}),
      ffprobeOutput({duration: 'NaN'}),
      ffprobeOutput({duration: 'Infinity'}),
      ffprobeOutput({duration: '-0'}),
      ffprobeOutput({channels: 1.5}),
      JSON.stringify({streams: [stream], extra: true}),
      JSON.stringify({streams: [{...stream, extra: true}]}),
    ];
    invalid.forEach((value) => expect(() => parseMethodExplainerFfprobeOutput(value)).toThrow());
  });

  it('blocks duplicate ffprobe keys before last-wins parsing with rebound hashes', () => {
    const stream =
      '"codec_name":"aac","codec_type":"audio","sample_rate":"48000","channels":1,"channel_layout":"mono","duration":"75.000"';
    for (const stdout of [
      `{"streams":[],"streams":[{${stream}}]}`,
      `{"streams":[],"\\u0073treams":[{${stream}}]}`,
      `{"streams":[{"codec_name":"mp3",${stream}}]}`,
    ]) {
      const result = mutate((fixture) => {
        fixture.observation.ffprobe_stdout = stdout;
      });
      expectOut(result, 'FFPROBE_DUPLICATE_KEY');
    }
  });

  it('requires exactly one complete C-locale loudnorm summary', () => {
    expect(parseMethodExplainerLoudnormSummary(FFMPEG_8_1_1_LOUDNORM_SUMMARY)).toEqual({
      integrated_lufs: -16,
      true_peak_dbtp: -1.5,
    });
    const invalid = [
      '',
      'Output Integrated: -16.0 LUFS',
      loudnormSummary('-16,0'),
      loudnormSummary('NaN'),
      loudnormSummary('-0'),
      `${loudnormSummary()}\n${loudnormSummary()}`,
      `${loudnormSummary()}\nOutput True Peak: -1.5 dBTP`,
    ];
    invalid.forEach((value) => expect(() => parseMethodExplainerLoudnormSummary(value)).toThrow());
    expect(
      parseMethodExplainerLoudnormSummary(`ffmpeg header\n${loudnormSummary()}\ntrailer`),
    ).toMatchObject({integrated_lufs: -16, true_peak_dbtp: -1.5});
    expect(
      parseMethodExplainerLoudnormSummary(loudnormSummary().replaceAll('\n', '\r\n')),
    ).toMatchObject({integrated_lufs: -16});
    for (const malformed of [
      loudnormSummary().replace('Input Threshold: -30.0 LUFS\n\n', 'Input Threshold: -30.0 LUFS\n'),
      loudnormSummary().replace(
        'Output Threshold: -26.0 LUFS\n\n',
        'Output Threshold: -26.0 LUFS\n',
      ),
      loudnormSummary().replace('\n\n', '\nnot blank\n'),
    ])
      expect(() => parseMethodExplainerLoudnormSummary(malformed)).toThrow();
  });

  it('blocks prefixed or injected loudnorm labels after hash rebound', () => {
    for (const stderr of [
      loudnormSummary().replaceAll(/^/gmu, '[metadata] '),
      '[metadata] Output Integrated: -16.0 LUFS\nOutput True Peak: -1.5 dBTP',
      `${loudnormSummary()}\nOutput Integrated: -16.0 LUFS\nOutput True Peak: -1.5 dBTP`,
    ]) {
      const result = mutate((fixture) => {
        fixture.observation.loudnorm_stderr = stderr;
      });
      expectOut(result, 'LOUDNORM_SUMMARY_COUNT');
    }
  });

  it.each([
    ['CODEC_OUT_OF_POLICY', {codec_name: 'mp3'}],
    ['CHANNELS_OUT_OF_POLICY', {channels: 3}],
    ['LAYOUT_OUT_OF_POLICY', {channel_layout: 'surround'}],
    ['CHANNEL_LAYOUT_MISMATCH', {channels: 1, channel_layout: 'stereo'}],
    ['SAMPLE_RATE_OUT_OF_POLICY', {sample_rate: '44100'}],
    ['DURATION_OUT_OF_POLICY', {duration: '75.051'}],
  ] as const)('classifies probe mismatch %s', (reason, overrides) => {
    const result = mutate((fixture) => {
      fixture.observation.ffprobe_stdout = ffprobeOutput(overrides);
    });
    expectOut(result, reason);
  });

  it.each([
    ['-16.3', '-1.5', 'WITHIN_POLICY'],
    ['-15.7', '-2.0', 'WITHIN_POLICY'],
    ['-16.31', '-1.5', 'OUT_OF_POLICY'],
    ['-16.0', '-1.49', 'OUT_OF_POLICY'],
  ] as const)('applies inclusive loudness boundaries %s/%s', (lufs, peak, status) => {
    const result = mutate((fixture) => {
      fixture.observation.loudnorm_stderr = loudnormSummary(lufs, peak);
    });
    expect(result.policy_status).toBe(status);
  });

  it.each([
    'policy_sha256',
    'input_sha256',
    'ffprobe_tool_sha256',
    'ffmpeg_tool_sha256',
    'observation_sha256',
  ] as const)('blocks stale %s', (key) => {
    const fixture = makeAudioObservationFixture();
    fixture.expected_hashes[key] = 'f'.repeat(64);
    expectOut(inspect(fixture), `EXPECTED_${key.toUpperCase()}_MISMATCH`);
  });

  it('binds exact argv and C locale declarations', () => {
    const result = mutate((fixture) => {
      fixture.observation.invocations.ffmpeg.argv[0] = '-changed';
    });
    expectOut(result, 'INPUT_INVALID');
    const invalid = makeAudioObservationFixture();
    Object.assign(invalid.observation.invocations.ffprobe.env, {LANG: 'es_CO.UTF-8'});
    expectOut(inspect(invalid), 'INPUT_INVALID');
  });

  it('rejects negative zero across policy and upstream bindings', () => {
    for (const field of ['expected_duration_seconds', 'duration_tolerance_seconds'] as const) {
      const fixture = makeAudioObservationFixture();
      fixture.policy[field] = -0;
      expect(MethodExplainerAudioObservationPolicyV1Schema.safeParse(fixture.policy).success).toBe(
        false,
      );
      expectOut(inspect(fixture), 'INPUT_INVALID');
    }
    const binding = makeAudioObservationFixture();
    binding.observation.input_audio.size_bytes = -0;
    expectOut(inspect(binding), 'INPUT_INVALID');
  });

  it('rejects non-plain graphs without invoking accessors', () => {
    const accessor = makeAudioObservationFixture();
    let getterCalls = 0;
    Object.defineProperty(accessor, 'policy', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        throw new Error('must not execute');
      },
    });
    expect(() => inspect(accessor)).not.toThrow();
    expect(getterCalls).toBe(0);
    expectOut(inspect(accessor), 'INPUT_INVALID');

    const trapped = makeAudioObservationFixture();
    trapped.policy = new Proxy(trapped.policy, {
      get: () => {
        throw new Error('trap');
      },
    });
    expect(() => inspect(trapped)).not.toThrow();
    expectOut(inspect(trapped), 'INPUT_INVALID');

    const attacks = [
      () => {
        const fixture = makeAudioObservationFixture();
        Object.setPrototypeOf(fixture.policy, {exotic: true});
        return fixture;
      },
      () => {
        const fixture = makeAudioObservationFixture();
        Object.assign(fixture, {[Symbol('hidden')]: true});
        return fixture;
      },
      () => {
        const fixture = makeAudioObservationFixture();
        Object.defineProperty(fixture, 'setter', {enumerable: true, set: () => undefined});
        return fixture;
      },
      () => {
        const fixture = makeAudioObservationFixture();
        (fixture.policy.allowed_channels as unknown as unknown[]).length = 3;
        return fixture;
      },
      () => {
        const fixture = makeAudioObservationFixture();
        Object.assign(fixture, {cycle: fixture});
        return fixture;
      },
    ];
    attacks.forEach((attack) => expectOut(inspect(attack()), 'INPUT_INVALID'));
  });

  it.each(makeAudioObservationLimitFixtures())(
    'fails closed with a stable reason for an over-budget $name graph',
    ({input}) => {
      expect(isPlainObservationData(input)).toBe(false);
      expect(inspect(input)).toEqual({
        scope: 'MEASUREMENT_POLICY',
        policy_status: 'OUT_OF_POLICY',
        material_status: 'NOT_MATERIAL',
        promotion_authorized: false,
        reasons: ['INPUT_INVALID'],
        hashes: null,
        measurements: null,
      });
    },
  );

  it.each(['state', 'receipt', 'material_status', 'path'])(
    'rejects forbidden field %s',
    (field) => {
      const fixture = makeAudioObservationFixture();
      Object.assign(fixture.observation, {[field]: 'forbidden'});
      expectOut(inspect(fixture), 'INPUT_INVALID');
    },
  );
});
