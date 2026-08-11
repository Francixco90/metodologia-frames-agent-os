import type {z} from 'zod';

import {CvSpecV1Schema, type CvSpecV1} from '../_schema/cv-spec-v1.schema.ts';
import {
  CareerCvPackageV2Schema,
  CareerCvV2Schema,
  type CareerCvPackageV2,
  type CareerCvV2,
} from '../_schema/document-v2.schema.ts';
import {CareerCvV1Schema} from '../_schema/document-v1.schema.ts';
import {sha256Text, stableStringify} from './canonical.ts';

const withoutKeys = <T extends Record<string, unknown>>(
  value: T,
  keys: readonly string[],
): unknown => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

export const calculateCvSpecHash = (spec: CvSpecV1): string =>
  sha256Text(stableStringify(withoutKeys(spec, ['spec_sha256', 'approval', 'state'])));

export const createCvSpec = (draft: Omit<CvSpecV1, 'spec_sha256'>): CvSpecV1 => {
  const provisional = {...draft, spec_sha256: '0'.repeat(64)};
  return CvSpecV1Schema.parse({...draft, spec_sha256: calculateCvSpecHash(provisional)});
};

export const approveCvSpec = (
  input: unknown,
  approval: {approver_ref: string; approved_at: string},
): CvSpecV1 => {
  const spec = parseCvSpec(input);
  return CvSpecV1Schema.parse({
    ...spec,
    state: 'HUMAN_APPROVED',
    approval: {
      status: 'HUMAN_APPROVED',
      approved_spec_sha256: spec.spec_sha256,
      ...approval,
    },
  });
};

export const parseCvSpec = (
  input: unknown,
  options: {requireApproval?: boolean} = {},
): CvSpecV1 => {
  const spec = CvSpecV1Schema.parse(input);
  const calculated = calculateCvSpecHash(spec);
  if (calculated !== spec.spec_sha256) throw new Error('CV_SPEC_HASH_MISMATCH');
  if (spec.approval && spec.approval.approved_spec_sha256 !== calculated) {
    throw new Error('CV_SPEC_APPROVAL_STALE');
  }
  if (options.requireApproval && spec.state !== 'HUMAN_APPROVED') {
    throw new Error('CR_CV_SPEC_APPROVED_REQUIRED');
  }
  return spec;
};

export {assertCvSpecBindings} from './cv-spec-bindings.ts';

export const calculateCareerCvPackageV2Hash = (pkg: CareerCvPackageV2): string =>
  sha256Text(stableStringify(withoutKeys(pkg, ['package_sha256'])));

export const parseCareerCvPackageV2 = (input: unknown): CareerCvPackageV2 => {
  const pkg = CareerCvPackageV2Schema.parse(input);
  if (calculateCareerCvPackageV2Hash(pkg) !== pkg.package_sha256) {
    throw new Error('CV_PACKAGE_HASH_MISMATCH');
  }
  return pkg;
};

export const assertCvPackageCurrent = (
  packageInput: unknown,
  specInput: unknown,
): CareerCvPackageV2 => {
  const pkg = parseCareerCvPackageV2(packageInput);
  const spec = parseCvSpec(specInput, {requireApproval: true});
  if (pkg.spec_id !== spec.spec_id || pkg.spec_sha256 !== spec.spec_sha256) {
    throw new Error('CV_PACKAGE_SPEC_STALE');
  }
  if (pkg.evidence_bank_sha256 !== spec.evidence_bank_sha256) {
    throw new Error('CV_PACKAGE_EVIDENCE_STALE');
  }
  if (pkg.candidate_id !== spec.candidate_id) throw new Error('CV_PACKAGE_CANDIDATE_MISMATCH');
  if (pkg.application_brief_sha256 !== spec.application_brief_sha256) {
    throw new Error('CV_PACKAGE_BRIEF_STALE');
  }
  if (pkg.job_snapshot_sha256 !== spec.job_snapshot_sha256) {
    throw new Error('CV_PACKAGE_JOB_STALE');
  }
  if (pkg.contact_binding_id !== spec.contact_binding.binding_id) {
    throw new Error('CV_PACKAGE_CONTACT_BINDING_STALE');
  }
  const packageVariants = pkg.variants.map(
    ({variant_id, language, audience, output_kinds, page_budget, design_profile}) => ({
      variant_id,
      language,
      audience,
      output_kinds,
      page_budget,
      design_profile,
    }),
  );
  if (stableStringify(packageVariants) !== stableStringify(spec.variants)) {
    throw new Error('CV_PACKAGE_VARIANT_MATRIX_STALE');
  }
  return pkg;
};

type CareerCvV2Draft = Omit<CareerCvV2, 'content_sha256'> & {content_sha256?: string};

/**
 * [CÓDIGO] Compatibilidad deliberada: v1 solo migra con una spec aprobada y una
 * variante declarada. No se infiere posicionamiento, evidencia ni output intent.
 */
export const migrateCareerCvV1ToV2 = (
  cvInput: unknown,
  specInput: unknown,
  variantId: string,
): CareerCvV2 => {
  const cv = CareerCvV1Schema.parse(cvInput);
  const expectedV1Hash = sha256Text(
    stableStringify(withoutKeys(cv as Record<string, unknown>, ['content_sha256'])),
  );
  if (cv.content_sha256 !== expectedV1Hash) throw new Error('CAREER_CV_V1_HASH_MISMATCH');
  const spec = parseCvSpec(specInput, {requireApproval: true});
  const variant = spec.variants.find(({variant_id}) => variant_id === variantId);
  if (!variant) throw new Error('CV_SPEC_VARIANT_MISSING');
  if (cv.candidate_id !== spec.candidate_id) throw new Error('CV_SPEC_CANDIDATE_MISMATCH');
  if (cv.language !== variant.language) throw new Error('CV_SPEC_LANGUAGE_MISMATCH');
  if (cv.design_profile !== variant.design_profile) throw new Error('CV_SPEC_DESIGN_MISMATCH');
  if ((cv.application_id === null) !== (spec.intent === 'general')) {
    throw new Error('CV_SPEC_APPLICATION_MISMATCH');
  }
  const draft: CareerCvV2Draft = {
    ...cv,
    schema_version: 'career-cv-v2',
    spec_id: spec.spec_id,
    spec_sha256: spec.spec_sha256,
    variant_id: variant.variant_id,
    output_intent: spec.intent,
    audience: variant.audience,
    page_budget: variant.page_budget,
    section_order: spec.section_order,
    keyword_policy: spec.keyword_policy,
    deliberate_omissions: spec.deliberate_omissions,
    gaps: spec.gaps,
    attribution_limits: spec.attribution_limits,
  };
  const material = withoutKeys(draft as Record<string, unknown>, ['content_sha256']);
  return CareerCvV2Schema.parse({
    ...draft,
    content_sha256: sha256Text(stableStringify(material)),
  });
};

export type CvSpecInputV1 = z.input<typeof CvSpecV1Schema>;
