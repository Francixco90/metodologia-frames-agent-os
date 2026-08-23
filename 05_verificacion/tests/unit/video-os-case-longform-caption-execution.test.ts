import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformCaptionExecutionAuthority,
  deriveCaseLongformCaptionExecutionLedger,
} from 'workflows/video-os/index.ts';
import {
  cleanupCaseLongformCaptionExecutionFixtures,
  materializeCaseLongformCaptionExecutionFixture,
  rewriteCaseLongformCaptionExecutionMaterial,
} from '../../../tests/fixtures/video-os-case-longform-caption-execution.fixture.ts';

type Fixture = ReturnType<typeof materializeCaseLongformCaptionExecutionFixture>;
const validate = (fixture: Fixture) =>
  assertCaseLongformCaptionExecutionAuthority(fixture.contract, fixture.options);
const rewriteLedger = (fixture: Fixture): void => {
  fixture.contract.artifacts.caption_execution_ledger = rewriteCaseLongformCaptionExecutionMaterial(
    fixture.root,
    fixture.contract.artifacts.caption_execution_ledger.ref,
    fixture.ledger,
  );
};

afterEach(cleanupCaseLongformCaptionExecutionFixtures);
describe('case-longform V7b caption execution ledger', () => {
  it('recomputes one chained entry per cue-layout fragment without visual claims', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    const ledger = deriveCaseLongformCaptionExecutionLedger(fixture);
    expect(ledger.entries).toHaveLength(fixture.placement.placements.length);
    expect(ledger.entries[0]!.previous_entry_sha256).toBeNull();
    expect(ledger.entries[1]!.previous_entry_sha256).toBe(ledger.entries[0]!.entry_sha256);
    expect(ledger.execution_scope).toBe('CAPTION_DATA_GRAPH_ONLY');
    expect(ledger).not.toHaveProperty('visual_observation');
    expect(ledger).not.toHaveProperty('review');
    expect(ledger).not.toHaveProperty('render');
    expect(ledger).not.toHaveProperty('effects');
  });

  it.each<[string, (value: Fixture['ledger']['entries'][number]) => void]>([
    ['text', (value) => void (value.text_sha256 = '0'.repeat(64))],
    ['font', (value) => void (value.font_sha256 = '0'.repeat(64))],
    ['geometry', (value) => void (value.geometry.x += 1)],
    ['frame', (value) => void (value.end_frame += 1)],
    ['config', (value) => void (value.compositor_config_sha256 = '0'.repeat(64))],
    ['command', (value) => void (value.compositor_command_sha256 = '0'.repeat(64))],
    ['executable', (value) => void (value.compositor_executable_sha256 = '0'.repeat(64))],
    ['track', (value) => void (value.caption_track_sha256 = '0'.repeat(64))],
    ['cleanup', (value) => void (value.caption_cleanup_sha256 = '0'.repeat(64))],
    ['graph', (value) => void (value.graph_sha256 = '0'.repeat(64))],
    ['temporal', (value) => void (value.temporal_map_sha256 = '0'.repeat(64))],
  ])('rejects %s binding drift', (_label, mutate) => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    mutate(fixture.ledger.entries[0]!);
    rewriteLedger(fixture);
    expect(() => validate(fixture)).toThrow(/LEDGER-DRIFT/u);
  });

  it('rejects an omitted fragment', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    fixture.ledger.entries.pop();
    rewriteLedger(fixture);
    expect(() => validate(fixture)).toThrow(/LEDGER-DRIFT/u);
  });

  it('rejects reordered fragments', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    fixture.ledger.entries.reverse();
    rewriteLedger(fixture);
    expect(() => validate(fixture)).toThrow(/LEDGER-DRIFT/u);
  });

  it('rejects execution-ledger ref aliases', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    fixture.contract.artifacts.caption_execution_ledger =
      fixture.contract.artifacts.caption_placement_plan;
    expect(() => validate(fixture)).toThrow(/REF-ALIAS/u);
  });

  it('rejects entry and final-chain forgeries', () => {
    const entry = materializeCaseLongformCaptionExecutionFixture();
    entry.ledger.entries[0]!.entry_sha256 = '0'.repeat(64);
    rewriteLedger(entry);
    expect(() => validate(entry)).toThrow(/LEDGER-DRIFT/u);
    const chain = materializeCaseLongformCaptionExecutionFixture();
    chain.ledger.chain_sha256 = '0'.repeat(64);
    rewriteLedger(chain);
    expect(() => validate(chain)).toThrow(/LEDGER-DRIFT/u);
  });

  it('rejects status promotion and lifecycle aliases', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    fixture.contract.status = 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
    expect(() => validate(fixture)).toThrow(/STATUS-DRIFT/u);
    const strict = materializeCaseLongformCaptionExecutionFixture();
    expect(() =>
      assertCaseLongformCaptionExecutionAuthority(
        {...strict.contract, visual_observation: {}, verdict: 'PASS', review: {}, effects: true},
        strict.options,
      ),
    ).toThrow();
  });

  it('rejects placement geometry that is not bound to the ledger through the public gate', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    fixture.placement.placements[0]!.x += 1;
    fixture.contract.artifacts.caption_placement_plan = rewriteCaseLongformCaptionExecutionMaterial(
      fixture.root,
      fixture.contract.artifacts.caption_placement_plan.ref,
      fixture.placement,
    );
    expect(() => validate(fixture)).toThrow(/LEDGER-DRIFT/u);
  });

  it('rejects compositor hashes that are not bound to the ledger through the public gate', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    fixture.compositor.config.sha256 = '0'.repeat(64);
    fixture.contract.artifacts.caption_compositor_authority =
      rewriteCaseLongformCaptionExecutionMaterial(
        fixture.root,
        fixture.contract.artifacts.caption_compositor_authority.ref,
        fixture.compositor,
      );
    expect(() => validate(fixture)).toThrow(/LEDGER-DRIFT/u);
  });
});
