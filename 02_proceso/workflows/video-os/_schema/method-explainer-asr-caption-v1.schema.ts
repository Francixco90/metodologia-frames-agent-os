import {z} from 'zod';

import {Sha256Schema} from './video-os-v1.schema.ts';

const FrameSchema = z
  .number()
  .finite()
  .int()
  .min(0)
  .max(5_400)
  .refine((value) => !Object.is(value, -0), 'FRAME_NEGATIVE_ZERO');
const BoundedTextSchema = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim().length > 0, 'TEXT_BLANK');
const BeatIdSchema = z.string().regex(/^BEAT-[A-Z0-9-]{2,60}$/u);
export const MAX_METHOD_EXPLAINER_ASR_CAPTION_BEATS = 30;

export const MethodExplainerAsrCaptionV1Schema = z.strictObject({
  schema_version: z.literal('method-explainer-asr-caption-v1'),
  scope: z.literal('DECLARATIVE_ONLY'),
  bindings: z.strictObject({
    voice_bundle_sha256: Sha256Schema,
    voice_contract_sha256: Sha256Schema,
    spec_sha256: Sha256Schema,
    beat_budget_sha256: Sha256Schema,
  }),
  beats: z
    .array(
      z.strictObject({
        beat_id: BeatIdSchema,
        start_frame: FrameSchema,
        end_frame: FrameSchema,
        declared_asr_text: BoundedTextSchema(1_000),
        accessibility_caption: BoundedTextSchema(1_000),
        cues: z
          .array(
            z.strictObject({
              cue_id: z.string().regex(/^CUE-[A-Z0-9-]{2,80}$/u),
              start_frame: FrameSchema,
              end_frame: FrameSchema,
              text: BoundedTextSchema(500),
            }),
          )
          .min(1)
          .max(50),
      }),
    )
    .min(1)
    .max(MAX_METHOD_EXPLAINER_ASR_CAPTION_BEATS),
});

export const MethodExplainerAsrCaptionExpectedHashesSchema = z.strictObject({
  voice_bundle_sha256: Sha256Schema,
  voice_contract_sha256: Sha256Schema,
  spec_sha256: Sha256Schema,
  beat_budget_sha256: Sha256Schema,
  declaration_sha256: Sha256Schema,
});

export const MethodExplainerAsrCaptionInspectionInputSchema = z.strictObject({
  voice_bundle: z.unknown(),
  declaration: z.unknown(),
  expected_hashes: z.unknown(),
});

const validExpectedFrame = (value: number) =>
  Number.isFinite(value) && Number.isInteger(value) && value >= 0 && !Object.is(value, -0);

export const inspectExpectedVoiceFrames = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') return [];
  const voice = (raw as {voice_contract?: unknown}).voice_contract;
  if (!voice || typeof voice !== 'object') return [];
  const beats = (voice as {beats?: unknown}).beats;
  if (!Array.isArray(beats)) return [];
  if (beats.length > MAX_METHOD_EXPLAINER_ASR_CAPTION_BEATS) return ['EXPECTED_BEAT_COUNT_INVALID'];
  const reasons: string[] = [];
  beats.forEach((rawBeat, index) => {
    if (!rawBeat || typeof rawBeat !== 'object') return;
    const beat = rawBeat as Record<string, unknown>;
    const caption =
      beat.caption && typeof beat.caption === 'object'
        ? (beat.caption as Record<string, unknown>)
        : {};
    const fields = [
      beat.start_frame,
      beat.end_frame,
      beat.pause_before_frames,
      beat.pause_after_frames,
      caption.start_frame,
      caption.end_frame,
    ];
    if (fields.some((value) => typeof value === 'number' && !validExpectedFrame(value))) {
      reasons.push(`EXPECTED_BEAT_${index}_FRAME_INVALID`);
    }
  });
  return [...new Set(reasons)].sort();
};

export type MethodExplainerAsrCaptionV1 = z.infer<typeof MethodExplainerAsrCaptionV1Schema>;
