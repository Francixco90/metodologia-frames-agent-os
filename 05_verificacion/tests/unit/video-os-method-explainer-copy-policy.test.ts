import {describe, expect, it} from 'vitest';
import {inspectMethodExplainerCopy} from 'workflows/video-os/_runner/method-explainer-copy-policy.ts';
import {
  longestCommonSubsequenceLength,
  normalizeExplainerText,
} from 'workflows/video-os/_runner/method-explainer-text-normalization.ts';

import {
  HASH,
  makeCopyException,
  makeCopyInput,
} from '../fixtures/method-explainer-copy-policy.fixture.ts';

const INVALID_RESULT = {
  copy_status: 'BLOCK',
  overall_status: 'BLOCK',
  reasons: ['INPUT_INVALID'],
  metrics: null,
  exception: 'NOT_EVALUATED',
  neutrality: {coverage: 'NOT_EVALUATED', status: 'BLOCK'},
  approval_authorized: false,
};

describe('method-explainer text normalization', () => {
  it('uses NFKC while preserving Spanish diacritics and negation', () => {
    expect(normalizeExplainerText('  Ｎｏ elimina la intención  ')).toEqual({
      verbatim: 'No elimina la intención',
      tokens: ['no', 'elimina', 'la', 'intención'],
    });
  });
  it.each(['texto\u0000oculto', 'texto\u0085oculto', 'texto\u202Eoculto'])(
    'rejects unsafe Unicode %j',
    (text) => expect(() => normalizeExplainerText(text)).toThrow(/UNSAFE-UNICODE/u),
  );
  it.each(['PАSA', 'только'])('rejects any Cyrillic script %j', (text) =>
    expect(() => normalizeExplainerText(text)).toThrow(/CYRILLIC-SCRIPT/u),
  );
  it('bounds exported sequence helpers', () =>
    expect(() => longestCommonSubsequenceLength(Array(2_049).fill('a'), ['a'])).toThrow(
      /TOKEN-LIMIT/u,
    ));
});

