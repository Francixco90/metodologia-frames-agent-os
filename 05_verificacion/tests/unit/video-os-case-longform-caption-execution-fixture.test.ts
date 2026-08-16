import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import type {assertCaseLongformCaptionExecutionAuthority} from 'workflows/video-os/index.ts';
import {
  CaseLongformCaptionCompositorAuthority,
  CaseLongformCaptionContractAuthoritySchema,
  CaseLongformCaptionExecutionAuthoritySchema,
  CaseLongformCaptionPlacementPlan,
  deriveCaseLongformCaptionExecutionLedger,
} from 'workflows/video-os/index.ts';
const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
const roots: string[] = [];
const writeMaterial = (root: string, ref: string, value: object | Buffer) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
  const path = resolve(root, ref);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, bytes);
  return {ref, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
};
export const rewriteCaseLongformCaptionExecutionMaterial = (
  root: string,
  ref: string,
  value: object,
) => writeMaterial(root, ref, value);
export const cleanupCaseLongformCaptionExecutionFixtures = (): void => {
  roots.splice(0).forEach((root) => rmSync(root, {recursive: true, force: true}));
};

export const materializeCaseLongformCaptionExecutionFixture = (
  participant: 'danilo' | 'other' = 'danilo',
) => {
  const root = mkdtempSync(resolve(tmpdir(), 'case-caption-execution-'));
  roots.push(root);
  const artifacts = Object.fromEntries(
    Object.keys(CaseLongformCaptionContractAuthoritySchema.shape.artifacts.shape).map((name) => [
      name,
      writeMaterial(root, `${name}.json`, {synthetic: name}),
    ]),
  ) as Record<string, {ref: string; sha256: string; bytes: number}>;
  const job_id = 'synthetic-caption-execution';
  const source_set_sha256 = hash('synthetic-source-set');
  const binding = {
    job_id,
    plan_sha256: artifacts.plan!.sha256,
    source_set_sha256,
    graph_sha256: artifacts.operation_graph!.sha256,
    temporal_map_sha256: artifacts.temporal_map!.sha256,
    caption_track_sha256: artifacts.caption_track!.sha256,
    caption_cleanup_sha256: artifacts.caption_cleanup!.sha256,
  };
  const executable = writeMaterial(
    root,
    'caption-compositor.bin',
    Buffer.from('synthetic compositor executable'),
  );
  const command = writeMaterial(root, 'caption-compositor-command.json', {
    synthetic: 'canonical-command',
  });
  const config = writeMaterial(root, 'caption-compositor-config.json', {
    synthetic: 'canonical-config',
  });
  const compositor = CaseLongformCaptionCompositorAuthority.parse({
    schema_version: 'case-longform-caption-compositor-authority-v1',
    kind: 'caption_compositor_authority',
    actor_id: 'synthetic-compositor',
    ...binding,
    layout_authority_sha256: artifacts.caption_layout_authority!.sha256,
    executable,
    command,
    config,
  });
  artifacts.caption_compositor_authority = writeMaterial(
    root,
    'caption-compositor-authority.json',
    compositor,
  );
  const placement = CaseLongformCaptionPlacementPlan.parse({
    schema_version: 'case-longform-caption-placement-plan-v1',
    kind: 'caption_placement_plan',
    ...binding,
    layout_authority_sha256: artifacts.caption_layout_authority!.sha256,
    font_set_sha256: hash('synthetic-font-set'),
    placements: [
      {
        cue_id: 'cue-one',
        layout_id: 'body',
        start_frame: 4,
        end_frame: 8,
        text_sha256: hash('caption one'),
        font_sha256: hash('font'),
        x: 320,
        y: 900,
        width: 1280,
        height: 48,
      },
      {
        cue_id: 'cue-one',
        layout_id: 'closure',
        start_frame: 9,
        end_frame: 10,
        text_sha256: hash('caption one'),
        font_sha256: hash('font'),
        x: 320,
        y: 852,
        width: 1280,
        height: 96,
      },
    ],
  });
  artifacts.caption_placement_plan = writeMaterial(root, 'caption-placement.json', placement);
  let ledgerRef = writeMaterial(root, 'caption-execution-ledger.json', {pending: true});
  let contract = CaseLongformCaptionExecutionAuthoritySchema.parse({
    schema_version: 'case-longform-caption-execution-authority-v7b',
    job_id,
    source_set_sha256,
    artifacts: {...artifacts, caption_execution_ledger: ledgerRef},
    caption_actors: {
      layout_authority: 'synthetic-layout',
      compositor_authority: compositor.actor_id,
      caption_verifier: 'synthetic-verifier',
    },
    v4_status:
      participant === 'danilo'
        ? 'PRE_RENDER_BLOCKED'
        : 'BLOCKED_PENDING_PRESERVATION_AND_EXTERNAL_REVIEW_CONTRACTS',
    v5a_status: 'BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS',
    v6_status: 'BLOCKED_PENDING_CAPTION_AND_EXTERNAL_REVIEW_CONTRACTS',
    v7a_status:
      participant === 'danilo'
        ? 'PRE_RENDER_BLOCKED'
        : 'BLOCKED_PENDING_CAPTION_MATERIAL_LEDGER_CONTRACTS',
    status:
      participant === 'danilo'
        ? 'PRE_RENDER_BLOCKED'
        : 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS',
  });
  const ledger = deriveCaseLongformCaptionExecutionLedger({contract, placement, compositor});
  ledgerRef = writeMaterial(root, ledgerRef.ref, ledger);
  contract = CaseLongformCaptionExecutionAuthoritySchema.parse({
    ...contract,
    artifacts: {...contract.artifacts, caption_execution_ledger: ledgerRef},
  });
  const options = {
    projectRoot: root,
    captionTrustPolicy: {compositorAuthorityRoot: root},
  } as unknown as Parameters<typeof assertCaseLongformCaptionExecutionAuthority>[1];
  return {root, contract, placement, compositor, ledger, options};
};

afterEach(cleanupCaseLongformCaptionExecutionFixtures);
describe('case-longform caption execution fixture', () => {
  it('uses only synthetic JSON and binary refs and keeps Danilo blocked', () => {
    expect(materializeCaseLongformCaptionExecutionFixture().contract.status).toBe(
      'PRE_RENDER_BLOCKED',
    );
  });
});
