import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformCaptionContractAuthority,
  CaseLongformCaptionPlacementPlan,
} from 'workflows/video-os/index.ts';
import {
  cleanupCaseFixtures,
  readCaseFixture,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';
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

  it('rejects untrusted external actors and executable hashes', () => {
    const fixture = materializeCaseLongformCaptionContractFixture();
    fixture.options.captionTrustPolicy.trustedLayoutActorIds = [];
    expect(() => validate(fixture)).toThrow(/LAYOUT-AUTHORITY-DRIFT/u);
    const executable = materializeCaseLongformCaptionContractFixture();
    executable.options.captionTrustPolicy.trustedCompositorExecutableSha256 = '0'.repeat(64);
    expect(() => validate(executable)).toThrow(/TOOL-UNTRUSTED/u);
  });

  it('rejects font aliases and a forged font-set hash', () => {
    const alias = materializeCaseLongformCaptionContractFixture();
    alias.layoutValue.fonts.push(alias.layoutValue.fonts[0]!);
    rewriteLayout(alias);
    expect(() => validate(alias)).toThrow(/FONT-ALIAS/u);
    const forged = materializeCaseLongformCaptionContractFixture();
    forged.layoutValue.font_set_sha256 = '0'.repeat(64);
    rewriteLayout(forged);
    expect(() => validate(forged)).toThrow(/FONT-SET-DRIFT/u);
  });

  it('rejects missing or duplicate temporal layout rules without a default', () => {
    const missing = materializeCaseLongformCaptionContractFixture();
    missing.layoutValue.rules.pop();
    rewriteLayout(missing);
    expect(() => validate(missing)).toThrow(/LAYOUT-RULE-DRIFT/u);
    const duplicate = materializeCaseLongformCaptionContractFixture();
    duplicate.layoutValue.rules.push(duplicate.layoutValue.rules[0]!);
    rewriteLayout(duplicate);
    expect(() => validate(duplicate)).toThrow(/LAYOUT-RULE-DRIFT/u);
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

  it('rejects nested tool aliases and verifier PASS material', () => {
    const alias = materializeCaseLongformCaptionContractFixture();
    alias.compositor.authorityValue.command = alias.compositor.authorityValue.config;
    rewriteCompositor(alias);
    expect(() => validate(alias)).toThrow(/TOOL-REF-ALIAS/u);
    const pass = materializeCaseLongformCaptionContractFixture();
    pass.verifier.ref = writeCaseFixture(pass.verifier.root, pass.verifier.ref.ref, {
      ...pass.verifier.authorityValue,
      verdict: 'PASS',
    });
    pass.contract.artifacts.caption_verifier_authority = pass.verifier.ref;
    expect(() => validate(pass)).toThrow();
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
});
