import {
  CareerCvPackageV2Schema,
  CareerCvPackageV3Schema,
  type CareerCvPackageV3,
} from '../_schema/index.ts';
import {sha256Text, stableStringify} from './canonical.ts';
import {assertCvSpecV2DesignCurrent, parseCvSpecV2} from './cv-spec-v2.ts';
import {assertCvEvidenceAuthorityCurrent, type CvEvidenceAuthority} from './career-discovery.ts';

const withoutKeys = <T extends Record<string, unknown>>(value: T, keys: readonly string[]) =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

export const calculateCareerCvPackageV3Hash = (pkg: CareerCvPackageV3): string =>
  sha256Text(stableStringify(withoutKeys(pkg, ['package_sha256'])));

export const parseCareerCvPackageV3 = (input: unknown): CareerCvPackageV3 => {
  const pkg = CareerCvPackageV3Schema.parse(input);
  if (calculateCareerCvPackageV3Hash(pkg) !== pkg.package_sha256) {
    throw new Error('CV_PACKAGE_V3_HASH_MISMATCH');
  }
  return pkg;
};

export const migrateCareerCvPackageV2ToV3 = (
  input: unknown,
  specInput: unknown,
  evidenceAuthority?: CvEvidenceAuthority,
): CareerCvPackageV3 => {
  const pkg = CareerCvPackageV2Schema.parse(input);
  const spec = parseCvSpecV2(specInput, {requireApproval: true});
  if (!evidenceAuthority) throw new Error('CR_CAREER_EVIDENCE_READY_REQUIRED');
  assertCvEvidenceAuthorityCurrent(spec, evidenceAuthority);
  if (pkg.spec_id !== spec.spec_id || pkg.spec_sha256 !== spec.spec_sha256) {
    throw new Error('CV_PACKAGE_SPEC_STALE');
  }
  const variants = pkg.variants.map((variant) => {
    const expected = spec.variants.find(({variant_id}) => variant.variant_id === variant_id);
    if (!expected) throw new Error('CV_PACKAGE_VARIANT_MATRIX_STALE');
    return {...variant, design: expected.design};
  });
  const {schema_version, package_sha256, ...base} = pkg;
  void schema_version;
  void package_sha256;
  const draft = {...base, schema_version: 'cv-package-v3' as const, variants};
  return CareerCvPackageV3Schema.parse({
    ...draft,
    package_sha256: calculateCareerCvPackageV3Hash({...draft, package_sha256: '0'.repeat(64)}),
  });
};

export const assertCareerCvPackageV3Current = (
  packageInput: unknown,
  specInput: unknown,
  designAuthority?: {decision: unknown; system: unknown},
  evidenceAuthority?: CvEvidenceAuthority,
): CareerCvPackageV3 => {
  const pkg = parseCareerCvPackageV3(packageInput);
  const spec = parseCvSpecV2(specInput, {requireApproval: true});
  if (!evidenceAuthority) throw new Error('CR_CAREER_EVIDENCE_READY_REQUIRED');
  assertCvEvidenceAuthorityCurrent(spec, evidenceAuthority);
  if (pkg.spec_id !== spec.spec_id || pkg.spec_sha256 !== spec.spec_sha256) {
    throw new Error('CV_PACKAGE_SPEC_STALE');
  }
  const expected = spec.variants.map(
    ({variant_id, language, audience, output_kinds, page_budget, design_profile, design}) => ({
      variant_id,
      language,
      audience,
      output_kinds,
      page_budget,
      design_profile,
      design,
    }),
  );
  const observed = pkg.variants.map(({source_document_ref, source_document_sha256, ...variant}) => {
    void source_document_ref;
    void source_document_sha256;
    return variant;
  });
  if (stableStringify(expected) !== stableStringify(observed)) {
    throw new Error('CV_PACKAGE_VARIANT_MATRIX_STALE');
  }
  const executive = spec.variants.some(({output_kinds}) => output_kinds.includes('executive-html'));
  if (executive && !designAuthority) throw new Error('CR_CV_DESIGN_APPROVED_REQUIRED');
  if (executive)
    assertCvSpecV2DesignCurrent(spec, designAuthority!.decision, designAuthority!.system);
  return pkg;
};
