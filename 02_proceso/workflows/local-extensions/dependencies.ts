import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parse as parseYaml} from 'yaml';

import type {LocalExtensionManifest, LocalExtensionRecord} from './contracts.ts';
import {containedFile} from './paths.ts';

const sha256 = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
const safeReason = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.startsWith('LOCAL_EXTENSION_') ? error.message : fallback;

export const parseLocalExtensionManifestFileV1 = (path: string): unknown => {
  const text = readFileSync(path, 'utf8');
  return path.endsWith('.json') ? JSON.parse(text) : parseYaml(text);
};

export const sameExtensionEvidenceV1 = (
  left: readonly {ref: string; sha256: string}[],
  right: readonly {ref: string; sha256: string}[],
): boolean => {
  const normalized = (values: readonly {ref: string; sha256: string}[]) =>
    [...values].map(({ref, sha256: digest}) => `${ref}\u0000${digest}`).sort();
  const first = normalized(left);
  const second = normalized(right);
  return (
    new Set(left.map(({ref}) => ref)).size === left.length &&
    new Set(right.map(({ref}) => ref)).size === right.length &&
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
};

export const validatePackageContent = (
  root: string,
  manifest: LocalExtensionManifest,
): string[] => {
  const reasons: string[] = [];
  const seen = new Set<string>();
  for (const item of manifest.content) {
    if (['extension.yml', 'extension.yaml', 'extension.json'].includes(item.ref)) {
      reasons.push('MANIFEST_CANNOT_HASH_ITSELF');
    }
    if (seen.has(item.ref)) reasons.push('DUPLICATE_CONTENT_REF');
    seen.add(item.ref);
    try {
      const path = containedFile(root, item.ref);
      if (sha256(readFileSync(path)) !== item.sha256) reasons.push('CONTENT_HASH_MISMATCH');
    } catch (error) {
      reasons.push(safeReason(error, 'CONTENT_UNREADABLE'));
    }
  }
  const requiredRefs = [
    ...manifest.documentation,
    manifest.fixtures.positive,
    manifest.fixtures.adversarial,
  ];
  for (const ref of requiredRefs) {
    if (!seen.has(ref)) reasons.push('REQUIRED_REF_NOT_HASHED');
    try {
      containedFile(root, ref);
    } catch (error) {
      reasons.push(safeReason(error, 'REQUIRED_FILE_UNREADABLE'));
    }
  }
  return [...new Set(reasons)].sort();
};

const cyclicIds = (records: readonly LocalExtensionRecord[]): Set<string> => {
  const graph = new Map(
    records
      .filter((record) => record.manifest)
      .map((record) => [record.extension_id, record.manifest?.dependencies ?? []]),
  );
  const cycles = new Set<string>();
  const visit = (id: string, trail: string[]): void => {
    const index = trail.indexOf(id);
    if (index >= 0) {
      for (const item of trail.slice(index)) cycles.add(item);
      return;
    }
    for (const dependency of graph.get(id) ?? []) visit(dependency, [...trail, id]);
  };
  for (const id of graph.keys()) visit(id, []);
  return cycles;
};

export const applyDependencyBlocks = (records: LocalExtensionRecord[]): void => {
  const cycles = cyclicIds(records);
  for (const record of records.filter((item) => cycles.has(item.extension_id))) {
    record.state = 'BLOCKED';
    record.reason_codes = [
      ...new Set([...record.reason_codes, 'CIRCULAR_LOCAL_DEPENDENCY']),
    ].sort();
  }
  let changed = true;
  while (changed) {
    changed = false;
    const known = new Set(
      records.filter((record) => record.state !== 'BLOCKED').map((record) => record.extension_id),
    );
    const active = new Set(
      records
        .filter((record) => record.state === 'ACTIVE_LOCAL')
        .map((record) => record.extension_id),
    );
    for (const record of records) {
      const dependencies = record.manifest?.dependencies ?? [];
      const missing = dependencies.some((dependency) => !known.has(dependency));
      const inactive =
        record.state === 'ACTIVE_LOCAL' &&
        dependencies.some((dependency) => !active.has(dependency));
      if (missing && record.state !== 'BLOCKED') {
        record.state = 'BLOCKED';
        record.reason_codes = [
          ...new Set([...record.reason_codes, 'MISSING_LOCAL_DEPENDENCY']),
        ].sort();
        changed = true;
      } else if (inactive) {
        record.state = 'BLOCKED';
        record.reason_codes = [
          ...new Set([...record.reason_codes, 'LOCAL_DEPENDENCY_NOT_ACTIVE']),
        ].sort();
        changed = true;
      }
    }
  }
};
