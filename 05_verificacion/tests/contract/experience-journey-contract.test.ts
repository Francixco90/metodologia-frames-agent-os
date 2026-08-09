import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

type GhostMenu = {primary: string; alternatives: string[]};
type ServiceStage = {
  id: string;
  moment: string;
  trigger: string;
  user_job: string;
  user_need: string;
  friction: string;
  moment_of_truth: string;
  frontstage: string;
  ghost_menu: GhostMenu;
  backstage: string;
  owner: string;
  support: string[];
  evidence: string;
  metric: string;
  gate: string;
  failure_mode: string;
  preserved_work: string;
  recovery: string;
  next_recommended_action: string;
};

type ServiceBlueprint = {
  schema_version: string;
  stage_contract: {
    required: string[];
    ghost_menu: {primary_actions: number; alternative_actions_max: number; free_text_wins: boolean};
  };
  stages: ServiceStage[];
  service_rules: string[];
};

const blueprint = parse(
  readFileSync(
    resolve(process.cwd(), '02_proceso/workflows/experience/service-blueprint.yml'),
    'utf8',
  ),
) as ServiceBlueprint;

const requiredFields = [
  'trigger',
  'user_job',
  'user_need',
  'friction',
  'moment_of_truth',
  'frontstage',
  'ghost_menu',
  'backstage',
  'owner',
  'support',
  'evidence',
  'metric',
  'gate',
  'failure_mode',
  'preserved_work',
  'recovery',
  'next_recommended_action',
];

describe('Frames Experience customer journey contract', () => {
  it('models the eight moments with the complete frontstage/backstage handoff', () => {
    expect(blueprint.schema_version).toBe('frames-service-blueprint-v2');
    expect(blueprint.stage_contract.required).toEqual(requiredFields);
    expect(blueprint.stages.map(({id}) => id)).toEqual([
      'arrival',
      'understanding',
      'orientation',
      'codesign',
      'production',
      'review',
      'continuity',
      'recovery',
    ]);
    expect(new Set(blueprint.stages.map(({id}) => id)).size).toBe(8);
    for (const stage of blueprint.stages) {
      for (const field of requiredFields) {
        expect(stage).toHaveProperty(field);
        expect(stage[field as keyof ServiceStage]).toBeTruthy();
      }
      expect(stage.support.length).toBeGreaterThan(0);
    }
  });

  it('keeps ghost menus concise while free text remains authoritative', () => {
    expect(blueprint.stage_contract.ghost_menu).toEqual({
      primary_actions: 1,
      alternative_actions_max: 2,
      free_text_wins: true,
    });
    for (const {ghost_menu: menu} of blueprint.stages) {
      expect(menu.primary.trim().length).toBeGreaterThan(0);
      expect(menu.alternatives.length).toBeLessThanOrEqual(2);
      expect(menu.alternatives.every((label) => label.trim().length > 0)).toBe(true);
    }
    expect(blueprint.service_rules.join(' ')).toMatch(/texto libre prevalece/iu);
    expect(blueprint.service_rules.join(' ')).toMatch(/nunca dentro de briefs o entregables/iu);
  });

  it('binds every moment to a registered owner and a resolvable gate reference', () => {
    const owners = new Set(['RT-01', 'RT-04', 'RT-08', 'RT-09', 'RT-10', 'RT-11']);
    const gates = new Set([
      'G09_EXPERIENCE',
      'EXP_BRIEF_APPROVED',
      'workflow_plan.active_step.gate',
    ]);
    for (const stage of blueprint.stages) {
      expect(owners.has(stage.owner)).toBe(true);
      expect(gates.has(stage.gate)).toBe(true);
      expect(stage.evidence).not.toMatch(/simulad|narrativ|declaración YAML/iu);
      expect(stage.recovery.length).toBeGreaterThan(20);
      expect(stage.next_recommended_action.length).toBeGreaterThan(20);
    }
  });

  it('does not present textual fallback as material GenUI', () => {
    expect(blueprint.service_rules.join(' ')).toMatch(/fallback textual/iu);
    expect(blueprint.service_rules.join(' ')).toMatch(/adapter y probe/iu);
  });
});
