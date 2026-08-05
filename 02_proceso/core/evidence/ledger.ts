import {z} from 'zod';

import {
  ActorIdSchema,
  JsonObjectSchema,
  PortableIdSchema,
  PortableRefSchema,
  Sha256Schema,
  TimestampSchema,
} from '../contracts/index.ts';
import {hashCanonical} from './hash.ts';
import {immutableClone} from './immutable.ts';

export const EvidenceRecordInputSchema = z.strictObject({
  evidenceId: PortableIdSchema,
  kind: z.enum(['approval', 'decision', 'dissent', 'observation', 'receipt', 'source', 'test']),
  subjectRef: PortableRefSchema,
  payload: JsonObjectSchema,
  actorId: ActorIdSchema,
  recordedAt: TimestampSchema,
  tags: z.array(z.string().min(1).max(80)).max(32),
});

export const EvidenceRecordSchema = EvidenceRecordInputSchema.extend({
  payloadHash: Sha256Schema,
  previousRecordHash: Sha256Schema.nullable(),
  recordHash: Sha256Schema,
});

export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;
export type EvidenceRecordInput = z.infer<typeof EvidenceRecordInputSchema>;

export class EvidenceLedger {
  readonly #records: Readonly<EvidenceRecord>[] = [];

  public append(input: unknown): Readonly<EvidenceRecord> {
    const parsed = EvidenceRecordInputSchema.parse(input);
    if (this.#records.some((record) => record.evidenceId === parsed.evidenceId)) {
      throw new Error(`Duplicate evidence ID: ${parsed.evidenceId}`);
    }

    const payloadHash = hashCanonical(parsed.payload);
    const previousRecordHash = this.#records.at(-1)?.recordHash ?? null;
    const unsigned = {...parsed, payloadHash, previousRecordHash};
    const record = EvidenceRecordSchema.parse({
      ...unsigned,
      recordHash: hashCanonical(unsigned),
    });
    const immutableRecord = immutableClone(record);
    this.#records.push(immutableRecord);
    return immutableClone(immutableRecord);
  }

  public snapshot(): readonly Readonly<EvidenceRecord>[] {
    return immutableClone(this.#records);
  }

  public verify(): boolean {
    let previousRecordHash: string | null = null;
    for (const record of this.#records) {
      if (record.previousRecordHash !== previousRecordHash) {
        return false;
      }
      if (record.payloadHash !== hashCanonical(record.payload)) {
        return false;
      }
      const {recordHash, ...unsigned} = record;
      if (recordHash !== hashCanonical(unsigned)) {
        return false;
      }
      previousRecordHash = recordHash;
    }
    return true;
  }
}
