import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {ProjectLocalSourceRegisterScopeReceiptV1Schema} from '../../../../02_proceso/core/contracts/source-governance-v2/receipt-schemas.ts';
import {containsPrivateLocator} from './physical-validation.ts';
import {ProjectLocalSourceRegisterSchema, SourceRegistryCheckSchema} from './registry-schema.ts';

const formatIssues = (label: string, issues: z.core.$ZodIssue[]): string =>
  `${label}: ${issues.map(({message, path}) => `${path.join('.')}: ${message}`).join('; ')}`;

const GlobalLifecycleAuthoritySchema = z
  .object({
    schema_version: z.literal(2),
    contract_id: z.literal('source-promotion-v2'),
    mutation_policy: z.literal('append-only-events'),
  })
  .passthrough();

export const PROJECT_LOCAL_REGISTER =
  '03_artefactos/projects/agentic-workflow-adoption-v1/source-register.yml';
export const PROJECT_LOCAL_SCOPE_RECEIPT =
  '03_artefactos/projects/agentic-workflow-adoption-v1/receipts/source-register-project-local-scope-v1.yml';

export type LoadedGlobalSourceGovernance = {
  registry: z.infer<typeof SourceRegistryCheckSchema>;
  lifecycle: z.infer<typeof GlobalLifecycleAuthoritySchema>;
  registryRaw: string;
  lifecycleRaw: string;
};

export type LoadedProjectLocalSourceGovernance = LoadedGlobalSourceGovernance & {
  projectLocal: z.infer<typeof ProjectLocalSourceRegisterSchema>;
  projectLocalRaw: string;
  scopeReceipt: z.infer<typeof ProjectLocalSourceRegisterScopeReceiptV1Schema>;
};

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const loadGlobalSourceGovernance = (
  root: string,
  errors: string[],
): LoadedGlobalSourceGovernance | undefined => {
  let registryRaw: string;
  let lifecycleRaw: string;
  try {
    registryRaw = readFileSync(resolve(root, 'registries/sources/source-registry.yml'), 'utf8');
    lifecycleRaw = readFileSync(resolve(root, 'registries/sources/lifecycle-contract.yml'), 'utf8');
  } catch (error) {
    errors.push(`global source governance files unreadable: ${String(error)}`);
    return undefined;
  }
  if (containsPrivateLocator(registryRaw)) {
    errors.push('source-registry.yml contiene un locator local absoluto');
  }
  if (containsPrivateLocator(lifecycleRaw)) {
    errors.push('lifecycle-contract.yml contiene un locator local absoluto');
  }
  let registryValue: unknown;
  let lifecycleValue: unknown;
  try {
    registryValue = parse(registryRaw) as unknown;
    lifecycleValue = parse(lifecycleRaw) as unknown;
  } catch (error) {
    errors.push(`global source governance YAML inválido: ${String(error)}`);
    return undefined;
  }
  const registryResult = SourceRegistryCheckSchema.safeParse(registryValue);
  if (!registryResult.success) {
    errors.push(formatIssues('source-registry.yml inválido', registryResult.error.issues));
  }
  const lifecycleResult = GlobalLifecycleAuthoritySchema.safeParse(lifecycleValue);
  if (!lifecycleResult.success) {
    errors.push(formatIssues('lifecycle-contract.yml inválido', lifecycleResult.error.issues));
  }
  if (!registryResult.success || !lifecycleResult.success) return undefined;
  return {
    registry: registryResult.data,
    lifecycle: lifecycleResult.data,
    registryRaw,
    lifecycleRaw,
  };
};

export const loadProjectLocalSourceGovernance = (
  root: string,
  errors: string[],
): LoadedProjectLocalSourceGovernance | undefined => {
  const global = loadGlobalSourceGovernance(root, errors);
  if (global === undefined) return undefined;
  let projectLocalRaw: string;
  let scopeReceiptRaw: string;
  try {
    projectLocalRaw = readFileSync(resolve(root, PROJECT_LOCAL_REGISTER), 'utf8');
    scopeReceiptRaw = readFileSync(resolve(root, PROJECT_LOCAL_SCOPE_RECEIPT), 'utf8');
  } catch (error) {
    errors.push(`PROJECT_LOCAL source governance files unreadable: ${String(error)}`);
    return undefined;
  }
  if (containsPrivateLocator(projectLocalRaw) || containsPrivateLocator(scopeReceiptRaw)) {
    errors.push('PROJECT_LOCAL source governance contiene un locator local absoluto');
  }
  let projectLocalValue: unknown;
  let scopeReceiptValue: unknown;
  try {
    projectLocalValue = parse(projectLocalRaw) as unknown;
    scopeReceiptValue = parse(scopeReceiptRaw) as unknown;
  } catch (error) {
    errors.push(`PROJECT_LOCAL source governance YAML inválido: ${String(error)}`);
    return undefined;
  }
  const projectLocalResult = ProjectLocalSourceRegisterSchema.safeParse(projectLocalValue);
  if (!projectLocalResult.success) {
    errors.push(
      formatIssues('source-register.yml PROJECT_LOCAL inválido', projectLocalResult.error.issues),
    );
  }
  const scopeReceiptResult =
    ProjectLocalSourceRegisterScopeReceiptV1Schema.safeParse(scopeReceiptValue);
  if (!scopeReceiptResult.success) {
    errors.push(
      formatIssues('scope receipt PROJECT_LOCAL inválido', scopeReceiptResult.error.issues),
    );
  }
  if (!projectLocalResult.success || !scopeReceiptResult.success) return undefined;
  const {global_authorities: authorities} = projectLocalResult.data;
  if (sha256(global.lifecycleRaw) !== authorities.lifecycle_contract.sha256) {
    errors.push('lifecycle-contract.yml global difiere del binding PROJECT_LOCAL');
  }
  if (sha256(global.registryRaw) !== authorities.source_registry.sha256) {
    errors.push('source-registry.yml global difiere del binding PROJECT_LOCAL');
  }
  if (
    scopeReceiptResult.data.register_id !== projectLocalResult.data.register_id ||
    scopeReceiptResult.data.register_sha256 !== sha256(projectLocalRaw)
  ) {
    errors.push('scope receipt PROJECT_LOCAL no liga el registro físico exacto');
  }
  return {
    ...global,
    projectLocal: projectLocalResult.data,
    projectLocalRaw,
    scopeReceipt: scopeReceiptResult.data,
  };
};

export const loadSourceGovernance = loadGlobalSourceGovernance;
