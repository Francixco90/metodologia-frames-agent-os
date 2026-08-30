import {
  PinnedRepositorySourceEntryV2Schema,
  auditPinnedRepositorySourceV2,
} from '../../../../02_proceso/core/contracts/source-governance-v2.ts';
import type {LoadedProjectLocalSourceGovernance} from './parser.ts';
import {containsPrivateLocator, readPortableFile} from './physical-validation.ts';

const EXPECTED_PINNED_REPOSITORIES: ReadonlyMap<
  string,
  {canonicalUri: string; commitObjectId: string; treeObjectId: string}
> = new Map([
  [
    'SRC-PROPOSAL-MEASURE-E0D6BA4',
    {
      canonicalUri: 'https://github.com/SepBaGer/Propuesta-Medida.git',
      commitObjectId: 'e0d6ba4576b23c83a6b22dbad53e23a8795b26d0',
      treeObjectId: '457920d64756549eb4862b2653e2bf293d332ab9',
    },
  ],
  [
    'SRC-TECHNICAL-DEFENSE-78FD383',
    {
      canonicalUri:
        'https://github.com/GermanMetodologIA/technical-defense-preparation-workflow.git',
      commitObjectId: '78fd3834acd38cf4b6ace7f7f1ed9c06893300f3',
      treeObjectId: '467691b625de2590171290d2dff779a791749f8c',
    },
  ],
]);

export const validatePinnedRepositories = (
  root: string,
  {registry, projectLocal, scopeReceipt}: LoadedProjectLocalSourceGovernance,
): string[] => {
  const errors: string[] = [];
  const pinnedEntries = projectLocal.entries;
  const pinnedIds = new Set(pinnedEntries.map(({source_id: sourceId}) => sourceId));
  if (
    pinnedIds.size !== EXPECTED_PINNED_REPOSITORIES.size ||
    [...EXPECTED_PINNED_REPOSITORIES.keys()].some((sourceId) => !pinnedIds.has(sourceId))
  ) {
    errors.push('Las dos fuentes donantes fijadas no están registradas exactamente una vez');
  }
  const globalIds = new Set(registry.entries.map(({source_id: sourceId}) => sourceId));
  if (pinnedEntries.some(({source_id: sourceId}) => globalIds.has(sourceId))) {
    errors.push('Una fuente donante PROJECT_LOCAL contaminó source-registry.yml global');
  }
  validateScopeReceiptBindings(
    projectLocal.entries,
    scopeReceipt.historical_receipt_bindings,
    errors,
  );
  validateScopedUnionDeduplication(registry.entries, pinnedEntries, errors);

  for (const candidate of pinnedEntries) {
    const parsed = PinnedRepositorySourceEntryV2Schema.safeParse(candidate);
    if (!parsed.success) {
      errors.push(
        `${candidate.source_id}: contrato pinned repository inválido: ${parsed.error.issues
          .map(({message, path}) => `${path.join('.')}: ${message}`)
          .join('; ')}`,
      );
      continue;
    }
    const entry = parsed.data;
    const expected = EXPECTED_PINNED_REPOSITORIES.get(entry.source_id);
    if (
      expected === undefined ||
      entry.repository_lock.canonical_uri !== expected.canonicalUri ||
      entry.repository_lock.commit_object_id !== expected.commitObjectId ||
      entry.repository_lock.tree_object_id !== expected.treeObjectId
    ) {
      errors.push(`${entry.source_id}: URI/commit/tree difieren del baseline donante congelado`);
    }
    if (
      entry.current_state !== projectLocal.policy.maximum_state_without_h01 ||
      entry.rights.rights_verdict !== projectLocal.policy.rights_verdict ||
      entry.rights.allowed_use_scope !== projectLocal.policy.allowed_use_scope ||
      entry.restrictions.some(
        (restriction, index) => restriction !== projectLocal.policy.restrictions[index],
      )
    ) {
      errors.push(`${entry.source_id}: estado, rights o límites exceden la policy PROJECT_LOCAL`);
    }
    if (
      !entry.coverage_gaps.includes(projectLocal.external_evidence_contract.required_coverage_gap)
    ) {
      errors.push(`${entry.source_id}: falta coverage_gap de evidencia externa no replayed`);
    }
    errors.push(...auditPinnedRepositoryEvidence(root, entry, errors));
  }
  return errors;
};

