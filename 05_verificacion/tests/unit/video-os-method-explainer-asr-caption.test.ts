import {describe, expect, it} from 'vitest';
import {inspectAsrCaptionDeclaration} from 'workflows/video-os/_runner/method-explainer-asr-caption-policy.ts';

import {
  type AsrCaptionFixture,
  makeAsrCaptionFixture,
  makeOversizedAsrCaptionPreflightFixture,
  rebindAsrDeclaration,
  rebindAsrFixture,
} from '../fixtures/method-explainer-asr-caption.fixture.ts';

const inspect = (fixture: unknown) => inspectAsrCaptionDeclaration(fixture);
const mutateDeclaration = (mutate: (fixture: AsrCaptionFixture) => void) => {
  const fixture = makeAsrCaptionFixture();
  mutate(fixture);
  rebindAsrDeclaration(fixture);
  return inspect(fixture);
};
const expectBlocked = (result: ReturnType<typeof inspectAsrCaptionDeclaration>, reason: string) => {
  expect(result.declarative_status).toBe('BLOCK');
  expect(result.material_status).toBe('NOT_MATERIAL');
  expect(result.promotion_authorized).toBe(false);
  expect(result.reasons).toContain(reason);
};

describe('method-explainer declarative ASR and captions', () => {
  it('accepts exact multi-beat declarations without claiming materiality', () => {
    const result = inspect(makeAsrCaptionFixture());
    expect(result).toMatchObject({
      scope: 'DECLARATIVE_ONLY',
      declarative_status: 'PASS',
      material_status: 'NOT_MATERIAL',
      promotion_authorized: false,
      reasons: [],
    });
    expect(JSON.stringify(result)).not.toMatch(/RENDERED_DRAFT|receipt|audio/u);
  });

  it.each([
    'voice_bundle_sha256',
    'voice_contract_sha256',
    'spec_sha256',
    'beat_budget_sha256',
    'declaration_sha256',
  ] as const)('rejects stale expected hash %s', (key) => {
    const fixture = makeAsrCaptionFixture();
    fixture.expected_hashes[key] = 'f'.repeat(64);
    expect(inspect(fixture).declarative_status).toBe('BLOCK');
  });

  it('rejects stale declaration bindings', () => {
    for (const key of [
      'voice_bundle_sha256',
      'voice_contract_sha256',
      'spec_sha256',
      'beat_budget_sha256',
    ] as const) {
      const result = mutateDeclaration((fixture) => {
        fixture.declaration.bindings[key] = 'e'.repeat(64);
      });
      expect(result.declarative_status).toBe('BLOCK');
    }
  });

  it('requires exact beat set, order and frames', () => {
    expectBlocked(
      mutateDeclaration((fixture) => fixture.declaration.beats.pop()),
      'BEAT_COUNT_MISMATCH',
    );
    expectBlocked(
      mutateDeclaration((fixture) => fixture.declaration.beats.reverse()),
      'BEAT_ORDER_MISMATCH',
    );
    expectBlocked(
      mutateDeclaration((fixture) => {
        fixture.declaration.beats[1]!.beat_id = fixture.declaration.beats[0]!.beat_id;
      }),
      'BEAT_ID_DUPLICATE',
    );
    expectBlocked(
      mutateDeclaration((fixture) => {
        fixture.declaration.beats[0]!.end_frame += 1;
      }),
      'BEAT-PASA-01:BEAT_FRAME_MISMATCH',
    );
  });

  it.each([
    [
      'reversed',
      (f: AsrCaptionFixture) => {
        f.declaration.beats[0]!.cues[0]!.end_frame = 5;
      },
      'BEAT-PASA-01:CUE_FRAME_ORDER',
    ],
    [
      'outside',
      (f: AsrCaptionFixture) => {
        f.declaration.beats[0]!.cues[0]!.start_frame = 5;
      },
      'BEAT-PASA-01:CUE_OUTSIDE_AUDIBLE_WINDOW',
    ],
    [
      'overlap',
      (f: AsrCaptionFixture) => {
        const cue = f.declaration.beats[0]!.cues[0]!;
        cue.end_frame = 250;
        f.declaration.beats[0]!.cues.push({
          ...cue,
          cue_id: 'CUE-PASA-01-B',
          start_frame: 249,
          end_frame: 438,
        });
      },
      'BEAT-PASA-01:CUE_OVERLAP',
    ],
    [
      'out-of-order',
      (f: AsrCaptionFixture) => {
        const cue = f.declaration.beats[0]!.cues[0]!;
        cue.start_frame = 200;
        cue.end_frame = 250;
        f.declaration.beats[0]!.cues.push({
          ...cue,
          cue_id: 'CUE-PASA-01-B',
          start_frame: 100,
          end_frame: 150,
        });
      },
      'BEAT-PASA-01:CUE_ORDER',
    ],
  ] as const)('rejects cue %s', (_name, mutate, reason) =>
    expectBlocked(mutateDeclaration(mutate), reason),
  );

  it('rejects global duplicate cue ids', () => {
    expectBlocked(
      mutateDeclaration((fixture) => {
        fixture.declaration.beats[1]!.cues[0]!.cue_id =
          fixture.declaration.beats[0]!.cues[0]!.cue_id;
      }),
      'CUE_ID_DUPLICATE',
    );
  });

  it.each([
    ['ASR', 'declared_asr_text'],
    ['CAPTION', 'accessibility_caption'],
  ] as const)('classifies %s omissions, extras, repetitions and reorder', (channel, field) => {
    const cases = [
      ['OMITTED', 'Primero definimos evidencia para orientar cada decisión.'],
      ['UNEXPECTED', 'Primero definimos evidencia para orientar cada decisión con criterio extra.'],
      ['REPEATED', 'Primero primero definimos evidencia para orientar cada decisión con criterio.'],
      ['REORDERED', 'importante decisión cada orienta que evidencia la definimos Primero.'],
    ] as const;
    for (const [kind, text] of cases) {
      const result = mutateDeclaration((fixture) => {
        fixture.declaration.beats[0]![field] = text;
      });
      expectBlocked(result, `BEAT-PASA-01:${channel}_${kind}`);
    }
  });

  it('classifies cue text drift independently', () => {
    expectBlocked(
      mutateDeclaration((fixture) => {
        fixture.declaration.beats[0]!.cues[0]!.text = 'Primero definimos evidencia.';
      }),
      'BEAT-PASA-01:CUES_OMITTED',
    );
  });

  it.each(['!!!', '🤖'])('blocks semantically empty cue %j before concatenation', (text) => {
    const result = mutateDeclaration((fixture) => {
      const beat = fixture.declaration.beats[0]!;
      const expected = beat.cues[0]!;
      beat.cues = [
        {...expected, end_frame: expected.start_frame + 1, text},
        {
          ...expected,
          cue_id: 'CUE-PASA-01-B',
          start_frame: expected.start_frame + 1,
          text: beat.accessibility_caption,
        },
      ];
    });
    expectBlocked(result, 'TEXT_INVALID');
  });

  it.each([
    ['declared_asr_text', '!!!'],
    ['declared_asr_text', '🤖'],
    ['accessibility_caption', '!!!'],
    ['accessibility_caption', '🤖'],
  ] as const)('blocks semantically empty %s %j', (field, text) => {
    const result = mutateDeclaration((fixture) => {
      fixture.declaration.beats[0]![field] = text;
    });
    expectBlocked(result, 'TEXT_INVALID');
  });

  it.each(['!!!', '🤖'])('blocks coordinated semantically empty upstream authority %j', (text) => {
    const fixture = makeAsrCaptionFixture();
    const voiceBeat = fixture.voice_bundle.voice_contract.beats[0]!;
    voiceBeat.voiceover = text;
    voiceBeat.caption.text = text;
    fixture.voice_bundle.tts_candidate_plan.beats[0]!.text = text;
    const declaredBeat = fixture.declaration.beats[0]!;
    declaredBeat.declared_asr_text = text;
    declaredBeat.accessibility_caption = text;
    declaredBeat.cues[0]!.text = text;
    rebindAsrFixture(fixture);
    expectBlocked(inspect(fixture), 'TEXT_INVALID');
  });

  it('audits every upstream frame field against negative zero after hash rebound', () => {
    const mutations: ((fixture: AsrCaptionFixture) => void)[] = [
      (f) => (f.voice_bundle.voice_contract.beats[0]!.start_frame = -0),
      (f) => (f.voice_bundle.voice_contract.beats[0]!.end_frame = -0),
      (f) => (f.voice_bundle.voice_contract.beats[0]!.pause_before_frames = -0),
      (f) => (f.voice_bundle.voice_contract.beats[0]!.pause_after_frames = -0),
      (f) => (f.voice_bundle.voice_contract.beats[0]!.caption.start_frame = -0),
      (f) => (f.voice_bundle.voice_contract.beats[0]!.caption.end_frame = -0),
    ];
    for (const mutate of mutations) {
      const fixture = makeAsrCaptionFixture();
      mutate(fixture);
      rebindAsrFixture(fixture);
      expectBlocked(inspect(fixture), 'EXPECTED_BEAT_0_FRAME_INVALID');
    }
  });

  it('blocks an oversized raw beat set before reading untrusted beat elements', () => {
    const fixture = makeOversizedAsrCaptionPreflightFixture();
    const result = inspect(fixture.input);
    expect(result).toEqual({
      scope: 'DECLARATIVE_ONLY',
      declarative_status: 'BLOCK',
      material_status: 'NOT_MATERIAL',
      promotion_authorized: false,
      reasons: ['EXPECTED_BEAT_COUNT_INVALID'],
      beats: [],
    });
    expect(fixture.indexedReads()).toBe(0);
  });

  it('never reflects an unparsed control or bidi beat id in a frame reason', () => {
    const fixture = makeAsrCaptionFixture();
    fixture.voice_bundle.voice_contract.beats[0]!.beat_id = 'BEAT-\u0000\u202eSECRET';
    fixture.voice_bundle.voice_contract.beats[0]!.start_frame = -0;
    const result = inspect(fixture);
    expectBlocked(result, 'EXPECTED_BEAT_0_FRAME_INVALID');
    expect(result.reasons).toEqual(['EXPECTED_BEAT_0_FRAME_INVALID']);
    expect(JSON.stringify(result)).not.toContain('SECRET');
    expect(JSON.stringify(result)).not.toContain('\u202e');
  });

  it.each([
    (f: AsrCaptionFixture) => Object.assign(f.declaration, {state: 'RENDERED_DRAFT'}),
    (f: AsrCaptionFixture) => Object.assign(f.declaration, {receipt: {}}),
    (f: AsrCaptionFixture) => Object.assign(f.declaration.beats[0]!, {omitted_words: []}),
    (f: AsrCaptionFixture) => Object.assign(f.declaration.beats[0]!, {audio: 'voice.wav'}),
  ])('rejects material, calculated or promotional fields', (mutate) => {
    const fixture = makeAsrCaptionFixture();
    mutate(fixture);
    expect(inspect(fixture)).toMatchObject({
      declarative_status: 'BLOCK',
      material_status: 'NOT_MATERIAL',
      reasons: ['INPUT_INVALID'],
    });
  });

  it('rejects invalid numeric frames and semantic-empty cue text', () => {
    for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, -0, 1.5]) {
      const fixture = makeAsrCaptionFixture();
      fixture.declaration.beats[0]!.cues[0]!.start_frame = invalid;
      expect(inspect(fixture).declarative_status).toBe('BLOCK');
    }
    const result = mutateDeclaration((fixture) => {
      fixture.declaration.beats[0]!.cues[0]!.text = '!!!';
    });
    expect(result.declarative_status).toBe('BLOCK');
  });

  it('is deterministic, JSON-safe and does not mutate inputs', () => {
    const fixture = makeAsrCaptionFixture();
    const before = JSON.stringify(fixture);
    const first = inspect(fixture);
    const second = inspect(fixture);
    expect(JSON.stringify(fixture)).toBe(before);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(() => {
      void JSON.parse(JSON.stringify(first));
    }).not.toThrow();
  });
});
