import {describe, expect, it} from 'vitest';

import {
  assertMethodExplainerContractBundle,
  canonicalSha256,
  METHOD_EXPLAINER_OUTPUT_REFS,
  MethodExplainerContractBundleV1Schema,
  planVideoOs,
} from 'workflows/video-os/index.ts';

import {
  artifact,
  expectRejected,
  makeBundle,
  sha256,
  type Mutation,
} from './video-os-method-explainer-fixture.ts';

describe('method-explainer routing and deterministic planning', () => {
  it.each([
    ['Explica el método PASA', 'method-explainer'],
    ['Explica PIVOTE en un reel vertical', 'method-explainer'],
    ['Presenta este framework de trabajo', 'method-explainer'],
    ['Crear PASA para explicar el modelo', 'method-explainer'],
    ['PASA', 'case-longform'],
    ['Explica cómo pasa la información', 'case-longform'],
    ['Crear un video corto vertical', 'reel-evidence'],
  ] as const)('classifies %s as %s', (request, expected) => {
    expect(planVideoOs({request}).archetype).toBe(expected);
  });

  it('lets an explicit archetype override the classifier', () => {
    expect(planVideoOs({request: 'Explica PASA', archetype: 'reel-evidence'}).archetype).toBe(
      'reel-evidence',
    );
  });

  it('does not mistake a person named Marco for a framework', () => {
    expect(planVideoOs({request: 'Crear un video de Marco Antonio'}).archetype).toBe(
      'case-longform',
    );
  });

  it('uses the exact governed method-explainer defaults and artifacts', () => {
    const plan = planVideoOs({
      request: 'Explica el método PASA',
      sourceRefs: ['sources/pasa.md'],
      sourceAuthority: 'verified',
      rights: 'cleared',
    });
    expect(plan).toMatchObject({
      decision: 'ROUTED',
      archetype: 'method-explainer',
      primary_format: '9:16',
      defaults: {source_audio: 'none', automatic_terminal_state: 'RENDERED_DRAFT'},
      next_gate: 'VO_DIRECTION_APPROVED',
    });
    expect(plan.standard_artifacts).toEqual([
      'source-pack.yml',
      'intent-envelope.json',
      'assumptions-ledger.json',
      'method-content-model.json',
      'video-spec.json',
      'socratic-debate.md',
      'beat-budget.json',
      'diagram-contract.json',
      'piece-scripts.json',
      'caption-track.json',
      'storyboard.yml',
      'asset-manifest.yml',
      'render-plan.json',
      'unattended-run-state.json',
      'verification.json',
      'receipts/index.json',
      'contact-sheet.png',
      'review-report.md',
      'handoff.md',
      'audio/narration.wav',
      'renders/render-a.mp4',
      'renders/render-b.mp4',
      'renders/metodologia-method-explainer.mp4',
    ]);
  });

  it('blocks an incompatible method-explainer format without changing the primary profile', () => {
    const plan = planVideoOs({
      request: 'Explicar PASA',
      sourceRefs: ['sources/pasa.md'],
      sourceAuthority: 'verified',
      rights: 'cleared',
      primaryFormat: '16:9',
    });
    expect(plan).toMatchObject({
      archetype: 'method-explainer',
      decision: 'BLOCKED',
      primary_format: '9:16',
      next_gate: 'VO_INTAKE_COMPLETE',
    });
  });

  it('normalizes request hashes and produces identical plans', () => {
    const first = planVideoOs({request: '  Explica\tPASA\ncon evidencia  '});
    const second = planVideoOs({request: 'Explica PASA con evidencia'});
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(planVideoOs({request: first.request})));
  });
});

