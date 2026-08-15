import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  caseLongformSourceSetSha256,
  CaseLongformGraphAuthoritySchema,
} from 'workflows/video-os/index.ts';

export type CaseFixtureRef = {ref: string; sha256: string; bytes: number};
export const caseFixtureRoots: string[] = [];
const roles = ['intro', 'host', 'body', 'closure', 'outro'] as const;
const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
export const caseFixtureRef = (root: string, ref: string): CaseFixtureRef => {
  const bytes = readFileSync(resolve(root, ref));
  return {ref, sha256: sha(bytes), bytes: bytes.byteLength};
};
export const writeCaseFixture = (root: string, ref: string, value: unknown): CaseFixtureRef => {
  writeFileSync(resolve(root, ref), `${JSON.stringify(value)}\n`);
  return caseFixtureRef(root, ref);
};
export const readCaseFixture = <T>(root: string, ref: CaseFixtureRef): T =>
  JSON.parse(readFileSync(resolve(root, ref.ref), 'utf8')) as T;
export const cleanupCaseFixtures = (): void =>
  caseFixtureRoots.splice(0).forEach((path) => rmSync(path, {recursive: true, force: true}));

export const materializeCaseLongformGraphFixture = (staticPreview: boolean | 'outside' = false) => {
  const root = mkdtempSync(resolve(tmpdir(), 'case-coverage-project-'));
  const authorityRoot = mkdtempSync(resolve(tmpdir(), 'case-coverage-authority-'));
  const previewVerifierRoot = mkdtempSync(resolve(tmpdir(), 'case-coverage-verifier-'));
  caseFixtureRoots.push(root, authorityRoot, previewVerifierRoot);
  const job = 'VIDEO-PREVIEW-COVERAGE';
  // prettier-ignore
  const actors = {producer: 'ACTOR-PRODUCER', authority: 'ACTOR-AUTHORITY',
    preview_verifier: 'ACTOR-VERIFIER'};
  const visual =
    staticPreview === true
      ? 'color=c=blue:s=1920x1080:r=24:d=1'
      : staticPreview === 'outside'
        ? "color=c=blue:s=1920x1080:r=24:d=1,drawbox=x='1000+200*t':y=700:w=100:h=100:c=red:t=fill"
        : 'testsrc2=s=1920x1080:r=24:d=1';
  // prettier-ignore
  const result = spawnSync('ffmpeg', [
    '-v', 'error', '-f', 'lavfi', '-i', visual,
    '-f', 'lavfi', '-i', 'sine=frequency=600:sample_rate=48000:duration=1',
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'mpeg4', '-q:v', '5',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', resolve(root, 'preview.mp4'),
  ], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr);
  const preview = caseFixtureRef(root, 'preview.mp4');
  const staged = roles.map((role, index) => {
    copyFileSync(resolve(root, preview.ref), resolve(root, `${role}.mp4`));
    const source_id = `SOURCE-${role.toUpperCase()}`;
    const media = caseFixtureRef(root, `${role}.mp4`);
    // prettier-ignore
    const provenance_receipt = writeCaseFixture(authorityRoot, `${role}-provenance.json`, {
      schema_version: 'source-provenance-v1', kind: 'source_provenance', role, source_id,
      source_sha256: media.sha256, origin: index === 1 ? 'local_recording' : 'verified_derivative',
      statement: `${role} fixture`, actor_id: actors.authority});
    // prettier-ignore
    const authority_receipt = writeCaseFixture(authorityRoot, `${role}-authority.json`, {
      schema_version: 'source-authority-v1', kind: 'source_authority', role, source_id,
      source_sha256: media.sha256, provenance_sha256: provenance_receipt.sha256,
      authority: 'verified', rights: 'cleared', consent: 'confirmed', actor_id: actors.authority});
    return {role, source_id, media, provenance_receipt, authority_receipt};
  });
  const sourceSetSha = caseLongformSourceSetSha256(staged);
  // prettier-ignore
  const plan = writeCaseFixture(root, 'plan.json', {schema_version: 'case-longform-plan-v1',
    kind: 'case_longform_plan', revision: 'V00', job_id: job, source_set_sha256: sourceSetSha,
    primary_format: '16:9', frozen: true, actor_id: actors.producer});
  // prettier-ignore
  const measurements = {width: 1920, height: 1080, fps: 24, frame_count: 24,
    duration_ms: 1000, video_streams: 1, audio_streams: 1};
  const sources = staged.map((item) => ({
    ...item,
    freeze_receipt: writeCaseFixture(root, `${item.role}-freeze.json`, {
      schema_version: 'source-freeze-v1',
      kind: 'source_freeze',
      revision: 'V00',
      job_id: job,
      plan_sha256: plan.sha256,
      source_set_sha256: sourceSetSha,
      role: item.role,
      source_id: item.source_id,
      source_sha256: item.media.sha256,
      provenance_sha256: item.provenance_receipt.sha256,
      authority_sha256: item.authority_receipt.sha256,
      measurements,
      frozen: true,
      actor_id: actors.producer,
    }),
  }));
  // prettier-ignore
  const build = writeCaseFixture(previewVerifierRoot, 'preview-build.json', {
    schema_version: 'preview-build-v1', kind: 'preview_build', revision: 'V01', job_id: job,
    plan_sha256: plan.sha256, source_set_sha256: sourceSetSha, preview_sha256: preview.sha256,
    measurements, verifier_actor_id: actors.preview_verifier, verdict: 'PASS'});
  const preflight = writeCaseFixture(root, 'preflight.json', {
    schema_version: 'case-longform-preflight-v1',
    job_id: job,
    primary_format: '16:9',
    plan,
    sources,
    preview: {media: preview, build_receipt: build},
    actors,
    status: 'BLOCKED_PENDING_EVIDENCE_CONTRACTS',
  });
  const sourceSet = writeCaseFixture(root, 'source-set.json', {
    schema_version: 'case-longform-source-set-v1',
    kind: 'source_set',
    job_id: job,
    sources,
  });
  writeFileSync(resolve(root, 'runner.bin'), 'trusted-runner');
  writeFileSync(resolve(root, 'compiler.bin'), 'trusted-compiler');
  const runnerBin = caseFixtureRef(root, 'runner.bin');
  const compilerBin = caseFixtureRef(root, 'compiler.bin');
  // prettier-ignore
  const runner = writeCaseFixture(root, 'runner.json', {schema_version: 'case-longform-runner-v1',
    kind: 'runner', job_id: job, source_set_sha256: sourceSetSha, plan_sha256: plan.sha256,
    runner_id: 'runner', runner_version: '1', command_sha256: runnerBin.sha256, executable: runnerBin});
  // prettier-ignore
  const compiler = writeCaseFixture(root, 'compiler.json', {schema_version: 'case-longform-compiler-v1',
    kind: 'compiler', job_id: job, source_set_sha256: sourceSetSha, plan_sha256: plan.sha256,
    runner_sha256: runner.sha256, compiler_id: 'compiler', compiler_version: '1',
    command_sha256: compilerBin.sha256, executable: compilerBin});
  const ranges = [
    [0, 2],
    [3, 5],
    [6, 17],
    [18, 20],
    [21, 23],
  ] as const;
  const nodes = roles.map((role, index) => ({
    id: `op:${role}`,
    role,
    source_sha256: sources[index]!.media.sha256,
    inputs: index === 0 ? [] : [`op:${roles[index - 1]}`],
    sink: index === 4,
    start_frame: ranges[index]![0],
    end_frame: ranges[index]![1],
  }));
  const graphValue = {
    schema_version: 'case-longform-operation-graph-v1',
    kind: 'operation_graph',
    job_id: job,
    source_set_sha256: sourceSetSha,
    plan_sha256: plan.sha256,
    runner_sha256: runner.sha256,
    compiler_sha256: compiler.sha256,
    fps: 24,
    frame_count: 24,
    order: roles,
    nodes,
    edges: roles.slice(0, -1).map((from, index) => ({from, to: roles[index + 1]})),
  };
  const graph = writeCaseFixture(root, 'graph.json', graphValue);
  const temporalValue = {
    schema_version: 'case-longform-temporal-map-v1',
    kind: 'temporal_map',
    job_id: job,
    graph_sha256: graph.sha256,
    fps: 24,
    frame_count: 24,
    layouts: nodes.map(({role, start_frame, end_frame}) => ({id: role, start_frame, end_frame})),
    scrolls: [
      {id: 'scroll', start_frame: 8, end_frame: 14, roi: {x: 0, y: 0, width: 320, height: 180}},
    ],
    fades: [
      {id: 'fade-in', start_frame: 0, end_frame: 2, roi: {x: 0, y: 0, width: 320, height: 180}},
      {id: 'fade-out', start_frame: 21, end_frame: 23, roi: {x: 0, y: 0, width: 320, height: 180}},
    ],
    boundaries: nodes
      .slice(1)
      .map((node, index) => ({id: `${nodes[index]!.role}->${node.role}`, frame: node.start_frame})),
  };
  const temporal = writeCaseFixture(root, 'temporal.json', temporalValue);
  const redactionValue = {
    schema_version: 'case-longform-redaction-map-v1',
    kind: 'redaction_map',
    job_id: job,
    graph_sha256: graph.sha256,
    fps: 24,
    frame_count: 24,
    masks: [
      {
        id: 'mask-url',
        roi: {x: 20, y: 20, width: 200, height: 40},
        start_frame: 8,
        end_frame: 10,
        reason: 'URL',
      },
      {
        id: 'mask-domain',
        roi: {x: 240, y: 20, width: 200, height: 40},
        start_frame: 8,
        end_frame: 10,
        reason: 'domain',
      },
    ],
    sensitive_spans: [
      {
        id: 'url-span',
        start_frame: 8,
        end_frame: 10,
        dictionary_ids: ['URL'],
        mask_ids: ['mask-url', 'mask-domain'],
      },
    ],
  };
  const redaction = writeCaseFixture(root, 'redaction.json', redactionValue);
  const cleanup = writeCaseFixture(root, 'cleanup.json', {
    schema_version: 'case-longform-caption-cleanup-v1',
    kind: 'caption_cleanup',
    job_id: job,
    graph_sha256: graph.sha256,
    track_id: 'canonical',
    removed_legacy_layers: true,
    replacements: [{from: '[URL]', to: '[URL oculta]'}],
  });
  const captions = writeCaseFixture(root, 'captions.json', {
    schema_version: 'case-longform-caption-track-v1',
    kind: 'caption_track',
    job_id: job,
    graph_sha256: graph.sha256,
    track_id: 'canonical',
    layer_count: 1,
    cleanup,
    cues: [
      {id: 'one', start_frame: 0, end_frame: 10, text: 'Inicio [URL oculta]'},
      {id: 'two', start_frame: 11, end_frame: 23, text: 'Caso'},
    ],
  });
  const artifacts = {
    preflight,
    source_set: sourceSet,
    plan,
    preview_media: preview,
    runner,
    compiler,
    operation_graph: graph,
    temporal_map: temporal,
    redaction_map: redaction,
    caption_track: captions,
    caption_cleanup: cleanup,
  };
  const contract = CaseLongformGraphAuthoritySchema.parse({
    schema_version: 'case-longform-graph-authority-v1',
    job_id: job,
    source_set_sha256: sourceSetSha,
    artifacts,
    status: 'BLOCKED_PENDING_COVERAGE_CONTRACTS',
  });
  const graphAuthority = writeCaseFixture(root, 'graph-authority.json', contract);
  const options = {
    projectRoot: root,
    trustPolicy: {
      authorityRoot,
      previewVerifierRoot,
      trustedAuthorityActorIds: [actors.authority],
      trustedPreviewVerifierActorIds: [actors.preview_verifier],
      trustedRunnerSha256: runnerBin.sha256,
      trustedCompilerSha256: compilerBin.sha256,
    },
  };
  return {
    root,
    job,
    options,
    contract,
    graphAuthority,
    preview,
    values: {graph: graphValue, temporal: temporalValue, redaction: redactionValue},
  };
};

describe('case-longform coverage fixture authority', () => {
  it('materializes an exact blocked GraphAuthority', () => {
    try {
      expect(materializeCaseLongformGraphFixture().contract.status).toBe(
        'BLOCKED_PENDING_COVERAGE_CONTRACTS',
      );
    } finally {
      cleanupCaseFixtures();
    }
  });
});
