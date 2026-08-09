import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {DocumentationSurfaceV1Schema, FramesWorkOrderV1Schema} from 'core/contracts/index.ts';
import {
  buildMutationProfilesV1,
  renderMutationProfilesV1,
} from 'scripts/lib/mutation-profile-registry.ts';
import {verifyWorkOrderMutationProfileV1} from 'workflows/maintenance/index.ts';

const root = process.cwd();
const digest = 'a'.repeat(64);
const activeSkills = (): string[] => {
  const ids = new Set<string>();
  for (const ref of [
    '04_estado/registries/skills/skill-registry.yml',
    '04_estado/registries/skills/creation-v3-skill-registry.yml',
  ]) {
    const registry = parse(readFileSync(resolve(root, ref), 'utf8')) as {
      entries?: Array<{skill_id?: string; current_state?: string}>;
    };
    for (const entry of registry.entries ?? []) {
      if (entry.current_state === 'active' && entry.skill_id) ids.add(entry.skill_id);
    }
  }
  return [...ids].sort();
};

const impactPlan = {
  schemaVersion: 'documentation-impact-plan-v1',
  planId: 'DOC-PLAN-MUT-001',
  changeClass: 'CORRECT',
  scope: 'CANONICAL',
  affectedIds: ['dev-writing-plans'],
  surfaces: DocumentationSurfaceV1Schema.options.map((surface) => ({
    surface,
    disposition: 'NOT_APPLICABLE' as const,
    reasonCode: 'NO_USER_VISIBLE_CHANGE' as const,
  })),
  canonicalSha256: digest,
} as const;

const baseWorkOrder = {
  schemaVersion: 'frames-work-order-v1',
  workOrderId: 'WO-MUT-001',
  requestHash: digest,
  routeId: 'R9',
  workflowId: 'M03',
  stepId: 'M03-S01',
  skillId: 'dev-writing-plans',
  actorId: 'RT-10',
  readSet: [],
  writeSet: ['work/output.md'],
  inputs: [],
  expectedOutputs: ['work/output.md'],
  tools: ['apply-patch'],
  effectClass: 'LOCAL_REVERSIBLE',
  budget: {targetFiles: 1, maxFiles: 2, targetTokens: 1_000, maxTokens: 2_000},
  acceptanceCriteria: ['El cambio queda documentado.'],
  stopRule: 'Detener ante UNKNOWN.',
  canonicalSha256: digest,
} as const;

describe('mutation profile registry and gate', () => {
  it('covers every active skill exactly once and has no inactive extras', () => {
    const profiles = buildMutationProfilesV1(root);
    const ids = profiles.map(({skillId}) => skillId);
    expect(ids).toEqual(activeSkills());
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      readFileSync(
        resolve(root, '04_estado/registries/skills/mutation-profile-registry.yml'),
        'utf8',
      ),
    ).toBe(renderMutationProfilesV1(root));
  });

  it('marks every declared mutator as documentation-impact required', () => {
    const profiles = buildMutationProfilesV1(root);
    for (const profile of profiles) {
      expect(profile.documentationImpactRequired).toBe(profile.mutationClasses.length > 0);
    }
  });

  it('blocks mutating skills without impact and passes a matching complete order', () => {
    const profiles = buildMutationProfilesV1(root);
    const incomplete = FramesWorkOrderV1Schema.parse(baseWorkOrder);
    expect(verifyWorkOrderMutationProfileV1(incomplete, profiles)).toEqual({
      status: 'BLOCKED',
      reasonCodes: ['MUTATION-DOCS001'],
    });
    const complete = FramesWorkOrderV1Schema.parse({
      ...baseWorkOrder,
      changeClass: 'CORRECT',
      documentationImpact: impactPlan,
    });
    expect(verifyWorkOrderMutationProfileV1(complete, profiles)).toEqual({
      status: 'PASS',
      reasonCodes: [],
    });
  });

  it('blocks missing, duplicate and incompatible mutation profiles', () => {
    const profiles = buildMutationProfilesV1(root);
    const complete = FramesWorkOrderV1Schema.parse({
      ...baseWorkOrder,
      changeClass: 'CORRECT',
      documentationImpact: impactPlan,
    });
    const selected = profiles.find(({skillId}) => skillId === complete.skillId);
    expect(selected).toBeDefined();
    expect(verifyWorkOrderMutationProfileV1(complete, [])).toMatchObject({
      status: 'BLOCKED',
      reasonCodes: ['MUTATION-PROFILE001'],
    });
    expect(verifyWorkOrderMutationProfileV1(complete, [selected!, selected!])).toMatchObject({
      status: 'BLOCKED',
      reasonCodes: ['MUTATION-PROFILE002'],
    });
    expect(
      verifyWorkOrderMutationProfileV1(complete, [{...selected!, mutationClasses: ['CREATE']}]),
    ).toMatchObject({status: 'BLOCKED', reasonCodes: ['MUTATION-CLASS001']});
  });
});
