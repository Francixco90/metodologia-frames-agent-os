import {describe, expect, it} from 'vitest';
import {
  ArchitectureDecisionV1Schema,
  SkillReleaseCapsuleV1Schema,
  SkillSystemCaseV1Schema,
} from '../../../02_proceso/workflows/skill-systems/contracts.ts';
import {
  decideSmallestComponentV1,
  effectPolicyV1,
  evaluateSkillRunV1,
} from '../../../02_proceso/workflows/skill-systems/governance.ts';

const hash = 'a'.repeat(64);

describe('Skill Systems contracts', () => {
  it('keeps the Skill Case strict and authority-visible', () => {
    const value = SkillSystemCaseV1Schema.parse({
      schema_version: 'skill-system-case-v1',
      case_id: 'CASE-001',
      parent_id: null,
      request: 'Crear una capacidad reusable para revisar skills',
      scope: 'CANONICAL',
      desired_outcome: 'Detectar contratos incompletos antes de activar una skill',
      source_refs: ['00_inbox/first-party/source.yml'],
      authority_status: 'PARTIAL',
      effect_ceiling: 'E1',
      acceptance: ['Bloquea referencias inexistentes'],
      blocking_gaps: ['K02 no observado'],
      owner: 'RT-07-SKILL-PRODUCER',
      content_sha256: hash,
    });
    expect(value.authority_status).toBe('PARTIAL');
    expect(() => SkillSystemCaseV1Schema.parse({...value, extra: true})).toThrow();
  });

  it('demotes to the smallest sufficient component', () => {
    expect(
      decideSmallestComponentV1({
        repeatable: false,
        needsSpecializedJudgment: true,
        instructionSufficient: false,
        referenceSufficient: false,
        toolSufficient: false,
      }),
    ).toEqual({kind: 'INSTRUCTION', decision: 'DEMOTE'});
    expect(
      decideSmallestComponentV1({
        repeatable: true,
        needsSpecializedJudgment: false,
        instructionSufficient: false,
        referenceSufficient: false,
        toolSufficient: true,
      }),
    ).toEqual({kind: 'TOOL', decision: 'DEMOTE'});
  });

  it('requires at least two operational reasons for SPLIT', () => {
    expect(() =>
      ArchitectureDecisionV1Schema.parse({
        schema_version: 'skill-architecture-decision-v1',
        decision_id: 'ADR-001',
        case_id: 'CASE-001',
        capability_map_id: 'MAP-001',
        decision: 'SPLIT',
        selected_topology: ['SKILL-A', 'SKILL-B'],
        rejected_alternatives: ['Mantener una sola skill'],
        tradeoffs: ['Triggers distintos'],
        migration_required: true,
        fallback: 'Mantener versión previa',
        owner: 'RT-07-ARCHITECT',
        content_sha256: hash,
      }),
    ).toThrow('SSS_SPLIT_REQUIRES_TWO_REASONS');
  });

  it('blocks E3 without trusted sandbox replay and E4 in MVP', () => {
    expect(
      effectPolicyV1('E3', {
        workOrder: true,
        trustedRunner: false,
        sandboxReplay: false,
        humanAuthorization: false,
      }).status,
    ).toBe('VALIDATED_NOT_RUNNABLE');
    expect(
      effectPolicyV1('E4', {
        workOrder: true,
        trustedRunner: true,
        sandboxReplay: true,
        humanAuthorization: true,
      }),
    ).toMatchObject({status: 'BLOCKED', gap: 'E4_OUT_OF_MVP'});
  });

  it('excludes infrastructure failures from the denominator', () => {
    const summary = evaluateSkillRunV1({
      schema_version: 'skill-eval-run-v1',
      run_id: 'RUN-001',
      candidate_sha256: hash,
      cases: [
        {
          eval_case_id: 'CASE-001',
          infrastructure_status: 'PASS',
          baseline_pass: false,
          candidate_pass: true,
          evidence_refs: ['evidence/one.json'],
        },
        {
          eval_case_id: 'CASE-002',
          infrastructure_status: 'FAIL',
          baseline_pass: null,
          candidate_pass: null,
          evidence_refs: [],
        },
      ],
      replay_sha256: hash,
      actor_id: 'RT-07-EVAL-PRODUCER',
    });
    expect(summary).toMatchObject({denominator: 1, excluded_infrastructure: 1, verdict: 'PASS'});
  });

  it('requires four separated release roles', () => {
    const base = {
      schema_version: 'skill-release-capsule-v1',
      release_id: 'REL-001',
      parent_release_id: null,
      commit_sha: hash,
      package_sha256: hash,
      files: [{ref: 'skills/a/SKILL.md', sha256: hash}],
      compatibility: [{profile: 'P0_PORTABLE', status: 'PASS'}],
      restore_ref: 'restore.md',
      state: 'CANDIDATE',
    };
    expect(() => SkillReleaseCapsuleV1Schema.parse({...base, approvals: []})).toThrow();
  });
});
