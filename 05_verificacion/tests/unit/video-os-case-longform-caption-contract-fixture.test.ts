import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  caseLongformCaptionFontSetSha256,
  CaseLongformCaptionCompositorAuthority,
  CaseLongformCaptionContractAuthoritySchema,
  CaseLongformCaptionLayoutAuthority,
  CaseLongformCaptionToolCommand,
  CaseLongformCaptionToolConfig,
  CaseLongformCaptionVerifierAuthority,
  deriveCaseLongformCaptionPlacements,
} from 'workflows/video-os/index.ts';
import {
  CaseLongformCaptionTrack,
  CaseLongformOperationGraph,
  CaseLongformTemporalMap,
} from 'workflows/video-os/_runner/case-longform-graph-structure.ts';
import {
  caseFixtureRoots,
  cleanupCaseFixtures,
  readCaseFixture,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';
import {materializeCaseLongformPreservationLedgerFixture} from './video-os-case-longform-preservation-ledger.test.ts';

const externalRoot = (name: string): string => {
  const root = mkdtempSync(resolve(tmpdir(), `case-caption-${name}-`));
  caseFixtureRoots.push(root);
  return root;
};

export const materializeCaseLongformCaptionContractFixture = () => {
  const ledger = materializeCaseLongformPreservationLedgerFixture();
  const {root, preservationOptions} = ledger.base;
  const a = ledger.contract.artifacts;
  const layoutRoot = externalRoot('layout');
  const compositorRoot = externalRoot('compositor');
  const verifierRoot = externalRoot('verifier');
  const temporal = CaseLongformTemporalMap.parse(readCaseFixture(root, a.temporal_map));
  const track = CaseLongformCaptionTrack.parse(readCaseFixture(root, a.caption_track));
  const font = writeCaseFixture(layoutRoot, 'metodologia-font.bin', {synthetic: 'font'});
  const bindings = {
    job_id: ledger.contract.job_id,
    plan_sha256: a.plan.sha256,
    source_set_sha256: ledger.contract.source_set_sha256,
    graph_sha256: a.operation_graph.sha256,
    temporal_map_sha256: a.temporal_map.sha256,
    caption_track_sha256: a.caption_track.sha256,
    caption_cleanup_sha256: a.caption_cleanup.sha256,
  };
  const layoutValue = CaseLongformCaptionLayoutAuthority.parse({
    schema_version: 'case-longform-caption-layout-authority-v1',
    kind: 'caption_layout_authority',
    actor_id: 'caption-layout-authority',
    ...bindings,
    fps: 24,
    width: 1920,
    height: 1080,
    fonts: [font],
    font_set_sha256: caseLongformCaptionFontSetSha256([font]),
    rules: temporal.layouts.map(({id}) => ({
      layout_id: id,
      font_sha256: font.sha256,
      anchor: 'BOTTOM_CENTER',
      box_width: 1280,
      bottom_margin: 72,
      line_height: 48,
      max_lines: 3,
      max_chars_per_line: 56,
    })),
  });
  const layout = writeCaseFixture(layoutRoot, 'caption-layout-authority.json', layoutValue);
  const tool = (kind: 'compositor' | 'verifier', authorityRoot: string, actor_id: string) => {
    const executable = writeCaseFixture(authorityRoot, `${kind}.bin`, {synthetic: kind});
    const configValue = CaseLongformCaptionToolConfig.parse({
      schema_version: 'case-longform-caption-tool-config-v1',
      kind: `caption_${kind}_config`,
      ...bindings,
      layout_authority_sha256: layout.sha256,
      fps: 24,
      width: 1920,
      height: 1080,
    });
    const config = writeCaseFixture(authorityRoot, `${kind}-config.json`, configValue);
    const commandValue = CaseLongformCaptionToolCommand.parse({
      schema_version: 'case-longform-caption-tool-command-v1',
      kind: `caption_${kind}_command`,
      executable_sha256: executable.sha256,
      config_sha256: config.sha256,
      argv: [
        `caption-${kind === 'compositor' ? 'composition' : 'verification'}-plan`,
        '--config-sha256',
        config.sha256,
        '--layout-authority-sha256',
        layout.sha256,
        '--caption-track-sha256',
        a.caption_track.sha256,
      ],
    });
    const command = writeCaseFixture(authorityRoot, `${kind}-command.json`, commandValue);
    const schema =
      kind === 'compositor'
        ? CaseLongformCaptionCompositorAuthority
        : CaseLongformCaptionVerifierAuthority;
    const authorityValue = schema.parse({
      schema_version: `case-longform-caption-${kind}-authority-v1`,
      kind: `caption_${kind}_authority`,
      actor_id,
      ...bindings,
      layout_authority_sha256: layout.sha256,
      executable,
      command,
      config,
    });
    return {
      ref: writeCaseFixture(authorityRoot, `${kind}-authority.json`, authorityValue),
      executable,
      commandValue,
      authorityValue,
      root: authorityRoot,
    };
  };
  const compositor = tool('compositor', compositorRoot, 'caption-compositor-authority');
  const verifier = tool('verifier', verifierRoot, 'caption-verifier-authority');
  let placement = writeCaseFixture(root, 'caption-placement-plan.json', {pending: true});
  let contract = CaseLongformCaptionContractAuthoritySchema.parse({
    ...ledger.contract,
    schema_version: 'case-longform-caption-contract-authority-v7a',
    artifacts: {
      ...a,
      caption_layout_authority: layout,
      caption_compositor_authority: compositor.ref,
      caption_verifier_authority: verifier.ref,
      caption_placement_plan: placement,
    },
    caption_actors: {
      layout_authority: layoutValue.actor_id,
      compositor_authority: 'caption-compositor-authority',
      caption_verifier: 'caption-verifier-authority',
    },
    v6_status: ledger.contract.status,
    status: 'PRE_RENDER_BLOCKED',
  });
  placement = writeCaseFixture(
    root,
    placement.ref,
    deriveCaseLongformCaptionPlacements({
      contract,
      graph: CaseLongformOperationGraph.parse(ledger.base.values.graph),
      temporal,
      track,
      layout: layoutValue,
    }),
  );
  contract = CaseLongformCaptionContractAuthoritySchema.parse({
    ...contract,
    artifacts: {...contract.artifacts, caption_placement_plan: placement},
  });
  const options = {
    ...preservationOptions,
    captionTrustPolicy: {
      layoutAuthorityRoot: layoutRoot,
      compositorAuthorityRoot: compositorRoot,
      captionVerifierRoot: verifierRoot,
      trustedLayoutActorIds: [layoutValue.actor_id],
      trustedCompositorActorIds: [contract.caption_actors.compositor_authority],
      trustedCaptionVerifierActorIds: [contract.caption_actors.caption_verifier],
      trustedCompositorExecutableSha256: compositor.executable.sha256,
      trustedCaptionVerifierExecutableSha256: verifier.executable.sha256,
    },
  };
  return {ledger, contract, options, layoutValue, compositor, verifier};
};

afterEach(cleanupCaseFixtures);
describe('case-longform caption contract fixture', () => {
  it('materializes only synthetic caption authorities and remains pre-render blocked', () => {
    expect(materializeCaseLongformCaptionContractFixture().contract.status).toBe(
      'PRE_RENDER_BLOCKED',
    );
  });
});
