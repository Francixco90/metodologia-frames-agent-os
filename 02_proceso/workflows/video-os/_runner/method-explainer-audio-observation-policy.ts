import {
  MethodExplainerAudioObservationExpectedHashesSchema as ExpectedHashesSchema,
  MethodExplainerAudioObservationInspectionInputSchema as InspectionInputSchema,
  MethodExplainerAudioObservationPolicyV1Schema as PolicySchema,
  MethodExplainerAudioObservationV1Schema as ObservationSchema,
  isPlainObservationData,
  parseJsonWithUniqueKeys,
} from '../_schema/method-explainer-audio-observation-v1.schema.ts';
import {canonicalSha256} from '../_schema/method-explainer-planning-v1.schema.ts';

type Probe = Readonly<{
  codec_name: string;
  sample_rate_hz: number;
  channels: number;
  channel_layout: string;
  duration_seconds: number;
}>;
type Loudness = Readonly<{integrated_lufs: number; true_peak_dbtp: number}>;
class ObservationParseError extends Error {}
export const AUDIO_OBSERVATION_COVERAGE_GAPS = [
  'REFLECT_OWN_KEYS_ENUMERATION_REQUIRES_HOST_BYTE_BOUND',
] as const;
const fail = (code: string): never => {
  throw new ObservationParseError(code);
};
const exactKeys = (value: Record<string, unknown>, expected: readonly string[]) =>
  Object.keys(value).sort().join('|') === [...expected].sort().join('|');
const decimal = (value: unknown, code: string) => {
  if (typeof value !== 'string' || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) fail(code);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Object.is(parsed, -0)) fail(code);
  return parsed;
};

