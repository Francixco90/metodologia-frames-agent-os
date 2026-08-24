import {canonicalSha256} from 'workflows/video-os/_schema/method-explainer-planning-v1.schema.ts';
import {PLAIN_OBSERVATION_LIMITS} from 'workflows/video-os/_schema/method-explainer-audio-observation-v1.schema.ts';

const invocationContract = () => ({
  ffprobe: {
    argv: [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=codec_name,codec_type,sample_rate,channels,channel_layout,duration',
      '-of',
      'json',
      '$INPUT',
    ],
    env: {LC_ALL: 'C' as const, LANG: 'C' as const},
  },
  ffmpeg: {
    argv: [
      '-hide_banner',
      '-nostdin',
      '-nostats',
      '-i',
      '$INPUT',
      '-map',
      '0:a:0',
      '-vn',
      '-sn',
      '-dn',
      '-af',
      'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=summary',
      '-f',
      'null',
      '-',
    ],
    env: {LC_ALL: 'C' as const, LANG: 'C' as const},
  },
});

export const ffprobeOutput = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    streams: [
      {
        codec_name: 'aac',
        codec_type: 'audio',
        sample_rate: '48000',
        channels: 1,
        channel_layout: 'mono',
        duration: '75.000',
        ...overrides,
      },
    ],
  });

export const loudnormSummary = (integrated = '-16.0', peak = '-1.5') =>
  [
    'Input Integrated: -20.0 LUFS',
    'Input True Peak: -2.0 dBTP',
    'Input LRA: 1.0 LU',
    'Input Threshold: -30.0 LUFS',
    '',
    `Output Integrated: ${integrated} LUFS`,
    `Output True Peak: ${peak} dBTP`,
    'Output LRA: 1.0 LU',
    'Output Threshold: -26.0 LUFS',
    '',
    'Normalization Type: Dynamic',
    'Target Offset: +0.0 LU',
  ].join('\n');

// Normalized label block captured from FFmpeg 8.1.1; runtime prefixes are outside this block.
export const FFMPEG_8_1_1_LOUDNORM_SUMMARY = loudnormSummary();

export const makeAudioObservationFixture = () => {
  const policy = {
    schema_version: 'method-explainer-audio-observation-policy-v1' as const,
    scope: 'MEASUREMENT_POLICY' as const,
    invocations: invocationContract(),
    allowed_codecs: ['aac', 'flac', 'pcm_s16le', 'pcm_s24le'] as const,
    allowed_channels: [1, 2] as const,
    allowed_layouts: ['mono', 'stereo'] as const,
    expected_duration_seconds: 75,
    duration_tolerance_seconds: 0.05,
    sample_rate_hz: 48_000 as const,
    integrated_lufs_target: -16 as const,
    integrated_lufs_tolerance: 0.3 as const,
    true_peak_dbtp_max: -1.5 as const,
  };
  const observation = {
    schema_version: 'method-explainer-audio-observation-v1' as const,
    scope: 'MEASUREMENT_POLICY' as const,
    input_audio: {ref: 'audio/master.aac', sha256: '1'.repeat(64), size_bytes: 1024},
    tools: {
      ffprobe: {ref: 'tools/ffprobe', sha256: '2'.repeat(64), size_bytes: 200},
      ffmpeg: {ref: 'tools/ffmpeg', sha256: '3'.repeat(64), size_bytes: 300},
    },
    invocations: invocationContract(),
    ffprobe_stdout: ffprobeOutput(),
    loudnorm_stderr: loudnormSummary(),
  };
  return {
    policy,
    observation,
    expected_hashes: {
      policy_sha256: canonicalSha256(policy),
      input_sha256: canonicalSha256(observation.input_audio),
      ffprobe_tool_sha256: canonicalSha256(observation.tools.ffprobe),
      ffmpeg_tool_sha256: canonicalSha256(observation.tools.ffmpeg),
      observation_sha256: canonicalSha256(observation),
    },
  };
};

export type AudioObservationFixture = ReturnType<typeof makeAudioObservationFixture>;
export const rebindAudioObservationFixture = (fixture: AudioObservationFixture) => {
  fixture.expected_hashes.policy_sha256 = canonicalSha256(fixture.policy);
  fixture.expected_hashes.input_sha256 = canonicalSha256(fixture.observation.input_audio);
  fixture.expected_hashes.ffprobe_tool_sha256 = canonicalSha256(fixture.observation.tools.ffprobe);
  fixture.expected_hashes.ffmpeg_tool_sha256 = canonicalSha256(fixture.observation.tools.ffmpeg);
  fixture.expected_hashes.observation_sha256 = canonicalSha256(fixture.observation);
  return fixture;
};

const nestedObject = () => {
  let value: Record<string, unknown> = {};
  for (let depth = 0; depth <= PLAIN_OBSERVATION_LIMITS.maxDepth; depth += 1)
    value = {child: value};
  return value;
};

const fanoutObject = () =>
  Array.from({length: PLAIN_OBSERVATION_LIMITS.maxArrayLength}, (_, group) =>
    Object.fromEntries(
      Array.from({length: 16}, (_entry, index) => [`value_${group}_${index}`, index]),
    ),
  );

export const makeAudioObservationLimitFixtures = () =>
  [
    {
      name: 'wide',
      value: Object.fromEntries(
        Array.from({length: PLAIN_OBSERVATION_LIMITS.maxOwnProperties + 1}, (_, index) => [
          `key_${index}`,
          index,
        ]),
      ),
    },
    {name: 'deep', value: nestedObject()},
    {name: 'fanout', value: fanoutObject()},
    {
      name: 'oversized-array',
      value: Array.from({length: PLAIN_OBSERVATION_LIMITS.maxArrayLength + 1}, () => null),
    },
  ].map(({name, value}) => ({name, input: {...makeAudioObservationFixture(), untrusted: value}}));

export const makeOversizedAudioObservationProxyFixture = () => {
  let indexedDescriptorReads = 0;
  const oversized = Array.from({length: PLAIN_OBSERVATION_LIMITS.maxArrayLength + 1}, () => null);
  const guarded = new Proxy(oversized, {
    getOwnPropertyDescriptor(target, property) {
      if (typeof property === 'string' && /^(?:0|[1-9]\d*)$/u.test(property)) {
        indexedDescriptorReads += 1;
        throw new Error('OVERSIZED_ARRAY_INDEX_DESCRIPTOR_READ');
      }
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  });
  return {
    input: {...makeAudioObservationFixture(), untrusted: guarded},
    indexedDescriptorReads: () => indexedDescriptorReads,
  };
};
