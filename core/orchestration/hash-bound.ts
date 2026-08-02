import {createHash} from 'node:crypto';
import {readFile, realpath} from 'node:fs/promises';
import {isAbsolute, relative, resolve} from 'node:path';

import {
  CandidatePackageV2Schema,
  CanonicalEditorialUnitV1Schema,
  ContentTypeDefinitionV1Schema,
  ContentWorkOrderV2Schema,
  DistributionVariantV1Schema,
  HashBoundReferenceV1Schema,
  OrchestrationRunV2Schema,
  withoutDeclaredSha256,
  type CandidatePackageV2,
  type CanonicalEditorialUnitV1,
  type ContentTypeDefinitionV1,
  type ContentWorkOrderV2,
  type DistributionVariantV1,
  type HashBoundReferenceV1,
  type OrchestrationRunV2,
} from '../contracts/index.ts';
import {hashCanonical} from '../evidence/hash.ts';
import {failOrchestration} from './errors.ts';

export const computeDeclaredContractSha256 = (value: object, digestField: string): string =>
  hashCanonical(withoutDeclaredSha256(value, digestField));

export const assertDeclaredContractSha256 = (value: object, digestField: string): void => {
  const descriptor = Object.getOwnPropertyDescriptor(value, digestField);
  const digest: unknown = descriptor?.value;
  if (typeof digest !== 'string' || computeDeclaredContractSha256(value, digestField) !== digest) {
    failOrchestration('ORCH_V2_HASH_MISMATCH', `Canonical SHA-256 mismatch for ${digestField}.`);
  }
};

export const verifyHashBoundFile = async (
  root: string,
  input: HashBoundReferenceV1,
): Promise<void> => {
  const binding = HashBoundReferenceV1Schema.parse(input);
  const resolvedRoot = await realpath(root);
  const resolvedTarget = await realpath(resolve(resolvedRoot, binding.ref));
  const relativeTarget = relative(resolvedRoot, resolvedTarget);
  if (relativeTarget === '' || relativeTarget.startsWith('..') || isAbsolute(relativeTarget)) {
    failOrchestration(
      'ORCH_V2_HASH_MISMATCH',
      `Hash-bound reference escapes the governed root: ${binding.ref}.`,
    );
  }
  const raw = await readFile(resolvedTarget);
  const digest = createHash('sha256').update(raw).digest('hex');
  if (digest !== binding.sha256) {
    failOrchestration('ORCH_V2_HASH_MISMATCH', `File digest mismatch for ${binding.ref}.`);
  }
};

const parseDeclaredHash = <T extends object>(
  input: unknown,
  parser: {parse(value: unknown): T},
  digestField: string,
): T => {
  const parsed = parser.parse(input);
  assertDeclaredContractSha256(parsed, digestField);
  return parsed;
};

export const parseHashBoundContentWorkOrderV2 = (input: unknown): ContentWorkOrderV2 =>
  parseDeclaredHash(input, ContentWorkOrderV2Schema, 'canonicalSha256');

export const parseHashBoundCanonicalEditorialUnitV1 = (input: unknown): CanonicalEditorialUnitV1 =>
  parseDeclaredHash(input, CanonicalEditorialUnitV1Schema, 'canonicalSha256');

export const parseHashBoundContentTypeDefinitionV1 = (input: unknown): ContentTypeDefinitionV1 =>
  parseDeclaredHash(input, ContentTypeDefinitionV1Schema, 'definitionSha256');

export const parseHashBoundDistributionVariantV1 = (input: unknown): DistributionVariantV1 =>
  parseDeclaredHash(input, DistributionVariantV1Schema, 'canonicalSha256');

export const parseHashBoundCandidatePackageV2 = (input: unknown): CandidatePackageV2 =>
  parseDeclaredHash(input, CandidatePackageV2Schema, 'packageSha256');

export const parseHashBoundOrchestrationRunV2 = (input: unknown): OrchestrationRunV2 =>
  parseDeclaredHash(input, OrchestrationRunV2Schema, 'runSha256');
