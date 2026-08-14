import {describe, expect, it} from 'vitest';

import {
  CareerDesignSystemRefV1Schema,
  CvDesignBriefV1Schema,
} from 'workflows/career/_schema/index.ts';
import {
  approveCvDesignDecision,
  assertCvDesignDecisionCurrent,
  calculateCareerDesignSystemHash,
  createCvDesignBrief,
  createCvDesignDecision,
  parseCvDesignDecision,
} from 'workflows/career/_runner/cv-design.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

const buildSystem = () => {
  const provisional = CareerDesignSystemRefV1Schema.parse({
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
  return CareerDesignSystemRefV1Schema.parse({
    ...provisional,
    design_system_sha256: calculateCareerDesignSystemHash(provisional),
  });
};

const buildBrief = () =>
  createCvDesignBrief({
    schema_version: 'cv-design-brief-v1',
    brief_id: 'CVDBRIEF-SYNTHETIC-001',
    candidate_id: 'CAND-SYNTHETIC-001',
    audiences: ['recruiter', 'hiring_manager'],
    languages: ['es', 'en'],
    requested_outputs: ['executive-html'],
    density: 'balanced',
    hierarchy: ['identity', 'positioning', 'proof', 'experience'],
    interaction_depth: 'progressive-disclosure',
    constraints: ['No remote dependencies'],
    design_system: buildSystem(),
    requested_compositions: ['blueprint-executive', 'neo-swiss-editorial'],
    state: 'DESIGN_OPTIONS_READY',
    next_gate: 'CR_CV_DESIGN_APPROVED',
  });

const buildReadyDecision = () => {
  const brief = buildBrief();
  return createCvDesignDecision(
    {
      schema_version: 'cv-design-decision-v1',
      decision_id: 'CVDESIGN-SYNTHETIC-001',
      brief_id: brief.brief_id,
      brief_sha256: brief.brief_sha256,
      design_system_id: brief.design_system.design_system_id,
      design_system_sha256: brief.design_system.design_system_sha256,
      options: [
        {
          composition_id: 'blueprint-executive',
          rationale_ref: 'fixtures/design/blueprint.md',
          rationale_sha256: HASH_A,
          preview_ref: 'fixtures/design/blueprint.html',
          preview_sha256: HASH_B,
        },
        {
          composition_id: 'neo-swiss-editorial',
          rationale_ref: 'fixtures/design/neo-swiss.md',
          rationale_sha256: HASH_B,
          preview_ref: 'fixtures/design/neo-swiss.html',
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
};

describe('Career design authority', () => {
  it('requires exactly the two governed alternatives', () => {
    const brief = buildBrief();
    expect(
      CvDesignBriefV1Schema.safeParse({
        ...brief,
        requested_compositions: ['blueprint-executive', 'blueprint-executive'],
      }).success,
    ).toBe(false);
  });

  it('keeps DESIGN_OPTIONS_READY unselected and requires manual approval', () => {
    const ready = buildReadyDecision();
    expect(ready).toMatchObject({state: 'DESIGN_OPTIONS_READY', selected_composition: null});
    expect(() => parseCvDesignDecision(ready, {requireApproval: true})).toThrow(
      'CR_CV_DESIGN_APPROVED_REQUIRED',
    );
    const approved = approveCvDesignDecision(ready, 'neo-swiss-editorial', {
      approver_ref: 'H01',
      approved_at: '2026-08-11T12:00:00-05:00',
    });
    expect(parseCvDesignDecision(approved, {requireApproval: true})).toMatchObject({
      state: 'HUMAN_APPROVED',
      selected_composition: 'neo-swiss-editorial',
    });
  });

  it('rejects stale decision, brief and design-system hashes', () => {
    const approved = approveCvDesignDecision(buildReadyDecision(), 'blueprint-executive', {
      approver_ref: 'H01',
      approved_at: '2026-08-11T12:00:00-05:00',
    });
    expect(() =>
      parseCvDesignDecision({...approved, options: [...approved.options].reverse()}),
    ).toThrow('CV_DESIGN_DECISION_HASH_MISMATCH');
    expect(() =>
      assertCvDesignDecisionCurrent(approved, buildBrief(), buildSystem()),
    ).not.toThrow();
    expect(() =>
      assertCvDesignDecisionCurrent(
        approved,
        {...buildBrief(), brief_sha256: HASH_A},
        buildSystem(),
      ),
    ).toThrow();
  });
});
