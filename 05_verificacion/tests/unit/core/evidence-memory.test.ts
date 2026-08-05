import {describe, expect, it} from 'vitest';

import {
  canonicalize,
  EvidenceLedger,
  hashCanonical,
  verifyCanonicalHash,
} from '../../../../core/evidence/index.ts';
import {AppendOnlyMemory} from '../../../../core/memory/index.ts';
import {HASH_A, HASH_B, NOW, portableRef} from './fixtures.ts';

describe('canonical evidence', () => {
  it('produces the same digest independent of object key order', () => {
    const first = {z: [3, 2, 1], a: {right: true, left: null}};
    const second = {a: {left: null, right: true}, z: [3, 2, 1]};
    expect(canonicalize(first)).toBe(canonicalize(second));
    expect(hashCanonical(first)).toBe(hashCanonical(second));
    expect(verifyCanonicalHash(second, hashCanonical(first))).toBe(true);
  });

  it('rejects values that are not JSON serializable', () => {
    expect(() => canonicalize({missing: undefined})).toThrow();
    expect(() => canonicalize({invalid: Number.POSITIVE_INFINITY})).toThrow();
  });

  it('chains append-only evidence and detects duplicate IDs', () => {
    const ledger = new EvidenceLedger();
    const input = {
      evidenceId: 'evidence:one',
      kind: 'test',
      subjectRef: portableRef('artifact', 'artifact:one'),
      payload: {command: 'pnpm test', exitCode: 0, details: {attempts: [1]}},
      actorId: 'actor:verifier',
      recordedAt: NOW,
      tags: ['CÓDIGO'],
    };
    const first = ledger.append(input);
    const storedDetails = first.payload.details as {attempts: number[]};
    expect(Object.isFrozen(first.payload)).toBe(true);
    expect(Object.isFrozen(storedDetails)).toBe(true);
    expect(Object.isFrozen(storedDetails.attempts)).toBe(true);
    expect(Reflect.set(storedDetails, 'attempts', [99])).toBe(false);
    input.payload.details.attempts.push(2);
    expect(ledger.snapshot()[0]?.payload.details).toEqual({attempts: [1]});
    expect(ledger.verify()).toBe(true);

    const second = ledger.append({...input, evidenceId: 'evidence:two'});
    expect(second.previousRecordHash).toBe(first.recordHash);
    expect(ledger.verify()).toBe(true);
    expect(() => ledger.append(input)).toThrow(/Duplicate evidence ID/u);
  });
});

describe('governed append-only memory', () => {
  it('stores compact evidence-linked summaries and verifies its chain', () => {
    const memory = new AppendOnlyMemory();
    const input = {
      memoryId: 'memory:one',
      subjectId: 'artifact:one',
      kind: 'decision',
      summary: 'The committee selected direction A with one recorded dissent.',
      actorId: 'actor:lead',
      evidenceRefs: [portableRef('evidence', 'evidence:one')],
      createdAt: NOW,
    } as const;
    const entry = memory.append(input);

    expect(Reflect.set(input.evidenceRefs[0] as object, 'digest', HASH_B)).toBe(true);
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.evidenceRefs)).toBe(true);
    expect(Object.isFrozen(entry.evidenceRefs[0])).toBe(true);
    expect(
      Reflect.set(entry.evidenceRefs[0] as object, 'digest', HASH_A.replaceAll('a', 'b')),
    ).toBe(false);
    expect(memory.snapshot()).toHaveLength(1);
    expect(memory.snapshot()[0]?.evidenceRefs[0]?.digest).toBe(HASH_A);
    expect(memory.verify()).toBe(true);
  });

  it('rejects private reasoning labels and arbitrary reasoning fields', () => {
    const memory = new AppendOnlyMemory();
    const prohibitedLabels = [
      'chain-of-thought',
      'private reasoning',
      'cadena de pensamiento',
      'razonamiento privado',
    ];
    for (const [index, label] of prohibitedLabels.entries()) {
      expect(() =>
        memory.append({
          memoryId: `memory:cot:${String(index)}`,
          subjectId: 'artifact:one',
          kind: 'learning',
          summary: `This field contains ${label}.`,
          actorId: 'actor:lead',
          evidenceRefs: [],
          createdAt: NOW,
        }),
      ).toThrow();
    }
    expect(() =>
      memory.append({
        memoryId: 'memory:extra',
        subjectId: 'artifact:one',
        kind: 'fact',
        summary: 'Bounded fact.',
        reasoning: 'hidden',
        actorId: 'actor:lead',
        evidenceRefs: [],
        createdAt: NOW,
      }),
    ).toThrow();
  });

  it('rejects duplicate memory IDs', () => {
    const memory = new AppendOnlyMemory();
    const input = {
      memoryId: 'memory:duplicate',
      subjectId: 'artifact:one',
      kind: 'fact',
      summary: 'A verified fact.',
      actorId: 'actor:lead',
      evidenceRefs: [],
      createdAt: NOW,
    } as const;
    memory.append(input);
    expect(() => memory.append(input)).toThrow(/Duplicate memory ID/u);
  });

  it('does not use arbitrary external digests as a memory chain link', () => {
    const memory = new AppendOnlyMemory();
    const entry = memory.append({
      memoryId: 'memory:hash',
      subjectId: 'artifact:one',
      kind: 'fact',
      summary: 'A verified fact.',
      actorId: 'actor:lead',
      evidenceRefs: [],
      createdAt: NOW,
    });
    expect(entry.entryHash).not.toBe(HASH_A);
  });
});
