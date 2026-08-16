import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import type {z} from 'zod';

import {
  withCaseLongformMediaSnapshot,
  type CaseLongformMediaSnapshotHooks,
} from './case-longform-media.ts';
import type {CaseLongformSourceSet} from './case-longform-graph-structure.ts';
import {
  CaseLongformFrameDiffLedger,
  type CaseLongformFrameDiffLedgerValue,
} from './case-longform-preservation-ledger-authority.ts';
import type {
  CaseLongformPreservationPlan,
  CaseLongformPreservationPolicyReceipt,
} from './case-longform-preservation-plan-authority.ts';
import {compareCaseLongformRgbRegion} from './case-longform-preservation-rgb-compare.ts';
import {probeCaseLongformRgbMedia} from './case-longform-preservation-rgb.ts';
import {
  withCaseLongformPreservationTools,
  type CaseLongformPreservationToolAuthority,
} from './case-longform-preservation-tool.ts';

type Ref = {ref: string; sha256: string; bytes: number};
type Plan = z.infer<typeof CaseLongformPreservationPlan>;
type Policy = z.infer<typeof CaseLongformPreservationPolicyReceipt>;
type Sources = z.infer<typeof CaseLongformSourceSet>;

export const deriveCaseLongformFrameDiffLedger = (input: {
  projectRoot: string;
  job_id: string;
  plan_ref: Ref;
  policy_ref: Ref;
  source_set_sha256: string;
  preview_ref: Ref;
  redaction_ref: Ref;
  plan: Plan;
  policy: Policy;
  source_set: Sources;
  tool_authority: CaseLongformPreservationToolAuthority;
  tool_hooks?: Parameters<typeof withCaseLongformPreservationTools>[2];
  material_hooks?: CaseLongformMediaSnapshotHooks;
}): CaseLongformFrameDiffLedgerValue => {
  const rawRoot = mkdtempSync(resolve(tmpdir(), 'video-os-case-rgb-ledger-'));
  try {
    return withCaseLongformPreservationTools(
      input.tool_authority,
      (tools) =>
        withCaseLongformMediaSnapshot(
          input.projectRoot,
          input.preview_ref,
          (outputPath) => {
            const outputProbe = probeCaseLongformRgbMedia(tools.ffprobe, outputPath);
            const sourceItems = [
              ...new Map(
                input.plan.regions.map((region) => {
                  const item = input.source_set.sources.find(
                    (value) =>
                      value.role === region.source_role &&
                      value.media.sha256 === region.source_sha256,
                  );
                  if (!item) throw new Error('VIDEO-OS-CASE-RGB-SOURCE-DRIFT');
                  return [region.source_sha256, item] as const;
                }),
              ).values(),
            ];
            const inspect = (
              index: number,
              paths: Map<string, {path: string; frame_count: number}>,
            ): CaseLongformFrameDiffLedgerValue => {
              if (index < sourceItems.length) {
                const item = sourceItems[index]!;
                return withCaseLongformMediaSnapshot(
                  input.projectRoot,
                  item.media,
                  (path) => {
                    paths.set(item.media.sha256, {
                      path,
                      frame_count: probeCaseLongformRgbMedia(tools.ffprobe, path).frame_count,
                    });
                    return inspect(index + 1, paths);
                  },
                  input.material_hooks,
                );
              }
              const selected = input.policy.participants.find(
                ({participant_id}) => participant_id === input.plan.participant_id,
              )!;
              const regions = input.plan.regions.map((region) => {
                const source = paths.get(region.source_sha256)!;
                if (
                  region.source_end_frame >= source.frame_count ||
                  region.output_end_frame >= outputProbe.frame_count
                )
                  throw new Error('VIDEO-OS-CASE-RGB-FRAME-RANGE');
                return CaseLongformFrameDiffLedger.shape.regions.element.strip().parse(
                  compareCaseLongformRgbRegion({
                    ffmpeg: tools.ffmpeg,
                    root: rawRoot,
                    source_path: source.path,
                    output_path: outputPath,
                    output_sha256: input.preview_ref.sha256,
                    region,
                    overlays: selected.authorized_overlays,
                    tolerance: input.policy.rgb_tolerance_per_channel,
                    minimum_residual_ratio_ppm: input.policy.minimum_residual_ratio_ppm,
                  }),
                );
              });
              return CaseLongformFrameDiffLedger.parse({
                schema_version: 'case-longform-frame-diff-ledger-v1',
                kind: 'frame_diff_ledger',
                job_id: input.job_id,
                preservation_plan_sha256: input.plan_ref.sha256,
                preservation_policy_sha256: input.policy_ref.sha256,
                source_set_sha256: input.source_set_sha256,
                preview_media_sha256: input.preview_ref.sha256,
                redaction_map_sha256: input.redaction_ref.sha256,
                ffmpeg_sha256: input.tool_authority.ffmpeg_sha256,
                ffmpeg_bytes: input.tool_authority.ffmpeg_bytes,
                ffprobe_sha256: input.tool_authority.ffprobe_sha256,
                ffprobe_bytes: input.tool_authority.ffprobe_bytes,
                fps: 24,
                rgb_tolerance_per_channel: input.policy.rgb_tolerance_per_channel,
                minimum_residual_ratio_ppm: input.policy.minimum_residual_ratio_ppm,
                regions,
              });
            };
            return inspect(0, new Map());
          },
          input.material_hooks,
        ),
      input.tool_hooks,
    );
  } finally {
    rmSync(rawRoot, {recursive: true, force: true});
  }
};