export const parseMethodExplainerFfprobeOutput = (stdout: unknown): Probe => {
  if (typeof stdout !== 'string' || stdout.length > 20_000) return fail('FFPROBE_OUTPUT');
  let parsed: unknown;
  try {
    parsed = parseJsonWithUniqueKeys(stdout);
  } catch (error) {
    if (error instanceof Error && error.message === 'JSON_DUPLICATE_KEY')
      return fail('FFPROBE_DUPLICATE_KEY');
    return fail('FFPROBE_OUTPUT');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('FFPROBE_OUTPUT');
  const root = parsed as Record<string, unknown>;
  const streams = root.streams;
  if (!exactKeys(root, ['streams']) || !Array.isArray(streams)) return fail('FFPROBE_OUTPUT');
  if (streams.length !== 1) fail('AUDIO_STREAM_COUNT');
  const raw: unknown = streams[0];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('FFPROBE_OUTPUT');
  const stream = raw as Record<string, unknown>;
  const keys = [
    'codec_name',
    'codec_type',
    'sample_rate',
    'channels',
    'channel_layout',
    'duration',
  ];
  if (!exactKeys(stream, keys) || stream.codec_type !== 'audio') fail('FFPROBE_OUTPUT');
  const codec = stream.codec_name;
  const channels = stream.channels;
  const layout = stream.channel_layout;
  if (typeof codec !== 'string' || !/^[a-z0-9_]{2,30}$/u.test(codec)) return fail('FFPROBE_OUTPUT');
  if (typeof channels !== 'number' || !Number.isSafeInteger(channels))
    return fail('FFPROBE_OUTPUT');
  if (typeof layout !== 'string' || !/^[a-z0-9_]{2,30}$/u.test(layout))
    return fail('FFPROBE_OUTPUT');
  const sampleRate = decimal(stream.sample_rate, 'FFPROBE_OUTPUT');
  const duration = decimal(stream.duration, 'FFPROBE_OUTPUT');
  if (!Number.isSafeInteger(sampleRate) || sampleRate <= 0 || channels <= 0 || duration <= 0)
    fail('FFPROBE_OUTPUT');
  return {
    codec_name: codec,
    sample_rate_hz: sampleRate,
    channels,
    channel_layout: layout,
    duration_seconds: duration,
  };
};

export const parseMethodExplainerLoudnormSummary = (stderr: unknown): Loudness => {
  if (typeof stderr !== 'string' || stderr.length > 50_000) return fail('LOUDNORM_OUTPUT');
  const number = '(-?(?:0|[1-9]\\d*)(?:\\.\\d+)?)';
  const signed = '[+-]?(?:0|[1-9]\\d*)(?:\\.\\d+)?';
  const block = new RegExp(
    [
      `(?:^|\\r?\\n)Input Integrated:[ \\t]*${number} LUFS`,
      `Input True Peak:[ \\t]*${number} dBTP`,
      `Input LRA:[ \\t]*${number} LU`,
      `Input Threshold:[ \\t]*${number} LUFS`,
      '',
      `Output Integrated:[ \\t]*${number} LUFS`,
      `Output True Peak:[ \\t]*${number} dBTP`,
      `Output LRA:[ \\t]*${number} LU`,
      `Output Threshold:[ \\t]*${number} LUFS`,
      '',
      'Normalization Type:[ \\t]*(?:Linear|Dynamic)',
      `Target Offset:[ \\t]*${signed} LU(?=\\r?\\n|$)`,
    ].join('\\r?\\n'),
    'gu',
  );
  const summaries = [...stderr.matchAll(block)];
  const labels =
    'Input Integrated|Input True Peak|Input LRA|Input Threshold|Output Integrated|Output True Peak|Output LRA|Output Threshold|Normalization Type|Target Offset'.split(
      '|',
    );
  if (
    summaries.length !== 1 ||
    labels.some((label) => (stderr.match(new RegExp(`${label}:`, 'gu'))?.length ?? 0) !== 1)
  )
    fail('LOUDNORM_SUMMARY_COUNT');
  const summary = summaries[0]!;
  return {
    integrated_lufs: decimal(summary[5], 'LOUDNORM_OUTPUT'),
    true_peak_dbtp: decimal(summary[6], 'LOUDNORM_OUTPUT'),
  };
};

const blocked = (reasons: readonly string[] = ['INPUT_INVALID']) => ({
  scope: 'MEASUREMENT_POLICY' as const,
  policy_status: 'OUT_OF_POLICY' as const,
  material_status: 'NOT_MATERIAL' as const,
  promotion_authorized: false,
  coverage_gaps: [...AUDIO_OBSERVATION_COVERAGE_GAPS],
  reasons: [...reasons].sort(),
  hashes: null,
  measurements: null,
});

const inspectObservation = (raw: unknown) => {
  if (!isPlainObservationData(raw)) return blocked();
  const envelope = InspectionInputSchema.safeParse(raw);
  if (!envelope.success) return blocked();
  const policyResult = PolicySchema.safeParse(envelope.data.policy);
  const observationResult = ObservationSchema.safeParse(envelope.data.observation);
  const expectedResult = ExpectedHashesSchema.safeParse(envelope.data.expected_hashes);
  if (!policyResult.success || !observationResult.success || !expectedResult.success)
    return blocked();
  const policy = policyResult.data;
  const observation = observationResult.data;
  const hashes = {
    policy_sha256: canonicalSha256(policy),
    input_sha256: canonicalSha256(observation.input_audio),
    ffprobe_tool_sha256: canonicalSha256(observation.tools.ffprobe),
    ffmpeg_tool_sha256: canonicalSha256(observation.tools.ffmpeg),
    observation_sha256: canonicalSha256(observation),
  };
  const reasons = new Set<string>();
  for (const key of Object.keys(hashes) as (keyof typeof hashes)[])
    if (hashes[key] !== expectedResult.data[key])
      reasons.add(`EXPECTED_${key.toUpperCase()}_MISMATCH`);
  let probe: Probe;
  let loudness: Loudness;
  try {
    probe = parseMethodExplainerFfprobeOutput(observation.ffprobe_stdout);
    loudness = parseMethodExplainerLoudnormSummary(observation.loudnorm_stderr);
  } catch (error) {
    return blocked([error instanceof ObservationParseError ? error.message : 'INPUT_INVALID']);
  }
  if (!policy.allowed_codecs.includes(probe.codec_name as never))
    reasons.add('CODEC_OUT_OF_POLICY');
  if (!policy.allowed_channels.includes(probe.channels as never))
    reasons.add('CHANNELS_OUT_OF_POLICY');
  if (!policy.allowed_layouts.includes(probe.channel_layout as never))
    reasons.add('LAYOUT_OUT_OF_POLICY');
  if ((probe.channels === 1) !== (probe.channel_layout === 'mono'))
    reasons.add('CHANNEL_LAYOUT_MISMATCH');
  if (probe.sample_rate_hz !== policy.sample_rate_hz) reasons.add('SAMPLE_RATE_OUT_OF_POLICY');
  if (
    Math.abs(probe.duration_seconds - policy.expected_duration_seconds) >
    policy.duration_tolerance_seconds
  )
    reasons.add('DURATION_OUT_OF_POLICY');
  if (
    loudness.integrated_lufs < policy.integrated_lufs_target - policy.integrated_lufs_tolerance ||
    loudness.integrated_lufs > policy.integrated_lufs_target + policy.integrated_lufs_tolerance
  )
    reasons.add('INTEGRATED_LUFS_OUT_OF_POLICY');
  if (loudness.true_peak_dbtp > policy.true_peak_dbtp_max) reasons.add('TRUE_PEAK_OUT_OF_POLICY');
  return {
    scope: 'MEASUREMENT_POLICY' as const,
    policy_status: reasons.size ? ('OUT_OF_POLICY' as const) : ('WITHIN_POLICY' as const),
    material_status: 'NOT_MATERIAL' as const,
    promotion_authorized: false,
    coverage_gaps: [...AUDIO_OBSERVATION_COVERAGE_GAPS],
    reasons: [...reasons].sort(),
    hashes,
    measurements: {...probe, ...loudness},
  };
};

export const inspectMethodExplainerAudioObservation = (raw: unknown) => {
  try {
    return inspectObservation(raw);
  } catch {
    return blocked();
  }
};
