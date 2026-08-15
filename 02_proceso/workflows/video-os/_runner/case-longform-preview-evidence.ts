import type {z} from 'zod';

import {assertCaseLongformGraphAuthority} from './case-longform-graph.ts';
import {probeCaseLongformMedia, readCaseLongformMaterial} from './case-longform-media.ts';
import {
  CaseLongformCompiler,
  CaseLongformOperationGraph,
  CaseLongformRedactionMap,
  CaseLongformRunner,
  CaseLongformTemporalMap,
} from './case-longform-graph-structure.ts';
import {
  caseLongformPreviewFingerprints,
  caseLongformRoiKey,
  deriveCaseLongformPreviewCoverage,
  extractCaseLongformPreviewEvidenceHashes,
} from './case-longform-preview-frame-evidence.ts';
import {
  CaseLongformObservedCoverage,
  CaseLongformPlannedFullProfile,
  CaseLongformPreviewEvidenceSchema,
  CaseLongformPreviewObservedLineage,
  CaseLongformPreviewProfile,
  CaseLongformSharedPreviewConfig,
  type CaseLongformPreviewEvidence,
} from './case-longform-preview-evidence-schema.ts';

export {CaseLongformPreviewEvidenceSchema, deriveCaseLongformPreviewCoverage};
type Ref = {ref: string; sha256: string; bytes: number};
type Options = Parameters<typeof assertCaseLongformGraphAuthority>[1];
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const material = <T>(root: string, ref: Ref, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));

