import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformPreviewEvidence,
  CaseLongformPreviewEvidenceSchema,
  deriveCaseLongformPreviewCoverage,
} from 'workflows/video-os/index.ts';
import {
  CaseLongformObservedCoverage,
  CaseLongformPlannedFullProfile,
  CaseLongformPreviewObservedLineage,
  CaseLongformPreviewProfile,
  CaseLongformSharedPreviewConfig,
} from 'workflows/video-os/_runner/case-longform-preview-evidence-schema.ts';
import {
  caseLongformPreviewFingerprints,
  caseLongformRoiKey,
  extractCaseLongformPreviewEvidenceHashes,
} from 'workflows/video-os/_runner/case-longform-preview-frame-evidence.ts';
import {
  cleanupCaseFixtures,
  materializeCaseLongformGraphFixture,
  readCaseFixture,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';

const BAD = '0'.repeat(64);
const MASKS = ['mask-domain', 'mask-url'];
const materialize = (staticPreview: boolean | 'outside' = false) => {
  const fixture = materializeCaseLongformGraphFixture(staticPreview);
  const ga = fixture.contract.artifacts;
  const shared = writeCaseFixture(fixture.root, 'shared-preview.json', {
    schema_version: 'case-longform-shared-preview-config-v1',
    kind: 'shared_preview_config',
    job_id: fixture.job,
    graph_authority_sha256: fixture.graphAuthority.sha256,
    graph_sha256: ga.operation_graph.sha256,
    runner_sha256: ga.runner.sha256,
    compiler_sha256: ga.compiler.sha256,
    temporal_map_sha256: ga.temporal_map.sha256,
    redaction_map_sha256: ga.redaction_map.sha256,
    caption_track_sha256: ga.caption_track.sha256,
    caption_cleanup_sha256: ga.caption_cleanup.sha256,
    mask_ids: MASKS,
  });
  const profile = writeCaseFixture(fixture.root, 'preview-profile.json', {
    schema_version: 'case-longform-preview-profile-v1',
    kind: 'preview_observed_profile',
    job_id: fixture.job,
    graph_sha256: ga.operation_graph.sha256,
    shared_config_sha256: shared.sha256,
    caption_track_sha256: ga.caption_track.sha256,
    mask_ids: MASKS,
    width: 1920,
    height: 1080,
    target_bitrate_kbps: 1200,
    range: {start_frame: 0, end_frame: 23},
    allowed_deltas: ['bitrate'],
    preview_media: fixture.preview,
  });
  const fullProfile = writeCaseFixture(fixture.root, 'planned-full-profile.json', {
    schema_version: 'case-longform-planned-full-profile-v1',
    kind: 'planned_full_profile',
    job_id: fixture.job,
    graph_sha256: ga.operation_graph.sha256,
    shared_config_sha256: shared.sha256,
    caption_track_sha256: ga.caption_track.sha256,
    mask_ids: MASKS,
    width: 1920,
    height: 1080,
    target_bitrate_kbps: 8000,
    range: {start_frame: 0, end_frame: 23},
    allowed_deltas: ['bitrate'],
    preview_profile_sha256: profile.sha256,
  });
  const expected = deriveCaseLongformPreviewCoverage(
    24,
    fixture.values.temporal,
    fixture.values.redaction,
  );
  const extracted = extractCaseLongformPreviewEvidenceHashes(
    readFileSync(resolve(fixture.root, fixture.preview.ref)),
    expected.flatMap(({roi}) => (roi ? [roi] : [])),
  );
  const frameHashes = extracted.full;
  const points = expected.map((point) => ({
    ...point,
    frame_sha256: point.roi
      ? extracted.regions.get(caseLongformRoiKey(point.roi))?.get(point.frame)
      : frameHashes.get(point.frame),
  }));
  const coverage = writeCaseFixture(fixture.root, 'observed-coverage.json', {
    schema_version: 'case-longform-observed-coverage-v1',
    kind: 'preview_observed_coverage',
    job_id: fixture.job,
    graph_sha256: ga.operation_graph.sha256,
    temporal_map_sha256: ga.temporal_map.sha256,
    redaction_map_sha256: ga.redaction_map.sha256,
    preview_sha256: fixture.preview.sha256,
    preview_profile_sha256: profile.sha256,
    points,
  });
  const lineageNodes = fixture.values.graph.nodes.map((node) => ({
    role: node.role,
    start_frame: node.start_frame,
    end_frame: node.end_frame,
    ...caseLongformPreviewFingerprints(
      node.source_sha256,
      frameHashes.get(node.start_frame)!,
      frameHashes.get(node.end_frame)!,
    ),
  }));
  const lineage = writeCaseFixture(fixture.root, 'preview-lineage.json', {
    schema_version: 'case-longform-preview-observed-lineage-v1',
    kind: 'preview_observed_lineage',
    job_id: fixture.job,
    graph_sha256: ga.operation_graph.sha256,
    runner_sha256: ga.runner.sha256,
    compiler_sha256: ga.compiler.sha256,
    preview_sha256: fixture.preview.sha256,
    preview_profile_sha256: profile.sha256,
    nodes: lineageNodes,
  });
  const contract = CaseLongformPreviewEvidenceSchema.parse({
    schema_version: 'case-longform-preview-evidence-v1',
    job_id: fixture.job,
    artifacts: {
      graph_authority: fixture.graphAuthority,
      shared_config: shared,
      preview_profile: profile,
      planned_full_profile: fullProfile,
      observed_coverage: coverage,
      preview_observed_lineage: lineage,
    },
    status: 'BLOCKED_PENDING_POSTRENDER_CONTRACTS',
  });
  return {
    fixture,
    contract,
    values: {
      shared: CaseLongformSharedPreviewConfig.parse(readCaseFixture(fixture.root, shared)),
      profile: CaseLongformPreviewProfile.parse(readCaseFixture(fixture.root, profile)),
      fullProfile: CaseLongformPlannedFullProfile.parse(readCaseFixture(fixture.root, fullProfile)),
      coverage: CaseLongformObservedCoverage.parse(readCaseFixture(fixture.root, coverage)),
      lineage: CaseLongformPreviewObservedLineage.parse(readCaseFixture(fixture.root, lineage)),
    },
  };
};
const replace = (
  root: string,
  contract: ReturnType<typeof materialize>['contract'],
  key: keyof typeof contract.artifacts,
  value: unknown,
): void => {
  contract.artifacts[key] = writeCaseFixture(root, contract.artifacts[key].ref, value);
};
afterEach(cleanupCaseFixtures);
type Points = ReturnType<typeof materialize>['values']['coverage']['points'];
const coverageMutations: Array<[string, (points: Points) => void]> = [
  ['an omission', (points) => void points.pop()],
  ['an extra point', (points) => points.push({...points[0]!, id: 'extra'})],
  ['a duplicate', (points) => points.push({...points[0]!})],
  [
    'a missing boundary',
    (points) =>
      void points.splice(
        points.findIndex(({kind}) => kind === 'boundary'),
        1,
      ),
  ],
  [
    'a missing mask-frame',
    (points) =>
      void points.splice(
        points.findIndex(
          ({kind, mask_id, frame}) =>
            kind === 'sensitive' && mask_id === 'mask-domain' && frame === 9,
        ),
        1,
      ),
  ],
];

describe('case-longform PR1b2 observed preview evidence', () => {
  it('accepts exact observed preview evidence but remains blocked', () => {
    const {fixture, contract} = materialize();
    const result = assertCaseLongformPreviewEvidence(contract, fixture.options);
    expect(result.status).toBe('BLOCKED_PENDING_POSTRENDER_CONTRACTS');
    expect(result).not.toHaveProperty('render_authority');
  });
  it('rejects GraphAuthority, shared config and profile drift', () => {
    const item = materialize();
    const raw = readCaseFixture<Record<string, unknown>>(
      item.fixture.root,
      item.contract.artifacts.graph_authority,
    );
    const originalAuthority = structuredClone(raw);
    raw.status = 'READY';
    replace(item.fixture.root, item.contract, 'graph_authority', raw);
    expect(() => assertCaseLongformPreviewEvidence(item.contract, item.fixture.options)).toThrow();
    replace(item.fixture.root, item.contract, 'graph_authority', originalAuthority);
    const originalShared = structuredClone(item.values.shared);
    item.values.shared.graph_sha256 = BAD;
    replace(item.fixture.root, item.contract, 'shared_config', item.values.shared);
    expect(() => assertCaseLongformPreviewEvidence(item.contract, item.fixture.options)).toThrow(
      /SHARED/u,
    );
    replace(item.fixture.root, item.contract, 'shared_config', originalShared);
    const originalProfile = structuredClone(item.values.profile);
    item.values.profile.shared_config_sha256 = BAD;
    replace(item.fixture.root, item.contract, 'preview_profile', item.values.profile);
    expect(() => assertCaseLongformPreviewEvidence(item.contract, item.fixture.options)).toThrow(
      /PROFILE/u,
    );
    const dimensionProfile = structuredClone(originalProfile);
    dimensionProfile.width = 1280;
    replace(item.fixture.root, item.contract, 'preview_profile', dimensionProfile);
    expect(() => assertCaseLongformPreviewEvidence(item.contract, item.fixture.options)).toThrow(
      /PROFILE-MEDIA/u,
    );
  });
  it.each(coverageMutations)('rejects coverage drift from %s', (_name, mutate) => {
    const item = materialize();
    mutate(item.values.coverage.points);
    replace(item.fixture.root, item.contract, 'observed_coverage', item.values.coverage);
    expect(() => assertCaseLongformPreviewEvidence(item.contract, item.fixture.options)).toThrow(
      /COVERAGE/u,
    );
  });
  it('rejects a forged observed frame hash', () => {
    const item = materialize();
    item.values.coverage.points[0]!.frame_sha256 = BAD;
    replace(item.fixture.root, item.contract, 'observed_coverage', item.values.coverage);
    expect(() => assertCaseLongformPreviewEvidence(item.contract, item.fixture.options)).toThrow(
      /COVERAGE/u,
    );
  });
  it('rejects a wholly static preview', () => {
    const staticFixture = materialize(true);
    expect(() =>
      assertCaseLongformPreviewEvidence(staticFixture.contract, staticFixture.fixture.options),
    ).toThrow(/STATIC/u);
  });
  it('rejects motion outside a static declared ROI', () => {
    const outsideOnly = materialize('outside');
    expect(() =>
      assertCaseLongformPreviewEvidence(outsideOnly.contract, outsideOnly.fixture.options),
    ).toThrow(/STATIC/u);
  });
  it('rejects a self-declared lineage fingerprint', () => {
    const lineage = materialize();
    lineage.values.lineage.nodes[0].input_fingerprint = BAD;
    replace(
      lineage.fixture.root,
      lineage.contract,
      'preview_observed_lineage',
      lineage.values.lineage,
    );
    expect(() =>
      assertCaseLongformPreviewEvidence(lineage.contract, lineage.fixture.options),
    ).toThrow(/LINEAGE/u);
  });
  it('rejects a lineage artifact alias', () => {
    const alias = materialize();
    alias.contract.artifacts.preview_observed_lineage = alias.contract.artifacts.observed_coverage;
    expect(() => assertCaseLongformPreviewEvidence(alias.contract, alias.fixture.options)).toThrow(
      /REF-ALIAS/u,
    );
  });
  it('rejects any observed-full claim or full media injection', () => {
    const partial = materialize();
    partial.values.fullProfile.range.end_frame = 22;
    replace(
      partial.fixture.root,
      partial.contract,
      'planned_full_profile',
      partial.values.fullProfile,
    );
    expect(() =>
      assertCaseLongformPreviewEvidence(partial.contract, partial.fixture.options),
    ).toThrow(/PROFILE/u);
    const item = materialize();
    replace(item.fixture.root, item.contract, 'planned_full_profile', {
      ...item.values.fullProfile,
      full_media: item.fixture.preview,
      observed: true,
    });
    expect(() => assertCaseLongformPreviewEvidence(item.contract, item.fixture.options)).toThrow();
    expect(() =>
      CaseLongformPreviewEvidenceSchema.parse({...item.contract, full_observed: {}}),
    ).toThrow();
  });
});
