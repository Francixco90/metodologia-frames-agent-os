import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {
  prepareReadOnlyGrounding,
  validateNotebookWorkUnitDeclaration,
} from '../../adapters/notebooklm/index.ts';
import {AgentContractSchema} from '../../committees/src/index.ts';
import {
  NotebookWorkflowBindingManifestSchema,
  type NotebookWorkUnitDeclaration,
} from '../../core/contracts/index.ts';

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
const workflowFiles = [
  'workflows/core/notebooklm-binding.yml',
  'workflows/web/notebooklm-binding.yml',
  'workflows/content/notebooklm-binding.yml',
  'workflows/adapters/notebooklm-binding.yml',
] as const;
const expectedSources = ['SRC-PROMPT-MAESTRO-V6', 'SRC-SYNTH-VS001'] as const;

const NotebookRegistryIndexSchema = z.object({
  entries: z.array(
    z
      .object({
        binding_id: z.string().min(1),
        binding: z.object({mode: z.enum(['none', 'digest'])}).passthrough(),
        state: z.enum(['grounded', 'partial', 'coverage_gap', 'blocked']),
      })
      .passthrough(),
  ),
});
const SourceRegistryIndexSchema = z.object({
  entries: z.array(z.object({source_id: z.string().min(1)}).passthrough()),
});

const readYaml = async (relativePath: string): Promise<unknown> =>
  parse(await readFile(path.resolve(process.cwd(), relativePath), 'utf8')) as unknown;

const loadDeclarations = async (): Promise<
  Array<{unitId: string; declaration: NotebookWorkUnitDeclaration}>
> => {
  const agents = await Promise.all(
    roleIds.map(async (roleId) => {
      const contract = AgentContractSchema.parse(await readYaml(`agents/${roleId}/contract.yml`));
      return {unitId: roleId, declaration: contract.notebooklm};
    }),
  );
  const workflows = await Promise.all(
    workflowFiles.map(async (relativePath) => {
      const manifest = NotebookWorkflowBindingManifestSchema.parse(await readYaml(relativePath));
      return {unitId: manifest.workflow_id, declaration: manifest.notebooklm};
    }),
  );
  return [...agents, ...workflows];
};

describe('NotebookLM declarations per agent and workflow', () => {
  it('covers RT-01..RT-11 and the four workflow surfaces with explicit intent', async () => {
    const declarations = await loadDeclarations();

    expect(declarations).toHaveLength(15);
    expect(new Set(declarations.map(({unitId}) => unitId))).toEqual(
      new Set([...roleIds, 'WF-CORE', 'WF-WEB', 'WF-CONTENT', 'WF-ADAPTERS']),
    );
    for (const {declaration} of declarations) {
      expect(declaration.purpose.length).toBeGreaterThan(10);
      expect(declaration.question).toMatch(/\?$/u);
      expect(declaration.coverage.expected_source_ids).toStrictEqual(expectedSources);
    }
  });

  it('resolves every binding and expected source through the governed registries', async () => {
    const [declarations, notebookRegistry, sourceRegistry] = await Promise.all([
      loadDeclarations(),
      readYaml('registries/notebooks/notebook-registry.yml').then((input) =>
        NotebookRegistryIndexSchema.parse(input),
      ),
      readYaml('registries/sources/source-registry.yml').then((input) =>
        SourceRegistryIndexSchema.parse(input),
      ),
    ]);
    const bindings = new Map(
      notebookRegistry.entries.map((entry) => [entry.binding_id, entry] as const),
    );
    const sources = new Set(sourceRegistry.entries.map(({source_id: sourceId}) => sourceId));

    for (const {unitId, declaration} of declarations) {
      const registryBinding = bindings.get(declaration.binding_id);
      expect(registryBinding, unitId).toBeDefined();
      expect(registryBinding?.binding.mode, unitId).toBe(declaration.binding.mode);
      expect(registryBinding?.state, unitId).toBe('coverage_gap');
      for (const sourceId of declaration.coverage.expected_source_ids) {
        expect(sources.has(sourceId), `${unitId}:${sourceId}`).toBe(true);
      }
    }
  });

  it('keeps every current work unit read-only and fail-closed without evidence', async () => {
    const declarations = await loadDeclarations();

    for (const {unitId, declaration} of declarations) {
      validateNotebookWorkUnitDeclaration(declaration);
      expect(declaration.binding, unitId).toMatchObject({
        mode: 'none',
        locator_material_present: false,
      });
      expect(declaration.coverage, unitId).toMatchObject({
        status: 'coverage_gap',
        covered_source_ids: [],
        evidence_refs: [],
      });
      expect(declaration.coverage.missing_source_ids, unitId).toStrictEqual(expectedSources);
      expect(declaration.permissions, unitId).toStrictEqual({
        access_mode: 'read_only',
        mutation: 'forbidden',
        evidence_promotion: 'forbidden_without_source_mapping',
        source_locked_effect: 'none',
      });
      if (declaration.binding.mode !== 'none') {
        throw new Error(`${unitId} unexpectedly carries a live binding.`);
      }
      expect(
        prepareReadOnlyGrounding({
          operation: 'resolve_binding_status',
          binding: {
            mode: 'none',
            reasonCode: declaration.binding.reason_code,
            locatorMaterialPresent: false,
          },
          claimIds: [],
        }),
        unitId,
      ).toStrictEqual({
        status: 'blocked',
        bindingMode: 'none',
        coverageStatus: 'unavailable',
        evidence: [],
        errorCode: 'NOTEBOOK_BINDING_NONE',
        reasonCode: 'binding_not_selected',
      });
    }
  });

  it('binds workflow manifests to real entrypoints and a portable contract', async () => {
    for (const relativePath of workflowFiles) {
      const manifest = NotebookWorkflowBindingManifestSchema.parse(await readYaml(relativePath));
      expect(existsSync(path.resolve(process.cwd(), manifest.notebooklm.contract_ref))).toBe(true);
      for (const entrypoint of manifest.entrypoints) {
        expect(existsSync(path.resolve(process.cwd(), entrypoint)), entrypoint).toBe(true);
      }
    }
  });
});
