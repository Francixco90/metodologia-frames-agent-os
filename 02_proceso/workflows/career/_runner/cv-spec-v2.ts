import {CvSpecV2Schema, type CvSpecV2} from '../_schema/index.ts';
import {sha256Text, stableStringify} from './canonical.ts';
import {parseCareerDesignSystem, parseCvDesignDecision} from './cv-design.ts';
import {parseCvSpec} from './cv-spec.ts';
import {assertCvEvidenceAuthorityCurrent, type CvEvidenceAuthority} from './career-discovery.ts';

const withoutKeys = <T extends Record<string, unknown>>(value: T, keys: readonly string[]) =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

const NEUTRAL_DESIGN = {
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

const PENDING_DESIGN = {...NEUTRAL_DESIGN, mode: 'pending-design' as const};

export const calculateCvSpecV2Hash = (spec: CvSpecV2): string =>
  sha256Text(stableStringify(withoutKeys(spec, ['spec_sha256', 'approval', 'state'])));

export const createCvSpecV2 = (draft: Omit<CvSpecV2, 'spec_sha256'>): CvSpecV2 => {
  const provisional = {...draft, spec_sha256: '0'.repeat(64)};
  return CvSpecV2Schema.parse({...draft, spec_sha256: calculateCvSpecV2Hash(provisional)});
};

export const parseCvSpecV2 = (
  input: unknown,
  options: {requireApproval?: boolean} = {},
): CvSpecV2 => {
  const spec = CvSpecV2Schema.parse(input);
  const calculated = calculateCvSpecV2Hash(spec);
  if (calculated !== spec.spec_sha256) throw new Error('CV_SPEC_V2_HASH_MISMATCH');
  if (spec.approval && spec.approval.approved_spec_sha256 !== calculated) {
    throw new Error('CV_SPEC_V2_APPROVAL_STALE');
  }
  if (options.requireApproval && spec.state !== 'HUMAN_APPROVED') {
    throw new Error('CR_CV_SPEC_APPROVED_REQUIRED');
  }
  return spec;
};

export const approveCvSpecV2 = (
  input: unknown,
  approval: {approver_ref: string; approved_at: string},
  designAuthority?: {decision: unknown; system: unknown},
  evidenceAuthority?: CvEvidenceAuthority,
): CvSpecV2 => {
  const spec = parseCvSpecV2(input);
  if (!evidenceAuthority) throw new Error('CR_CAREER_EVIDENCE_READY_REQUIRED');
  assertCvEvidenceAuthorityCurrent(spec, evidenceAuthority);
  const executive = spec.variants.some(({output_kinds}) => output_kinds.includes('executive-html'));
  if (spec.variants.some(({design}) => design.mode === 'pending-design')) {
    throw new Error('CR_CV_DESIGN_APPROVED_REQUIRED');
  }
  if (executive && !designAuthority) throw new Error('CR_CV_DESIGN_APPROVED_REQUIRED');
  if (executive) {
    const decision = parseCvDesignDecision(designAuthority!.decision, {requireApproval: true});
    const system = parseCareerDesignSystem(designAuthority!.system);
    for (const variant of spec.variants.filter(({output_kinds}) =>
      output_kinds.includes('executive-html'),
    )) {
      if (
        variant.design.decision_sha256 !== decision.decision_sha256 ||
        variant.design.design_system_sha256 !== system.design_system_sha256 ||
        variant.design.composition_id !== decision.selected_composition
      ) {
        throw new Error('CV_SPEC_V2_DESIGN_STALE');
      }
    }
  }
  return CvSpecV2Schema.parse({
    ...spec,
    state: 'HUMAN_APPROVED',
    approval: {
      status: 'HUMAN_APPROVED',
      approved_spec_sha256: spec.spec_sha256,
      ...approval,
    },
  });
};

type DesignMigrationInput = {
  decision: unknown;
  decision_ref: string;
  design_system_ref: string;
};

/** Liga una decisión explícita a la spec pre-diseño y genera un nuevo hash DRAFT. */
export const bindCvSpecV2DesignDecision = (
  input: unknown,
  design: DesignMigrationInput,
): CvSpecV2 => {
  const spec = parseCvSpecV2(input);
  if (spec.state === 'HUMAN_APPROVED') throw new Error('CV_SPEC_V2_ALREADY_APPROVED');
  const executive = spec.variants.filter(({output_kinds}) =>
    output_kinds.includes('executive-html'),
  );
  if (executive.length === 0) throw new Error('CV_DESIGN_NOT_APPLICABLE_TO_ATS_ONLY');
  if (executive.some(({design: binding}) => binding.mode !== 'pending-design')) {
    throw new Error('CV_SPEC_V2_DESIGN_ALREADY_BOUND');
  }
  const decision = parseCvDesignDecision(design.decision, {requireApproval: true});
  if (decision.selected_composition === null) throw new Error('CV_DESIGN_SELECTION_REQUIRED');
  const {spec_sha256, ...draft} = spec;
  void spec_sha256;
  return createCvSpecV2({
    ...draft,
    variants: spec.variants.map((variant) => ({
      ...variant,
      design: variant.output_kinds.includes('executive-html')
        ? {
            mode: 'approved-system',
            design_system_id: decision.design_system_id,
            design_system_ref: design.design_system_ref,
            design_system_sha256: decision.design_system_sha256,
            decision_id: decision.decision_id,
            decision_ref: design.decision_ref,
            decision_sha256: decision.decision_sha256,
            composition_id: decision.selected_composition,
            theme_policy: {
              default_theme: 'navy',
              alternate_theme: 'light',
              print_theme: 'light',
              persistence: 'local-storage-progressive-enhancement',
            },
          }
        : variant.design,
    })),
    state: 'DRAFT',
    approval: null,
  });
};

/** [CÓDIGO] v1 nunca conserva aprobación ni deduce una selección visual. */
export const migrateCvSpecV1ToV2 = (input: unknown, design?: DesignMigrationInput): CvSpecV2 => {
  const legacy = parseCvSpec(input, {requireApproval: true});
  const requiresDesign = legacy.variants.some(({output_kinds}) =>
    output_kinds.includes('executive-html'),
  );
  if (!requiresDesign && design) throw new Error('CV_DESIGN_NOT_APPLICABLE_TO_ATS_ONLY');
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
      design: variant.output_kinds.includes('executive-html') ? PENDING_DESIGN : NEUTRAL_DESIGN,
    })),
    state: 'DRAFT',
    next_gate: 'CR_CV_SPEC_APPROVED',
    approval: null,
  });
  return design ? bindCvSpecV2DesignDecision(pending, design) : pending;
};

export const assertCvSpecV2DesignCurrent = (
  specInput: unknown,
  decisionInput: unknown,
  systemInput: unknown,
): CvSpecV2 => {
  const spec = parseCvSpecV2(specInput, {requireApproval: true});
  const decision = parseCvDesignDecision(decisionInput, {requireApproval: true});
  const system = parseCareerDesignSystem(systemInput);
  if (
    decision.design_system_id !== system.design_system_id ||
    decision.design_system_sha256 !== system.design_system_sha256
  ) {
    throw new Error('CV_SPEC_V2_DESIGN_SYSTEM_STALE');
  }
  for (const variant of spec.variants.filter(({output_kinds}) =>
    output_kinds.includes('executive-html'),
  )) {
    if (
      variant.design.decision_id !== decision.decision_id ||
      variant.design.decision_sha256 !== decision.decision_sha256 ||
      variant.design.design_system_id !== decision.design_system_id ||
      variant.design.design_system_sha256 !== decision.design_system_sha256 ||
      variant.design.composition_id !== decision.selected_composition
    ) {
      throw new Error('CV_SPEC_V2_DESIGN_STALE');
    }
  }
  return spec;
};
