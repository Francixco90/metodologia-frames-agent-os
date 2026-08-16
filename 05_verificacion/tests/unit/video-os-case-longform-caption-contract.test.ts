import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformCaptionContractAuthority,
  CaseLongformCaptionPlacementPlan,
  deriveCaseLongformCaptionPlacements,
} from 'workflows/video-os/index.ts';
import {
  CaseLongformCaptionTrack,
  CaseLongformOperationGraph,
  CaseLongformTemporalMap,
} from 'workflows/video-os/_runner/case-longform-graph-structure.ts';
import {
  cleanupCaseFixtures,
  readCaseFixture,
  writeCaseFixture,
} from '../../../tests/fixtures/video-os-case-longform-coverage.fixture.ts';
import {materializeCaseLongformCaptionContractFixture} from './video-os-case-longform-caption-contract-fixture.test.ts';

type Fixture = ReturnType<typeof materializeCaseLongformCaptionContractFixture>;
const validate = (fixture: Fixture) =>
  assertCaseLongformCaptionContractAuthority(fixture.contract, fixture.options);
const rewriteLayout = (fixture: Fixture): void => {
  fixture.contract.artifacts.caption_layout_authority = writeCaseFixture(
    fixture.options.captionTrustPolicy.layoutAuthorityRoot,
    fixture.contract.artifacts.caption_layout_authority.ref,
    fixture.layoutValue,
  );
};
const rewriteCompositor = (fixture: Fixture): void => {
  fixture.compositor.ref = writeCaseFixture(
    fixture.compositor.root,
    fixture.compositor.ref.ref,
    fixture.compositor.authorityValue,
  );
  fixture.contract.artifacts.caption_compositor_authority = fixture.compositor.ref;
};
const deriveText = (fixture: Fixture, text: string) => {
  const root = fixture.ledger.base.root;
  const a = fixture.contract.artifacts;
  const track = CaseLongformCaptionTrack.parse(readCaseFixture(root, a.caption_track));
  track.cues = [{...track.cues[0]!, text}];
  return deriveCaseLongformCaptionPlacements({
    contract: fixture.contract,
    graph: CaseLongformOperationGraph.parse(readCaseFixture(root, a.operation_graph)),
    temporal: CaseLongformTemporalMap.parse(readCaseFixture(root, a.temporal_map)),
    track,
    layout: fixture.layoutValue,
  });
};

