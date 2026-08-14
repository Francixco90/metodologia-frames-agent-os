import {describe, expect, it} from 'vitest';

import {
  CareerCvPackageV2Schema,
  CareerCvPackageV3Schema,
  CvSpecV2Schema,
} from 'workflows/career/_schema/index.ts';
import {
  assertCareerCvPackageV3Current,
  calculateCareerCvPackageV3Hash,
  migrateCareerCvPackageV2ToV3,
  parseCareerCvPackageV3,
} from 'workflows/career/_runner/cv-package-v3.ts';
import {
  approveCvSpecV2,
  createCvSpecV2,
  migrateCvSpecV1ToV2,
} from 'workflows/career/_runner/cv-spec-v2.ts';
import {approveCvSpec, createCvSpec} from 'workflows/career/_runner/cv-spec.ts';
import {calculateCareerCvPackageV2Hash} from 'workflows/career/_runner/cv-spec.ts';
import {
  bindEvidence,
  buildApprovedGeneralSpec,
  HASH_A,
  HASH_B,
  HASH_C,
  type makeEvidenceAuthority,
} from './career-cv-spec-fixtures.ts';

const evidenceAuthorities = new Map<string, ReturnType<typeof makeEvidenceAuthority>>();

const NEUTRAL = {
  mode: 'ats-neutral' as const,
  design_system_id: null,
  design_system_ref: null,
  design_system_sha256: null,
  decision_id: null,
  decision_ref: null,
  decision_sha256: null,
  composition_id: null,
  theme_policy: null,
};

const APPROVED_DESIGN = {
  mode: 'approved-system' as const,
  design_system_id: 'CVDS-METODOLOGIA-001',
  design_system_ref: 'brand/career/design-system.json',
  design_system_sha256: HASH_A,
  decision_id: 'CVDESIGN-SYNTHETIC-001',
  decision_ref: 'work/private/design/decision.json',
  decision_sha256: HASH_B,
  composition_id: 'blueprint-executive' as const,
  theme_policy: {
    default_theme: 'navy' as const,
    alternate_theme: 'light' as const,
    print_theme: 'light' as const,
    persistence: 'local-storage-progressive-enhancement' as const,
  },
};

const buildApprovedSpecV2 = (executive: boolean) => {
  const legacy = buildApprovedGeneralSpec();
  if (!executive) {
    const {spec_sha256, approval, ...base} = legacy;
    void spec_sha256;
    void approval;
    const ats = approveCvSpec(
      createCvSpec({...base, variants: [legacy.variants[0]!], state: 'DRAFT', approval: null}),
      {approver_ref: 'H01', approved_at: '2026-08-11T10:00:00-05:00'},
    );
    const bound = bindEvidence(migrateCvSpecV1ToV2(ats));
    const approved = approveCvSpecV2(
      bound.spec,
      {
        approver_ref: 'H01',
        approved_at: '2026-08-11T11:00:00-05:00',
      },
      undefined,
      bound.authority,
    );
    evidenceAuthorities.set(approved.spec_sha256, bound.authority);
    return approved;
  }
  const {schema_version, spec_sha256, state, approval, next_gate, variants, ...base} = legacy;
  void schema_version;
  void spec_sha256;
  void state;
  void approval;
  void next_gate;
  const pending = createCvSpecV2({
    ...base,
    schema_version: 'cv-spec-v2',
    evidence_candidate_packet_ref: null,
    evidence_candidate_packet_sha256: null,
    evidence_readiness_ref: null,
    evidence_readiness_sha256: null,
    variants: variants.map((variant) => ({
      ...variant,
      design: variant.output_kinds.includes('executive-html') ? APPROVED_DESIGN : NEUTRAL,
    })),
    state: 'DRAFT',
    next_gate: 'CR_CV_SPEC_APPROVED',
    approval: null,
  });
  const bound = bindEvidence(pending);
  const approved = CvSpecV2Schema.parse({
    ...bound.spec,
    state: 'HUMAN_APPROVED',
    approval: {
      status: 'HUMAN_APPROVED',
      approved_spec_sha256: bound.spec.spec_sha256,
      approver_ref: 'H01',
      approved_at: '2026-08-11T11:00:00-05:00',
    },
  });
  evidenceAuthorities.set(approved.spec_sha256, bound.authority);
  return approved;
};

