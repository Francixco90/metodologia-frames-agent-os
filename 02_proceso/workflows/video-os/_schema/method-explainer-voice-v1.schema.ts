import {z} from 'zod';

import {ArtifactBindingSchema, canonicalSha256} from './method-explainer-planning-v1.schema.ts';
import {Sha256Schema} from './video-os-v1.schema.ts';

const BeatIdSchema = z.string().regex(/^BEAT-[A-Z0-9-]{2,60}$/u);
const CandidateIdSchema = z.string().regex(/^TTS-[A-Z0-9-]{2,80}$/u);
const issue = (context: z.RefinementCtx, message: string, path: PropertyKey[] = []) =>
  context.addIssue({code: 'custom', message, path});
const canonicalVoiceRef = (ref: string) =>
  ref
    .replace(/\\/gu, '/')
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.')
    .join('/');
const containsUnsafeUnicodeCategory = (ref: string) => /\p{C}/u.test(ref);
const CanonicalVoiceSourceBindingSchema = ArtifactBindingSchema.superRefine((binding, context) => {
  if (containsUnsafeUnicodeCategory(binding.ref) || binding.ref !== canonicalVoiceRef(binding.ref))
    issue(context, 'TTS_SOURCE_REF_NOT_CANONICAL', ['ref']);
});

const VoiceBeatSchema = z
  .strictObject({
    beat_id: BeatIdSchema,
    start_frame: z.number().int().min(0),
    end_frame: z.number().int().positive(),
    pause_before_frames: z.number().int().min(0),
    pause_after_frames: z.number().int().min(0),
    voiceover: z.string().min(1).max(1_000),
    on_screen: z.array(z.string().min(1).max(160)).max(8),
    caption: z.strictObject({
      text: z.string().min(1).max(1_000),
      start_frame: z.number().int().min(0),
      end_frame: z.number().int().positive(),
    }),
  })
  .superRefine((beat, context) => {
    const audibleStart = beat.start_frame + beat.pause_before_frames;
    const audibleEnd = beat.end_frame - beat.pause_after_frames;
    if (beat.end_frame <= beat.start_frame) issue(context, 'VOICE_BEAT_FRAME_ORDER');
    if (audibleEnd <= audibleStart) issue(context, 'VOICE_BEAT_PAUSE_BUDGET');
    if (
      beat.caption.start_frame < audibleStart ||
      beat.caption.end_frame > audibleEnd ||
      beat.caption.end_frame <= beat.caption.start_frame
    )
      issue(context, 'VOICE_CAPTION_FRAME_ORDER', ['caption']);
    if (beat.caption.text !== beat.voiceover)
      issue(context, 'VOICE_CAPTION_TEXT_BINDING', ['caption', 'text']);
  });

export const MethodExplainerVoiceV1Schema = z
  .strictObject({
    schema_version: z.literal('method-explainer-voice-v1'),
    spec_sha256: Sha256Schema,
    beat_budget_sha256: Sha256Schema,
    locale: z.literal('es-419'),
    voseo: z.literal(false),
    beats: z.array(VoiceBeatSchema).min(1).max(30),
  })
  .superRefine((voice, context) => {
    const ids = new Set<string>();
    let cursor = voice.beats[0]?.start_frame ?? 0;
    if (cursor !== 0) issue(context, 'VOICE_FIRST_BEAT_START', ['beats', 0, 'start_frame']);
    voice.beats.forEach((beat, index) => {
      if (ids.has(beat.beat_id)) issue(context, 'VOICE_DUPLICATE_BEAT_ID', ['beats', index]);
      if (beat.start_frame !== cursor)
        issue(context, 'VOICE_BEAT_TIMELINE_GAP', ['beats', index, 'start_frame']);
      ids.add(beat.beat_id);
      cursor = beat.end_frame;
    });
  });

const TtsParametersSchema = z.strictObject({
  pace: z.number().positive().max(2),
  temperature: z.number().min(0).max(2),
  expressiveness: z.number().min(0).max(2),
  guidance: z.number().min(0).max(2),
  seed: z.number().int().min(0),
});

const CandidateBeatSchema = z
  .strictObject({
    beat_id: BeatIdSchema,
    text: z.string().min(1).max(1_000),
    candidates: z
      .array(
        z.strictObject({
          candidate_id: CandidateIdSchema,
          parameters: TtsParametersSchema,
          cache_key_sha256: Sha256Schema,
        }),
      )
      .length(2),
  })
  .superRefine((beat, context) => {
    if (new Set(beat.candidates.map(({candidate_id}) => candidate_id)).size !== 2)
      issue(context, 'TTS_DUPLICATE_CANDIDATE_ID', ['candidates']);
    if (new Set(beat.candidates.map(({cache_key_sha256}) => cache_key_sha256)).size !== 2)
      issue(context, 'TTS_DUPLICATE_CACHE_KEY', ['candidates']);
    if (new Set(beat.candidates.map(({parameters}) => canonicalSha256(parameters))).size !== 2)
      issue(context, 'TTS_DUPLICATE_PARAMETERS', ['candidates']);
  });

export const TtsCandidatePlanV1Schema = z
  .strictObject({
    schema_version: z.literal('tts-candidate-plan-v1'),
    spec_sha256: Sha256Schema,
    beat_budget_sha256: Sha256Schema,
    voice_contract_sha256: Sha256Schema,
    locale: z.literal('es-419'),
    voseo: z.literal(false),
    engine: CanonicalVoiceSourceBindingSchema,
    model: CanonicalVoiceSourceBindingSchema,
    config: CanonicalVoiceSourceBindingSchema,
    voice_profile: z.strictObject({id: z.string().min(1).max(120), sha256: Sha256Schema}),
    beats: z.array(CandidateBeatSchema).min(1).max(30),
  })
  .superRefine((plan, context) => {
    const beatIds = new Set<string>();
    const candidateIds = new Set<string>();
    if (
      new Set(
        [plan.engine.ref, plan.model.ref, plan.config.ref].map((ref) => canonicalVoiceRef(ref)),
      ).size !== 3
    )
      issue(context, 'TTS_DUPLICATE_SOURCE_REF');
    plan.beats.forEach((beat, index) => {
      if (beatIds.has(beat.beat_id)) issue(context, 'TTS_DUPLICATE_BEAT_ID', ['beats', index]);
      beatIds.add(beat.beat_id);
      beat.candidates.forEach(({candidate_id}) => {
        if (candidateIds.has(candidate_id))
          issue(context, 'TTS_DUPLICATE_GLOBAL_CANDIDATE_ID', ['beats', index]);
        candidateIds.add(candidate_id);
      });
    });
  });

export type MethodExplainerVoiceV1 = z.infer<typeof MethodExplainerVoiceV1Schema>;
export type TtsCandidatePlanV1 = z.infer<typeof TtsCandidatePlanV1Schema>;
export type TtsParameters = z.infer<typeof TtsParametersSchema>;
