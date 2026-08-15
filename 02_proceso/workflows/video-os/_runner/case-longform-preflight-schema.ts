import {createHash} from 'node:crypto';

import {z} from 'zod';

import {
  CaseLongformHash as Hash,
  CaseLongformMaterialRef as Ref,
  CaseLongformMediaMeasurements as Measurements,
} from './case-longform-media.ts';

const roles = ['intro', 'host', 'body', 'closure', 'outro'] as const;
const source = (role: (typeof roles)[number]) =>
  z.strictObject({
    role: z.literal(role),
    source_id: z.string().min(1).max(120),
    media: Ref,
    provenance_receipt: Ref,
    authority_receipt: Ref,
    freeze_receipt: Ref,
  });
const Sources = z.tuple([
  source('intro'),
  source('host'),
  source('body'),
  source('closure'),
  source('outro'),
]);

export const CaseLongformPreflightSchema = z.strictObject({
  schema_version: z.literal('case-longform-preflight-v1'),
  job_id: z.string().regex(/^VIDEO-[A-Z0-9-]{3,79}$/u),
  primary_format: z.literal('16:9'),
  plan: Ref,
  sources: Sources,
  preview: z.strictObject({media: Ref, build_receipt: Ref}),
  actors: z.strictObject({
    producer: z.string().min(1),
    authority: z.string().min(1),
    preview_verifier: z.string().min(1),
  }),
  status: z.literal('BLOCKED_PENDING_EVIDENCE_CONTRACTS'),
});
export type CaseLongformPreflight = z.infer<typeof CaseLongformPreflightSchema>;

export const CaseLongformProvenance = z.strictObject({
  schema_version: z.literal('source-provenance-v1'),
  kind: z.literal('source_provenance'),
  role: z.enum(roles),
  source_id: z.string(),
  source_sha256: Hash,
  origin: z.enum(['local_recording', 'verified_derivative', 'metodologia_generated']),
  statement: z.string().min(1),
  actor_id: z.string().min(1),
});
export const CaseLongformAuthority = z.strictObject({
  schema_version: z.literal('source-authority-v1'),
  kind: z.literal('source_authority'),
  role: z.enum(roles),
  source_id: z.string(),
  source_sha256: Hash,
  provenance_sha256: Hash,
  authority: z.literal('verified'),
  rights: z.literal('cleared'),
  consent: z.literal('confirmed'),
  actor_id: z.string().min(1),
});
export const CaseLongformPlan = z.strictObject({
  schema_version: z.literal('case-longform-plan-v1'),
  kind: z.literal('case_longform_plan'),
  revision: z.literal('V00'),
  job_id: z.string(),
  source_set_sha256: Hash,
  primary_format: z.literal('16:9'),
  frozen: z.literal(true),
  actor_id: z.string().min(1),
});
export const CaseLongformFreeze = z.strictObject({
  schema_version: z.literal('source-freeze-v1'),
  kind: z.literal('source_freeze'),
  revision: z.literal('V00'),
  job_id: z.string(),
  plan_sha256: Hash,
  source_set_sha256: Hash,
  role: z.enum(roles),
  source_id: z.string(),
  source_sha256: Hash,
  provenance_sha256: Hash,
  authority_sha256: Hash,
  measurements: Measurements,
  frozen: z.literal(true),
  actor_id: z.string().min(1),
});
export const CaseLongformPreviewBuild = z.strictObject({
  schema_version: z.literal('preview-build-v1'),
  kind: z.literal('preview_build'),
  revision: z.literal('V01'),
  job_id: z.string(),
  plan_sha256: Hash,
  source_set_sha256: Hash,
  preview_sha256: Hash,
  measurements: Measurements,
  verifier_actor_id: z.string().min(1),
  verdict: z.literal('PASS'),
});

type SourceSetInput = ReadonlyArray<{
  role: string;
  source_id: string;
  media: {sha256: string; bytes: number};
}>;
export const caseLongformSourceSetSha256 = (sources: SourceSetInput): string =>
  createHash('sha256')
    .update(
      JSON.stringify(
        sources.map(({role, source_id, media}) => ({
          role,
          source_id,
          sha256: media.sha256,
          bytes: media.bytes,
        })),
      ),
    )
    .digest('hex');
