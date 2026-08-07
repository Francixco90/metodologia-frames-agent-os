import {describe, expect, it} from 'vitest';

import {readRepositoryYaml} from '../../fixtures/verifier/io.ts';

/**
 * Contract test: `02_proceso/governance/tool-policy.yml` (tool-policy-v1).
 * Asserts schema_version, the 6 active owners with concrete allow/deny,
 * Guardian deny Edit+Write, and the 8 stub owners flagged coverage_gap. [CONFIG]
 */
describe('tool-policy.yml contract', () => {
  const policy = readRepositoryYaml('02_proceso/governance/tool-policy.yml') as {
    schema_version: number;
    manifest_id: string;
    roles: string[];
    rules: Array<{
      role: string;
      tools: {allow: string[]; deny: string[]; conditional?: string[]};
    }>;
    gaps?: string[];
  };

  it('declares schema_version 1 and manifest_id tool-policy-v1', () => {
    expect(policy.schema_version).toBe(1);
    expect(policy.manifest_id).toBe('tool-policy-v1');
  });

  it('declares 14 roles', () => {
    expect(policy.roles).toHaveLength(14);
  });

  it('has 6 active owners with concrete allow/deny', () => {
    const active = ['lead', 'repo', 'qa', 'core', 'governance', 'guardian'];
    for (const role of active) {
      const rule = policy.rules.find((r) => r.role === role);
      expect(rule, `active owner ${role} must have a rule`).toBeDefined();
      expect(rule?.tools.allow.length ?? 0).toBeGreaterThan(0);
      // Concrete = either a deny list OR a conditional list (guardian has deny; others conditional).
      const hasDeny = (rule?.tools.deny.length ?? 0) > 0;
      const hasConditional = (rule?.tools.conditional?.length ?? 0) > 0;
      expect(hasDeny || hasConditional).toBe(true);
    }
  });

  it('guardian denies Edit and Write', () => {
    const guardian = policy.rules.find((r) => r.role === 'guardian');
    expect(guardian).toBeDefined();
    expect(guardian?.tools.deny).toEqual(expect.arrayContaining(['Edit', 'Write']));
  });

  it('flags 8 stub owners with coverage_gap', () => {
    const stubs = [
      'sources',
      'agents-committee',
      'skill-foundry',
      'web',
      'content',
      'remotion',
      'static-social',
      'n8n',
    ];
    for (const role of stubs) {
      const rule = policy.rules.find((r) => r.role === role);
      expect(rule, `stub owner ${role} must have a rule`).toBeDefined();
      const conditional = (rule?.tools.conditional ?? []).join('\n');
      expect(conditional).toMatch(/coverage_gap/u);
    }
    // The manifest gaps section also records the 8-stub gap. [CONFIG]
    const gaps = (policy.gaps ?? []).join('\n');
    expect(gaps).toMatch(/8 stub owners/u);
  });
});
