import {existsSync, readFileSync, realpathSync, statSync} from 'node:fs';
import {basename, isAbsolute, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {z} from 'zod';
export const PRINCIPLE_REGISTRY_REF = '02_proceso/governance/principle-conformance-registry.yml';
export const EXPECTED_PRINCIPLE_IDS = Array.from(
  {length: 16},
  (_, index) => `PC-${String(index + 1).padStart(2, '0')}`,
);
const PortableRefSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !isAbsolute(value) &&
      !value.startsWith('file:') &&
      !value.includes('\\') &&
      !/(^|\/)\.\.(\/|$)/u.test(value),
    'Expected a portable repository-relative path',
  );
const EvidenceTagSchema = z.enum([
  '[CÓDIGO]',
  '[CONFIG]',
  '[DOC]',
  '[INFERENCIA]',
  '[SUPUESTO]',
  'coverage_gap',
]);
const SourceRefSchema = z.strictObject({
  path: PortableRefSchema,
  anchor: z.string().min(1),
  evidence_tag: EvidenceTagSchema,
});
const Ref = PortableRefSchema;
const PartialControlRefSchema = z.strictObject({implementation_ref: Ref});
const ControlRefSchema = z.strictObject({implementation_ref: Ref, aggregate_ref: Ref});
const EnforcementSchema = z.strictObject({
  control_refs: z.array(ControlRefSchema).min(1),
  test_refs: z.array(PortableRefSchema).min(1),
  fail_effect: z.literal('BLOCK'),
});
const GapSchema = z.strictObject({
  missing_control: z.string().min(1),
  blocking_effect: z.literal('BLOCK'),
});
const EntryBaseShape = {
  id: z.string().regex(/^PC-\d{2}$/u),
  key: z.string().regex(/^[a-z][a-z0-9_]*$/u),
  requirement: z.string().min(1),
  responsible: z.string().min(1),
  source_refs: z.array(SourceRefSchema).min(1),
  partial_control_refs: z.array(PartialControlRefSchema).optional(),
  limit: z.string().min(1),
};
const PrincipleEntrySchema = z.discriminatedUnion('status', [
  z.strictObject({
    ...EntryBaseShape,
    status: z.literal('ENFORCED'),
    evidence_tag: z.enum(['[CÓDIGO]', '[CONFIG]']),
    enforcement: EnforcementSchema,
  }),
  z.strictObject({
    ...EntryBaseShape,
    status: z.literal('GAP'),
    evidence_tag: z.literal('coverage_gap'),
    gap: GapSchema,
  }),
]);
export const PrincipleConformanceRegistrySchema = z.strictObject({
  schema_version: z.literal(1),
  registry_id: z.literal('principle-conformance-v1'),
  source_of_truth: z.literal(true),
  unknown_defaults_to: z.literal('GAP'),
  principles: z.array(PrincipleEntrySchema).length(16),
});
export type PrincipleConformanceRegistry = z.infer<typeof PrincipleConformanceRegistrySchema>;
const OwnershipSchema = z.object({
  writers: z.record(z.string(), z.array(z.string().min(1))),
  non_writers: z.record(z.string(), z.unknown()).optional(),
});
export const loadPrincipleConformanceRegistry = (
  root = process.cwd(),
): PrincipleConformanceRegistry =>
  PrincipleConformanceRegistrySchema.parse(
    parse(readFileSync(resolve(root, PRINCIPLE_REGISTRY_REF), 'utf8')),
  );
