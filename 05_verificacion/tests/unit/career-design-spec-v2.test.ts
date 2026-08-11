import {describe, expect, it} from 'vitest';

import {approveCvSpec, createCvSpec} from 'workflows/career/_runner/cv-spec.ts';
import {
  approveCvSpecV2,
  assertCvSpecV2DesignCurrent,
  bindCvSpecV2DesignDecision,
  migrateCvSpecV1ToV2,
  parseCvSpecV2,
} from 'workflows/career/_runner/cv-spec-v2.ts';
import {
  approveCvDesignDecision,
  calculateCareerDesignSystemHash,
  createCvDesignBrief,
  createCvDesignDecision,
} from 'workflows/career/_runner/cv-design.ts';
import {CareerDesignSystemRefV1Schema, CvSpecV2Schema} from 'workflows/career/_schema/index.ts';
import {buildApprovedGeneralSpec, HASH_A, HASH_B} from './career-cv-spec-fixtures.ts';

const buildApprovedAtsSpec = () => {
  const legacy = buildApprovedGeneralSpec();
  const {spec_sha256, approval, ...base} = legacy;
  void spec_sha256;
  void approval;
  return approveCvSpec(
    createCvSpec({...base, variants: [legacy.variants[0]!], state: 'DRAFT', approval: null}),
    {approver_ref: 'H01', approved_at: '2026-08-11T10:00:00-05:00'},
  );
};

const buildDesignAuthority = () => {
  const systemDraft = CareerDesignSystemRefV1Schema.parse({
    schema_version: 'metodologia-career-design-system-v1',
    design_system_id: 'CVDS-METODOLOGIA-001',
    contract_ref: 'brand/career/design-system.md',
    contract_sha256: HASH_A,
    tokens_ref: 'brand/career/tokens.json',
    tokens_sha256: HASH_B,
    component_registry_ref: 'brand/career/components.json',
    component_registry_sha256: HASH_A,
    font_manifest_ref: 'brand/career/fonts.json',
    font_manifest_sha256: HASH_B,
    icon_registry_ref: 'brand/career/icons.json',
    icon_registry_sha256: HASH_A,
    composition_ids: ['blueprint-executive', 'neo-swiss-editorial'],
    theme_policy: {
      default_theme: 'navy',
      alternate_theme: 'light',
      print_theme: 'light',
      persistence: 'local-storage-progressive-enhancement',
    },
    design_system_sha256: HASH_A,
  });
  const system = CareerDesignSystemRefV1Schema.parse({
    ...systemDraft,
    design_system_sha256: calculateCareerDesignSystemHash(systemDraft),
  });
  const brief = createCvDesignBrief({
    schema_version: 'cv-design-brief-v1',
    brief_id: 'CVDBRIEF-SYNTHETIC-002',
    candidate_id: 'CAND-SYNTHETIC-001',
    audiences: ['hiring_manager'],
    languages: ['en'],
    requested_outputs: ['executive-html'],
    density: 'editorial',
    hierarchy: ['identity', 'positioning', 'proof'],
    interaction_depth: 'progressive-disclosure',
    constraints: [],
    design_system: system,
    requested_compositions: ['blueprint-executive', 'neo-swiss-editorial'],
    state: 'DESIGN_OPTIONS_READY',
    next_gate: 'CR_CV_DESIGN_APPROVED',
  });
  const ready = createCvDesignDecision(
    {
      schema_version: 'cv-design-decision-v1',
      decision_id: 'CVDESIGN-SYNTHETIC-002',
      brief_id: brief.brief_id,
      brief_sha256: brief.brief_sha256,
      design_system_id: system.design_system_id,
      design_system_sha256: system.design_system_sha256,
      options: [
        {
          composition_id: 'blueprint-executive',
          rationale_ref: 'fixtures/a.md',
          rationale_sha256: HASH_A,
          preview_ref: 'fixtures/a.html',
          preview_sha256: HASH_B,
        },
        {
          composition_id: 'neo-swiss-editorial',
          rationale_ref: 'fixtures/b.md',
          rationale_sha256: HASH_B,
          preview_ref: 'fixtures/b.html',
          preview_sha256: HASH_A,
        },
      ],
      selected_composition: null,
      state: 'DESIGN_OPTIONS_READY',
      next_gate: 'CR_CV_DESIGN_APPROVED',
      approval: null,
    },
    brief,
  );
  const decision = approveCvDesignDecision(ready, 'blueprint-executive', {
    approver_ref: 'H01',
    approved_at: '2026-08-11T12:00:00-05:00',
  });
  return {system, ready, decision};
};

