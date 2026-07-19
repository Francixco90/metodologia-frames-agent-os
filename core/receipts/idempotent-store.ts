import type {z} from 'zod';

import {ReleaseReceiptSchema, RenderReceiptSchema} from '../contracts/index.ts';
import {hashCanonical, immutableClone} from '../evidence/index.ts';

export class IdempotencyConflictError extends Error {
  public constructor(key: string) {
    super(`Idempotency key already exists with different content: ${key}`);
    this.name = 'IdempotencyConflictError';
  }
}

export interface ReceiptRecordResult<Receipt> {
  readonly receipt: Readonly<Receipt>;
  readonly receiptHash: string;
  readonly status: 'created' | 'replayed';
}

export class IdempotentReceiptStore<Receipt extends {idempotencyKey: string}> {
  readonly #records = new Map<string, {receipt: Readonly<Receipt>; receiptHash: string}>();

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

    const receipt = immutableClone(parsed);
    this.#records.set(parsed.idempotencyKey, {receipt, receiptHash});
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
