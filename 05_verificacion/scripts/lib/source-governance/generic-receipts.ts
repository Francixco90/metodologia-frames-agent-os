import {parse} from 'yaml';
import {z} from 'zod';

import {containsPrivateLocator, readPortableFile} from './physical-validation.ts';
import type {SourceRegistryCheck, SourceRegistryCheckEntry} from './registry-schema.ts';

const SourceStateSchema = z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']);
const ReceiptBaseSchema = z
  .object({
    receipt_id: z.string().trim().min(1),
    recorded_at: z.string().trim().min(1),
    event_order: z.number().int().positive(),
    actor_id: z.string().trim().min(1),
    verifier_id: z.string().trim().min(1).optional(),
    package_id: z.string().trim().min(1),
    source_id: z.string().regex(/^SRC-[A-Z0-9-]+$/u),
    append_only: z.literal(true),
  })
  .passthrough();
const TransitionReceiptSchema = ReceiptBaseSchema.extend({
  transition: z.object({from: SourceStateSchema.nullable(), to: SourceStateSchema}).strict(),
});
const MigrationReceiptSchema = ReceiptBaseSchema.extend({
  receipt_kind: z.literal('hash_semantics_migration'),
  state_preserved: SourceStateSchema,
});

type TransitionReceipt = z.infer<typeof TransitionReceiptSchema>;
type ReceiptIdentity = Pick<TransitionReceipt, 'event_order' | 'receipt_id' | 'source_id'>;

const EXPECTED_TRANSITIONS = [
  {from: null, to: 'candidate'},
  {from: 'candidate', to: 'quarantined'},
  {from: 'quarantined', to: 'evaluated'},
  {from: 'evaluated', to: 'active'},
  {from: 'active', to: 'deprecated'},
] as const;

const validatesIdentity = (
  identity: ReceiptIdentity,
  entry: SourceRegistryCheckEntry,
  receiptIds: Set<string>,
  errors: string[],
): void => {
  if (receiptIds.has(identity.receipt_id)) {
    errors.push(`${entry.source_id}: receipt_id duplicado: ${identity.receipt_id}`);
  }
  receiptIds.add(identity.receipt_id);
  const suffix = `-${String(identity.event_order).padStart(3, '0')}`;
  if (
    identity.source_id !== entry.source_id ||
    !identity.receipt_id.includes(`-${entry.source_id}-`) ||
    !identity.receipt_id.endsWith(suffix)
  ) {
    errors.push(`${entry.source_id}: receipt_id no está ligado a source_id y event_order`);
  }
};

const validateActorSeparation = (
  entry: SourceRegistryCheckEntry,
  receipts: readonly TransitionReceipt[],
  errors: string[],
): void => {
  for (const receipt of receipts) {
    if (receipt.verifier_id !== undefined && receipt.verifier_id === receipt.actor_id) {
      errors.push(`${entry.source_id}: actor y verifier colapsan en event ${receipt.event_order}`);
    }
  }
  const producer = receipts[0]?.actor_id;
  const evaluated = receipts.find(({transition}) => transition.to === 'evaluated');
  if (evaluated !== undefined && evaluated.actor_id === producer) {
    errors.push(`${entry.source_id}: evaluación no separa producer y verifier`);
  }
  const active = receipts.find(({transition}) => transition.to === 'active');
  if (
    active !== undefined &&
    (active.verifier_id === undefined || active.verifier_id !== evaluated?.actor_id)
  ) {
    errors.push(`${entry.source_id}: activación no acredita verifier causal distinto`);
  }
};

const validateEntryReceipts = (
  root: string,
  entry: SourceRegistryCheckEntry,
  receiptIds: Set<string>,
  paths: Set<string>,
): string[] => {
  const errors: string[] = [];
  const transitions: TransitionReceipt[] = [];
  for (const receiptPath of entry.receipts) {
    if (paths.has(receiptPath)) errors.push(`${entry.source_id}: receipt path reutilizado`);
    paths.add(receiptPath);
    const bytes = readPortableFile(root, entry.source_id, receiptPath, errors);
    if (bytes === undefined) continue;
    if (containsPrivateLocator(bytes)) {
      errors.push(`${entry.source_id}: receipt contiene locator local privado: ${receiptPath}`);
    }
    let value: unknown;
    try {
      value = parse(new TextDecoder().decode(bytes)) as unknown;
    } catch (error) {
      errors.push(`${entry.source_id}: receipt YAML inválido: ${String(error)}`);
      continue;
    }
    const transition = TransitionReceiptSchema.safeParse(value);
    if (transition.success) {
      validatesIdentity(transition.data, entry, receiptIds, errors);
      transitions.push(transition.data);
      continue;
    }
    const migration = MigrationReceiptSchema.safeParse(value);
    if (!migration.success) {
      errors.push(`${entry.source_id}: receipt genérico no cumple contrato: ${receiptPath}`);
      continue;
    }
    validatesIdentity(migration.data, entry, receiptIds, errors);
    if (
      migration.data.state_preserved !== entry.current_state ||
      migration.data.event_order <= transitions.length
    ) {
      errors.push(`${entry.source_id}: receipt de migración rompe orden o estado preservado`);
    }
  }
  const expected = EXPECTED_TRANSITIONS.slice(
    0,
    EXPECTED_TRANSITIONS.findIndex(({to}) => to === entry.current_state) + 1,
  );
  if (
    transitions.length !== expected.length ||
    transitions.some(
      (receipt, index) =>
        receipt.event_order !== index + 1 ||
        receipt.transition.from !== expected[index]?.from ||
        receipt.transition.to !== expected[index]?.to,
    )
  ) {
    errors.push(`${entry.source_id}: cadena causal de receipts no coincide con current_state`);
  }
  validateActorSeparation(entry, transitions, errors);
  return errors;
};

export const validateGenericReceiptChains = (
  root: string,
  registry: SourceRegistryCheck,
): string[] => {
  const errors: string[] = [];
  const receiptIds = new Set<string>();
  const paths = new Set<string>();
  for (const entry of registry.entries) {
    if (entry.source_kind !== 'pinned_repository_implementation_source') {
      errors.push(...validateEntryReceipts(root, entry, receiptIds, paths));
    }
  }
  return errors;
};
