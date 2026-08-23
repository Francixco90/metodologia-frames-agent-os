import {describe, expect, it} from 'vitest';
import {MethodExplainerVoiceBundleV1Schema} from 'workflows/video-os/_schema/index.ts';

import {
  makeVoiceContractFixture,
  rebindVoiceFixture,
  SYNTHETIC_SHA256,
} from '../fixtures/method-explainer-voice.fixture.ts';

type Fixture = ReturnType<typeof makeVoiceContractFixture>;
const rejects = (mutate: (fixture: Fixture) => void, rebind = false) => {
  const fixture = makeVoiceContractFixture();
  mutate(fixture);
  if (rebind) rebindVoiceFixture(fixture);
  expect(MethodExplainerVoiceBundleV1Schema.safeParse(fixture).success).toBe(false);
};
const rejectsWith = (mutate: (fixture: Fixture) => void, message: string, rebind = false) => {
  const fixture = makeVoiceContractFixture();
  mutate(fixture);
  if (rebind) rebindVoiceFixture(fixture);
  const result = MethodExplainerVoiceBundleV1Schema.safeParse(fixture);
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.issues.map((item) => item.message)).toContain(message);
};

describe('method-explainer voice code-only contracts', () => {
  it('accepts a canonical synthetic contract without material or promotion claims', () => {
    const fixture = makeVoiceContractFixture();
    expect(MethodExplainerVoiceBundleV1Schema.parse(fixture)).toEqual(fixture);
    const serialized = JSON.stringify(fixture);
    expect(serialized).not.toMatch(/RENDERED_DRAFT|receipt|raw_audio|mastered_audio/u);
  });

  it('rejects extra fields, including an attempted promotional state', () => {
    rejects((fixture) => Object.assign(fixture, {state: 'RENDERED_DRAFT'}));
    rejects((fixture) => Object.assign(fixture.voice_contract.beats[0]!, {extra: true}));
    rejects((fixture) =>
      Object.assign(fixture.tts_candidate_plan.beats[0]!.candidates[0]!, {output: 'audio.wav'}),
    );
  });

  it('binds canonical hashes and all parent hashes', () => {
    rejects((fixture) => {
      fixture.hashes.voice_contract = SYNTHETIC_SHA256;
    });
    rejects((fixture) => {
      fixture.tts_candidate_plan.voice_contract_sha256 = SYNTHETIC_SHA256;
    });
    rejects((fixture) => {
      fixture.voice_contract.spec_sha256 = '9'.repeat(64);
    }, true);
    rejects((fixture) => {
      fixture.tts_candidate_plan.beat_budget_sha256 = '8'.repeat(64);
    }, true);
  });

  it('rejects non-local, private and duplicate source references', () => {
    for (const ref of ['/tmp/tts', '../models/voice.bin', 'work/private/voice.bin']) {
      rejects((fixture) => {
        fixture.tts_candidate_plan.engine.ref = ref;
      }, true);
    }
    rejects((fixture) => {
      fixture.tts_candidate_plan.model.ref = fixture.tts_candidate_plan.engine.ref;
    }, true);
  });

  it('rejects non-canonical refs and compares aliases before duplicate detection', () => {
    for (const ref of [
      'tools/./tts',
      'tools//tts',
      'tools/\u0000tts',
      'tools/\u0085tts',
      'tools/\u202Etts',
      'tools\\tts',
    ]) {
      rejectsWith(
        (fixture) => {
          fixture.tts_candidate_plan.engine.ref = ref;
        },
        'TTS_SOURCE_REF_NOT_CANONICAL',
        true,
      );
    }
    rejectsWith(
      (fixture) => {
        fixture.tts_candidate_plan.engine.ref = 'tools/./tts';
        fixture.tts_candidate_plan.model.ref = 'tools/tts';
      },
      'TTS_DUPLICATE_SOURCE_REF',
      true,
    );
  });

  it('fixes locale and voseo to neutral Latin American Spanish', () => {
    rejects((fixture) => {
      fixture.voice_contract.locale = 'es-ES' as 'es-419';
    }, true);
    rejects((fixture) => {
      fixture.tts_candidate_plan.voseo = true as false;
    }, true);
  });

  it('rejects invalid beat, pause and caption frames', () => {
    rejects((fixture) => {
      fixture.voice_contract.beats[0]!.end_frame = 0;
    }, true);
    rejects((fixture) => {
      fixture.voice_contract.beats[0]!.pause_before_frames = 440;
    }, true);
    rejects((fixture) => {
      fixture.voice_contract.beats[0]!.caption.start_frame = 5;
    }, true);
    rejects((fixture) => {
      fixture.voice_contract.beats[0]!.caption.end_frame = 439;
    }, true);
  });

  it('requires the complete voice timeline to start at frame zero', () => {
    rejectsWith(
      (fixture) => {
        fixture.voice_contract.beats[0]!.start_frame = 1;
        fixture.voice_contract.beats[0]!.caption.start_frame = 7;
      },
      'VOICE_FIRST_BEAT_START',
      true,
    );
  });

  it('binds beat ids, narration and candidate identity', () => {
    rejects((fixture) => {
      fixture.tts_candidate_plan.beats[0]!.beat_id = 'BEAT-OTHER-01';
    }, true);
    rejects((fixture) => {
      fixture.tts_candidate_plan.beats[0]!.text = 'Narración distinta';
    }, true);
    rejects((fixture) => {
      const candidates = fixture.tts_candidate_plan.beats[0]!.candidates;
      candidates[1]!.candidate_id = candidates[0]!.candidate_id;
    }, true);
  });

  it('requires distinct cache keys and semantically distinct candidate parameters', () => {
    rejectsWith(
      (fixture) => {
        const candidates = fixture.tts_candidate_plan.beats[0]!.candidates;
        candidates[1]!.cache_key_sha256 = candidates[0]!.cache_key_sha256;
      },
      'TTS_DUPLICATE_CACHE_KEY',
      true,
    );
    rejectsWith(
      (fixture) => {
        const candidates = fixture.tts_candidate_plan.beats[0]!.candidates;
        candidates[1]!.parameters = {...candidates[0]!.parameters};
      },
      'TTS_DUPLICATE_PARAMETERS',
      true,
    );
  });

  it('is declarative evidence only, not executed authority or promotion', () => {
    const fixture = makeVoiceContractFixture();
    fixture.spec_sha256 = '7'.repeat(64);
    fixture.voice_contract.spec_sha256 = fixture.spec_sha256;
    fixture.tts_candidate_plan.spec_sha256 = fixture.spec_sha256;
    fixture.beat_budget_sha256 = '8'.repeat(64);
    fixture.voice_contract.beat_budget_sha256 = fixture.beat_budget_sha256;
    fixture.tts_candidate_plan.beat_budget_sha256 = fixture.beat_budget_sha256;
    rebindVoiceFixture(fixture);
    expect(MethodExplainerVoiceBundleV1Schema.safeParse(fixture).success).toBe(true);
    expect(JSON.stringify(fixture)).not.toMatch(/receipt|RENDERED_DRAFT|HUMAN_APPROVED/u);
  });
});
