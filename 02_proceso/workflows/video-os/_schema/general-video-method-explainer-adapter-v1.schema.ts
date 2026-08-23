import {z} from 'zod';

import {MethodExplainerContractBundleV1Schema} from './method-explainer-execution-v1.schema.ts';
import {Sha256Schema, VideoOsRequestSchema} from './video-os-v1.schema.ts';

export const GeneralVideoMethodExplainerAdapterModeSchema = z.literal('PLAN_VERIFY_ONLY');
export const GeneralVideoMethodExplainerAdapterOperationSchema = z.enum([
  'PLAN',
  'VERIFY_EXISTING',
]);

const SelectedVideoOsRequestSchema = VideoOsRequestSchema.extend({
  archetype: z.literal('method-explainer'),
});

export const GeneralVideoMethodExplainerAdapterRequestV1Schema = z.discriminatedUnion('operation', [
  z.strictObject({
    schema_version: z.literal('general-video-method-explainer-adapter-request-v1'),
    archetype: z.literal('method-explainer'),
    mode: GeneralVideoMethodExplainerAdapterModeSchema,
    operation: z.literal('PLAN'),
    video_os_request: SelectedVideoOsRequestSchema,
  }),
  z.strictObject({
    schema_version: z.literal('general-video-method-explainer-adapter-request-v1'),
    archetype: z.literal('method-explainer'),
    mode: GeneralVideoMethodExplainerAdapterModeSchema,
    operation: z.literal('VERIFY_EXISTING'),
    bundle: MethodExplainerContractBundleV1Schema,
    expected: z.strictObject({
      bundle_sha256: Sha256Schema,
      spec_sha256: Sha256Schema,
      contract_set_sha256: Sha256Schema,
      build_manifest_sha256: Sha256Schema,
      unattended_run_sha256: Sha256Schema,
    }),
  }),
]);

export const GeneralVideoMethodExplainerPlanEvidenceSchema = z.strictObject({
  kind: z.literal('PLAN'),
  request_sha256: Sha256Schema,
  decision: z.enum(['ROUTED', 'NEEDS_INPUT', 'BLOCKED']),
  primary_format: z.literal('9:16'),
  secondary_exports: z.array(z.enum(['16:9', '9:16', '1:1'])).max(3),
  blocking_questions: z.array(z.string()).max(3),
  standard_artifacts: z.array(z.string()).min(1),
});

export const GeneralVideoMethodExplainerVerificationEvidenceSchema = z.strictObject({
  kind: z.literal('VERIFY_EXISTING'),
  bundle_sha256: Sha256Schema,
  spec_sha256: Sha256Schema,
  contract_set_sha256: Sha256Schema,
  build_manifest_sha256: Sha256Schema,
  unattended_run_sha256: Sha256Schema,
});

export const GeneralVideoMethodExplainerAdapterResultV1Schema = z.strictObject({
  schema_version: z.literal('general-video-method-explainer-adapter-result-v1'),
  archetype: z.literal('method-explainer'),
  mode: GeneralVideoMethodExplainerAdapterModeSchema,
  operation: GeneralVideoMethodExplainerAdapterOperationSchema.nullable(),
  verdict: z.enum(['VALIDATED_CANDIDATE', 'BLOCKED']),
  effects: z.literal(false),
  render_authority: z.literal(false),
  publication_authority: z.literal(false),
  maximum_state: z.literal('BLOCKED'),
  stop_gate: z.literal('VO_DIRECTION_APPROVED'),
  next_gate: z.enum(['VO_INTAKE_COMPLETE', 'VO_DIRECTION_APPROVED']),
  coverage_gap: z.literal('GENERAL_VIDEO_METHOD_EXPLAINER_NOT_PROMOTED'),
  reason_code: z
    .string()
    .regex(/^[A-Z][A-Z0-9-]{2,119}$/u)
    .nullable(),
  evidence: z
    .union([
      GeneralVideoMethodExplainerPlanEvidenceSchema,
      GeneralVideoMethodExplainerVerificationEvidenceSchema,
    ])
    .nullable(),
});

export type GeneralVideoMethodExplainerAdapterRequestV1 = z.infer<
  typeof GeneralVideoMethodExplainerAdapterRequestV1Schema
>;
export type GeneralVideoMethodExplainerAdapterResultV1 = z.infer<
  typeof GeneralVideoMethodExplainerAdapterResultV1Schema
>;
export type GeneralVideoMethodExplainerVerificationEvidence = z.infer<
  typeof GeneralVideoMethodExplainerVerificationEvidenceSchema
>;
export type GeneralVideoMethodExplainerContractBundle = z.infer<
  typeof MethodExplainerContractBundleV1Schema
>;
