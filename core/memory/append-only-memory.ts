import {z} from 'zod';

import {
  ActorIdSchema,
  containsProhibitedReasoningText,
  PortableIdSchema,
  PortableRefSchema,
  Sha256Schema,
  TimestampSchema,
} from '../contracts/index.ts';
import {hashCanonical, immutableClone} from '../evidence/index.ts';

export const MemoryEntryInputSchema = z
  .strictObject({
    memoryId: PortableIdSchema,
    subjectId: PortableIdSchema,
    kind: z.enum(['assumption', 'coverage_gap', 'decision', 'dissent', 'fact', 'learning', 'risk']),
    summary: z.string().min(1).max(4000),
    actorId: ActorIdSchema,
    evidenceRefs: z.array(PortableRefSchema).max(128),
    createdAt: TimestampSchema,
  })
  .superRefine((entry, context) => {
    if (containsProhibitedReasoningText(entry)) {
      context.addIssue({
        code: 'custom',
        message: 'Private reasoning and chain-of-thought must not be persisted',
        path: ['summary'],
      });
    }
  });

export const MemoryEntrySchema = MemoryEntryInputSchema.extend({
  previousEntryHash: Sha256Schema.nullable(),
  entryHash: Sha256Schema,
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export class AppendOnlyMemory {
  readonly #entries: Readonly<MemoryEntry>[] = [];

  public append(input: unknown): Readonly<MemoryEntry> {
    const parsed = MemoryEntryInputSchema.parse(input);
    if (this.#entries.some((entry) => entry.memoryId === parsed.memoryId)) {
      throw new Error(`Duplicate memory ID: ${parsed.memoryId}`);
    }
    const previousEntryHash = this.#entries.at(-1)?.entryHash ?? null;
    const unsigned = {...parsed, previousEntryHash};
    const entry = immutableClone(
      MemoryEntrySchema.parse({...unsigned, entryHash: hashCanonical(unsigned)}),
    );
    this.#entries.push(entry);
    return immutableClone(entry);
  }

  public snapshot(): readonly Readonly<MemoryEntry>[] {
    return immutableClone(this.#entries);
  }

  public verify(): boolean {
    let previousEntryHash: string | null = null;
    for (const entry of this.#entries) {
      if (entry.previousEntryHash !== previousEntryHash) {
        return false;
      }
      const {entryHash, ...unsigned} = entry;
      if (entryHash !== hashCanonical(unsigned)) {
        return false;
      }
      previousEntryHash = entryHash;
    }
    return true;
  }
}
