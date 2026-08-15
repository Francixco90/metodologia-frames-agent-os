import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformPrerenderReviewAuthority,
  deriveCaseLongformAudioMatches,
  deriveCaseLongformAudioOperations,
} from 'workflows/video-os/index.ts';
import {
  cleanupCaseFixtures,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';
import {materializeCaseLongformPrerenderReviewFixture} from './video-os-case-longform-prerender-review-fixture.test.ts';

const BAD = '0'.repeat(64);
const materialize = materializeCaseLongformPrerenderReviewFixture;
type Fixture = ReturnType<typeof materialize>;
type ReviewKey = keyof Fixture['reviewContract']['artifacts'];
const external = new Set<ReviewKey>([
  'semantic_policy_receipt',
  'semantic_policy_receipt_v2',
  'audio_dictionary_receipt',
]);
const replace = (fixture: Fixture, key: ReviewKey, value: unknown): void => {
  const root = external.has(key) ? fixture.options.trustPolicy.authorityRoot : fixture.root;
  fixture.reviewContract.artifacts[key] = writeCaseFixture(
    root,
    fixture.reviewContract.artifacts[key].ref,
    value,
  );
};
afterEach(cleanupCaseFixtures);

describe('case-longform PR1c0b1a audio authority', () => {
  it('accepts material audio authority while remaining blocked', () => {
    const fixture = materialize();
    const result = assertCaseLongformPrerenderReviewAuthority(
      fixture.reviewContract,
      fixture.options,
    );
    expect(result.status).toBe('BLOCKED_PENDING_SEMANTIC_AND_PRESERVATION_CONTRACTS');
    expect(result).not.toHaveProperty('render_authority');
    expect(result.artifacts).not.toHaveProperty('external_review_receipt');
  });
  it('revalidates V2 and rejects V3 extra fields or aliases', () => {
    const v2 = materialize();
    v2.reviewContract.artifacts.transform_order.sha256 = BAD;
    expect(() =>
      assertCaseLongformPrerenderReviewAuthority(v2.reviewContract, v2.options),
    ).toThrow();
    const extra = materialize();
    expect(() =>
      assertCaseLongformPrerenderReviewAuthority(
        {...extra.reviewContract, external_review_receipt: {}},
        extra.options,
      ),
    ).toThrow();
    const alias = materialize();
    alias.reviewContract.artifacts.audio_transcript =
      alias.reviewContract.artifacts.audio_redaction_map;
    expect(() =>
      assertCaseLongformPrerenderReviewAuthority(alias.reviewContract, alias.options),
    ).toThrow(/REF-ALIAS/u);
  });
  it.each([
    [
      'policy predecessor',
      (fixture: Fixture) => {
        fixture.values.policyV2.previous_policy_sha256 = BAD;
        replace(fixture, 'semantic_policy_receipt_v2', fixture.values.policyV2);
      },
    ],
    [
      'dictionary actor',
      (fixture: Fixture) => {
        fixture.values.dictionary.actor_id = 'UNTRUSTED';
        replace(fixture, 'audio_dictionary_receipt', fixture.values.dictionary);
      },
    ],
  ] as const)('rejects external %s drift', (_name, mutate) => {
    const fixture = materialize();
    mutate(fixture);
    expect(() =>
      assertCaseLongformPrerenderReviewAuthority(fixture.reviewContract, fixture.options),
    ).toThrow(/POLICY/u);
  });
  it('rejects canonical dictionary duplicates after rebinding policy', () => {
    const fixture = materialize();
    fixture.values.dictionary.entries[1]!.variants = ['Empresa--Reservada'];
    replace(fixture, 'audio_dictionary_receipt', fixture.values.dictionary);
    fixture.values.policyV2.audio_dictionary_sha256 =
      fixture.reviewContract.artifacts.audio_dictionary_receipt.sha256;
    replace(fixture, 'semantic_policy_receipt_v2', fixture.values.policyV2);
    expect(() =>
      assertCaseLongformPrerenderReviewAuthority(fixture.reviewContract, fixture.options),
    ).toThrow(/DICTIONARY/u);
  });
  it.each([
    [
      'incomplete coverage',
      (fixture: Fixture) => {
        fixture.values.transcript.sources[2].segments.at(-1)!.end_frame = 22;
      },
      /TRANSCRIPT/u,
    ],
    [
      'source drift',
      (fixture: Fixture) => {
        fixture.values.transcript.sources[0].source_sha256 = BAD;
      },
      /TRANSCRIPT/u,
    ],
    [
      'mixed sensitive cue',
      (fixture: Fixture) => {
        fixture.values.transcript.sources[2].segments[1]!.text = 'usamos empresa reservada hoy';
      },
      /NOT-ISOLATED/u,
    ],
  ] as const)('rejects %s', (_name, mutate, error) => {
    const fixture = materialize();
    mutate(fixture);
    replace(fixture, 'audio_transcript', fixture.values.transcript);
    expect(() =>
      assertCaseLongformPrerenderReviewAuthority(fixture.reviewContract, fixture.options),
    ).toThrow(error);
  });
  it('rejects forged matches and unsupported voice synthesis fields', () => {
    const forged = materialize();
    forged.values.audio.matches.pop();
    replace(forged, 'audio_redaction_map', forged.values.audio);
    expect(() =>
      assertCaseLongformPrerenderReviewAuthority(forged.reviewContract, forged.options),
    ).toThrow(/AUDIO-REDACTION/u);
    const clone = materialize();
    (clone.values.audio.operations[0] as Record<string, unknown>).voice_clone = true;
    replace(clone, 'audio_redaction_map', clone.values.audio);
    expect(() =>
      assertCaseLongformPrerenderReviewAuthority(clone.reviewContract, clone.options),
    ).toThrow();
  });
  it('rejects CUT outside an exact source gap', () => {
    const fixture = materialize();
    const segments = structuredClone(fixture.values.segments);
    segments.segments[2]!.source_end_frame = 3;
    const matches = deriveCaseLongformAudioMatches(
      fixture.values.transcript,
      fixture.values.dictionary,
    );
    expect(() =>
      deriveCaseLongformAudioOperations(matches, fixture.values.dictionary, segments),
    ).toThrow(/CUT-NOT-SOURCE-GAP/u);
  });
  it.each([
    [
      'PCM hash',
      (donor: Record<string, unknown>) => {
        donor.pcm_sha256 = BAD;
      },
      /DONOR-MATERIAL/u,
    ],
    [
      'source authority',
      (donor: Record<string, unknown>) => {
        donor.source_sha256 = BAD;
      },
      /DONOR-AUTHORITY/u,
    ],
    [
      'speech-free overclaim',
      (donor: Record<string, unknown>) => {
        donor.speech_free_review = 'VERIFIED';
      },
      undefined,
    ],
    [
      'duration +1 frame',
      (donor: Record<string, unknown>) => {
        donor.source_start_frame = 2;
        donor.source_end_frame = 4;
      },
      /DONOR-AUTHORITY/u,
    ],
    [
      'duration -1 frame',
      (donor: Record<string, unknown>) => {
        donor.source_start_frame = 2;
        donor.source_end_frame = 2;
      },
      /DONOR-AUTHORITY/u,
    ],
  ] as const)('rejects donor %s drift', (_name, mutate, error) => {
    const fixture = materialize();
    const room = fixture.values.audio.operations.find(
      ({treatment}) => treatment === 'ROOM_TONE_IDENTIFIER',
    ) as unknown as {donor: Record<string, unknown>};
    mutate(room.donor);
    replace(fixture, 'audio_redaction_map', fixture.values.audio);
    const assertion = () =>
      assertCaseLongformPrerenderReviewAuthority(fixture.reviewContract, fixture.options);
    if (error) expect(assertion).toThrow(error);
    else expect(assertion).toThrow();
  });
});
