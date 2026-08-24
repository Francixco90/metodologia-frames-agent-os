import {canonicalSha256} from 'workflows/video-os/_schema/method-explainer-planning-v1.schema.ts';
import type {MethodExplainerVoiceBundleV1} from 'workflows/video-os/_schema/method-explainer-voice-bundle-v1.schema.ts';

export const SYNTHETIC_SHA256 = 'a'.repeat(64);
const binding = (ref: string, sha256 = SYNTHETIC_SHA256) => ({
  ref,
  sha256,
  size_bytes: 12,
});

export const rebindVoiceFixture = (bundle: MethodExplainerVoiceBundleV1) => {
  bundle.hashes.voice_contract = canonicalSha256(bundle.voice_contract);
  bundle.tts_candidate_plan.voice_contract_sha256 = bundle.hashes.voice_contract;
  bundle.hashes.tts_candidate_plan = canonicalSha256(bundle.tts_candidate_plan);
  return bundle;
};

export const makeVoiceContractFixture = (): MethodExplainerVoiceBundleV1 => {
  const specSha256 = 'b'.repeat(64);
  const beatBudgetSha256 = 'c'.repeat(64);
  const voiceContract = {
    schema_version: 'method-explainer-voice-v1' as const,
    spec_sha256: specSha256,
    beat_budget_sha256: beatBudgetSha256,
    locale: 'es-419' as const,
    voseo: false as const,
    beats: [
      {
        beat_id: 'BEAT-PASA-01',
        start_frame: 0,
        end_frame: 450,
        pause_before_frames: 6,
        pause_after_frames: 12,
        voiceover: 'Primero definimos la evidencia que orienta cada decisión importante.',
        on_screen: ['Intención verificable', 'Criterio humano'],
        caption: {
          text: 'Primero definimos la evidencia que orienta cada decisión importante.',
          start_frame: 6,
          end_frame: 438,
        },
      },
    ],
  };
  const candidatePlan = {
    schema_version: 'tts-candidate-plan-v1' as const,
    spec_sha256: specSha256,
    beat_budget_sha256: beatBudgetSha256,
    voice_contract_sha256: canonicalSha256(voiceContract),
    locale: 'es-419' as const,
    voseo: false as const,
    engine: binding('tools/chatterbox-tts-local'),
    model: binding('models/voice-model.bin', 'd'.repeat(64)),
    config: binding('models/voice-config.json', 'e'.repeat(64)),
    voice_profile: {id: 'pristino-neutral-v1', sha256: 'f'.repeat(64)},
    beats: [
      {
        beat_id: 'BEAT-PASA-01',
        text: voiceContract.beats[0]!.voiceover,
        candidates: [
          {
            candidate_id: 'TTS-PASA-01-A',
            parameters: {
              pace: 1,
              temperature: 0.7,
              expressiveness: 0.5,
              guidance: 0.4,
              seed: 11,
            },
            cache_key_sha256: '1'.repeat(64),
          },
          {
            candidate_id: 'TTS-PASA-01-B',
            parameters: {
              pace: 1,
              temperature: 0.8,
              expressiveness: 0.6,
              guidance: 0.4,
              seed: 12,
            },
            cache_key_sha256: '2'.repeat(64),
          },
        ],
      },
    ],
  };
  return {
    schema_version: 'method-explainer-voice-bundle-v1',
    spec_sha256: specSha256,
    beat_budget_sha256: beatBudgetSha256,
    hashes: {
      voice_contract: canonicalSha256(voiceContract),
      tts_candidate_plan: canonicalSha256(candidatePlan),
    },
    voice_contract: voiceContract,
    tts_candidate_plan: candidatePlan,
  };
};
