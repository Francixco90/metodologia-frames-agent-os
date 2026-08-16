import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformCaptionExecutionLedgerProjection,
  CaseLongformCaptionExecutionAuthoritySchema,
} from 'workflows/video-os/index.ts';
import {
  cleanupCaseLongformCaptionExecutionFixtures,
  materializeCaseLongformCaptionExecutionFixture,
} from './video-os-case-longform-caption-execution-fixture.test.ts';

type Fixture = ReturnType<typeof materializeCaseLongformCaptionExecutionFixture>;
const validate = (fixture: Fixture) => assertCaseLongformCaptionExecutionLedgerProjection(fixture);

afterEach(cleanupCaseLongformCaptionExecutionFixtures);
describe('case-longform V7b caption execution ledger', () => {
  it('recomputes one chained entry per cue-layout fragment without visual claims', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    const result = validate(fixture);
    expect(fixture.ledger.entries).toHaveLength(fixture.placement.placements.length);
    expect(fixture.ledger.entries[0]!.previous_entry_sha256).toBeNull();
    expect(fixture.ledger.entries[1]!.previous_entry_sha256).toBe(
      fixture.ledger.entries[0]!.entry_sha256,
    );
    expect(result.status).toBe('PRE_RENDER_BLOCKED');
    expect(result).not.toHaveProperty('visual_observation');
    expect(result).not.toHaveProperty('review');
    expect(result).not.toHaveProperty('render');
    expect(result).not.toHaveProperty('effects');
  });

  it('advances only non-Danilo contracts to the visual-evidence blocker', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture('other');
    expect(validate(fixture).status).toBe('BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS');
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
    expect(() => validate(fixture)).toThrow(/LEDGER-DRIFT/u);
  });

  it('rejects an omitted fragment', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    fixture.ledger.entries.pop();
    expect(() => validate(fixture)).toThrow(/LEDGER-DRIFT/u);
  });

  it('rejects reordered fragments', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    fixture.ledger.entries.reverse();
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
    expect(() => validate(entry)).toThrow(/LEDGER-DRIFT/u);
    const chain = materializeCaseLongformCaptionExecutionFixture();
    chain.ledger.chain_sha256 = '0'.repeat(64);
    expect(() => validate(chain)).toThrow(/LEDGER-DRIFT/u);
  });

  it('rejects status promotion and lifecycle aliases', () => {
    const fixture = materializeCaseLongformCaptionExecutionFixture();
    fixture.contract.status = 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
    expect(() => validate(fixture)).toThrow(/STATUS-DRIFT/u);
    const strict = materializeCaseLongformCaptionExecutionFixture();
    expect(() =>
      CaseLongformCaptionExecutionAuthoritySchema.parse({
        ...strict.contract,
        visual_observation: {},
        verdict: 'PASS',
        review: {},
        render: {},
        effects: true,
      }),
    ).toThrow();
  });
});