afterEach(cleanupCaseFixtures);
describe('case-longform V7a caption authority contracts', () => {
  it('revalidates V6 and keeps Danilo pre-render blocked without ledger or review claims', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    const result = validate(fixture);
    expect(result.status).toBe('PRE_RENDER_BLOCKED');
    expect(result.v6_status).toBe('BLOCKED_PENDING_CAPTION_AND_EXTERNAL_REVIEW_CONTRACTS');
    expect(result).not.toHaveProperty('caption_material_ledger');
    expect(result).not.toHaveProperty('review');
    expect(result).not.toHaveProperty('render');
    expect(result).not.toHaveProperty('effects');
  });

  it('rejects overlapping canonical trust roots', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.options.captionTrustPolicy.layoutAuthorityRoot = fixture.ledger.base.root;
    expect(() => validate(fixture)).toThrow(/TRUST-ROOT-OVERLAP/u);
  });

  it('rejects caption actors that are not independent', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.contract.caption_actors.layout_authority =
      fixture.contract.caption_actors.compositor_authority;
    expect(() => validate(fixture)).toThrow(/ACTORS-NOT-INDEPENDENT/u);
  });

  it('rejects untrusted external actors', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.options.captionTrustPolicy.trustedLayoutActorIds = [];
    expect(() => validate(fixture)).toThrow(/LAYOUT-AUTHORITY-DRIFT/u);
  });

  it('rejects untrusted compositor executable hashes', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.options.captionTrustPolicy.trustedCompositorExecutableSha256 = '0'.repeat(64);
    expect(() => validate(fixture)).toThrow(/TOOL-UNTRUSTED/u);
  });

  it('rejects font aliases', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.layoutValue.fonts.push(fixture.layoutValue.fonts[0]!);
    rewriteLayout(fixture);
    expect(() => validate(fixture)).toThrow(/FONT-ALIAS/u);
  });

  it('rejects a forged font-set hash', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.layoutValue.font_set_sha256 = '0'.repeat(64);
    rewriteLayout(fixture);
    expect(() => validate(fixture)).toThrow(/FONT-SET-DRIFT/u);
  });

  it('rejects a missing temporal layout rule without a default', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.layoutValue.rules.pop();
    rewriteLayout(fixture);
    expect(() => validate(fixture)).toThrow(/LAYOUT-RULE-DRIFT/u);
  });

  it('rejects duplicate temporal layout rules', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.layoutValue.rules.push(fixture.layoutValue.rules[0]!);
    rewriteLayout(fixture);
    expect(() => validate(fixture)).toThrow(/LAYOUT-RULE-DRIFT/u);
  });

  it('rejects a non-allowlisted compositor argv structure', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.compositor.commandValue.argv[0] = 'caption-compose-now';
    fixture.compositor.authorityValue.command = writeCaseFixture(
      fixture.compositor.root,
      fixture.compositor.authorityValue.command.ref,
      fixture.compositor.commandValue,
    );
    rewriteCompositor(fixture);
    expect(() => validate(fixture)).toThrow(/TOOL-CONTRACT-DRIFT/u);
  });

  it('rejects nested tool aliases', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.compositor.authorityValue.command = fixture.compositor.authorityValue.config;
    rewriteCompositor(fixture);
    expect(() => validate(fixture)).toThrow(/TOOL-REF-ALIAS/u);
  });

  it('rejects verifier PASS material', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.verifier.ref = writeCaseFixture(fixture.verifier.root, fixture.verifier.ref.ref, {
      ...fixture.verifier.authorityValue,
      verdict: 'PASS',
    });
    fixture.contract.artifacts.caption_verifier_authority = fixture.verifier.ref;
    expect(() => validate(fixture)).toThrow();
  });

  it('rejects producer-authored placement geometry', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    const ref = fixture.contract.artifacts.caption_placement_plan;
    const plan = CaseLongformCaptionPlacementPlan.parse(
      readCaseFixture(fixture.ledger.base.root, ref),
    );
    plan.placements[0]!.x += 1;
    fixture.contract.artifacts.caption_placement_plan = writeCaseFixture(
      fixture.ledger.base.root,
      ref.ref,
      plan,
    );
    expect(() => validate(fixture)).toThrow(/PLACEMENT-DRIFT/u);
  });

  it('rejects status promotion and lifecycle aliases', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.contract.status = 'BLOCKED_PENDING_CAPTION_MATERIAL_LEDGER_CONTRACTS';
    expect(() => validate(fixture)).toThrow(/STATUS-DRIFT/u);
    const strict = materializeCaseLongformCaptionContractFixture();
    expect(() =>
      assertCaseLongformCaptionContractAuthority(
        {...strict.contract, caption_material_ledger: {}, review: {}, render: {}, effects: true},
        strict.options,
      ),
    ).toThrow();
  });

  it('accepts exact LF line capacity', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    const plan = deriveText(fixture, `${'a'.repeat(56)}\n${'b'.repeat(56)}`);
    expect(plan.placements.every(({height}) => height === 96)).toBe(true);
  });

  it('rejects LF line overflow', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    expect(() => deriveText(fixture, 'a\nb\nc\nd')).toThrow(/TEXT-OVERFLOW/u);
  });

  it('counts mixed LF and wrapping exactly', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    const plan = deriveText(fixture, `${'a'.repeat(57)}\n`);
    expect(plan.placements.every(({height}) => height === 144)).toBe(true);
  });

  it('rejects carriage returns', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    expect(() => deriveText(fixture, 'linea\r\notra')).toThrow(/TEXT-CONTROL/u);
  });

  it('rejects non-LF control characters', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    expect(() => deriveText(fixture, 'linea\u0007otra')).toThrow(/TEXT-CONTROL/u);
  });

  it('rejects Unicode NEXT LINE U+0085', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    expect(() => deriveText(fixture, 'linea\u0085otra')).toThrow(/TEXT-CONTROL/u);
  });

  it('rejects Unicode control U+009F', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    expect(() => deriveText(fixture, 'linea\u009Fotro')).toThrow(/TEXT-CONTROL/u);
  });

  it('rejects Unicode LINE SEPARATOR U+2028', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    expect(() => deriveText(fixture, 'linea\u2028otra')).toThrow(/TEXT-CONTROL/u);
  });

  it('rejects Unicode PARAGRAPH SEPARATOR U+2029', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    expect(() => deriveText(fixture, 'linea\u2029otra')).toThrow(/TEXT-CONTROL/u);
  });

  it('counts emoji as one Unicode codepoint', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    const plan = deriveText(fixture, '😀'.repeat(56));
    expect(plan.placements.every(({height}) => height === 48)).toBe(true);
  });
});