describe('method-explainer copy roles', () => {
  it('accepts complementary copy but leaves neutrality pending H01', () => {
    const result = inspectMethodExplainerCopy(makeCopyInput());
    expect(result.copy_status).toBe('PASS');
    expect(result.overall_status).toBe('REVIEW_REQUIRED');
    expect('status' in result).toBe(false);
    expect(result.neutrality).toEqual({coverage: 'KNOWN_FORMS_ONLY', status: 'PENDING_H01'});
    expect(result.approval_authorized).toBe(false);
  });
  it('requires accessibility caption to be verbatim after NFKC normalization', () => {
    const fullwidth = makeCopyInput({
      voiceover: 'Método no primero',
      accessibility_caption: 'Ｍétodo no primero',
    });
    expect(inspectMethodExplainerCopy(fullwidth).reasons).not.toContain('CAPTION_NOT_VERBATIM');
    const drift = makeCopyInput({accessibility_caption: 'Primero definimos evidencia.'});
    const result = inspectMethodExplainerCopy(drift);
    expect(result.copy_status).toBe('BLOCK');
    expect(result.reasons).toContain('CAPTION_NOT_VERBATIM');
  });
  it.each([
    ['No proceses 2 veces', 'Proceses 2 veces'],
    ['No proceses 2 veces', 'No proceses 2 2 veces'],
    ['No proceses 2 veces', 'No proceses veces'],
  ])('blocks caption token loss or repetition: %j / %j', (voiceover, accessibility_caption) => {
    const result = inspectMethodExplainerCopy(makeCopyInput({voiceover, accessibility_caption}));
    expect(result.copy_status).toBe('BLOCK');
    expect(result.reasons).toContain('CAPTION_NOT_VERBATIM');
  });
  it('blocks empty roles and normalized literal copy per node or aggregate', () => {
    expect(inspectMethodExplainerCopy(makeCopyInput({on_screen: []})).copy_status).toBe('BLOCK');
    const literal = makeCopyInput({
      on_screen: ['PRIMERO definimos evidencia para orientar cada decisión con criterio'],
    });
    const literalResult = inspectMethodExplainerCopy(literal);
    expect(literalResult.copy_status).toBe('BLOCK');
    expect(literalResult.reasons).toContain('VOICE_SCREEN_LITERAL');
    const split = makeCopyInput({
      on_screen: ['Primero definimos evidencia para', 'orientar cada decisión con criterio'],
    });
    const splitResult = inspectMethodExplainerCopy(split);
    expect(splitResult.copy_status).toBe('BLOCK');
    expect(splitResult.reasons).toContain('VOICE_SCREEN_LITERAL');
  });
  it('blocks multiset containment despite padding and preserves one keyword', () => {
    const padded = makeCopyInput({
      on_screen: [
        'Extra criterio con decisión cada orientar para evidencia definimos primero primero',
      ],
    });
    const result = inspectMethodExplainerCopy(padded);
    expect(result.copy_status).toBe('BLOCK');
    expect(result.reasons).toContain('VOICE_SCREEN_CONTAINMENT');
    expect(inspectMethodExplainerCopy(makeCopyInput({on_screen: ['Evidencia']})).copy_status).toBe(
      'PASS',
    );
  });
  it('uses a strict integer threshold above 70 percent', () => {
    const voice = 'uno dos tres cuatro cinco seis siete ocho nueve diez';
    const atSeventy = makeCopyInput({
      voiceover: voice,
      accessibility_caption: voice,
      on_screen: ['uno dos tres cuatro cinco seis siete once doce trece'],
    });
    expect(inspectMethodExplainerCopy(atSeventy).reasons).not.toContain('VOICE_SCREEN_OVERLAP');
    const above = makeCopyInput({
      voiceover: voice,
      accessibility_caption: voice,
      on_screen: ['uno dos tres cuatro cinco seis siete ocho once doce'],
    });
    const result = inspectMethodExplainerCopy(above);
    expect(result.copy_status).toBe('REVIEW_REQUIRED');
    expect(result.reasons).toContain('VOICE_SCREEN_OVERLAP');
  });
  it('counts reordered and repeated tokens by multiplicity', () => {
    const voice = 'uno dos tres cuatro cinco seis siete ocho nueve diez';
    const result = inspectMethodExplainerCopy(
      makeCopyInput({
        voiceover: voice,
        accessibility_caption: voice,
        on_screen: ['ocho siete seis cinco cuatro tres dos uno uno extra'],
      }),
    );
    expect(result.copy_status).toBe('REVIEW_REQUIRED');
    expect(result.reasons).toContain('VOICE_SCREEN_OVERLAP');
  });
  it('detects copy divided across nodes through n-grams and LCS', () => {
    const input = makeCopyInput({
      voiceover: 'uno dos tres cuatro cinco seis siete ocho nueve diez',
      accessibility_caption: 'uno dos tres cuatro cinco seis siete ocho nueve diez',
      on_screen: ['uno dos señal', 'cinco seis dato'],
    });
    const result = inspectMethodExplainerCopy(input);
    expect(result.copy_status).toBe('REVIEW_REQUIRED');
    expect(result.reasons).toContain('VOICE_SCREEN_SPLIT_COPY');
  });
  it.each(['Vos podés avanzar.', 'Empezá por la intención.', 'Elegís la evidencia.'])(
    'blocks known voseo %j',
    (voiceover) => {
      const result = inspectMethodExplainerCopy(
        makeCopyInput({voiceover, accessibility_caption: voiceover}),
      );
      expect(result).toMatchObject({overall_status: 'BLOCK', neutrality: {status: 'BLOCK'}});
    },
  );
  it('keeps unknown regional surfaces pending H01', () => {
    const voiceover = 'Cachái una alternativa útil.';
    const result = inspectMethodExplainerCopy(
      makeCopyInput({voiceover, accessibility_caption: voiceover}),
    );
    expect(result.neutrality.status).toBe('PENDING_H01');
    expect(result.approval_authorized).toBe(false);
  });
  it('never turns a hash-bound declared exception into PASS', () => {
    const base = makeCopyInput({on_screen: [makeCopyInput().voiceover]});
    const input = {...base, exception: makeCopyException(base, 'VOICE_SCREEN_LITERAL')};
    expect(inspectMethodExplainerCopy(input)).toMatchObject({
      copy_status: 'REVIEW_REQUIRED',
      overall_status: 'REVIEW_REQUIRED',
      exception: 'DECLARED_PENDING_H01',
      approval_authorized: false,
    });
  });
  it('blocks missing, stale and malformed exception bindings', () => {
    const base = makeCopyInput({on_screen: [makeCopyInput().voiceover]});
    expect(inspectMethodExplainerCopy(base).copy_status).toBe('BLOCK');
    const stale = makeCopyException(base, 'VOICE_SCREEN_LITERAL');
    stale.voice_contract_sha256 = HASH.replaceAll('a', 'c');
    expect(inspectMethodExplainerCopy({...base, exception: stale})).toMatchObject({
      copy_status: 'BLOCK',
      exception: 'STALE',
    });
    expect(inspectMethodExplainerCopy({...base, exception: {...stale, extra: true}})).toMatchObject(
      {
        copy_status: 'BLOCK',
        reasons: ['INPUT_INVALID'],
        exception: 'NOT_EVALUATED',
      },
    );
  });
  it('returns a stable fail-closed shape for absent or invalid runtime input', () => {
    expect(inspectMethodExplainerCopy(undefined)).toEqual(INVALID_RESULT);
    for (const invalid of [
      {...makeCopyInput(), beat_id: 'bad'},
      {...makeCopyInput(), voice_contract_sha256: 'A'.repeat(64)},
      {...makeCopyInput(), on_screen: ['   ']},
      {...makeCopyInput(), voiceover: 'a'.repeat(1_001)},
      {...makeCopyInput(), extra: true},
    ])
      expect(inspectMethodExplainerCopy(invalid)).toEqual(INVALID_RESULT);
  });
  it.each(['!!!', '🤖'])('blocks semantically empty on-screen node %j before metrics', (node) => {
    expect(
      inspectMethodExplainerCopy(makeCopyInput({on_screen: [node, 'Criterio humano']})),
    ).toEqual(INVALID_RESULT);
  });
  it('does not mutate inputs and returns deterministic JSON-safe output', () => {
    const input = makeCopyInput();
    const before = JSON.stringify(input);
    const first = inspectMethodExplainerCopy(input);
    const second = inspectMethodExplainerCopy(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(() => {
      void JSON.parse(JSON.stringify(first));
    }).not.toThrow();
  });
});
