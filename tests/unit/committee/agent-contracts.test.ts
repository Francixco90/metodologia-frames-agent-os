import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {parse} from 'yaml';

import {AgentContractSchema} from '../../../committees/src/index.ts';

const roleIds = [
  'RT-01',
  'RT-02',
  'RT-03',
  'RT-04',
  'RT-05',
  'RT-06',
  'RT-07',
  'RT-08',
  'RT-09',
  'RT-10',
  'RT-11',
] as const;

describe('RT-01 through RT-11 operational contracts', () => {
  it.each(roleIds)('validates %s contract.yml', async (roleId) => {
    const contractPath = path.join(process.cwd(), 'agents', roleId, 'contract.yml');
    const raw = await readFile(contractPath, 'utf8');
    const result = AgentContractSchema.safeParse(parse(raw) as unknown);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role_id).toBe(roleId);
      expect(result.data.handoff.required_fields).toContain('outputs');
      expect(result.data.handoff.required_fields).toContain('tests');
      expect(result.data.handoff.required_fields).toContain('coverage_gaps');
      expect(result.data.evidence_policy.private_reasoning).toBe('NEVER_PERSIST');
      expect(result.data.notebooklm).toMatchObject({
        binding: {mode: 'none'},
        coverage: {
          status: 'coverage_gap',
          covered_source_ids: [],
          evidence_refs: [],
        },
        permissions: {
          access_mode: 'read_only',
          mutation: 'forbidden',
          source_locked_effect: 'none',
        },
      });
    }
  });

  it('covers eleven distinct operational roles', async () => {
    const contracts = await Promise.all(
      roleIds.map(async (roleId) => {
        const raw = await readFile(
          path.join(process.cwd(), 'agents', roleId, 'contract.yml'),
          'utf8',
        );
        return AgentContractSchema.parse(parse(raw) as unknown);
      }),
    );

    expect(new Set(contracts.map(({role_id: roleId}) => roleId)).size).toBe(11);
  });

  it('defines RT-11 as a verifier that cannot produce, remediate or approve for H01', async () => {
    const raw = await readFile(path.join(process.cwd(), 'agents', 'RT-11', 'contract.yml'), 'utf8');
    const guardian = AgentContractSchema.parse(parse(raw) as unknown);

    expect(guardian.title).toMatch(/Guardian/u);
    expect(guardian.purpose).toMatch(/independiente/u);
    expect(guardian.tools.forbidden.join(' ')).toMatch(/Producir, corregir/u);
    expect(guardian.tools.forbidden.join(' ')).toMatch(/H01/u);
  });
});
