import {createHash} from 'node:crypto';

import type {SourceRegistryCheck, SourceRegistryCheckEntry} from './registry-schema.ts';

const sha256Text = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

const claimsUnique = (entry: SourceRegistryCheckEntry): boolean =>
  entry.deduplication.verdict.includes('unique');

const validateDuplicateGroups = (
  label: string,
  groups: ReadonlyMap<string, SourceRegistryCheckEntry[]>,
): string[] => {
  const errors: string[] = [];
  for (const entries of groups.values()) {
    if (entries.length < 2) continue;
    const ids = entries.map(({source_id: sourceId}) => sourceId).join(', ');
    if (entries.some(claimsUnique)) {
      errors.push(`${label} duplicado declarado unique: ${ids}`);
    }
    if (entries.some(({current_state: state}) => state === 'active')) {
      errors.push(`${label} duplicado no puede permanecer active: ${ids}`);
    }
  }
  return errors;
};

const groupEntries = (
  entries: readonly SourceRegistryCheckEntry[],
  value: (entry: SourceRegistryCheckEntry) => string | null | undefined,
): Map<string, SourceRegistryCheckEntry[]> => {
  const groups = new Map<string, SourceRegistryCheckEntry[]>();
  for (const entry of entries) {
    const key = value(entry);
    if (key === undefined || key === null) continue;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
};

export const validateSourceDeduplication = (registry: SourceRegistryCheck): string[] => {
  const errors: string[] = [];
  for (const entry of registry.entries) {
    if ((entry.canonical_uri === undefined) !== (entry.canonical_uri_sha256 === undefined)) {
      errors.push(`${entry.source_id}: canonical URI y su hash deben declararse juntos`);
    } else if (
      entry.canonical_uri !== undefined &&
      sha256Text(entry.canonical_uri) !== entry.canonical_uri_sha256
    ) {
      errors.push(`${entry.source_id}: canonical_uri_sha256 no liga la URI exacta`);
    }
    if (
      entry.current_state === 'active' &&
      entry.deduplication.checked_against_registry === undefined
    ) {
      errors.push(`${entry.source_id}: active sin deduplicación ligada al registry`);
    }
  }
  const entries = registry.entries;
  errors.push(
    ...validateDuplicateGroups(
      'canonical_uri',
      groupEntries(entries, (entry) => entry.canonical_uri),
    ),
    ...validateDuplicateGroups(
      'raw_sha256',
      groupEntries(entries, (entry) => entry.hashes.raw_sha256),
    ),
    ...validateDuplicateGroups(
      'source_normalized_sha256',
      groupEntries(entries, (entry) => entry.hashes.source_normalized_sha256),
    ),
  );
  return errors;
};
