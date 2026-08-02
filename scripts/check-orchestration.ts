import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

import {parse} from 'yaml';

import {
  AgentContractBaseV2Schema,
  AgentRegistryV2Schema,
  materializeAgentContractV2,
} from '../committees/src/agent-contract-v2.ts';
import {AgentContractSchema} from '../committees/src/agent-contract.ts';
import {verifyHashBoundFile} from '../core/orchestration/hash-bound.ts';

export const validateOrchestrationContracts = async (
  root = process.cwd(),
): Promise<{agentCount: number; legacyCount: number}> => {
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

  await verifyHashBoundFile(root, registry.baseContract);
  let legacyCount = 0;
  for (const entry of registry.entries) {
    await verifyHashBoundFile(root, entry.legacyV1Contract);
    const legacy = AgentContractSchema.parse(
      parse(await readFile(resolve(root, entry.legacyV1Contract.ref), 'utf8')) as unknown,
    );
    if (legacy.role_id !== entry.roleId) {
      throw new Error(`Legacy role mismatch: ${entry.roleId} binds ${legacy.role_id}.`);
    }
    materializeAgentContractV2(base, registry.baseContract, entry);
    legacyCount += 1;
  }

  return {agentCount: registry.entries.length, legacyCount};
};

const result = await validateOrchestrationContracts();
console.info(
  `PASS ORCHESTRATION V2: ${String(result.agentCount)} materialized agents, ` +
    `${String(result.legacyCount)} hash-bound V1 contracts, publication forbidden.`,
);