type ProjectLocalEntry = LoadedProjectLocalSourceGovernance['projectLocal']['entries'][number];
type ScopeReceiptBinding =
  LoadedProjectLocalSourceGovernance['scopeReceipt']['historical_receipt_bindings'][number];

const validateScopeReceiptBindings = (
  entries: readonly ProjectLocalEntry[],
  scopeBindings: readonly ScopeReceiptBinding[],
  errors: string[],
): void => {
  const bySource = new Map<string, ScopeReceiptBinding['receipts']>(
    scopeBindings.map((binding) => [binding.source_id, binding.receipts]),
  );
  for (const entry of entries) {
    const actual = bySource.get(entry.source_id);
    if (
      actual === undefined ||
      actual.some(
        (binding, index) =>
          binding.path !== entry.receipt_bindings[index]?.path ||
          binding.sha256 !== entry.receipt_bindings[index]?.sha256 ||
          binding.event_order !== entry.receipt_bindings[index]?.event_order,
      )
    ) {
      errors.push(`${entry.source_id}: scope receipt no liga la cadena histórica exacta`);
    }
  }
};

const validateScopedUnionDeduplication = (
  globalEntries: LoadedProjectLocalSourceGovernance['registry']['entries'],
  localEntries: readonly ProjectLocalEntry[],
  errors: string[],
): void => {
  const union = [
    ...globalEntries.map((entry) => ({scope: 'GLOBAL', entry}) as const),
    ...localEntries.map((entry) => ({scope: 'PROJECT_LOCAL', entry}) as const),
  ];
  for (const local of localEntries) {
    const keys = {
      canonical_uri: local.canonical_uri,
      raw_sha256: local.hashes.raw_sha256,
      source_normalized_sha256: local.hashes.source_normalized_sha256,
      commit_sha1: local.repository_lock.commit_object_id,
    };
    for (const candidate of union) {
      if (candidate.entry.source_id === local.source_id) continue;
      const repositoryLock = (candidate.entry as {repository_lock?: {commit_object_id?: string}})
        .repository_lock;
      const candidateKeys = {
        canonical_uri: candidate.entry.canonical_uri,
        raw_sha256: candidate.entry.hashes.raw_sha256,
        source_normalized_sha256: candidate.entry.hashes.source_normalized_sha256,
        commit_sha1: repositoryLock?.commit_object_id,
      };
      for (const key of Object.keys(keys) as Array<keyof typeof keys>) {
        if (candidateKeys[key] !== undefined && candidateKeys[key] === keys[key]) {
          errors.push(
            `${local.source_id}: colisión ${key} en dedupe GLOBAL+PROJECT_LOCAL con ${candidate.scope}:${candidate.entry.source_id}`,
          );
        }
      }
    }
  }
};

const auditPinnedRepositoryEvidence = (
  root: string,
  entry: ReturnType<typeof PinnedRepositorySourceEntryV2Schema.parse>,
  errors: string[],
): string[] => {
  const evidencePaths = new Set([
    entry.repository_lock.repository_descriptor.locator,
    entry.repository_lock.selected_paths_manifest.locator,
    entry.repository_lock.selected_paths_projection.locator,
    entry.repository_lock.rights_authorization_projection.locator,
    ...entry.receipt_bindings.map(({path}) => path),
  ]);
  if (evidencePaths.size !== 7) {
    errors.push(`${entry.source_id}: se requieren 4 evidencias y 3 receipts físicos distintos`);
  }
  const evidence = [];
  for (const path of evidencePaths) {
    const bytes = readPortableFile(root, entry.source_id, path, errors);
    if (bytes === undefined) continue;
    if (containsPrivateLocator(bytes)) {
      errors.push(`${entry.source_id}: evidencia contiene un locator local privado: ${path}`);
    }
    evidence.push({path, bytes});
  }
  return auditPinnedRepositorySourceV2({entry, evidence});
};
