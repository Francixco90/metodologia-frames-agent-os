import {afterEach, describe, expect, it} from 'vitest';

import {assertCaseLongformPrerenderGraphAuthority} from 'workflows/video-os/index.ts';
import {
  cleanupCaseFixtures,
  materializeCaseLongformGraphFixture,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';

const BAD = '0'.repeat(64);
type Segment = {
  id: string;
  node_id: string;
  role: 'intro' | 'host' | 'body' | 'closure' | 'outro';
  source_sha256: string;
  source_start_frame: number;
  source_end_frame: number;
  output_start_frame: number;
  output_end_frame: number;
  transform: 'PASSTHROUGH';
};
const materialize = materializeCaseLongformGraphFixture;
type Policy = ReturnType<typeof materialize>['values']['policy'];
const replace = (
  fixture: ReturnType<typeof materialize>,
  key: 'source_segment_map' | 'transform_order' | 'semantic_policy_receipt',
  value: unknown,
): void => {
  const root =
    key === 'semantic_policy_receipt' ? fixture.options.trustPolicy.authorityRoot : fixture.root;
  fixture.contract.artifacts[key] = writeCaseFixture(
    root,
    fixture.contract.artifacts[key].ref,
    value,
  );
};
afterEach(cleanupCaseFixtures);

describe('case-longform PR1c0a pre-render authority freeze', () => {
  it('accepts V2 while remaining blocked before pre-render review contracts', () => {
    const fixture = materialize();
    const result = assertCaseLongformPrerenderGraphAuthority(fixture.contract, fixture.options);
    expect(result.status).toBe('BLOCKED_PENDING_PRERENDER_REVIEW_CONTRACTS');
    expect(result).not.toHaveProperty('render_authority');
  });
  it.each([
    [
      'source SHA drift',
      (segments: ReturnType<typeof materialize>['values']['segments']) => {
        segments.segments[0]!.source_sha256 = BAD;
      },
    ],
    [
      'output gap',
      (segments: ReturnType<typeof materialize>['values']['segments']) => {
        segments.segments[1]!.output_start_frame += 1;
      },
    ],
    [
      'duration drift',
      (segments: ReturnType<typeof materialize>['values']['segments']) => {
        segments.segments[0]!.source_end_frame += 1;
      },
    ],
    [
      'node-boundary escape',
      (segments: ReturnType<typeof materialize>['values']['segments']) => {
        segments.segments[0]!.source_end_frame += 1;
        segments.segments[0]!.output_end_frame += 1;
      },
    ],
  ] as const)('rejects %s in source segments', (_name, mutate) => {
    const fixture = materialize();
    mutate(fixture.values.segments);
    replace(fixture, 'source_segment_map', fixture.values.segments);
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(fixture.contract, fixture.options),
    ).toThrow(/SEGMENT/u);
  });
  it('rejects a missing role and source ranges inverted against output order', () => {
    const missing = materialize();
    missing.values.segments.segments[4] = {
      ...missing.values.segments.segments[0]!,
      id: 'replacement-intro',
    };
    replace(missing, 'source_segment_map', missing.values.segments);
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(missing.contract, missing.options),
    ).toThrow(/SEGMENT/u);
    const inverted = materialize();
    const list = inverted.values.segments.segments as unknown as Segment[];
    const first = list[0]!;
    list.splice(
      0,
      1,
      {
        ...first,
        id: 'intro-a',
        source_start_frame: 2,
        source_end_frame: 2,
        output_start_frame: 0,
        output_end_frame: 0,
      },
      {
        ...first,
        id: 'intro-b',
        source_start_frame: 0,
        source_end_frame: 1,
        output_start_frame: 1,
        output_end_frame: 2,
      },
    );
    replace(inverted, 'source_segment_map', inverted.values.segments);
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(inverted.contract, inverted.options),
    ).toThrow(/SEGMENT/u);
  });
  it('rejects source-set binding drift in the segment map', () => {
    const fixture = materialize();
    fixture.values.segments.source_set_sha256 = BAD;
    replace(fixture, 'source_segment_map', fixture.values.segments);
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(fixture.contract, fixture.options),
    ).toThrow(/AUTHORITY-DRIFT/u);
  });
  it('rejects transform reordering and undeclared operations', () => {
    const order = materialize();
    order.values.order.order.reverse();
    replace(order, 'transform_order', order.values.order);
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(order.contract, order.options),
    ).toThrow();
    const extra = materialize();
    replace(extra, 'transform_order', {...extra.values.order, review_pass: true});
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(extra.contract, extra.options),
    ).toThrow();
  });
  it.each([
    [
      'actor',
      (policy: Policy) => {
        policy.actor_id = 'UNTRUSTED';
      },
    ],
    [
      'plan',
      (policy: Policy) => {
        policy.plan_sha256 = BAD;
      },
    ],
    [
      'public name',
      (policy: Policy) => {
        policy.participants[2]!.public_name = 'Natali';
      },
    ],
    [
      'required status gap',
      (policy: Policy) => {
        policy.required_coverage_gaps = [];
      },
    ],
  ] as const)('rejects policy %s drift', (_name, mutate) => {
    const fixture = materialize();
    mutate(fixture.values.policy);
    replace(fixture, 'semantic_policy_receipt', fixture.values.policy);
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(fixture.contract, fixture.options),
    ).toThrow();
  });
  it('rejects cross-kind ref aliases', () => {
    const fixture = materialize();
    fixture.contract.artifacts.transform_order = fixture.contract.artifacts.source_segment_map;
    expect(() =>
      assertCaseLongformPrerenderGraphAuthority(fixture.contract, fixture.options),
    ).toThrow(/REF-ALIAS/u);
  });
});
