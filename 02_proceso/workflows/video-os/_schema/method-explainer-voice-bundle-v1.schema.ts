import {z} from 'zod';

import {canonicalSha256} from './method-explainer-planning-v1.schema.ts';
import {
  MethodExplainerVoiceV1Schema,
  TtsCandidatePlanV1Schema,
} from './method-explainer-voice-v1.schema.ts';
import {Sha256Schema} from './video-os-v1.schema.ts';

// This code-only envelope validates declared bindings. It does not derive them
// from material spec/beat inputs, execute TTS, or authorize any promotion.
export const MethodExplainerVoiceBundleV1Schema = z
  .strictObject({
    schema_version: z.literal('method-explainer-voice-bundle-v1'),
    spec_sha256: Sha256Schema,
    beat_budget_sha256: Sha256Schema,
    hashes: z.strictObject({
      voice_contract: Sha256Schema,
      tts_candidate_plan: Sha256Schema,
    }),
    voice_contract: MethodExplainerVoiceV1Schema,
    tts_candidate_plan: TtsCandidatePlanV1Schema,
  })
  .superRefine((bundle, context) => {
    const voice = bundle.voice_contract;
    const plan = bundle.tts_candidate_plan;
    const add = (message: string, path: PropertyKey[] = []) =>
      context.addIssue({code: 'custom', message, path});
    if (voice.spec_sha256 !== bundle.spec_sha256 || plan.spec_sha256 !== bundle.spec_sha256)
      add('VOICE_BUNDLE_SPEC_BINDING');
    if (
      voice.beat_budget_sha256 !== bundle.beat_budget_sha256 ||
      plan.beat_budget_sha256 !== bundle.beat_budget_sha256
    )
      add('VOICE_BUNDLE_BEAT_BUDGET_BINDING');
    const voiceSha256 = canonicalSha256(voice);
    const planSha256 = canonicalSha256(plan);
    if (bundle.hashes.voice_contract !== voiceSha256)
      add('VOICE_BUNDLE_VOICE_HASH', ['hashes', 'voice_contract']);
    if (bundle.hashes.tts_candidate_plan !== planSha256)
      add('VOICE_BUNDLE_PLAN_HASH', ['hashes', 'tts_candidate_plan']);
    if (plan.voice_contract_sha256 !== voiceSha256)
      add('VOICE_PLAN_VOICE_HASH', ['tts_candidate_plan', 'voice_contract_sha256']);
    if (voice.locale !== plan.locale || voice.voseo !== plan.voseo)
      add('VOICE_BUNDLE_LOCALE_BINDING');
    if (voice.beats.length !== plan.beats.length) add('VOICE_BUNDLE_BEAT_COUNT');
    voice.beats.forEach((beat, index) => {
      const planned = plan.beats[index];
      if (!planned || planned.beat_id !== beat.beat_id || planned.text !== beat.voiceover)
        add('VOICE_BUNDLE_BEAT_BINDING', ['tts_candidate_plan', 'beats', index]);
    });
  });

export type MethodExplainerVoiceBundleV1 = z.infer<typeof MethodExplainerVoiceBundleV1Schema>;
