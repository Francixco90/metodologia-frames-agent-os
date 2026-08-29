import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {RepositorySourcePolicyV1Schema} from '../../../../02_proceso/core/contracts/source-governance-v2.ts';
import {containsPrivateLocator} from './physical-validation.ts';
import {SourceRegistryCheckSchema} from './registry-schema.ts';

const formatIssues = (label: string, issues: z.core.$ZodIssue[]): string =>
  `${label}: ${issues.map(({message, path}) => `${path.join('.')}: ${message}`).join('; ')}`;

export type LoadedSourceGovernance = {
  registry: z.infer<typeof SourceRegistryCheckSchema>;
  lifecycle: {repository_sources: z.infer<typeof RepositorySourcePolicyV1Schema>} & Record<
    string,
    unknown
  >;
};

export const loadSourceGovernance = (
  root: string,
  errors: string[],
): LoadedSourceGovernance | undefined => {
  let registryRaw: string;
  let lifecycleRaw: string;
  try {
    registryRaw = readFileSync(resolve(root, 'registries/sources/source-registry.yml'), 'utf8');
    lifecycleRaw = readFileSync(resolve(root, 'registries/sources/lifecycle-contract.yml'), 'utf8');
  } catch (error) {
    errors.push(`source governance files unreadable: ${String(error)}`);
    return undefined;
  }
  if (containsPrivateLocator(registryRaw)) {
    errors.push('source-registry.yml contiene un locator local absoluto');
  }
  let registryValue: unknown;
  let lifecycleValue: unknown;
  try {
    registryValue = parse(registryRaw) as unknown;
    lifecycleValue = parse(lifecycleRaw) as unknown;
  } catch (error) {
    errors.push(`source governance YAML inválido: ${String(error)}`);
    return undefined;
  }
  const registryResult = SourceRegistryCheckSchema.safeParse(registryValue);
  if (!registryResult.success) {
    errors.push(formatIssues('source-registry.yml inválido', registryResult.error.issues));
  }
  const lifecycleResult = z
    .object({repository_sources: RepositorySourcePolicyV1Schema})
    .passthrough()
    .safeParse(lifecycleValue);
  if (!lifecycleResult.success) {
    errors.push(formatIssues('lifecycle-contract.yml inválido', lifecycleResult.error.issues));
  }
  if (containsPrivateLocator(lifecycleRaw)) {
    errors.push('lifecycle-contract.yml contiene un locator local absoluto');
  }
  if (!registryResult.success || !lifecycleResult.success) return undefined;
  return {registry: registryResult.data, lifecycle: lifecycleResult.data};
};
