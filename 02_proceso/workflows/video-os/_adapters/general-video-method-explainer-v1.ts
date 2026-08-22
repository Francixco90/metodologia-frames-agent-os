import {z} from 'zod';

import {assertMethodExplainerMaterialBundle, planVideoOs} from '../_runner/video-os.ts';
import {
  canonicalSha256,
  MethodExplainerContractBundleV1Schema,
  Sha256Schema,
  VideoOsRequestSchema,
} from '../_schema/index.ts';

const AdapterModeSchema = z.literal('PLAN_VERIFY_ONLY');
const AdapterOperationSchema = z.enum(['PLAN', 'VERIFY_EXISTING']);
const SelectedVideoOsRequestSchema = VideoOsRequestSchema.extend({
  archetype: z.literal('method-explainer'),
});

export const GeneralVideoMethodExplainerAdapterRequestV1Schema = z.discriminatedUnion('operation', [
  z.strictObject({
    schema_version: z.literal('general-video-method-explainer-adapter-request-v1'),
    archetype: z.literal('method-explainer'),
    mode: AdapterModeSchema,
    operation: z.literal('PLAN'),
    video_os_request: SelectedVideoOsRequestSchema,
  }),
  z.strictObject({
    schema_version: z.literal('general-video-method-explainer-adapter-request-v1'),
    archetype: z.literal('method-explainer'),
    mode: AdapterModeSchema,
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

const PlanEvidenceSchema = z.strictObject({
  kind: z.literal('PLAN'),
  request_sha256: Sha256Schema,
  decision: z.enum(['ROUTED', 'NEEDS_INPUT', 'BLOCKED']),
  primary_format: z.literal('9:16'),
  secondary_exports: z.array(z.enum(['16:9', '9:16', '1:1'])).max(3),
  blocking_questions: z.array(z.string()).max(3),
  standard_artifacts: z.array(z.string()).min(1),
});
const VerificationEvidenceSchema = z.strictObject({
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
  mode: AdapterModeSchema,
  operation: AdapterOperationSchema.nullable(),
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
  evidence: z.union([PlanEvidenceSchema, VerificationEvidenceSchema]).nullable(),
});

export type GeneralVideoMethodExplainerAdapterRequestV1 = z.infer<
  typeof GeneralVideoMethodExplainerAdapterRequestV1Schema
>;
export type GeneralVideoMethodExplainerAdapterResultV1 = z.infer<
  typeof GeneralVideoMethodExplainerAdapterResultV1Schema
>;

const result = (
  value: Pick<
    GeneralVideoMethodExplainerAdapterResultV1,
    'operation' | 'verdict' | 'next_gate' | 'reason_code' | 'evidence'
  >,
): GeneralVideoMethodExplainerAdapterResultV1 =>
  GeneralVideoMethodExplainerAdapterResultV1Schema.parse({
    schema_version: 'general-video-method-explainer-adapter-result-v1',
    archetype: 'method-explainer',
    mode: 'PLAN_VERIFY_ONLY',
    effects: false,
    render_authority: false,
    publication_authority: false,
    maximum_state: 'BLOCKED',
    stop_gate: 'VO_DIRECTION_APPROVED',
    coverage_gap: 'GENERAL_VIDEO_METHOD_EXPLAINER_NOT_PROMOTED',
    ...value,
  });

const operationFrom = (raw: unknown): GeneralVideoMethodExplainerAdapterResultV1['operation'] => {
  if (!raw || typeof raw !== 'object' || !('operation' in raw)) return null;
  const parsed = AdapterOperationSchema.safeParse(raw.operation);
  return parsed.success ? parsed.data : null;
};

const sanitizedReason = (error: unknown): string => {
  if (error instanceof Error && /^METHOD-EXPLAINER-[A-Z0-9-]{2,99}$/u.test(error.message))
    return error.message;
  return 'ADAPTER-VALIDATION-FAILED';
};

const verificationEvidence = (
  bundle: z.infer<typeof MethodExplainerContractBundleV1Schema>,
): z.infer<typeof VerificationEvidenceSchema> => ({
  kind: 'VERIFY_EXISTING',
  bundle_sha256: canonicalSha256(bundle),
  spec_sha256: canonicalSha256(bundle.video_spec),
  contract_set_sha256: bundle.build_manifest.contract_set_sha256,
  build_manifest_sha256: bundle.hashes.build_manifest,
  unattended_run_sha256: bundle.unattended_run_material.sha256,
});

export const planOrVerifyGeneralVideoMethodExplainer = async (
  raw: unknown,
  options: {baseDir?: string} = {},
): Promise<GeneralVideoMethodExplainerAdapterResultV1> => {
  const parsed = GeneralVideoMethodExplainerAdapterRequestV1Schema.safeParse(raw);
  if (!parsed.success)
    return result({
      operation: operationFrom(raw),
      verdict: 'BLOCKED',
      next_gate: 'VO_INTAKE_COMPLETE',
      reason_code: 'ADAPTER-REQUEST-INVALID',
      evidence: null,
    });

  if (parsed.data.operation === 'PLAN') {
    try {
      const plan = planVideoOs(parsed.data.video_os_request);
      const routed = plan.decision === 'ROUTED';
      return result({
        operation: 'PLAN',
        verdict: routed ? 'VALIDATED_CANDIDATE' : 'BLOCKED',
        next_gate:
          plan.next_gate === 'VO_DIRECTION_APPROVED'
            ? 'VO_DIRECTION_APPROVED'
            : 'VO_INTAKE_COMPLETE',
        reason_code: routed
          ? null
          : plan.decision === 'NEEDS_INPUT'
            ? 'ADAPTER-PLAN-NEEDS-INPUT'
            : 'ADAPTER-PLAN-BLOCKED',
        evidence: {
          kind: 'PLAN',
          request_sha256: plan.request_sha256,
          decision: plan.decision,
          primary_format: '9:16',
          secondary_exports: plan.secondary_exports,
          blocking_questions: plan.blocking_questions,
          standard_artifacts: plan.standard_artifacts,
        },
      });
    } catch {
      return result({
        operation: 'PLAN',
        verdict: 'BLOCKED',
        next_gate: 'VO_INTAKE_COMPLETE',
        reason_code: 'ADAPTER-VALIDATION-FAILED',
        evidence: null,
      });
    }
  }

  if (!options.baseDir)
    return result({
      operation: 'VERIFY_EXISTING',
      verdict: 'BLOCKED',
      next_gate: 'VO_DIRECTION_APPROVED',
      reason_code: 'ADAPTER-MATERIAL-ROOT-REQUIRED',
      evidence: null,
    });

  try {
    const bundle = await assertMethodExplainerMaterialBundle(parsed.data.bundle, options.baseDir);
    const evidence = verificationEvidence(bundle);
    const matches = Object.entries(parsed.data.expected).every(
      ([key, expected]) => evidence[key as keyof typeof parsed.data.expected] === expected,
    );
    return result({
      operation: 'VERIFY_EXISTING',
      verdict: matches ? 'VALIDATED_CANDIDATE' : 'BLOCKED',
      next_gate: 'VO_DIRECTION_APPROVED',
      reason_code: matches ? null : 'ADAPTER-EXPECTED-HASH-MISMATCH',
      evidence,
    });
  } catch (error) {
    return result({
      operation: 'VERIFY_EXISTING',
      verdict: 'BLOCKED',
      next_gate: 'VO_DIRECTION_APPROVED',
      reason_code: sanitizedReason(error),
      evidence: null,
    });
  }
};