describe('CV spec v2 design gates', () => {
  it('migrates ATS-only through an explicit neutral bypass', () => {
    const migrated = migrateCvSpecV1ToV2(buildApprovedAtsSpec());
    expect(migrated).toMatchObject({schema_version: 'cv-spec-v2', state: 'DRAFT'});
    expect(migrated.variants[0]?.design).toEqual({
      mode: 'ats-neutral',
      design_system_id: null,
      design_system_ref: null,
      design_system_sha256: null,
      decision_id: null,
      decision_ref: null,
      decision_sha256: null,
      composition_id: null,
      theme_policy: null,
    });
  });

  it('allows pending design only before approval and binds after the decision', () => {
    const legacy = buildApprovedGeneralSpec();
    const authority = buildDesignAuthority();
    const pending = migrateCvSpecV1ToV2(legacy);
    expect(
      pending.variants.find(({output_kinds}) => output_kinds.includes('executive-html'))?.design,
    ).toMatchObject({mode: 'pending-design', decision_sha256: null});
    expect(() =>
      approveCvSpecV2(pending, {
        approver_ref: 'H01',
        approved_at: '2026-08-11T12:30:00-05:00',
      }),
    ).toThrow('CR_CV_DESIGN_APPROVED_REQUIRED');
    expect(
      CvSpecV2Schema.safeParse({
        ...pending,
        state: 'HUMAN_APPROVED',
        approval: {
          status: 'HUMAN_APPROVED',
          approved_spec_sha256: pending.spec_sha256,
          approver_ref: 'H01',
          approved_at: '2026-08-11T12:30:00-05:00',
        },
      }).success,
    ).toBe(false);
    expect(() =>
      migrateCvSpecV1ToV2(legacy, {
        decision: authority.ready,
        decision_ref: 'work/private/design/decision.json',
        design_system_ref: 'brand/career/design-system.json',
      }),
    ).toThrow('CR_CV_DESIGN_APPROVED_REQUIRED');
    expect(
      bindCvSpecV2DesignDecision(pending, {
        decision: authority.decision,
        decision_ref: 'work/private/design/decision.json',
        design_system_ref: 'brand/career/design-system.json',
      }).variants.find(({output_kinds}) => output_kinds.includes('executive-html'))?.design.mode,
    ).toBe('approved-system');
  });

  it('rejects mixed ATS and executive outputs under one variant ID', () => {
    const pending = migrateCvSpecV1ToV2(buildApprovedGeneralSpec());
    const executiveIndex = pending.variants.findIndex(({output_kinds}) =>
      output_kinds.includes('executive-html'),
    );
    const variants = pending.variants.map((variant, index) =>
      index === executiveIndex
        ? {...variant, output_kinds: ['ats-html', 'executive-html']}
        : variant,
    );
    expect(CvSpecV2Schema.safeParse({...pending, variants}).success).toBe(false);
  });

  it('invalidates stale selections and requires a new spec approval', () => {
    const authority = buildDesignAuthority();
    const migrated = migrateCvSpecV1ToV2(buildApprovedGeneralSpec(), {
      decision: authority.decision,
      decision_ref: 'work/private/design/decision.json',
      design_system_ref: 'brand/career/design-system.json',
    });
    expect(() => parseCvSpecV2(migrated, {requireApproval: true})).toThrow(
      'CR_CV_SPEC_APPROVED_REQUIRED',
    );
    expect(() =>
      approveCvSpecV2(migrated, {
        approver_ref: 'H01',
        approved_at: '2026-08-11T12:30:00-05:00',
      }),
    ).toThrow('CR_CV_DESIGN_APPROVED_REQUIRED');
    const approved = approveCvSpecV2(
      migrated,
      {
        approver_ref: 'H01',
        approved_at: '2026-08-11T12:30:00-05:00',
      },
      {decision: authority.decision, system: authority.system},
    );
    expect(() =>
      assertCvSpecV2DesignCurrent(approved, authority.decision, authority.system),
    ).not.toThrow();
    expect(() =>
      assertCvSpecV2DesignCurrent(
        approved,
        {...authority.decision, decision_sha256: HASH_A},
        authority.system,
      ),
    ).toThrow();
  });
});
