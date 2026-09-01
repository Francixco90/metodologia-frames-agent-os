import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

import {fileBytes, fileSha256} from './physical-validation.ts';
import type {SourceRegistryCheck} from './registry-schema.ts';

const ACTIVE_POLICIES: Readonly<Record<string, {rightsVerdict: string; authorityVerdict: string}>> =
  {
    first_party_synthetic_fixture: {
      rightsVerdict: 'allowed_local_test_only',
      authorityVerdict: 'verified_for_contract_testing_only',
    },
    product_requirements_authority: {
      rightsVerdict: 'allowed_internal_implementation',
      authorityVerdict: 'verified_product_requirements',
    },
    first_party_brand_bundle: {
      rightsVerdict: 'allowed_internal_editorial',
      authorityVerdict: 'verified_stable_projection_sources',
    },
    first_party_public_semantics: {
      rightsVerdict: 'allowed_internal_editorial',
      authorityVerdict: 'verified_first_party_public_semantics',
    },
  };

export const validateSourceLifecycleView = (
  root: string,
  registry: SourceRegistryCheck,
): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of registry.entries) {
    if (ids.has(entry.source_id)) errors.push(`source_id duplicado: ${entry.source_id}`);
    ids.add(entry.source_id);

    for (const receipt of entry.receipts) {
      if (
        receipt.startsWith('/') ||
        receipt.includes('..') ||
        !existsSync(resolve(root, receipt))
      ) {
        errors.push(`${entry.source_id}: receipt no portable o inexistente: ${receipt}`);
      }
    }

    if (entry.current_state === 'active') {
      validateActiveEntry(root, entry, errors);
    } else if (
      (entry.hashes.raw_sha256 === null || entry.hashes.source_normalized_sha256 === null) &&
      (entry.coverage_gaps?.length ?? 0) === 0
    ) {
      errors.push(`${entry.source_id}: hash ausente sin coverage_gap`);
    }
  }
  return errors;
};

const validateActiveEntry = (
  root: string,
  entry: SourceRegistryCheck['entries'][number],
  errors: string[],
): void => {
  if (entry.hashes.raw_sha256 === null || entry.hashes.source_normalized_sha256 === null) {
    errors.push(`${entry.source_id}: active sin hashes raw+source_normalized`);
  }
  if (entry.hashes.normalized_sha256 !== entry.hashes.source_normalized_sha256) {
    errors.push(`${entry.source_id}: alias normalized_sha256 no coincide con el hash canónico`);
  }
  if (entry.receipts.length < 4) {
    errors.push(`${entry.source_id}: active sin lifecycle receipts completos`);
  }
  if (entry.portable_locator === undefined || entry.portable_locator_role === undefined) {
    errors.push(`${entry.source_id}: active sin locator portable tipado`);
  } else if (
    entry.portable_locator.startsWith('/') ||
    entry.portable_locator.includes('..') ||
    !existsSync(resolve(root, entry.portable_locator))
  ) {
    errors.push(`${entry.source_id}: locator portable inexistente o inseguro`);
  } else if (entry.portable_locator_role === 'source_material') {
    validateSourceMaterial(root, entry, errors);
  } else if (entry.projection === undefined) {
    errors.push(`${entry.source_id}: locator derived_projection sin metadata de proyección`);
  } else {
    validateProjection(root, entry, entry.projection, errors);
  }
  const policy = ACTIVE_POLICIES[entry.source_kind];
  if (policy === undefined) {
    errors.push(`${entry.source_id}: source_kind no admitido para estado active`);
  } else {
    if (entry.rights.rights_verdict !== policy.rightsVerdict) {
      errors.push(`${entry.source_id}: active sin rights compatibles con ${entry.source_kind}`);
    }
    if (entry.authority.authority_verdict !== policy.authorityVerdict) {
      errors.push(`${entry.source_id}: active sin autoridad compatible con ${entry.source_kind}`);
    }
  }
};

const validateSourceMaterial = (
  root: string,
  entry: SourceRegistryCheck['entries'][number],
  errors: string[],
): void => {
  const locator = entry.portable_locator;
  if (
    locator !== undefined &&
    entry.hashes.source_normalized_sha256 !== null &&
    fileSha256(resolve(root, locator)) !== entry.hashes.source_normalized_sha256
  ) {
    errors.push(`${entry.source_id}: source material no coincide con source_normalized_sha256`);
  }
  if (entry.projection !== undefined) {
    errors.push(`${entry.source_id}: source material no puede declararse como proyección`);
  }
};

const validateProjection = (
  root: string,
  entry: SourceRegistryCheck['entries'][number],
  projection: NonNullable<SourceRegistryCheck['entries'][number]['projection']>,
  errors: string[],
): void => {
  const projectionPath = resolve(root, projection.projection_locator);
  if (
    projection.projection_locator !== entry.portable_locator ||
    fileSha256(projectionPath) !== projection.projection_sha256 ||
    fileBytes(projectionPath) !== projection.projection_bytes
  ) {
    errors.push(`${entry.source_id}: artefacto de proyección no coincide con registry`);
  }
  if (projection.derived_from_source_normalized_sha256 !== entry.hashes.source_normalized_sha256) {
    errors.push(`${entry.source_id}: proyección no deriva del hash normalizado canónico`);
  }
};
