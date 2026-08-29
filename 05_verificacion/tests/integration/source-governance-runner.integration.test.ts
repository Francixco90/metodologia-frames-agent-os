import {runSourceGovernanceCheck} from '../../scripts/check-sources.ts';
import {
  createSourceGovernanceWorkspace,
  sha256Fixture,
  type SourceGovernanceWorkspace,
} from '../fixtures/source-notebook/runner-workspace.ts';

type RegistryEntryFixture = {
  source_id: string;
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
  };
};
type RegistryFixture = {entries: RegistryEntryFixture[]};

const REGISTRY = 'registries/sources/source-registry.yml';
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

const expectRunnerFailure = (
  workspace: SourceGovernanceWorkspace,
  expectedFragment: string,
): void => {
  const result = runSourceGovernanceCheck(workspace.root);
  expect(result.ok).toBe(false);
  expect(result.errors.join('\n')).toContain(expectedFragment);
};

describe('source governance production runner integration', () => {
  it('accepts the physical production workspace through the real pure runner', async () => {
    await withWorkspace((workspace) => {
      expect(runSourceGovernanceCheck(workspace.root)).toMatchObject({
        ok: true,
        errors: [],
        sourceCount: 13,
      });
    });
  });

  it('rejects donor URI, commit and tree drift against the frozen baseline', async () => {
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
        const registry = await workspace.readYaml<RegistryFixture>(REGISTRY);
        mutate(findEntry(registry, PROPOSAL_ID));
        await workspace.writeYaml(REGISTRY, registry);
        expectRunnerFailure(workspace, 'URI/commit/tree difieren del baseline donante congelado');
      });
    }
  });

  it('rejects lifecycle escalation and incomplete active rights or authority', async () => {
    await withWorkspace(async (workspace) => {
      const lifecycle = await workspace.readYaml<{
        repository_sources: {maximum_state_without_h01: string};
      }>('registries/sources/lifecycle-contract.yml');
      lifecycle.repository_sources.maximum_state_without_h01 = 'active';
      await workspace.writeYaml('registries/sources/lifecycle-contract.yml', lifecycle);
      expectRunnerFailure(workspace, 'maximum_state_without_h01');
    });
    for (const mutate of [
      (entry: RegistryEntryFixture) => delete entry.rights.rights_holder,
      (entry: RegistryEntryFixture) => delete entry.rights.rights_basis,
      (entry: RegistryEntryFixture) => delete entry.rights.allowed_use_scope,
      (entry: RegistryEntryFixture) => {
        entry.authority.provenance_evidence = '';
      },
    ]) {
      await withWorkspace(async (workspace) => {
        const registry = await workspace.readYaml<RegistryFixture>(REGISTRY);
        mutate(findEntry(registry, 'SRC-SYNTH-VS001'));
        await workspace.writeYaml(REGISTRY, registry);
        expectRunnerFailure(workspace, 'source-registry.yml inválido');
      });
    }
  });

  it('rejects a private locator embedded in donor physical evidence', async () => {
    await withWorkspace(async (workspace) => {
      const locator =
        '03_artefactos/projects/agentic-workflow-adoption-v1/sources/proposal-measure-e0d6ba4/repository.yml';
      const privateLocator = ['', 'Users', 'private', 'donor'].join('/');
      await workspace.writeText(
        locator,
        `${await workspace.readText(locator)}# ${privateLocator}\n`,
      );
      expectRunnerFailure(workspace, 'evidencia contiene un locator local privado');
    });
  });

  it('rejects canonical 0/4 coverage when source_locked is asserted', async () => {
    await withWorkspace(async (workspace) => {
      const locator = 'registries/sources/canonical-source-gaps.yml';
      const gaps = await workspace.readYaml<{consequence: {source_locked: boolean}}>(locator);
      gaps.consequence.source_locked = true;
      await workspace.writeYaml(locator, gaps);
      expectRunnerFailure(workspace, 'expected=4, confirmed=0 y source_locked=false');
    });
  });

  it('rejects canonical and physical duplicates still declared unique', async () => {
    await withWorkspace(async (workspace) => {
      const registry = await workspace.readYaml<RegistryFixture>(REGISTRY);
      const first = findEntry(registry, 'SRC-METH-JVC-YT-001');
      const second = findEntry(registry, 'SRC-METH-JVC-SKOOL-001');
      if (first.canonical_uri === undefined || first.canonical_uri_sha256 === undefined) {
        throw new Error('Expected canonical URI fixture.');
      }
      second.canonical_uri = first.canonical_uri;
      second.canonical_uri_sha256 = first.canonical_uri_sha256;
      second.deduplication.verdict = 'unique';
      await workspace.writeYaml(REGISTRY, registry);
      expectRunnerFailure(workspace, 'canonical_uri duplicado declarado unique');
    });
    await withWorkspace(async (workspace) => {
      const registry = await workspace.readYaml<RegistryFixture>(REGISTRY);
      const first = findEntry(registry, 'SRC-SYNTH-VS001');
      const second = findEntry(registry, 'SRC-MAO-BRAND-BUNDLE-001');
      second.hashes.raw_sha256 = first.hashes.raw_sha256;
      second.hashes.normalized_sha256 = first.hashes.normalized_sha256;
      second.hashes.source_normalized_sha256 = first.hashes.source_normalized_sha256;
      await workspace.writeYaml(REGISTRY, registry);
      expectRunnerFailure(workspace, 'raw_sha256 duplicado declarado unique');
    });
  });

  it('rejects a physically rebound receipt whose previous hash breaks causality', async () => {
    await withWorkspace(async (workspace) => {
      const registry = await workspace.readYaml<RegistryFixture>(REGISTRY);
      const entry = findEntry(registry, PROPOSAL_ID);
      const binding = entry.receipt_bindings?.[1];
      if (binding === undefined) throw new Error('Missing proposal receipt binding fixture.');
      const receipt = await workspace.readYaml<{previous_receipt_sha256: string}>(binding.path);
      receipt.previous_receipt_sha256 = 'b'.repeat(64);
      await workspace.writeYaml(binding.path, receipt);
      binding.sha256 = sha256Fixture(await workspace.readBytes(binding.path));
      await workspace.writeYaml(REGISTRY, registry);
      expectRunnerFailure(workspace, 'previous receipt SHA-256 chain is broken');
    });
  });

  it('rejects an out-of-order generic transition through the real receipt parser', async () => {
    await withWorkspace(async (workspace) => {
      const locator = 'receipts/imports/20260719-SRC-SYNTH-VS001-quarantined.yml';
      const receipt = await workspace.readYaml<{
        transition: {from: string | null; to: string};
      }>(locator);
      receipt.transition.from = null;
      await workspace.writeYaml(locator, receipt);
      expectRunnerFailure(workspace, 'cadena causal de receipts no coincide con current_state');
    });
    await withWorkspace(async (workspace) => {
      const locator = 'receipts/imports/20260719-SRC-SYNTH-VS001-active.yml';
      const receipt = await workspace.readYaml<{actor_id: string; verifier_id: string}>(locator);
      receipt.verifier_id = receipt.actor_id;
      await workspace.writeYaml(locator, receipt);
      expectRunnerFailure(workspace, 'actor y verifier colapsan');
    });
  });
});
