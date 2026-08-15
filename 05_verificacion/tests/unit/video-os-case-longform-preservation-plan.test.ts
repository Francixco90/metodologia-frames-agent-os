import {createHash} from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {assertCaseLongformPreservationPlanAuthority} from 'workflows/video-os/index.ts';
import {
  cleanupCaseFixtures,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';
import {materializeCaseLongformPreservationPlanFixture} from './video-os-case-longform-preservation-plan-fixture.test.ts';

type Fixture = ReturnType<typeof materializeCaseLongformPreservationPlanFixture>;
const validate = (fixture: Fixture) =>
  assertCaseLongformPreservationPlanAuthority(
    fixture.preservationContract,
    fixture.preservationOptions,
  );
const rewritePlan = (fixture: Fixture): void => {
  fixture.preservationContract.artifacts.preservation_plan = writeCaseFixture(
    fixture.root,
    fixture.preservationContract.artifacts.preservation_plan.ref,
    fixture.values.preservationPlan,
  );
};
const rewritePolicy = (fixture: Fixture): void => {
  const ref = fixture.preservationContract.artifacts.preservation_policy_receipt;
  const policy = writeCaseFixture(
    fixture.options.trustPolicy.authorityRoot,
    ref.ref,
    fixture.values.preservationPolicy,
  );
  fixture.preservationContract.artifacts.preservation_policy_receipt = policy;
  fixture.values.preservationPlan.policy_sha256 = policy.sha256;
  rewritePlan(fixture);
};
afterEach(cleanupCaseFixtures);

describe('case-longform PR1c1a preservation plan authority', () => {
  it('revalidates V4 and remains blocked before RGB evidence', () => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    expect(validate(fixture).status).toBe('BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS');
    expect(validate(fixture)).not.toHaveProperty('frame_diff_ledger');
    expect(validate(fixture)).not.toHaveProperty('render_authority');
  });
  it('rejects V4 drift, ref aliases and lifecycle claims', () => {
    const v4 = materializeCaseLongformPreservationPlanFixture();
    v4.preservationContract.artifacts.semantic_claim_map.sha256 = '0'.repeat(64);
    expect(() => validate(v4)).toThrow();
    const alias = materializeCaseLongformPreservationPlanFixture();
    alias.preservationContract.artifacts.preservation_plan =
      alias.preservationContract.artifacts.semantic_claim_map;
    expect(() => validate(alias)).toThrow(/REF-ALIAS/u);
    const lifecycle = materializeCaseLongformPreservationPlanFixture();
    expect(() =>
      assertCaseLongformPreservationPlanAuthority(
        {
          ...lifecycle.preservationContract,
          artifacts: {
            ...lifecycle.preservationContract.artifacts,
            frame_diff_ledger: lifecycle.preservationContract.artifacts.preservation_plan,
          },
          frame_diff_ledger: {},
          review: {},
          render: {},
          effects: true,
        },
        lifecycle.preservationOptions,
      ),
    ).toThrow();
  });
  it.each([
    [
      'plan',
      (fixture: Fixture) => {
        fixture.values.preservationPolicy.plan_sha256 = '0'.repeat(64);
      },
    ],
    [
      'source',
      (fixture: Fixture) => {
        fixture.values.preservationPolicy.source_set_sha256 = '0'.repeat(64);
      },
    ],
    [
      'previous policy',
      (fixture: Fixture) => {
        fixture.values.preservationPolicy.previous_policy_sha256 = '0'.repeat(64);
      },
    ],
    [
      'actor',
      (fixture: Fixture) => {
        fixture.values.preservationPolicy.actor_id = 'untrusted';
      },
    ],
    [
      'identity',
      (fixture: Fixture) => {
        fixture.values.preservationPolicy.participants[2]!.public_name = 'Natali';
      },
    ],
  ] as const)('rejects policy %s drift', (_name, mutate) => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    mutate(fixture);
    rewritePolicy(fixture);
    expect(() => validate(fixture)).toThrow(/POLICY/u);
  });
  it.each([
    [
      'region omitted',
      (fixture: Fixture) => {
        fixture.values.preservationPlan.regions.pop();
      },
    ],
    [
      'region id duplicate',
      (fixture: Fixture) => {
        fixture.values.preservationPlan.regions[1]!.region_id =
          fixture.values.preservationPlan.regions[0]!.region_id;
      },
    ],
    [
      'category drift',
      (fixture: Fixture) => {
        fixture.values.preservationPlan.regions[0]!.category = 'interfaces';
      },
    ],
    [
      'source timeline',
      (fixture: Fixture) => {
        fixture.values.preservationPlan.regions[0]!.source_start_frame += 1;
      },
    ],
    [
      'output timeline',
      (fixture: Fixture) => {
        fixture.values.preservationPlan.regions[0]!.output_end_frame += 1;
      },
    ],
    [
      'ROI drift',
      (fixture: Fixture) => {
        fixture.values.preservationPlan.regions[0]!.output_roi.x += 1;
      },
    ],
    [
      'overlay omitted',
      (fixture: Fixture) => {
        fixture.values.preservationPlan.regions[0]!.overlay_ids.pop();
      },
    ],
    [
      'overlay duplicate',
      (fixture: Fixture) => {
        fixture.values.preservationPlan.regions[0]!.overlay_ids.push(
          fixture.values.preservationPlan.regions[0]!.overlay_ids[0]!,
        );
      },
    ],
  ] as const)('rejects plan %s', (_name, mutate) => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    mutate(fixture);
    rewritePlan(fixture);
    expect(() => validate(fixture)).toThrow(/PRESERVATION/u);
  });
  it('allows multiple same-category regions but requires explicit cross-category overlap', () => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    expect(validate(fixture).status).toBe('BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS');
    fixture.values.preservationPolicy.participants[0]!.regions[1]!.category = 'interfaces';
    fixture.values.preservationPolicy.participants[0]!.regions[1]!.source_roi =
      fixture.values.preservationPolicy.participants[0]!.regions[0]!.source_roi;
    fixture.values.preservationPolicy.participants[0]!.regions[1]!.source_start_frame = 5;
    fixture.values.preservationPlan.regions[1]!.category = 'interfaces';
    fixture.values.preservationPlan.regions[1]!.source_roi =
      fixture.values.preservationPlan.regions[0]!.source_roi;
    fixture.values.preservationPlan.regions[1]!.output_roi =
      fixture.values.preservationPlan.regions[0]!.output_roi;
    fixture.values.preservationPlan.regions[1]!.source_start_frame = 5;
    fixture.values.preservationPlan.regions[1]!.output_start_frame = 10;
    fixture.values.preservationPlan.regions[1]!.overlay_ids = [
      ...fixture.values.preservationPlan.regions[0]!.overlay_ids,
    ];
    rewritePolicy(fixture);
    expect(() => validate(fixture)).toThrow(/CROSS-CATEGORY/u);
    fixture.values.preservationPolicy.participants[0]!.allowed_cross_category_overlaps = [
      ['danilo-dashboard-main', 'danilo-dashboard-secondary'],
    ];
    rewritePolicy(fixture);
    expect(validate(fixture).status).toBe('BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS');
  });
  it.each([
    ['danilo', 'interfaces'],
    ['alejandra', 'faces'],
    ['natalia', 'products'],
  ] as const)('rejects canonical %s %s coverage omission', (participantId, category) => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    const participant = fixture.values.preservationPolicy.participants.find(
      ({participant_id}) => participant_id === participantId,
    )!;
    const removed = participant.regions.find((region) => region.category === category)!;
    participant.regions = participant.regions.filter(
      ({region_id}) => region_id !== removed.region_id,
    );
    if (participantId === 'danilo')
      fixture.values.preservationPlan.regions = fixture.values.preservationPlan.regions.filter(
        ({region_id}) => region_id !== removed.region_id,
      );
    rewritePolicy(fixture);
    expect(() => validate(fixture)).toThrow(/CANONICAL-COVERAGE/u);
  });
  it('rejects freeform full-frame caption exclusions and vacuous RGB limits', () => {
    const caption = materializeCaseLongformPreservationPlanFixture();
    Object.assign(
      caption.values.preservationPolicy.participants[0]!
        .authorized_overlays[0]! as unknown as Record<string, unknown>,
      {kind: 'CAPTION', source_id: 'one', roi: {x: 0, y: 0, width: 1920, height: 1080}},
    );
    rewritePolicy(caption);
    expect(() => validate(caption)).toThrow();
    const limits = materializeCaseLongformPreservationPlanFixture();
    limits.values.preservationPolicy.rgb_tolerance_per_channel = 255;
    limits.values.preservationPolicy.minimum_residual_ratio_ppm = 1;
    rewritePolicy(limits);
    expect(() => validate(limits)).toThrow();
  });
  it.each([
    [
      'one-frame mask drift',
      (fixture: Fixture) => {
        fixture.values.preservationPolicy.participants[0]!.authorized_overlays[0]!.start_frame = 10;
      },
    ],
    [
      'overlay alias',
      (fixture: Fixture) => {
        fixture.values.preservationPolicy.participants[0]!.authorized_overlays[1]!.overlay_id =
          fixture.values.preservationPolicy.participants[0]!.authorized_overlays[0]!.overlay_id;
      },
    ],
    [
      'duplicate region geometry',
      (fixture: Fixture) => {
        const regions = fixture.values.preservationPolicy.participants[0]!.regions;
        regions[1] = {
          ...regions[1]!,
          source_start_frame: regions[0]!.source_start_frame,
          source_end_frame: regions[0]!.source_end_frame,
          source_roi: regions[0]!.source_roi,
        };
      },
    ],
  ] as const)('rejects policy geometry %s', (_name, mutate) => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    mutate(fixture);
    rewritePolicy(fixture);
    expect(() => validate(fixture)).toThrow(/PRESERVATION/u);
  });
  it('rejects fake, hash-drifted, symlinked and mutated tools', () => {
    const hashDrift = materializeCaseLongformPreservationPlanFixture();
    hashDrift.preservationOptions.preservationToolAuthority.ffmpeg_sha256 = '0'.repeat(64);
    expect(() => validate(hashDrift)).toThrow(/TOOL/u);
    const fake = materializeCaseLongformPreservationPlanFixture();
    const truePath = realpathSync('/usr/bin/true');
    fake.preservationOptions.preservationToolAuthority.ffmpeg_path = truePath;
    fake.preservationOptions.preservationToolAuthority.ffmpeg_sha256 = createHash('sha256')
      .update(readFileSync(truePath))
      .digest('hex');
    expect(() => validate(fake)).toThrow(/TOOL-KIND/u);
    const linked = materializeCaseLongformPreservationPlanFixture();
    const link = resolve(linked.root, 'ffmpeg-link');
    symlinkSync(linked.preservationOptions.preservationToolAuthority.ffmpeg_path, link);
    linked.preservationOptions.preservationToolAuthority.ffmpeg_path = link;
    expect(() => validate(linked)).toThrow(/TOOL/u);
    const mutated = materializeCaseLongformPreservationPlanFixture();
    const copy = resolve(mutated.root, 'ffmpeg-copy');
    copyFileSync(mutated.preservationOptions.preservationToolAuthority.ffmpeg_path, copy);
    chmodSync(copy, 0o700);
    mutated.preservationOptions.preservationToolAuthority.ffmpeg_path = realpathSync(copy);
    mutated.preservationOptions.preservationToolAuthority.ffmpeg_sha256 = createHash('sha256')
      .update(readFileSync(copy))
      .digest('hex');
    const mutableOptions = mutated.preservationOptions as typeof mutated.preservationOptions & {
      preservationToolHooks?: {
        afterOpen: (kind: 'ffmpeg' | 'ffprobe', path: string) => void;
      };
    };
    mutableOptions.preservationToolHooks = {
      afterOpen: (kind, path) => {
        if (kind === 'ffmpeg') writeFileSync(path, 'mutated');
      },
    };
    expect(() => validate(mutated)).toThrow(/TOOL-IDENTITY/u);
  });
});
