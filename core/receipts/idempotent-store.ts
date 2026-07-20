import type {z} from 'zod';

import {ReleaseReceiptSchema, RenderReceiptSchema} from '../contracts/index.ts';
import {hashCanonical, immutableClone} from '../evidence/index.ts';

export class IdempotencyConflictError extends Error {
  public constructor(key: string) {
    super(`Idempotency key already exists with different content: ${key}`);
    this.name = 'IdempotencyConflictError';
  }
}

export class ReceiptIdentityConflictError extends Error {
  public constructor(receiptId: string) {
    super(`Receipt ID already exists with different content: ${receiptId}`);
    this.name = 'ReceiptIdentityConflictError';
  }
}

export interface ReceiptRecordResult<Receipt> {
  readonly receipt: Readonly<Receipt>;
  readonly receiptHash: string;
  readonly status: 'created' | 'replayed';
}

export class IdempotentReceiptStore<Receipt extends {idempotencyKey: string; receiptId: string}> {
  readonly #records = new Map<string, {receipt: Readonly<Receipt>; receiptHash: string}>();
  readonly #receiptIds = new Map<string, string>();

  public constructor(private readonly schema: z.ZodType<Receipt>) {}

  public record(input: unknown): ReceiptRecordResult<Receipt> {
    const parsed = this.schema.parse(input);
    const receiptHash = hashCanonical(parsed);
    const existing = this.#records.get(parsed.idempotencyKey);
    if (existing !== undefined) {
      if (existing.receiptHash !== receiptHash) {
        throw new IdempotencyConflictError(parsed.idempotencyKey);
      }
      return {
        receipt: immutableClone(existing.receipt),
        receiptHash: existing.receiptHash,
        status: 'replayed',
      };
    }
    const existingReceiptIdHash = this.#receiptIds.get(parsed.receiptId);
    if (existingReceiptIdHash !== undefined && existingReceiptIdHash !== receiptHash) {
      throw new ReceiptIdentityConflictError(parsed.receiptId);
    }

    const receipt = immutableClone(parsed);
    this.#records.set(parsed.idempotencyKey, {receipt, receiptHash});
    this.#receiptIds.set(parsed.receiptId, receiptHash);
    return {receipt: immutableClone(receipt), receiptHash, status: 'created'};
  }

  public get(idempotencyKey: string): Readonly<Receipt> | undefined {
    const receipt = this.#records.get(idempotencyKey)?.receipt;
    return receipt === undefined ? undefined : immutableClone(receipt);
  }

  public snapshot(): readonly Readonly<Receipt>[] {
    return immutableClone([...this.#records.values()].map(({receipt}) => receipt));
  }
}

export function createRenderReceiptStore(): IdempotentReceiptStore<
  z.infer<typeof RenderReceiptSchema>
> {
  return new IdempotentReceiptStore(RenderReceiptSchema);
}

export function createReleaseReceiptStore(): IdempotentReceiptStore<
  z.infer<typeof ReleaseReceiptSchema>
> {
  return new IdempotentReceiptStore(ReleaseReceiptSchema);
}