const validateFileRef = (root: string, ref: string, label: string): string[] => {
  const absolute = resolve(root, ref);
  if (!existsSync(absolute)) return [`${label}: referencia inexistente ${ref}`];
  const rootReal = realpathSync(root);
  const targetReal = realpathSync(absolute);
  const fromRoot = relative(rootReal, targetReal);
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    return [`${label}: referencia escapa del repositorio ${ref}`];
  }
  if (!statSync(targetReal).isFile()) return [`${label}: referencia no es archivo ${ref}`];
  return [];
};
export const validatePrincipleConformance = (
  root: string,
  registry: PrincipleConformanceRegistry,
): string[] => {
  const errors: string[] = [];
  const ownershipPath = resolve(root, '01_intencion/program/ownership-manifest.yml');
  let owners = new Set<string>();
  try {
    const ownership = OwnershipSchema.parse(parse(readFileSync(ownershipPath, 'utf8')));
    owners = new Set([
      ...Object.keys(ownership.writers),
      ...Object.keys(ownership.non_writers ?? {}),
    ]);
  } catch (error) {
    return [`ownership-manifest invalido: ${String(error)}`];
  }
  const ids = registry.principles.map(({id}) => id);
  const keys = registry.principles.map(({key}) => key);
  if (new Set(ids).size !== ids.length) errors.push('principle id duplicado');
  if (new Set(keys).size !== keys.length) errors.push('principle key duplicado');
  if ([...ids].sort().join('|') !== EXPECTED_PRINCIPLE_IDS.join('|')) {
    errors.push(`principios requeridos: ${EXPECTED_PRINCIPLE_IDS.join(', ')}`);
  }
  for (const principle of registry.principles) {
    const label = principle.id;
    if (!owners.has(principle.responsible)) {
      errors.push(`${label}: responsible no resoluble ${principle.responsible}`);
    }
    for (const source of principle.source_refs) {
      const refErrors = validateFileRef(root, source.path, `${label} source`);
      errors.push(...refErrors);
      if (refErrors.length === 0) {
        const content = readFileSync(resolve(root, source.path), 'utf8');
        if (!content.includes(source.anchor)) {
          errors.push(`${label}: anchor ausente en ${source.path}: ${source.anchor}`);
        }
      }
    }
    for (const control of principle.partial_control_refs ?? []) {
      errors.push(...validateFileRef(root, control.implementation_ref, `${label} partial control`));
    }
    if (principle.status !== 'ENFORCED') continue;
    for (const control of principle.enforcement.control_refs) {
      const implementationErrors = validateFileRef(
        root,
        control.implementation_ref,
        `${label} control`,
      );
      const aggregateErrors = validateFileRef(root, control.aggregate_ref, `${label} aggregate`);
      errors.push(...implementationErrors, ...aggregateErrors);
      if (implementationErrors.length === 0 && aggregateErrors.length === 0) {
        const aggregate = readFileSync(resolve(root, control.aggregate_ref), 'utf8');
        const implementationName = basename(control.implementation_ref);
        if (!aggregate.includes(implementationName)) {
          errors.push(
            `${label}: aggregate ${control.aggregate_ref} no referencia ${implementationName}`,
          );
        }
      }
    }
    for (const testRef of principle.enforcement.test_refs) {
      errors.push(...validateFileRef(root, testRef, `${label} test`));
    }
  }
  return errors;
};
export const summarizePrincipleConformance = (registry: PrincipleConformanceRegistry) => {
  const enforced = registry.principles.filter(({status}) => status === 'ENFORCED').length;
  const gaps = registry.principles.length - enforced;
  return {
    total: registry.principles.length,
    enforced,
    gaps,
    conformance: gaps > 0 ? 'GAP' : 'ENFORCED',
  };
};
const main = (): void => {
  try {
    const registry = loadPrincipleConformanceRegistry();
    const errors = validatePrincipleConformance(process.cwd(), registry);
    if (errors.length > 0) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
      return;
    }
    const summary = summarizePrincipleConformance(registry);
    console.info(
      `REGISTRY_VALID: principles=${summary.total} enforced=${summary.enforced} gaps=${summary.gaps}`,
    );
    console.info(`CONFORMANCE=${summary.conformance}`);
    for (const principle of registry.principles) {
      if (principle.status === 'GAP') {
        console.warn(`[coverage_gap] ${principle.id}: ${principle.gap.missing_control}`);
      }
    }
  } catch (error) {
    console.error(`principle-conformance invalido: ${String(error)}`);
    process.exitCode = 1;
  }
};
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
