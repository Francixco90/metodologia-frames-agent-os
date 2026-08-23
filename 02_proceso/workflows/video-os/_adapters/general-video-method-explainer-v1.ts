import {assertMethodExplainerMaterialBundle} from '../_runner/method-explainer-material.ts';
import {planVideoOs} from '../_runner/video-os.ts';
import {canonicalSha256} from '../_schema/method-explainer-planning-v1.schema.ts';
import {
  GeneralVideoMethodExplainerAdapterOperationSchema,
  GeneralVideoMethodExplainerAdapterRequestV1Schema,
  GeneralVideoMethodExplainerAdapterResultV1Schema,
  type GeneralVideoMethodExplainerAdapterResultV1,
  type GeneralVideoMethodExplainerContractBundle,
  type GeneralVideoMethodExplainerVerificationEvidence,
} from '../_schema/general-video-method-explainer-adapter-v1.schema.ts';

export {
  GeneralVideoMethodExplainerAdapterRequestV1Schema,
  GeneralVideoMethodExplainerAdapterResultV1Schema,
  type GeneralVideoMethodExplainerAdapterRequestV1,
  type GeneralVideoMethodExplainerAdapterResultV1,
} from '../_schema/general-video-method-explainer-adapter-v1.schema.ts';

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
  const parsed = GeneralVideoMethodExplainerAdapterOperationSchema.safeParse(raw.operation);
  return parsed.success ? parsed.data : null;
};

const sanitizedReason = (error: unknown): string => {
  if (error instanceof Error && /^METHOD-EXPLAINER-[A-Z0-9-]{2,99}$/u.test(error.message))
    return error.message;
  return 'ADAPTER-VALIDATION-FAILED';
};

const verificationEvidence = (
  bundle: GeneralVideoMethodExplainerContractBundle,
): GeneralVideoMethodExplainerVerificationEvidence => ({
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
