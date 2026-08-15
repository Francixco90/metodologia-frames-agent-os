import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {
  assertCaseLongformGraphAuthority,
  caseLongformSourceSetSha256,
  CaseLongformGraphAuthoritySchema,
} from 'workflows/video-os/index.ts';
import {readCaseLongformMaterial} from 'workflows/video-os/_runner/case-longform-media.ts';
type Ref = {ref: string; sha256: string; bytes: number};
const roles = ['intro', 'host', 'body', 'closure', 'outro'] as const;
const temporary: string[] = [];
const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const HASH = (value: number): string => sha(Buffer.from(String(value)));
const ROI = {x: 0, y: 0, width: 320, height: 180};
const refFor = (root: string, ref: string): Ref => {
  const bytes = readFileSync(resolve(root, ref));
  return {ref, sha256: sha(bytes), bytes: bytes.byteLength};
};
const write = (root: string, ref: string, value: unknown): Ref => {
  writeFileSync(resolve(root, ref), `${JSON.stringify(value)}\n`);
  return refFor(root, ref);
};
const media = (root: string): Ref => {
  // prettier-ignore
  const result = spawnSync('ffmpeg', [
    '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=1920x1080:r=24:d=1',
    '-f', 'lavfi', '-i', 'sine=frequency=600:sample_rate=48000:duration=1',
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'mpeg4', '-q:v', '5',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', resolve(root, 'preview.mp4'),
  ], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr);
  return refFor(root, 'preview.mp4');
};