const buildPackage = (executive: boolean) => {
  const spec = buildApprovedSpecV2(executive);
  const provisional = CareerCvPackageV3Schema.parse({
    schema_version: 'cv-package-v3',
    package_id: 'CVPKG-DESIGN-001',
    candidate_id: spec.candidate_id,
    application_id: null,
    spec_id: spec.spec_id,
    spec_sha256: spec.spec_sha256,
    evidence_bank_sha256: spec.evidence_bank_sha256,
    application_brief_sha256: null,
    job_snapshot_sha256: null,
    source_document_ref: 'work/private/career/source.json',
    source_document_sha256: HASH_C,
    contact_binding_id: spec.contact_binding.binding_id,
    variants: spec.variants.map((variant) => ({
      ...variant,
      source_document_ref: `work/private/career/${variant.variant_id}.json`,
      source_document_sha256: HASH_A,
    })),
    outputs: spec.variants.flatMap(({variant_id, output_kinds}) =>
      output_kinds.map((kind) => ({
        variant_id,
        kind,
        artifact_ref: `work/private/career/${variant_id}-${kind}`,
        artifact_sha256: HASH_B,
        verification: 'UNKNOWN' as const,
      })),
    ),
    qa: {
      claims: 'UNKNOWN',
      cross_format_parity: 'UNKNOWN',
      bilingual_parity: 'UNKNOWN',
      accessibility: 'UNKNOWN',
      parseability: 'UNKNOWN',
      determinism: 'UNKNOWN',
    },
    parity_status: 'UNKNOWN',
    privacy_status: 'UNKNOWN',
    state: 'RENDERED_DRAFT',
    approved_spec_sha256: null,
    publication_receipt: null,
    package_sha256: HASH_A,
  });
  const pkg = CareerCvPackageV3Schema.parse({
    ...provisional,
    package_sha256: calculateCareerCvPackageV3Hash(provisional),
  });
  return {spec, pkg};
};

describe('CV package v3 design bindings', () => {
  it('accepts ATS-neutral packages and rejects a fake design binding', () => {
    const {pkg} = buildPackage(false);
    expect(parseCareerCvPackageV3(pkg)).toEqual(pkg);
    expect(
      CareerCvPackageV3Schema.safeParse({
        ...pkg,
        variants: [{...pkg.variants[0]!, design: APPROVED_DESIGN}],
      }).success,
    ).toBe(false);
  });

  it('requires observed HUMAN_APPROVED authority for executive packages', () => {
    const {spec, pkg} = buildPackage(true);
    expect(() =>
      assertCareerCvPackageV3Current(
        pkg,
        spec,
        undefined,
        evidenceAuthorities.get(spec.spec_sha256),
      ),
    ).toThrow('CR_CV_DESIGN_APPROVED_REQUIRED');
    expect(
      CareerCvPackageV3Schema.safeParse({
        ...pkg,
        variants: pkg.variants.map((variant) =>
          variant.output_kinds.includes('executive-html') ? {...variant, design: NEUTRAL} : variant,
        ),
      }).success,
    ).toBe(false);
  });

  it('maps each package variant to its own spec design binding', () => {
    const {spec, pkg} = buildPackage(true);
    const legacyDraft = CareerCvPackageV2Schema.parse({
      ...pkg,
      schema_version: 'cv-package-v2',
      variants: [...pkg.variants].reverse().map(({design, ...variant}) => {
        void design;
        return variant;
      }),
      package_sha256: HASH_A,
    });
    const legacy = CareerCvPackageV2Schema.parse({
      ...legacyDraft,
      package_sha256: calculateCareerCvPackageV2Hash(legacyDraft),
    });
    expect(() => migrateCareerCvPackageV2ToV3(legacy, spec)).toThrow(
      'CR_CAREER_EVIDENCE_READY_REQUIRED',
    );
    const migrated = migrateCareerCvPackageV2ToV3(
      legacy,
      spec,
      evidenceAuthorities.get(spec.spec_sha256),
    );
    for (const variant of migrated.variants) {
      expect(variant.design).toEqual(
        spec.variants.find(({variant_id}) => variant_id === variant.variant_id)?.design,
      );
    }
  });

  it('rejects a package variant that mixes ATS and executive outputs', () => {
    const {pkg} = buildPackage(true);
    const index = pkg.variants.findIndex(({output_kinds}) =>
      output_kinds.includes('executive-html'),
    );
    const variant = pkg.variants[index]!;
    const variants = pkg.variants.map((item, itemIndex) =>
      itemIndex === index ? {...item, output_kinds: [...item.output_kinds, 'ats-html']} : item,
    );
    const outputs = [
      ...pkg.outputs,
      {
        variant_id: variant.variant_id,
        kind: 'ats-html' as const,
        artifact_ref: 'work/private/career/mixed.html',
        artifact_sha256: HASH_A,
        verification: 'UNKNOWN' as const,
      },
    ];
    expect(CareerCvPackageV3Schema.safeParse({...pkg, variants, outputs}).success).toBe(false);
  });
});
