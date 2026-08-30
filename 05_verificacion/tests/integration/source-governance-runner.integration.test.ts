import {linkSync, renameSync, symlinkSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  runProjectLocalSourceGovernanceCheck,
  runSourceGovernanceCheck,
} from '../../scripts/lib/source-governance/run.ts';
import {readPortableFile} from '../../scripts/lib/source-governance/physical-validation.ts';
import {
  createSourceGovernanceWorkspace,
  sha256Fixture,
  type SourceGovernanceWorkspace,
} from '../fixtures/source-notebook/runner-workspace.ts';

type RegistryEntryFixture = {
  source_id: string;
  source_kind: string;
  canonical_uri?: string;
  canonical_uri_sha256?: string;
  current_state: string;
  deduplication: {verdict: string; checked_against_registry?: string};
  hashes: {
    raw_sha256: string | null;
    normalized_sha256: string | null;
    source_normalized_sha256: string | null;
  };
  rights: {
    rights_holder?: string;
    rights_basis?: string;
    allowed_use_scope?: string;
    rights_verdict: string;
  };
  authority: {authority_verdict: string; provenance_evidence: string};
  receipts: string[];
  receipt_bindings?: Array<{path: string; sha256: string; event_order: number}>;
  repository_lock?: {
    canonical_uri: string;
    canonical_uri_sha256: string;
    commit_object_id: string;
    tree_object_id: string;
    source_archive: {sha256: string};
  };
};
type RegistryFixture = {entries: RegistryEntryFixture[]};

const GLOBAL_REGISTRY = 'registries/sources/source-registry.yml';
const PROJECT_LOCAL_REGISTER =
  '03_artefactos/projects/agentic-workflow-adoption-v1/source-register.yml';
const PROJECT_LOCAL_SCOPE_RECEIPT =
  '03_artefactos/projects/agentic-workflow-adoption-v1/receipts/source-register-project-local-scope-v1.yml';
const PROPOSAL_ID = 'SRC-PROPOSAL-MEASURE-E0D6BA4';

const findEntry = (registry: RegistryFixture, sourceId: string): RegistryEntryFixture => {
  const entry = registry.entries.find(({source_id: candidate}) => candidate === sourceId);
  if (entry === undefined) throw new Error(`Missing source fixture ${sourceId}`);
  return entry;
};

const withWorkspace = async (
  assertion: (workspace: SourceGovernanceWorkspace) => Promise<void> | void,
): Promise<void> => {
  const workspace = await createSourceGovernanceWorkspace();
  try {
    await assertion(workspace);
  } finally {
    await workspace.dispose();
  }
};

const expectFailure = (
  runner: typeof runSourceGovernanceCheck,
  workspace: SourceGovernanceWorkspace,
  expectedFragment: string,
): void => {
  const result = runner(workspace.root);
  expect(result.ok).toBe(false);
  expect(result.errors.join('\n')).toContain(expectedFragment);
};