const materialize = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'case-graph-project-'));
  const authorityRoot = mkdtempSync(resolve(tmpdir(), 'case-graph-authority-'));
  const previewVerifierRoot = mkdtempSync(resolve(tmpdir(), 'case-graph-verifier-'));
  temporary.push(root, authorityRoot, previewVerifierRoot);
  const job = 'VIDEO-GRAPH-AUTHORITY';
  // prettier-ignore
  const actors = {producer: 'ACTOR-PRODUCER', authority: 'ACTOR-AUTHORITY',
    preview_verifier: 'ACTOR-VERIFIER'};
  const preview = media(root);
  const staged = roles.map((role, index) => {
    copyFileSync(resolve(root, preview.ref), resolve(root, `${role}.mp4`));
    const source_id = `SOURCE-${role.toUpperCase()}`;
    const sourceMedia = refFor(root, `${role}.mp4`);
    // prettier-ignore
    const provenance_receipt = write(authorityRoot, `${role}-provenance.json`, {
      schema_version: 'source-provenance-v1', kind: 'source_provenance', role, source_id,
      source_sha256: sourceMedia.sha256, origin: index === 1 ? 'local_recording' : 'verified_derivative',
      statement: `${role} fixture`, actor_id: actors.authority});
    // prettier-ignore
    const authority_receipt = write(authorityRoot, `${role}-authority.json`, {
      schema_version: 'source-authority-v1', kind: 'source_authority', role, source_id,
      source_sha256: sourceMedia.sha256, provenance_sha256: provenance_receipt.sha256,
      authority: 'verified', rights: 'cleared', consent: 'confirmed', actor_id: actors.authority});
    return {role, source_id, media: sourceMedia, provenance_receipt, authority_receipt};
  });
  const sourceSetSha = caseLongformSourceSetSha256(staged);
  // prettier-ignore
  const plan = write(root, 'plan.json', {schema_version: 'case-longform-plan-v1',
    kind: 'case_longform_plan', revision: 'V00', job_id: job, source_set_sha256: sourceSetSha,
    primary_format: '16:9', frozen: true, actor_id: actors.producer});
  // prettier-ignore
  const measurements = {width: 1920, height: 1080, fps: 24, frame_count: 24,
    duration_ms: 1000, video_streams: 1, audio_streams: 1};
  const sources = staged.map((item) => ({
    ...item,
    freeze_receipt: write(root, `${item.role}-freeze.json`, {
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
  const build = write(previewVerifierRoot, 'preview-build.json', {
    schema_version: 'preview-build-v1',
    kind: 'preview_build',
    revision: 'V01',
    job_id: job,
    plan_sha256: plan.sha256,
    source_set_sha256: sourceSetSha,
    preview_sha256: preview.sha256,
    measurements,
    verifier_actor_id: actors.preview_verifier,
    verdict: 'PASS',
  });
  const preflight = write(root, 'preflight.json', {
    schema_version: 'case-longform-preflight-v1',
    job_id: job,
    primary_format: '16:9',
    plan,
    sources,
    preview: {media: preview, build_receipt: build},
    actors,
    status: 'BLOCKED_PENDING_EVIDENCE_CONTRACTS',
  });
  const sourceSet = write(root, 'source-set.json', {
    schema_version: 'case-longform-source-set-v1',
    kind: 'source_set',
    job_id: job,
    sources,
  });
  writeFileSync(resolve(root, 'runner.bin'), 'trusted-runner');
  writeFileSync(resolve(root, 'compiler.bin'), 'trusted-compiler');
  const runnerBin = refFor(root, 'runner.bin');
  const compilerBin = refFor(root, 'compiler.bin');
  const runner = write(root, 'runner.json', {
    schema_version: 'case-longform-runner-v1',
    kind: 'runner',
    job_id: job,
    source_set_sha256: sourceSetSha,
    plan_sha256: plan.sha256,
    runner_id: 'runner',
    runner_version: '1',
    command_sha256: runnerBin.sha256,
    executable: runnerBin,
  });
  const compiler = write(root, 'compiler.json', {
    schema_version: 'case-longform-compiler-v1',
    kind: 'compiler',
    job_id: job,
    source_set_sha256: sourceSetSha,
    plan_sha256: plan.sha256,
    runner_sha256: runner.sha256,
    compiler_id: 'compiler',
    compiler_version: '1',
    command_sha256: compilerBin.sha256,
    executable: compilerBin,
  });
  const spans = [
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
    start_frame: spans[index]![0],
    end_frame: spans[index]![1],
  }));
  const graph = write(root, 'graph.json', {
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
  });
  const temporal = write(root, 'temporal.json', {
    schema_version: 'case-longform-temporal-map-v1',
    kind: 'temporal_map',
    job_id: job,
    graph_sha256: graph.sha256,
    fps: 24,
    frame_count: 24,
    layouts: nodes.map(({role, start_frame, end_frame}) => ({id: role, start_frame, end_frame})),
    scrolls: [{id: 'scroll', start_frame: 8, end_frame: 14, roi: ROI}],
    fades: [
      {id: 'fade-in', start_frame: 0, end_frame: 2, roi: ROI},
      {id: 'fade-out', start_frame: 21, end_frame: 23, roi: ROI},
    ],
    boundaries: nodes
      .slice(1)
      .map((node, index) => ({id: `${nodes[index]!.role}->${node.role}`, frame: node.start_frame})),
  });
  const redaction = write(root, 'redaction.json', {
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
    ],
    sensitive_spans: [
      {
        id: 'url-span',
        start_frame: 8,
        end_frame: 10,
        dictionary_ids: ['URL'],
        mask_ids: ['mask-url'],
      },
    ],
  });
  const cleanup = write(root, 'cleanup.json', {
    schema_version: 'case-longform-caption-cleanup-v1',
    kind: 'caption_cleanup',
    job_id: job,
    graph_sha256: graph.sha256,
    track_id: 'canonical',
    removed_legacy_layers: true,
    replacements: [{from: '[URL]', to: '[URL oculta]'}],
  });
  const captions = write(root, 'captions.json', {
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
  return {root, contract, options, values: {sourceSet, cleanup, captions, graph}};
};
const replace = (
  root: string,
  contract: ReturnType<typeof materialize>['contract'],
  key: keyof typeof contract.artifacts,
  value: unknown,
): void => {
  contract.artifacts[key] = write(root, contract.artifacts[key].ref, value);
};
afterEach(() =>
  temporary.splice(0).forEach((path) => rmSync(path, {recursive: true, force: true})),
);

describe('case-longform PR1b preflight-bound graph authority', () => {
  it('accepts exact authority but remains blocked before coverage', () => {
    const {contract, options} = materialize();
    const result = assertCaseLongformGraphAuthority(contract, options);
    expect(result.status).toBe('BLOCKED_PENDING_COVERAGE_CONTRACTS');
    expect(result).not.toHaveProperty('render_authority');
  });
  it('rejects plan, preview and source-set drift from preflight', () => {
    for (const key of ['plan', 'preview_media'] as const) {
      const fixture = materialize();
      const original = fixture.contract.artifacts[key];
      const alias = `copy-${original.ref}`;
      copyFileSync(resolve(fixture.root, original.ref), resolve(fixture.root, alias));
      fixture.contract.artifacts[key] = refFor(fixture.root, alias);
      expect(() => assertCaseLongformGraphAuthority(fixture.contract, fixture.options)).toThrow(
        /PREFLIGHT-DRIFT/u,
      );
    }
    const source = materialize();
    const raw = JSON.parse(
      readFileSync(resolve(source.root, source.values.sourceSet.ref), 'utf8'),
    ) as {sources: Array<{media: Ref}>};
    raw.sources[0]!.media = raw.sources[1]!.media;
    replace(source.root, source.contract, 'source_set', raw);
    expect(() => assertCaseLongformGraphAuthority(source.contract, source.options)).toThrow(
      /PREFLIGHT-DRIFT/u,
    );
  });
  it('rejects untrusted runner or compiler executables', () => {
    const fixture = materialize();
    fixture.options.trustPolicy.trustedRunnerSha256 = HASH(99);
    expect(() => assertCaseLongformGraphAuthority(fixture.contract, fixture.options)).toThrow(
      /UNTRUSTED-EXECUTABLE/u,
    );
  });
  it('rejects cleanup ref drift and graph disconnection', () => {
    const cleanup = materialize();
    const captions = JSON.parse(
      readFileSync(resolve(cleanup.root, cleanup.values.captions.ref), 'utf8'),
    ) as {cleanup: Ref};
    captions.cleanup.sha256 = HASH(7);
    replace(cleanup.root, cleanup.contract, 'caption_track', captions);
    expect(() => assertCaseLongformGraphAuthority(cleanup.contract, cleanup.options)).toThrow(
      /AUTHORITY-DRIFT/u,
    );
    const graph = materialize();
    const value = JSON.parse(readFileSync(resolve(graph.root, graph.values.graph.ref), 'utf8')) as {
      nodes: Array<{inputs: string[]}>;
    };
    value.nodes[2]!.inputs = ['op:intro'];
    replace(graph.root, graph.contract, 'operation_graph', value);
    expect(() => assertCaseLongformGraphAuthority(graph.contract, graph.options)).toThrow(
      /GRAPH-TOPOLOGY/u,
    );
  });
  it('rejects non-canonical portable refs', () => {
    const fixture = materialize();
    const ref = fixture.contract.artifacts.operation_graph;
    for (const unsafe of [`./${ref.ref}`, `folder//${ref.ref}`, `folder\\${ref.ref}`])
      expect(() => readCaseLongformMaterial(fixture.root, {...ref, ref: unsafe})).toThrow(
        /UNSAFE-REF/u,
      );
  });
});
