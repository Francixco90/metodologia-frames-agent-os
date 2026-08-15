import type {z} from 'zod';

import {readCaseLongformMaterial, probeCaseLongformMedia} from './case-longform-media.ts';
import {assertCaseLongformPreflight, caseLongformSourceSetSha256} from './case-longform-preview.ts';
import {
  CaseLongformGraphAuthoritySchema,
  type CaseLongformGraphAuthority,
} from './case-longform-graph-evidence.ts';
import {
  CaseLongformCaptionCleanup,
  CaseLongformCaptionTrack,
  CaseLongformCompiler,
  CaseLongformOperationGraph,
  CaseLongformRedactionMap,
  CaseLongformRunner,
  CaseLongformSourceSet,
  CaseLongformTemporalMap,
} from './case-longform-graph-structure.ts';
import {validateCaseLongformGraphMaterial} from './case-longform-graph-validation.ts';

export {CaseLongformGraphAuthoritySchema};
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const material = <T>(
  root: string,
  ref: {ref: string; sha256: string; bytes: number},
  schema: z.ZodType<T>,
): T => schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));

export const assertCaseLongformGraphAuthority = (
  raw: unknown,
  options: {
    projectRoot: string;
    trustPolicy: {
      authorityRoot: string;
      previewVerifierRoot: string;
      trustedAuthorityActorIds: readonly string[];
      trustedPreviewVerifierActorIds: readonly string[];
      trustedRunnerSha256: string;
      trustedCompilerSha256: string;
    };
  },
): CaseLongformGraphAuthority => {
  const contract = CaseLongformGraphAuthoritySchema.parse(raw);
  const a = contract.artifacts;
  const topRefs = Object.values(a);
  if (new Set(topRefs.map(({ref}) => ref)).size !== topRefs.length)
    throw new Error('VIDEO-OS-CASE-GRAPH-REF-ALIAS');
  const preflightRaw = JSON.parse(
    readCaseLongformMaterial(options.projectRoot, a.preflight).bytes.toString('utf8'),
  ) as unknown;
  const preflight = assertCaseLongformPreflight(preflightRaw, options);
  const sourceSet = material(options.projectRoot, a.source_set, CaseLongformSourceSet);
  const runner = material(options.projectRoot, a.runner, CaseLongformRunner);
  const compiler = material(options.projectRoot, a.compiler, CaseLongformCompiler);
  const graph = material(options.projectRoot, a.operation_graph, CaseLongformOperationGraph);
  const temporal = material(options.projectRoot, a.temporal_map, CaseLongformTemporalMap);
  const redaction = material(options.projectRoot, a.redaction_map, CaseLongformRedactionMap);
  const captions = material(options.projectRoot, a.caption_track, CaseLongformCaptionTrack);
  const cleanup = material(options.projectRoot, a.caption_cleanup, CaseLongformCaptionCleanup);
  const nestedRefs = [runner.executable, compiler.executable];
  if (new Set([...topRefs, ...nestedRefs].map(({ref}) => ref)).size !== topRefs.length + 2)
    throw new Error('VIDEO-OS-CASE-GRAPH-REF-ALIAS');
  nestedRefs.forEach((ref) => readCaseLongformMaterial(options.projectRoot, ref));
  const sourceSetSha = caseLongformSourceSetSha256(preflight.sources);
  if (
    contract.job_id !== preflight.job_id ||
    contract.source_set_sha256 !== sourceSetSha ||
    sourceSet.job_id !== preflight.job_id ||
    !same(sourceSet.sources, preflight.sources) ||
    !same(a.plan, preflight.plan) ||
    !same(a.preview_media, preflight.preview.media)
  )
    throw new Error('VIDEO-OS-CASE-GRAPH-PREFLIGHT-DRIFT');
  if (
    runner.executable.sha256 !== options.trustPolicy.trustedRunnerSha256 ||
    compiler.executable.sha256 !== options.trustPolicy.trustedCompilerSha256
  )
    throw new Error('VIDEO-OS-CASE-GRAPH-UNTRUSTED-EXECUTABLE');
  if (
    runner.job_id !== contract.job_id ||
    runner.source_set_sha256 !== sourceSetSha ||
    runner.plan_sha256 !== a.plan.sha256 ||
    compiler.job_id !== contract.job_id ||
    compiler.source_set_sha256 !== sourceSetSha ||
    compiler.plan_sha256 !== a.plan.sha256 ||
    compiler.runner_sha256 !== a.runner.sha256 ||
    !same(captions.cleanup, a.caption_cleanup)
  )
    throw new Error('VIDEO-OS-CASE-GRAPH-AUTHORITY-DRIFT');
  const preview = readCaseLongformMaterial(options.projectRoot, a.preview_media);
  if (probeCaseLongformMedia(preview.bytes).frame_count !== graph.frame_count)
    throw new Error('VIDEO-OS-CASE-PREVIEW-GRAPH-FRAME-DRIFT');
  validateCaseLongformGraphMaterial({
    jobId: contract.job_id,
    sourceSetSha,
    sources: sourceSet.sources,
    runner,
    compiler,
    graph,
    temporal,
    redaction,
    captions,
    cleanup,
    hashes: {
      plan: a.plan.sha256,
      runner: a.runner.sha256,
      compiler: a.compiler.sha256,
      graph: a.operation_graph.sha256,
      cleanup: a.caption_cleanup.sha256,
    },
  });
  return contract;
};