export const assertCaseLongformPreviewEvidence = (
  raw: unknown,
  options: Options,
): CaseLongformPreviewEvidence => {
  const contract = CaseLongformPreviewEvidenceSchema.parse(raw);
  const a = contract.artifacts;
  const refs = Object.values(a);
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-PREVIEW-EVIDENCE-REF-ALIAS');
  const authorityRaw = JSON.parse(
    readCaseLongformMaterial(options.projectRoot, a.graph_authority).bytes.toString('utf8'),
  ) as unknown;
  const authority = assertCaseLongformGraphAuthority(authorityRaw, options);
  if (contract.job_id !== authority.job_id)
    throw new Error('VIDEO-OS-CASE-PREVIEW-GRAPH-AUTHORITY-DRIFT');
  const ga = authority.artifacts;
  const runner = material(options.projectRoot, ga.runner, CaseLongformRunner);
  const compiler = material(options.projectRoot, ga.compiler, CaseLongformCompiler);
  const graph = material(options.projectRoot, ga.operation_graph, CaseLongformOperationGraph);
  const temporal = material(options.projectRoot, ga.temporal_map, CaseLongformTemporalMap);
  const redaction = material(options.projectRoot, ga.redaction_map, CaseLongformRedactionMap);
  const shared = material(options.projectRoot, a.shared_config, CaseLongformSharedPreviewConfig);
  const previewProfile = material(
    options.projectRoot,
    a.preview_profile,
    CaseLongformPreviewProfile,
  );
  const fullProfile = material(
    options.projectRoot,
    a.planned_full_profile,
    CaseLongformPlannedFullProfile,
  );
  const coverage = material(options.projectRoot, a.observed_coverage, CaseLongformObservedCoverage);
  const lineage = material(
    options.projectRoot,
    a.preview_observed_lineage,
    CaseLongformPreviewObservedLineage,
  );
  const maskIds = redaction.masks.map(({id}) => id).sort();
  if (
    shared.job_id !== contract.job_id ||
    shared.graph_authority_sha256 !== a.graph_authority.sha256 ||
    shared.graph_sha256 !== ga.operation_graph.sha256 ||
    shared.runner_sha256 !== ga.runner.sha256 ||
    shared.compiler_sha256 !== ga.compiler.sha256 ||
    shared.temporal_map_sha256 !== ga.temporal_map.sha256 ||
    shared.redaction_map_sha256 !== ga.redaction_map.sha256 ||
    shared.caption_track_sha256 !== ga.caption_track.sha256 ||
    shared.caption_cleanup_sha256 !== ga.caption_cleanup.sha256 ||
    !same([...shared.mask_ids].sort(), maskIds)
  )
    throw new Error('VIDEO-OS-CASE-PREVIEW-SHARED-CONFIG-DRIFT');
  const preview = readCaseLongformMaterial(options.projectRoot, ga.preview_media);
  const previewMeasurements = probeCaseLongformMedia(preview.bytes);
  for (const profile of [previewProfile, fullProfile])
    if (
      profile.job_id !== contract.job_id ||
      profile.graph_sha256 !== ga.operation_graph.sha256 ||
      profile.shared_config_sha256 !== a.shared_config.sha256 ||
      profile.caption_track_sha256 !== ga.caption_track.sha256 ||
      !same([...profile.mask_ids].sort(), maskIds) ||
      profile.range.start_frame !== 0 ||
      profile.range.end_frame !== graph.frame_count - 1
    )
      throw new Error('VIDEO-OS-CASE-PREVIEW-PROFILE-DRIFT');
  if (
    !same(previewProfile.preview_media, ga.preview_media) ||
    previewProfile.width !== previewMeasurements.width ||
    previewProfile.height !== previewMeasurements.height
  )
    throw new Error('VIDEO-OS-CASE-PREVIEW-PROFILE-MEDIA-DRIFT');
  if (fullProfile.preview_profile_sha256 !== a.preview_profile.sha256)
    throw new Error('VIDEO-OS-CASE-PLANNED-FULL-PREVIEW-BINDING');
  if (fullProfile.width !== 1920 || fullProfile.height !== 1080)
    throw new Error('VIDEO-OS-CASE-PLANNED-FULL-DIMENSIONS');
  const expectedPoints = deriveCaseLongformPreviewCoverage(graph.frame_count, temporal, redaction);
  const shape = (point: {
    id: string;
    kind: string;
    subject_id: string;
    frame: number;
    region_id?: string | undefined;
    mask_id?: string | undefined;
    roi?: {x: number; y: number; width: number; height: number} | undefined;
  }) => ({
    id: point.id,
    kind: point.kind,
    subject_id: point.subject_id,
    frame: point.frame,
    region_id: point.region_id ?? null,
    mask_id: point.mask_id ?? null,
    roi: point.roi ?? null,
  });
  if (
    new Set(coverage.points.map(({id}) => id)).size !== coverage.points.length ||
    !same(coverage.points.map(shape), expectedPoints.map(shape))
  )
    throw new Error('VIDEO-OS-CASE-PREVIEW-COVERAGE-DRIFT');
  const extracted = extractCaseLongformPreviewEvidenceHashes(
    preview.bytes,
    expectedPoints.flatMap(({roi}) => (roi ? [roi] : [])),
  );
  const frameHashes = extracted.full;
  if (frameHashes.size !== graph.frame_count)
    throw new Error('VIDEO-OS-CASE-PREVIEW-FRAMEHASH-COUNT');
  expectedPoints.forEach((point) => {
    const hash = point.roi
      ? extracted.regions.get(caseLongformRoiKey(point.roi))?.get(point.frame)
      : frameHashes.get(point.frame);
    if (!hash) throw new Error('VIDEO-OS-CASE-PREVIEW-COVERAGE-FRAME-MISSING');
    point.frame_sha256 = hash;
  });
  const expectedMaterial = CaseLongformObservedCoverage.shape.points.parse(expectedPoints);
  if (
    coverage.job_id !== contract.job_id ||
    coverage.graph_sha256 !== ga.operation_graph.sha256 ||
    coverage.temporal_map_sha256 !== ga.temporal_map.sha256 ||
    coverage.redaction_map_sha256 !== ga.redaction_map.sha256 ||
    coverage.preview_sha256 !== ga.preview_media.sha256 ||
    coverage.preview_profile_sha256 !== a.preview_profile.sha256 ||
    !same(coverage.points, expectedMaterial)
  )
    throw new Error('VIDEO-OS-CASE-PREVIEW-COVERAGE-DRIFT');
  const points = new Map(coverage.points.map((point) => [point.id, point]));
  for (const [kind, spans] of [
    ['scroll', temporal.scrolls],
    ['fade', temporal.fades],
  ] as const)
    for (const span of spans) {
      const hashes = ['start', 'mid', 'end'].map(
        (position) => points.get(`${kind}:${span.id}:${position}`)?.frame_sha256,
      );
      if (hashes.some((hash) => !hash) || new Set(hashes).size < 2)
        throw new Error(`VIDEO-OS-CASE-PREVIEW-${kind.toUpperCase()}-STATIC`);
    }
  const expectedLineage = graph.nodes.map((node) => ({
    role: node.role,
    start_frame: node.start_frame,
    end_frame: node.end_frame,
    ...caseLongformPreviewFingerprints(
      node.source_sha256,
      frameHashes.get(node.start_frame)!,
      frameHashes.get(node.end_frame)!,
    ),
  }));
  if (
    lineage.job_id !== contract.job_id ||
    lineage.graph_sha256 !== ga.operation_graph.sha256 ||
    lineage.runner_sha256 !== ga.runner.sha256 ||
    lineage.compiler_sha256 !== ga.compiler.sha256 ||
    lineage.preview_sha256 !== ga.preview_media.sha256 ||
    lineage.preview_profile_sha256 !== a.preview_profile.sha256 ||
    !same(lineage.nodes, expectedLineage) ||
    runner.command_sha256 !== runner.executable.sha256 ||
    compiler.command_sha256 !== compiler.executable.sha256
  )
    throw new Error('VIDEO-OS-CASE-PREVIEW-OBSERVED-LINEAGE-DRIFT');
  return contract;
};
