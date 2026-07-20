import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {
  AgentContractBaseV2Schema,
  AgentContractV2Schema,
  AgentRegistryV2Schema,
  materializeAgentContractV2,
} from '../../committees/src/agent-contract-v2.ts';
import {AgentContractSchema} from '../../committees/src/agent-contract.ts';
import {verifyHashBoundFile} from '../../core/orchestration/hash-bound.ts';

const loadRegistry = async () => {
  const root = process.cwd();
  const base = AgentContractBaseV2Schema.parse(
    parse(
      await readFile(resolve(root, 'registries/agents/base-contract-v2.yml'), 'utf8'),
    ) as unknown,
  );
  const registry = AgentRegistryV2Schema.parse(
    parse(
      await readFile(resolve(root, 'registries/agents/agent-registry-v2.yml'), 'utf8'),
    ) as unknown,
  );
  return {base, registry, root};
};

describe('AgentContractV2 and V1 compatibility', () => {
  it('materializes RT-01 through RT-11 from one hash-bound base', async () => {
    const {base, registry, root} = await loadRegistry();
    await verifyHashBoundFile(root, registry.baseContract);
    const contracts = registry.entries.map((entry) =>
      materializeAgentContractV2(base, registry.baseContract, entry),
    );

    expect(contracts).toHaveLength(11);
    expect(contracts.find(({roleId}) => roleId === 'RT-01')).toMatchObject({
      agentId: 'CreativeOrchestratorV2',
      agentClass: 'orchestrator',
      lifecycle: 'permanent',
    });
    expect(contracts.find(({roleId}) => roleId === 'RT-11')).toMatchObject({
      agentId: 'GuardianV2',
      agentClass: 'guardian',
      lifecycle: 'permanent',
    });
    expect(
      contracts
        .filter(({roleId}) => roleId !== 'RT-01' && roleId !== 'RT-11')
        .every(
          ({agentClass, lifecycle}) => agentClass === 'specialist' && lifecycle === 'ephemeral',
        ),
    ).toBe(true);
  });

  it('keeps every VS-001 V1 contract byte-bound and schema-valid', async () => {
    const {registry, root} = await loadRegistry();
    for (const entry of registry.entries) {
      await verifyHashBoundFile(root, entry.legacyV1Contract);
      const legacy = AgentContractSchema.parse(
        parse(await readFile(resolve(root, entry.legacyV1Contract.ref), 'utf8')) as unknown,
      );
      expect(legacy.role_id).toBe(entry.roleId);
    }
    expect(registry.migration).toEqual({
      strategy: 'v1-adapter-before-producer-cutover',
      vs001Compatible: true,
      producerCutoverAllowed: false,
    });
  });

  it('rejects unknown fields and invalid permanent specialist promotion', async () => {
    const {base, registry} = await loadRegistry();
    const specialistEntry = registry.entries.find(({roleId}) => roleId === 'RT-02');
    expect(specialistEntry).toBeDefined();
    if (specialistEntry === undefined) {
      return;
    }
    const specialist = materializeAgentContractV2(base, registry.baseContract, specialistEntry);
    expect(() =>
      AgentContractV2Schema.parse({...specialist, hiddenInstruction: 'not allowed'}),
    ).toThrow();
    expect(() => AgentContractV2Schema.parse({...specialist, lifecycle: 'permanent'})).toThrow();
  });

  it('keeps publication and pre-H01 memory writes forbidden in every role', async () => {
    const {base, registry} = await loadRegistry();
    const contracts = registry.entries.map((entry) =>
      materializeAgentContractV2(base, registry.baseContract, entry),
    );
    expect(
      contracts.every(
        ({publicationPolicy, memoryPolicy, maxRetries}) =>
          publicationPolicy === 'forbidden' &&
          memoryPolicy === 'after_human_approval_only' &&
          maxRetries === 3,
      ),
    ).toBe(true);
  });
});
