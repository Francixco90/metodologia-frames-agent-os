import {z} from 'zod';

import {ArtifactBindingSchema} from './method-explainer-planning-v1.schema.ts';
import {Sha256Schema} from './video-os-v1.schema.ts';

const EnvSchema = z.strictObject({LC_ALL: z.literal('C'), LANG: z.literal('C')});
const FfprobeInvocationSchema = z.strictObject({
  argv: z.tuple([
    z.literal('-v'),
    z.literal('error'),
    z.literal('-select_streams'),
    z.literal('a'),
    z.literal('-show_entries'),
    z.literal('stream=codec_name,codec_type,sample_rate,channels,channel_layout,duration'),
    z.literal('-of'),
    z.literal('json'),
    z.literal('$INPUT'),
  ]),
  env: EnvSchema,
});
const FfmpegInvocationSchema = z.strictObject({
  argv: z.tuple([
    z.literal('-hide_banner'),
    z.literal('-nostdin'),
    z.literal('-nostats'),
    z.literal('-i'),
    z.literal('$INPUT'),
    z.literal('-map'),
    z.literal('0:a:0'),
    z.literal('-vn'),
    z.literal('-sn'),
    z.literal('-dn'),
    z.literal('-af'),
    z.literal('loudnorm=I=-16:TP=-1.5:LRA=11:print_format=summary'),
    z.literal('-f'),
    z.literal('null'),
    z.literal('-'),
  ]),
  env: EnvSchema,
});
const InvocationContractSchema = z.strictObject({
  ffprobe: FfprobeInvocationSchema,
  ffmpeg: FfmpegInvocationSchema,
});

export const PLAIN_OBSERVATION_LIMITS = {
  maxDepth: 12,
  maxNodes: 2_048,
  maxArrayLength: 128,
  maxOwnProperties: 128,
} as const;

export const isPlainObservationData = (input: unknown): boolean => {
  const seen = new Set<object>();
  const pending: {value: unknown; depth: number}[] = [{value: input, depth: 0}];
  let scheduledNodes = 1;
  while (pending.length) {
    const {value, depth} = pending.pop()!;
    if (depth > PLAIN_OBSERVATION_LIMITS.maxDepth) return false;
    if (value === null || ['string', 'boolean'].includes(typeof value)) continue;
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Object.is(value, -0)) return false;
      continue;
    }
    if (typeof value !== 'object' || seen.has(value)) return false;
    seen.add(value);
    try {
      const array = Array.isArray(value);
      if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype))
        return false;
      let arrayLength = 0;
      if (array) {
        const descriptor = Object.getOwnPropertyDescriptor(value, 'length');
        if (!descriptor || !('value' in descriptor) || !Number.isSafeInteger(descriptor.value))
          return false;
        arrayLength = descriptor.value as number;
        if (arrayLength < 0 || arrayLength > PLAIN_OBSERVATION_LIMITS.maxArrayLength) return false;
      }
      const keys = Reflect.ownKeys(value);
      const dataKeyCount = keys.length - (array ? 1 : 0);
      if (dataKeyCount < 0 || dataKeyCount > PLAIN_OBSERVATION_LIMITS.maxOwnProperties)
        return false;
      let arrayIndexes = 0;
      for (const key of keys) {
        if (typeof key !== 'string') return false;
        if (array && key === 'length') continue;
        if (array && !/^(?:0|[1-9]\d*)$/u.test(key)) return false;
        if (array && Number(key) >= arrayLength) return false;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor) || descriptor.enumerable !== true) return false;
        if (array) arrayIndexes += 1;
        scheduledNodes += 1;
        if (scheduledNodes > PLAIN_OBSERVATION_LIMITS.maxNodes) return false;
        pending.push({value: descriptor.value, depth: depth + 1});
      }
      if (array && arrayIndexes !== arrayLength) return false;
    } catch {
      return false;
    }
  }
  return true;
};