describe('source governance production runners', () => {
  it('keeps the global 11-source runner independent from the 2-source PROJECT_LOCAL dossier', async () => {
    await withWorkspace(async (workspace) => {
      expect(runSourceGovernanceCheck(workspace.root)).toEqual({
        ok: true,
        errors: [],
        sourceCount: 11,
      });
      expect(runProjectLocalSourceGovernanceCheck(workspace.root)).toEqual({
        ok: true,
        errors: [],
        sourceCount: 2,
      });
      await workspace.remove(PROJECT_LOCAL_REGISTER);
      await workspace.remove(PROJECT_LOCAL_SCOPE_RECEIPT);
      expect(runSourceGovernanceCheck(workspace.root)).toEqual({
        ok: true,
        errors: [],
        sourceCount: 11,
      });
      expectFailure(
        runProjectLocalSourceGovernanceCheck,
        workspace,
        'PROJECT_LOCAL source governance files unreadable',
      );
    });
  });

  it('rejects donor URI, commit and tree drift against the frozen local baseline', async () => {
    const mutations = [
      (entry: RegistryEntryFixture) => {
        const uri = 'https://github.com/SepBaGer/Propuesta-Medida-drift.git';
        entry.canonical_uri = uri;
        entry.canonical_uri_sha256 = sha256Fixture(uri);
        if (entry.repository_lock !== undefined) {
          entry.repository_lock.canonical_uri = uri;
          entry.repository_lock.canonical_uri_sha256 = sha256Fixture(uri);
        }
      },
      (entry: RegistryEntryFixture) => {
        if (entry.repository_lock !== undefined)
          entry.repository_lock.commit_object_id = 'a'.repeat(40);
      },
      (entry: RegistryEntryFixture) => {
        if (entry.repository_lock !== undefined)
          entry.repository_lock.tree_object_id = 'b'.repeat(40);
      },
    ];
    for (const mutate of mutations) {
      await withWorkspace(async (workspace) => {
        const register = await workspace.readYaml<RegistryFixture>(PROJECT_LOCAL_REGISTER);
        mutate(findEntry(register, PROPOSAL_ID));
        await workspace.writeYaml(PROJECT_LOCAL_REGISTER, register);
        expectFailure(
          runProjectLocalSourceGovernanceCheck,
          workspace,
          'URI/commit/tree difieren del baseline donante congelado',
        );
      });
    }
  });

  it('separates local policy failure from global active-rights failure', async () => {
    await withWorkspace(async (workspace) => {
      const register = await workspace.readYaml<{policy: {maximum_state_without_h01: string}}>(
        PROJECT_LOCAL_REGISTER,
      );
      register.policy.maximum_state_without_h01 = 'active';
      await workspace.writeYaml(PROJECT_LOCAL_REGISTER, register);
      expectFailure(runProjectLocalSourceGovernanceCheck, workspace, 'maximum_state_without_h01');
      expect(runSourceGovernanceCheck(workspace.root).ok).toBe(true);
    });
    await withWorkspace(async (workspace) => {
      const registry = await workspace.readYaml<RegistryFixture>(GLOBAL_REGISTRY);
      delete findEntry(registry, 'SRC-SYNTH-VS001').rights.rights_holder;
      await workspace.writeYaml(GLOBAL_REGISTRY, registry);
      expectFailure(runSourceGovernanceCheck, workspace, 'source-registry.yml inválido');
    });
  });

  it('rejects private donor evidence while leaving the global runner unaffected', async () => {
    await withWorkspace(async (workspace) => {
      const locator =
        '03_artefactos/projects/agentic-workflow-adoption-v1/sources/proposal-measure-e0d6ba4/repository.yml';
      const privateLocator = ['', 'Users', 'private', 'donor'].join('/');
      await workspace.writeText(
        locator,
        `${await workspace.readText(locator)}# ${privateLocator}\n`,
      );
      expect(runSourceGovernanceCheck(workspace.root).ok).toBe(true);
      expectFailure(
        runProjectLocalSourceGovernanceCheck,
        workspace,
        'evidencia contiene un locator local privado',
      );
    });
  });

  it('rejects canonical coverage and generic lifecycle drift only in the global runner', async () => {
    await withWorkspace(async (workspace) => {
      const locator = 'registries/sources/canonical-source-gaps.yml';
      const gaps = await workspace.readYaml<{consequence: {source_locked: boolean}}>(locator);
      gaps.consequence.source_locked = true;
      await workspace.writeYaml(locator, gaps);
      expectFailure(runSourceGovernanceCheck, workspace, 'expected=4, confirmed=0');
    });
    await withWorkspace(async (workspace) => {
      const locator = 'receipts/imports/20260719-SRC-SYNTH-VS001-active.yml';
      const receipt = await workspace.readYaml<{actor_id: string; verifier_id: string}>(locator);
      receipt.verifier_id = receipt.actor_id;
      await workspace.writeYaml(locator, receipt);
      expectFailure(runSourceGovernanceCheck, workspace, 'actor y verifier colapsan');
    });
  });

  it('rejects global duplicates and PROJECT_LOCAL contamination', async () => {
    await withWorkspace(async (workspace) => {
      const registry = await workspace.readYaml<RegistryFixture>(GLOBAL_REGISTRY);
      const first = findEntry(registry, 'SRC-METH-JVC-YT-001');
      const second = findEntry(registry, 'SRC-METH-JVC-SKOOL-001');
      if (first.canonical_uri === undefined || first.canonical_uri_sha256 === undefined) {
        throw new Error('Expected canonical URI fixture.');
      }
      second.canonical_uri = first.canonical_uri;
      second.canonical_uri_sha256 = first.canonical_uri_sha256;
      second.deduplication.verdict = 'unique';
      await workspace.writeYaml(GLOBAL_REGISTRY, registry);
      expectFailure(
        runSourceGovernanceCheck,
        workspace,
        'canonical_uri duplicado declarado unique',
      );
    });
    await withWorkspace(async (workspace) => {
      const global = await workspace.readYaml<RegistryFixture>(GLOBAL_REGISTRY);
      const local = await workspace.readYaml<RegistryFixture>(PROJECT_LOCAL_REGISTER);
      global.entries.push(structuredClone(findEntry(local, PROPOSAL_ID)));
      await workspace.writeYaml(GLOBAL_REGISTRY, global);
      expectFailure(runSourceGovernanceCheck, workspace, 'reservada para PROJECT_LOCAL');
    });
  });

  it('rejects global binding drift, scope escalation and register drift', async () => {
    await withWorkspace(async (workspace) => {
      const register = await workspace.readYaml<{
        global_authorities: {source_registry: {sha256: string}};
      }>(PROJECT_LOCAL_REGISTER);
      register.global_authorities.source_registry.sha256 = 'a'.repeat(64);
      await workspace.writeYaml(PROJECT_LOCAL_REGISTER, register);
      expectFailure(
        runProjectLocalSourceGovernanceCheck,
        workspace,
        'source-register.yml PROJECT_LOCAL inválido',
      );
    });
    await withWorkspace(async (workspace) => {
      const receipt = await workspace.readYaml<{global_registry_integration_authorized: boolean}>(
        PROJECT_LOCAL_SCOPE_RECEIPT,
      );
      receipt.global_registry_integration_authorized = true;
      await workspace.writeYaml(PROJECT_LOCAL_SCOPE_RECEIPT, receipt);
      expectFailure(
        runProjectLocalSourceGovernanceCheck,
        workspace,
        'scope receipt PROJECT_LOCAL inválido',
      );
    });
    await withWorkspace(async (workspace) => {
      await workspace.writeText(
        PROJECT_LOCAL_REGISTER,
        `${await workspace.readText(PROJECT_LOCAL_REGISTER)}# physical drift\n`,
      );
      expectFailure(
        runProjectLocalSourceGovernanceCheck,
        workspace,
        'no liga el registro físico exacto',
      );
    });
  });

  it('rejects receipt drift and a scope receipt not bound to the historical chain', async () => {
    await withWorkspace(async (workspace) => {
      const register = await workspace.readYaml<RegistryFixture>(PROJECT_LOCAL_REGISTER);
      const binding = findEntry(register, PROPOSAL_ID).receipt_bindings?.[1];
      if (binding === undefined) throw new Error('Missing proposal receipt binding fixture.');
      await workspace.writeText(binding.path, `${await workspace.readText(binding.path)}# drift\n`);
      expectFailure(
        runProjectLocalSourceGovernanceCheck,
        workspace,
        'physical receipt hash mismatch',
      );
    });
    await withWorkspace(async (workspace) => {
      const receipt = await workspace.readYaml<{
        historical_receipt_bindings: Array<{receipts: Array<{sha256: string}>}>;
      }>(PROJECT_LOCAL_SCOPE_RECEIPT);
      receipt.historical_receipt_bindings[0]!.receipts[0]!.sha256 = 'b'.repeat(64);
      await workspace.writeYaml(PROJECT_LOCAL_SCOPE_RECEIPT, receipt);
      expectFailure(runProjectLocalSourceGovernanceCheck, workspace, 'scope receipt no liga');
    });
  });

  it('rejects scoped-union duplicates by URI, raw/source hash or commit', async () => {
    await withWorkspace(async (workspace) => {
      const global = await workspace.readYaml<RegistryFixture>(GLOBAL_REGISTRY);
      const local = await workspace.readYaml<RegistryFixture>(PROJECT_LOCAL_REGISTER);
      const donor = findEntry(local, PROPOSAL_ID);
      const duplicate = global.entries.find(({hashes}) => hashes.raw_sha256 !== null);
      const duplicateHash = duplicate?.hashes.raw_sha256;
      if (
        duplicateHash === null ||
        duplicateHash === undefined ||
        donor.repository_lock === undefined
      ) {
        throw new Error('Expected hash-bearing union fixtures.');
      }
      donor.hashes.raw_sha256 = duplicateHash;
      donor.hashes.normalized_sha256 = duplicateHash;
      donor.hashes.source_normalized_sha256 = duplicateHash;
      donor.repository_lock.source_archive.sha256 = duplicateHash;
      await workspace.writeYaml(PROJECT_LOCAL_REGISTER, local);
      expectFailure(runProjectLocalSourceGovernanceCheck, workspace, 'colisión raw_sha256');
    });
  });

  it('blocks lexical escape, symlink, hardlink and both TOCTOU substitution seams', async () => {
    await withWorkspace(async (workspace) => {
      const errors: string[] = [];
      expect(readPortableFile(workspace.root, PROPOSAL_ID, '../escape', errors)).toBeUndefined();
      expect(errors.join('\n')).toContain('fuera del root');

      await workspace.writeText('symlink-target.txt', 'target');
      symlinkSync('symlink-target.txt', resolve(workspace.root, 'symlink-evidence.txt'));
      expect(
        readPortableFile(workspace.root, PROPOSAL_ID, 'symlink-evidence.txt', errors),
      ).toBeUndefined();
      expect(errors.join('\n')).toContain('archivo regular exclusivo');

      await workspace.writeText('hardlink-target.txt', 'target');
      linkSync(
        resolve(workspace.root, 'hardlink-target.txt'),
        resolve(workspace.root, 'hardlink-evidence.txt'),
      );
      expect(
        readPortableFile(workspace.root, PROPOSAL_ID, 'hardlink-evidence.txt', errors),
      ).toBeUndefined();
      expect(errors.join('\n')).toContain('archivo regular exclusivo');

      await workspace.writeText('toctou-open.txt', 'before');
      const openPath = resolve(workspace.root, 'toctou-open.txt');
      expect(
        readPortableFile(workspace.root, PROPOSAL_ID, 'toctou-open.txt', errors, {
          afterInitialStat: () => {
            renameSync(openPath, `${openPath}.old`);
            writeFileSync(openPath, 'replacement');
          },
        }),
      ).toBeUndefined();
      expect(errors.join('\n')).toContain('entre validación y apertura');

      await workspace.writeText('toctou-readback.txt', 'before');
      const readbackPath = resolve(workspace.root, 'toctou-readback.txt');
      expect(
        readPortableFile(workspace.root, PROPOSAL_ID, 'toctou-readback.txt', errors, {
          afterOpen: () => {
            renameSync(readbackPath, `${readbackPath}.old`);
            writeFileSync(readbackPath, 'replacement');
          },
        }),
      ).toBeUndefined();
      expect(errors.join('\n')).toContain('readback de evidencia detectó sustitución');
    });
  });
});
