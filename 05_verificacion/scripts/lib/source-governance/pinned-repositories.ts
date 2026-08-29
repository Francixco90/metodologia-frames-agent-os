import {
  PinnedRepositorySourceEntryV2Schema,
  auditPinnedRepositorySourceV2,
} from '../../../../02_proceso/core/contracts/source-governance-v2.ts';
import type {LoadedSourceGovernance} from './parser.ts';
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
  {registry, lifecycle}: LoadedSourceGovernance,
): string[] => {
  const errors: string[] = [];
  const pinnedEntries = registry.entries.filter(
    ({source_kind: sourceKind}) => sourceKind === 'pinned_repository_implementation_source',
  );
  const pinnedIds = new Set(pinnedEntries.map(({source_id: sourceId}) => sourceId));
  if (
    pinnedIds.size !== EXPECTED_PINNED_REPOSITORIES.size ||
    [...EXPECTED_PINNED_REPOSITORIES.keys()].some((sourceId) => !pinnedIds.has(sourceId))
  ) {
    errors.push('Las dos fuentes donantes fijadas no están registradas exactamente una vez');
  }

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
      entry.current_state !== lifecycle.repository_sources.maximum_state_without_h01 ||
      entry.rights.rights_verdict !== lifecycle.repository_sources.rights_verdict ||
      entry.rights.allowed_use_scope !== lifecycle.repository_sources.allowed_use_scope ||
      entry.restrictions.some(
        (restriction, index) => restriction !== lifecycle.repository_sources.restrictions[index],
      )
    ) {
      errors.push(`${entry.source_id}: estado, rights o límites exceden el contrato lifecycle`);
    }
    errors.push(...auditPinnedRepositoryEvidence(root, entry, errors));
  }
  return errors;
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
