import {describe, expect, it} from 'vitest';

import {validateCaseLongformGraphMaterial} from 'workflows/video-os/_runner/case-longform-graph-validation.ts';

type Input = Parameters<typeof validateCaseLongformGraphMaterial>[0];
const H = 'a'.repeat(64);
const ref = {ref: 'material.bin', sha256: H, bytes: 1};
const roles = ['intro', 'host', 'body', 'closure', 'outro'] as const;
const ranges = [
  [0, 2],
  [3, 5],
  [6, 17],
  [18, 20],
  [21, 23],
] as const;
const base = (): Input => ({
  jobId: 'VIDEO-GRAPH-SEMANTICS',
  sourceSetSha: H,
  hashes: {plan: H, runner: H, compiler: H, graph: H, cleanup: H},
  sources: roles.map(() => ({media: {sha256: H}})),
  runner: {
    schema_version: 'case-longform-runner-v1',
    kind: 'runner',
    job_id: 'VIDEO-GRAPH-SEMANTICS',
    source_set_sha256: H,
    plan_sha256: H,
    runner_id: 'runner',
    runner_version: '1',
    command_sha256: H,
    executable: ref,
  },
  compiler: {
    schema_version: 'case-longform-compiler-v1',
    kind: 'compiler',
    job_id: 'VIDEO-GRAPH-SEMANTICS',
    source_set_sha256: H,
    plan_sha256: H,
    runner_sha256: H,
    compiler_id: 'compiler',
    compiler_version: '1',
    command_sha256: H,
    executable: ref,
  },
  graph: {
    schema_version: 'case-longform-operation-graph-v1',
    kind: 'operation_graph',
    job_id: 'VIDEO-GRAPH-SEMANTICS',
    source_set_sha256: H,
    plan_sha256: H,
    runner_sha256: H,
    compiler_sha256: H,
    fps: 24,
    frame_count: 24,
    order: [...roles],
    nodes: roles.map((role, index) => ({
      id: `op:${role}` as const,
      role,
      source_sha256: H,
      inputs: index === 0 ? [] : [`op:${roles[index - 1]}`],
      sink: index === 4,
      start_frame: ranges[index]![0],
      end_frame: ranges[index]![1],
    })) as Input['graph']['nodes'],
    edges: [
      {from: 'intro', to: 'host'},
      {from: 'host', to: 'body'},
      {from: 'body', to: 'closure'},
      {from: 'closure', to: 'outro'},
    ],
  },
  temporal: {
    schema_version: 'case-longform-temporal-map-v1',
    kind: 'temporal_map',
    job_id: 'VIDEO-GRAPH-SEMANTICS',
    graph_sha256: H,
    fps: 24,
    frame_count: 24,
    layouts: roles.map((id, index) => ({
      id,
      start_frame: ranges[index]![0],
      end_frame: ranges[index]![1],
    })),
    scrolls: [{id: 'scroll', start_frame: 8, end_frame: 14}],
    fades: [
      {id: 'in', start_frame: 0, end_frame: 2},
      {id: 'out', start_frame: 21, end_frame: 23},
    ],
    boundaries: [
      {id: 'intro->host', frame: 3},
      {id: 'host->body', frame: 6},
      {id: 'body->closure', frame: 18},
      {id: 'closure->outro', frame: 21},
    ],
  },
  redaction: {
    schema_version: 'case-longform-redaction-map-v1',
    kind: 'redaction_map',
    job_id: 'VIDEO-GRAPH-SEMANTICS',
    graph_sha256: H,
    fps: 24,
    frame_count: 24,
    masks: [
      {
        id: 'mask',
        roi: {x: 10, y: 10, width: 100, height: 40},
        start_frame: 7,
        end_frame: 11,
        reason: 'URL',
      },
    ],
    sensitive_spans: [
      {id: 'sensitive', start_frame: 8, end_frame: 10, dictionary_ids: ['URL'], mask_ids: ['mask']},
    ],
  },
  captions: {
    schema_version: 'case-longform-caption-track-v1',
    kind: 'caption_track',
    job_id: 'VIDEO-GRAPH-SEMANTICS',
    graph_sha256: H,
    track_id: 'canonical',
    layer_count: 1,
    cleanup: ref,
    cues: [{id: 'cue', start_frame: 0, end_frame: 23, text: 'new'}],
  },
  cleanup: {
    schema_version: 'case-longform-caption-cleanup-v1',
    kind: 'caption_cleanup',
    job_id: 'VIDEO-GRAPH-SEMANTICS',
    graph_sha256: H,
    track_id: 'canonical',
    removed_legacy_layers: true,
    replacements: [{from: 'old', to: 'new'}],
  },
});

describe('case-longform graph temporal semantics', () => {
  it('accepts the strict semantic baseline', () =>
    expect(() => validateCaseLongformGraphMaterial(base())).not.toThrow());
  it('rejects every temporal, ROI, mask and cleanup bypass', () => {
    const cases: Array<[RegExp, (input: Input) => void]> = [
      [
        /NODE-RANGE/u,
        (x) => {
          x.graph.nodes[0].start_frame = 3;
        },
      ],
      [
        /SCROLL-RANGE/u,
        (x) => {
          x.temporal.scrolls[0]!.start_frame = 15;
        },
      ],
      [
        /SENSITIVE-MASK/u,
        (x) => {
          x.redaction.masks[0]!.start_frame = 9;
        },
      ],
      [
        /ROI-BOUNDS/u,
        (x) => {
          x.redaction.masks[0]!.roi.x = 1900;
        },
      ],
      [
        /FADE-INTERVAL-DUPLICATE/u,
        (x) => Object.assign(x.temporal.fades[1]!, {start_frame: 0, end_frame: 2}),
      ],
      [
        /CLEANUP-NOT-APPLIED/u,
        (x) => {
          x.captions.cues[0]!.text = 'old new';
        },
      ],
      [
        /CLEANUP-NOT-APPLIED/u,
        (x) => {
          x.captions.cues[0]!.text = 'clean';
        },
      ],
      [
        /CLEANUP-NOT-APPLIED/u,
        (x) => {
          x.cleanup.replacements[0] = {from: 'old', to: 'old'};
        },
      ],
      [
        /CLEANUP-NOT-APPLIED/u,
        (x) => {
          x.cleanup.replacements[0]!.to = ' ';
        },
      ],
      [/CLEANUP-NOT-APPLIED/u, (x) => x.cleanup.replacements.push({from: 'old', to: 'new'})],
    ];
    for (const [error, mutate] of cases) {
      const input = base();
      mutate(input);
      expect(() => validateCaseLongformGraphMaterial(input)).toThrow(error);
    }
  });
});
