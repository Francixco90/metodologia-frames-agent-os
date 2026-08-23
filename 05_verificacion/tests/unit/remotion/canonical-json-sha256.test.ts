import {createHash} from 'node:crypto';
import {describe, expect, it} from 'vitest';

import pivoteFixture from '../../../../04_estado/tasks/TASK-loose-032/skill-system/S04/candidate-package/metodologia-explainer-diagram-design/fixtures/positive/pivote-radial-lenses.json';
import {
  canonicalJsonSha256,
  sha256Utf8,
} from '../../../../02_proceso/core/canonical-json-sha256.ts';

const native = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

describe('browser-safe canonical SHA-256', () => {
  it('matches standard SHA-256 vectors and Node byte for byte', () => {
    const vectors = [
      ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
      ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
      [
        'The quick brown fox jumps over the lazy dog',
        'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
      ],
    ] as const;
    for (const [text, expected] of vectors) {
      expect(sha256Utf8(text)).toBe(expected);
      expect(sha256Utf8(text)).toBe(native(text));
    }
  });

  it('preserves UTF-8 and JSON.stringify semantics across edge cases', () => {
    const values: unknown[] = [
      'Tecnología',
      'Tecnologi\u0301a',
      'Pristino 🤖',
      '\ud800',
      null,
      -0,
      [true, false, null, 1.5],
      {z: 1, a: {emoji: '🧭', lines: ['P', 'I', 'V', 'O', 'T', 'E']}},
    ];
    for (const value of values)
      expect(canonicalJsonSha256(value)).toBe(native(JSON.stringify(value)));
    expect(canonicalJsonSha256('Tecnología')).not.toBe(canonicalJsonSha256('Tecnologi\u0301a'));
  });

  it('keeps the canonical PIVOTE golden and compatible failures', () => {
    expect(canonicalJsonSha256(pivoteFixture.diagram)).toBe(
      '6dd616f8506039ddd9e1a3060628dc235f9692b0fcc804cc2dbe024b54fb080f',
    );
    expect(() => canonicalJsonSha256(undefined)).toThrow(TypeError);
    expect(() => canonicalJsonSha256(1n)).toThrow(TypeError);
    const cyclic: {self?: unknown} = {};
    cyclic.self = cyclic;
    expect(() => canonicalJsonSha256(cyclic)).toThrow(TypeError);
    expect(() => sha256Utf8(1 as never)).toThrow(TypeError);
  });
});
