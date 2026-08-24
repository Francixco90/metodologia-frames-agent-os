import {canonicalSha256} from 'workflows/video-os/_schema/method-explainer-planning-v1.schema.ts';
import {MAX_METHOD_EXPLAINER_ASR_CAPTION_BEATS} from 'workflows/video-os/_schema/method-explainer-asr-caption-v1.schema.ts';
import {makeVoiceContractFixture, rebindVoiceFixture} from './method-explainer-voice.fixture.ts';

export const makeAsrCaptionFixture = () => {
  const voiceBundle = makeVoiceContractFixture();
  voiceBundle.voice_contract.beats.push({
    beat_id: 'BEAT-PASA-02',
    start_frame: 450,
    end_frame: 900,
    pause_before_frames: 6,
    pause_after_frames: 12,
    voiceover: 'Después convertimos el aprendizaje en una práctica que puede repetirse.',
    on_screen: ['Práctica repetible'],
    caption: {
      text: 'Después convertimos el aprendizaje en una práctica que puede repetirse.',
      start_frame: 456,
      end_frame: 888,
    },
  });
  voiceBundle.tts_candidate_plan.beats.push({
    beat_id: 'BEAT-PASA-02',
    text: voiceBundle.voice_contract.beats[1]!.voiceover,
    candidates: [
      {
        candidate_id: 'TTS-PASA-02-A',
        parameters: {
          pace: 1,
          temperature: 0.65,
          expressiveness: 0.5,
          guidance: 0.4,
          seed: 21,
        },
        cache_key_sha256: '3'.repeat(64),
      },
      {
        candidate_id: 'TTS-PASA-02-B',
        parameters: {
          pace: 1,
          temperature: 0.75,
          expressiveness: 0.6,
          guidance: 0.4,
          seed: 22,
        },
        cache_key_sha256: '4'.repeat(64),
      },
    ],
  });
  rebindVoiceFixture(voiceBundle);
  const declaration = {
    schema_version: 'method-explainer-asr-caption-v1' as const,
    scope: 'DECLARATIVE_ONLY' as const,
    bindings: {
      voice_bundle_sha256: canonicalSha256(voiceBundle),
      voice_contract_sha256: canonicalSha256(voiceBundle.voice_contract),
      spec_sha256: voiceBundle.spec_sha256,
      beat_budget_sha256: voiceBundle.beat_budget_sha256,
    },
    beats: voiceBundle.voice_contract.beats.map((beat, index) => ({
      beat_id: beat.beat_id,
      start_frame: beat.start_frame,
      end_frame: beat.end_frame,
      declared_asr_text: beat.voiceover,
      accessibility_caption: beat.voiceover,
      cues: [
        {
          cue_id: `CUE-PASA-0${index + 1}`,
          start_frame: beat.caption.start_frame,
          end_frame: beat.caption.end_frame,
          text: beat.voiceover,
        },
      ],
    })),
  };
  return {
    voice_bundle: voiceBundle,
    declaration,
    expected_hashes: {
      ...declaration.bindings,
      declaration_sha256: canonicalSha256(declaration),
    },
  };
};

export type AsrCaptionFixture = ReturnType<typeof makeAsrCaptionFixture>;
export const rebindAsrDeclaration = (fixture: AsrCaptionFixture) => {
  fixture.expected_hashes.declaration_sha256 = canonicalSha256(fixture.declaration);
  return fixture;
};

export const rebindAsrFixture = (fixture: AsrCaptionFixture) => {
  rebindVoiceFixture(fixture.voice_bundle);
  const bindings = fixture.declaration.bindings;
  bindings.voice_bundle_sha256 = canonicalSha256(fixture.voice_bundle);
  bindings.voice_contract_sha256 = canonicalSha256(fixture.voice_bundle.voice_contract);
  bindings.spec_sha256 = fixture.voice_bundle.spec_sha256;
  bindings.beat_budget_sha256 = fixture.voice_bundle.beat_budget_sha256;
  Object.assign(fixture.expected_hashes, bindings);
  return rebindAsrDeclaration(fixture);
};

export const makeOversizedAsrCaptionPreflightFixture = () => {
  let indexedReads = 0;
  const rawBeats = Array.from({length: MAX_METHOD_EXPLAINER_ASR_CAPTION_BEATS + 1}, () => null);
  const beats = new Proxy(rawBeats, {
    get(target, property, receiver): unknown {
      if (typeof property === 'string' && /^\d+$/u.test(property)) {
        indexedReads += 1;
        throw new Error('OVERSIZED_BEAT_INDEX_READ');
      }
      return Reflect.get(target, property, receiver) as unknown;
    },
  });
  return {
    input: {
      voice_bundle: {voice_contract: {beats}},
      declaration: {},
      expected_hashes: {},
    },
    indexedReads: () => indexedReads,
  };
};
