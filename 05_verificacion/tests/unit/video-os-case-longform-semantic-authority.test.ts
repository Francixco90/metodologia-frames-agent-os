import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformClaims,
  assertCaseLongformSemanticAuthority,
  CaseLongformSemanticClaimMap,
} from 'workflows/video-os/index.ts';
import {
  cleanupCaseFixtures,
  writeCaseFixture,
} from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';
import {materializeCaseLongformSemanticFixture} from './video-os-case-longform-semantic-fixture.test.ts';

type Fixture = ReturnType<typeof materializeCaseLongformSemanticFixture>;
type Key = 'semantic_policy_receipt_v3' | 'semantic_claim_map';
const replace = (fixture: Fixture, key: Key, value: unknown): void => {
  const root =
    key === 'semantic_policy_receipt_v3' ? fixture.options.trustPolicy.authorityRoot : fixture.root;
  fixture.semanticContract.artifacts[key] = writeCaseFixture(
    root,
    fixture.semanticContract.artifacts[key].ref,
    value,
  );
};
const validate = (fixture: Fixture) =>
  assertCaseLongformSemanticAuthority(fixture.semanticContract, fixture.options);
afterEach(cleanupCaseFixtures);

describe('case-longform PR1c0b1b claims authority', () => {
  it('accepts material V4 while remaining pre-render blocked', () => {
    const fixture = materializeCaseLongformSemanticFixture();
    expect(validate(fixture).status).toBe('PRE_RENDER_BLOCKED');
    expect(validate(fixture)).not.toHaveProperty('render_authority');
    expect(validate(fixture).artifacts).not.toHaveProperty('external_review_receipt');
    expect(validate(fixture).artifacts).not.toHaveProperty('preservation_map');
  });
  it('revalidates V3 and rejects aliases or forbidden lifecycle fields', () => {
    const drift = materializeCaseLongformSemanticFixture();
    drift.semanticContract.artifacts.audio_transcript.sha256 = '0'.repeat(64);
    expect(() => validate(drift)).toThrow();
    const alias = materializeCaseLongformSemanticFixture();
    alias.semanticContract.artifacts.semantic_claim_map =
      alias.semanticContract.artifacts.semantic_policy_receipt_v3;
    expect(() => validate(alias)).toThrow(/REF-ALIAS/u);
    const extra = materializeCaseLongformSemanticFixture();
    expect(() =>
      assertCaseLongformSemanticAuthority(
        {
          ...extra.semanticContract,
          artifacts: {...extra.semanticContract.artifacts, preservation_map: {ref: 'fake'}},
          render_authority: {},
          effects: true,
        },
        extra.options,
      ),
    ).toThrow();
  });
  it.each([
    [
      'requirement',
      (fixture: Fixture) => {
        fixture.values.policyV3.participants[0]!.claim_requirements[0]!.required = false;
      },
    ],
    [
      'modality',
      (fixture: Fixture) => {
        fixture.values.policyV3.participants[0]!.claim_requirements[1]!.allowed_modalities = [
          'process_demonstration',
        ];
      },
    ],
    [
      'presentation',
      (fixture: Fixture) => {
        fixture.values.policyV3.participants[0]!.claim_requirements[0]!.presentation = 'progress';
      },
    ],
    [
      'role',
      (fixture: Fixture) => {
        fixture.values.policyV3.participants[0]!.claim_requirements[1]!.allowed_roles = ['body'];
      },
    ],
    [
      'authorized statement',
      (fixture: Fixture) => {
        fixture.values.policyV3.participants[0]!.claim_requirements[0]!.authorized_presentation_variants =
          ['gran trabajo'];
      },
    ],
  ] as const)('rejects semantic policy %s drift', (_name, mutate) => {
    const fixture = materializeCaseLongformSemanticFixture();
    mutate(fixture);
    replace(fixture, 'semantic_policy_receipt_v3', fixture.values.policyV3);
    expect(() => validate(fixture)).toThrow(/POLICY/u);
  });
  it('rejects arbitrary speech presented as an appointment declaration', () => {
    const fixture = materializeCaseLongformSemanticFixture();
    fixture.values.claims.claims.push({
      claim_id: 'danilo-appointed',
      output_status: 'appointed',
      presentation: 'appointment',
      presentation_mode: 'SOURCE_AUDIOVISUAL_ONLY',
      display_text: 'Caso',
      source_role: 'closure',
      source_sha256: fixture.values.sourceSet.sources[3].media.sha256,
      source_start_frame: 0,
      source_end_frame: 1,
      output_start_frame: 16,
      output_end_frame: 17,
      transcript_segment_ids: ['closure-room'],
      caption_cue_ids: ['two'],
      evidence: {
        kind: 'audiovisual_declaration',
        modality: 'appointment_declaration',
        speaker: 'Germán',
      },
    });
    fixture.values.claims.operational_gaps = [];
    replace(fixture, 'semantic_claim_map', fixture.values.claims);
    fixture.semanticContract.status = 'BLOCKED_PENDING_PRESERVATION_AND_EXTERNAL_REVIEW_CONTRACTS';
    expect(() => validate(fixture)).toThrow(/CLAIM/u);
  });
  it.each([
    [
      'certified overpromotion',
      (claim: Record<string, unknown>) => {
        claim.output_status = 'certified';
      },
    ],
    [
      'source drift',
      (claim: Record<string, unknown>) => {
        claim.source_sha256 = '0'.repeat(64);
      },
    ],
    [
      'output drift',
      (claim: Record<string, unknown>) => {
        claim.output_start_frame = 10;
      },
    ],
    [
      'transcript drift',
      (claim: Record<string, unknown>) => {
        claim.transcript_segment_ids = ['closure-room'];
      },
    ],
    [
      'caption drift',
      (claim: Record<string, unknown>) => {
        claim.caption_cue_ids = ['two'];
      },
    ],
    [
      'generated display rewrite',
      (claim: Record<string, unknown>) => {
        claim.display_text = 'Excelente trabajo';
      },
    ],
    [
      'speaker drift',
      (claim: Record<string, unknown>) => {
        claim.evidence = {
          kind: 'audiovisual_declaration',
          modality: 'recognition_declaration',
          speaker: 'Producer',
        };
      },
    ],
    [
      'role drift',
      (claim: Record<string, unknown>) => {
        claim.source_role = 'intro';
      },
    ],
  ] as const)('rejects claim %s', (_name, mutate) => {
    const fixture = materializeCaseLongformSemanticFixture();
    mutate(fixture.values.claims.claims[0] as unknown as Record<string, unknown>);
    replace(fixture, 'semantic_claim_map', fixture.values.claims);
    expect(() => validate(fixture)).toThrow(/CLAIM/u);
  });
  it.each(['text_note', 'plate', 'certificate'] as const)(
    'rejects %s substitution for audiovisual evidence',
    (kind) => {
      const fixture = materializeCaseLongformSemanticFixture();
      (fixture.values.claims.claims[0] as unknown as Record<string, unknown>).evidence = {
        kind,
        text: 'appointed',
      };
      replace(fixture, 'semantic_claim_map', fixture.values.claims);
      expect(() => validate(fixture)).toThrow();
    },
  );
  it('derives the operational gap and blocks injected or omitted gaps', () => {
    const injected = materializeCaseLongformSemanticFixture();
    injected.values.claims.operational_gaps[0]!.reason = 'MISSING_REQUIRED_AUDIOVISUAL_EVIDENCE';
    replace(injected, 'semantic_claim_map', injected.values.claims);
    expect(() => validate(injected)).toThrow(/GAP/u);
    const omitted = materializeCaseLongformSemanticFixture();
    omitted.values.claims.operational_gaps = [];
    replace(omitted, 'semantic_claim_map', omitted.values.claims);
    expect(() => validate(omitted)).toThrow(/GAP/u);
  });
  it('binds public name and forbids an editorial appointment label', () => {
    const name = materializeCaseLongformSemanticFixture();
    name.values.claims.public_name = 'Danilo';
    replace(name, 'semantic_claim_map', name.values.claims);
    expect(() => validate(name)).toThrow(/BINDING/u);
    const presentation = materializeCaseLongformSemanticFixture();
    (presentation.values.claims.claims[0] as unknown as Record<string, unknown>).presentation_mode =
      'EDITORIAL_LABEL';
    replace(presentation, 'semantic_claim_map', presentation.values.claims);
    expect(() => validate(presentation)).toThrow(/CLAIM/u);
  });
  it('keeps Natalia process evidence separate from its editorial progress label', () => {
    const fixture = materializeCaseLongformSemanticFixture();
    const raw = structuredClone(fixture.values.claims) as unknown as {
      participant_id: string;
      public_name: string;
      claims: Array<Record<string, unknown>>;
      operational_gaps: unknown[];
    };
    raw.participant_id = 'natalia';
    raw.public_name = 'Natalia Andrade';
    Object.assign(raw.claims[0]!, {
      claim_id: 'natalia-progress',
      output_status: 'in_progress',
      presentation: 'progress',
      presentation_mode: 'EDITORIAL_LABEL',
      display_text: 'En progreso',
      evidence: {kind: 'process_evidence', modality: 'process_demonstration'},
    });
    raw.operational_gaps = [];
    expect(
      assertCaseLongformClaims(
        CaseLongformSemanticClaimMap.parse(raw),
        fixture.values.policyV3.participants[2]!,
        {
          sourceSet: fixture.values.sourceSet,
          segments: fixture.values.segments,
          transcript: fixture.values.transcript,
          captions: fixture.values.captions,
        },
      ),
    ).toBe('BLOCKED_PENDING_PRESERVATION_AND_EXTERNAL_REVIEW_CONTRACTS');
  });
});