describe('method-explainer valid bundle', () => {
  it('accepts the complete local internal-draft bundle deterministically', () => {
    const bundle = makeBundle();
    expect(MethodExplainerContractBundleV1Schema.parse(bundle)).toEqual(bundle);
    const first = assertMethodExplainerContractBundle(bundle);
    const second = assertMethodExplainerContractBundle(structuredClone(bundle));
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('accepts an edge exactly six frames after every component settles', () => {
    const bundle = makeBundle();
    expect(bundle.diagram.edges[0]?.start_frame).toBe(
      Math.max(...bundle.diagram.nodes.map(({settle_frame}) => settle_frame)) + 6,
    );
    expect(() => assertMethodExplainerContractBundle(bundle)).not.toThrow();
  });

  it('projects build then run without a manifest self-hash cycle', () => {
    const bundle = makeBundle();
    expect(bundle.build_manifest.manifest_representation).toBe('embedded-no-self-hash');
    expect(bundle.run_representation).toBe('embedded-post-build');
    expect(Object.keys(bundle.build_manifest.required_outputs)).toHaveLength(22);
    expect(bundle.build_manifest.required_outputs).not.toHaveProperty('unattended_run_state');
    expect(bundle.hashes.build_manifest).toBe(canonicalSha256(bundle.build_manifest));
    expect(bundle.unattended_run.build_manifest_sha256).toBe(bundle.hashes.build_manifest);
    expect(bundle.unattended_run_material).toEqual(
      artifact(
        METHOD_EXPLAINER_OUTPUT_REFS.unattended_run_state,
        JSON.stringify(bundle.unattended_run),
      ),
    );
  });
});

describe('strict structural loading', () => {
  it.each([
    ['bundle', (bundle) => Object.assign(bundle, {unexpected: true})],
    ['video spec', (bundle) => Object.assign(bundle.video_spec, {unexpected: true})],
    ['intent', (bundle) => Object.assign(bundle.intent, {unexpected: true})],
    [
      'authority',
      (bundle) => Object.assign(bundle.method_content.authority_refs[0]!, {unexpected: true}),
    ],
    ['beat', (bundle) => Object.assign(bundle.beat_budget.beats[0]!, {unexpected: true})],
    ['node', (bundle) => Object.assign(bundle.diagram.nodes[0]!, {unexpected: true})],
    ['run stage', (bundle) => Object.assign(bundle.unattended_run.stages[0]!, {unexpected: true})],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)(
    'rejects an extra field in %s',
    (_, mutate) => {
      expectRejected(mutate);
    },
  );
});

describe('authority, rights and local-reference gates', () => {
  it.each([
    [
      'AUTO_CONTINUE with unknown rights',
      (bundle) => {
        bundle.intent.rights = 'unknown';
        bundle.intent.decision = 'AUTO_CONTINUE';
      },
    ],
    [
      'AUTO_CONTINUE with unresolved inputs',
      (bundle) => {
        bundle.intent.unknown = ['Titularidad del host'];
        bundle.intent.decision = 'AUTO_CONTINUE';
      },
    ],
    [
      'a material claim without authority',
      (bundle) => {
        bundle.method_content.claims[0]!.authority_refs = [];
      },
    ],
    [
      'an unknown authority reference',
      (bundle) => {
        bundle.method_content.concepts[0]!.authority_refs = ['authority/missing.json'];
      },
    ],
    [
      'a blocked intent reaching rendered draft',
      (bundle) => {
        bundle.intent.decision = 'BLOCKED';
      },
    ],
    [
      'blocked assumptions reaching rendered draft',
      (bundle) => {
        bundle.assumptions.decision = 'BLOCKED';
      },
    ],
    [
      'duplicate contradictory authority',
      (bundle) => {
        const original = bundle.method_content.authority_refs[0]!;
        bundle.method_content.authority_refs.push({
          ...original,
          sha256: sha256('contradictory-authority'),
          rights: 'cleared',
        });
      },
    ],
    [
      'an HTTP artifact reference',
      (bundle) => {
        bundle.build_manifest.audio.ref = 'https://example.test/audio.wav';
      },
    ],
    [
      'a UNC artifact reference',
      (bundle) => {
        bundle.build_manifest.audio.ref = '\\\\server\\share\\audio.wav';
      },
    ],
    [
      'an absolute artifact reference',
      (bundle) => {
        bundle.build_manifest.audio.ref = '/private/audio.wav';
      },
    ],
    [
      'a traversal artifact reference',
      (bundle) => {
        bundle.build_manifest.audio.ref = '../audio.wav';
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    expectRejected(mutate);
  });
});

describe('method, timeline, tempo and text-budget gates', () => {
  it.each([
    [
      'a relation to an unknown concept',
      (bundle) => {
        bundle.method_content.relations[0]!.target = 'CONCEPT-MISSING-01';
      },
    ],
    [
      'duplicate concept IDs',
      (bundle) => {
        bundle.method_content.concepts[1]!.id = bundle.method_content.concepts[0]!.id;
      },
    ],
    [
      'duplicate beat IDs',
      (bundle) => {
        bundle.beat_budget.beats[1]!.id = bundle.beat_budget.beats[0]!.id;
      },
    ],
    [
      'a timeline gap',
      (bundle) => {
        bundle.beat_budget.beats[1]!.start_frame += 1;
      },
    ],
    [
      'a timeline overlap',
      (bundle) => {
        bundle.beat_budget.beats[1]!.start_frame -= 1;
      },
    ],
    [
      'a first beat after frame zero',
      (bundle) => {
        bundle.beat_budget.beats[0]!.start_frame = 1;
      },
    ],
    [
      'a total-frame mismatch',
      (bundle) => {
        bundle.beat_budget.total_frames += 1;
      },
    ],
    [
      'intent duration drift',
      (bundle) => {
        bundle.intent.duration_seconds = 16;
      },
    ],
    [
      'voice word-count drift',
      (bundle) => {
        bundle.beat_budget.beats[0]!.voice_words += 1;
      },
    ],
    [
      'voice tempo above the governed maximum',
      (bundle) => {
        bundle.beat_budget.beats[0]!.end_frame = 149;
        bundle.beat_budget.beats[1]!.start_frame = 149;
      },
    ],
    [
      'font below 24 pixels',
      (bundle) => {
        bundle.beat_budget.beats[0]!.screen[0]!.font_px = 23;
      },
    ],
    [
      'more than two text lines',
      (bundle) => {
        bundle.beat_budget.beats[0]!.screen[0]!.max_lines = 3;
      },
    ],
    [
      'screen text beyond its budget',
      (bundle) => {
        bundle.beat_budget.beats[0]!.screen[0]!.text = 'x'.repeat(161);
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    expectRejected(mutate);
  });
});