export const parseJsonWithUniqueKeys = (source: string): unknown => {
  let cursor = 0;
  const whitespace = () => {
    while (/[ \t\r\n]/u.test(source[cursor] ?? '')) cursor += 1;
  };
  const quoted = (): string => {
    const start = cursor;
    if (source[cursor++] !== '"') throw new Error('JSON_STRING');
    while (cursor < source.length) {
      if (source[cursor] === '\\') cursor += 2;
      else if (source[cursor++] === '"') return JSON.parse(source.slice(start, cursor)) as string;
    }
    throw new Error('JSON_STRING');
  };
  const value = (): unknown => {
    whitespace();
    if (source[cursor] === '{') return object();
    if (source[cursor] === '[') {
      cursor += 1;
      const items: unknown[] = [];
      whitespace();
      if (source[cursor] === ']') {
        cursor += 1;
        return items;
      }
      while (true) {
        items.push(value());
        whitespace();
        if (source[cursor++] === ']') return items;
        if (source[cursor - 1] !== ',') throw new Error('JSON_ARRAY');
      }
    }
    if (source[cursor] === '"') return quoted();
    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(
      source.slice(cursor),
    );
    if (!match) throw new Error('JSON_VALUE');
    cursor += match[0].length;
    return JSON.parse(match[0]) as unknown;
  };
  const object = (): Record<string, unknown> => {
    cursor += 1;
    const result = Object.create(null) as Record<string, unknown>;
    const keys = new Set<string>();
    whitespace();
    if (source[cursor] === '}') {
      cursor += 1;
      return result;
    }
    while (true) {
      whitespace();
      const key = quoted();
      if (keys.has(key)) throw new Error('JSON_DUPLICATE_KEY');
      keys.add(key);
      whitespace();
      if (source[cursor++] !== ':') throw new Error('JSON_OBJECT');
      result[key] = value();
      whitespace();
      if (source[cursor++] === '}') return result;
      if (source[cursor - 1] !== ',') throw new Error('JSON_OBJECT');
    }
  };
  const parsed = value();
  whitespace();
  if (cursor !== source.length) throw new Error('JSON_TRAILING');
  return parsed;
};

export const MethodExplainerAudioObservationPolicyV1Schema = z.strictObject({
  schema_version: z.literal('method-explainer-audio-observation-policy-v1'),
  scope: z.literal('MEASUREMENT_POLICY'),
  invocations: InvocationContractSchema,
  allowed_codecs: z.tuple([
    z.literal('aac'),
    z.literal('flac'),
    z.literal('pcm_s16le'),
    z.literal('pcm_s24le'),
  ]),
  allowed_channels: z.tuple([z.literal(1), z.literal(2)]),
  allowed_layouts: z.tuple([z.literal('mono'), z.literal('stereo')]),
  expected_duration_seconds: z.number().finite().positive().max(180),
  duration_tolerance_seconds: z
    .number()
    .finite()
    .min(0)
    .max(0.1)
    .refine((value) => !Object.is(value, -0), 'NUMBER_NEGATIVE_ZERO'),
  sample_rate_hz: z.literal(48_000),
  integrated_lufs_target: z.literal(-16),
  integrated_lufs_tolerance: z.literal(0.3),
  true_peak_dbtp_max: z.literal(-1.5),
});

export const MethodExplainerAudioObservationV1Schema = z.strictObject({
  schema_version: z.literal('method-explainer-audio-observation-v1'),
  scope: z.literal('MEASUREMENT_POLICY'),
  input_audio: ArtifactBindingSchema,
  tools: z.strictObject({
    ffprobe: ArtifactBindingSchema,
    ffmpeg: ArtifactBindingSchema,
  }),
  invocations: InvocationContractSchema,
  ffprobe_stdout: z.string().min(1).max(20_000),
  loudnorm_stderr: z.string().min(1).max(50_000),
});

export const MethodExplainerAudioObservationExpectedHashesSchema = z.strictObject({
  policy_sha256: Sha256Schema,
  input_sha256: Sha256Schema,
  ffprobe_tool_sha256: Sha256Schema,
  ffmpeg_tool_sha256: Sha256Schema,
  observation_sha256: Sha256Schema,
});

export const MethodExplainerAudioObservationInspectionInputSchema = z.strictObject({
  policy: z.unknown(),
  observation: z.unknown(),
  expected_hashes: z.unknown(),
});

export type MethodExplainerAudioObservationPolicyV1 = z.infer<
  typeof MethodExplainerAudioObservationPolicyV1Schema
>;
