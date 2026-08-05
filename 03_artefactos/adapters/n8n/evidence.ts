import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {RelativePathSchema} from 'core/contracts/index.ts';

export interface N8nEvidenceReader {
  read(reference: string): Uint8Array | undefined;
}

export const sha256Bytes = (value: Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');

export class InMemoryEvidenceReader implements N8nEvidenceReader {
  readonly #records: Map<string, Uint8Array>;

  public constructor(records: Readonly<Record<string, string | Uint8Array>>) {
    this.#records = new Map(
      Object.entries(records).map(([reference, value]) => [
        RelativePathSchema.parse(reference),
        typeof value === 'string' ? new TextEncoder().encode(value) : Uint8Array.from(value),
      ]),
    );
  }

  public read(reference: string): Uint8Array | undefined {
    const value = this.#records.get(RelativePathSchema.parse(reference));
    return value === undefined ? undefined : Uint8Array.from(value);
  }
}

export class RepositoryEvidenceReader implements N8nEvidenceReader {
  public constructor(private readonly root: string) {}

  public read(reference: string): Uint8Array | undefined {
    const portableReference = RelativePathSchema.parse(reference);
    const absolutePath = resolve(this.root, portableReference);
    const absoluteRoot = resolve(this.root);
    if (!absolutePath.startsWith(`${absoluteRoot}/`) || !existsSync(absolutePath)) {
      return undefined;
    }
    return readFileSync(absolutePath);
  }
}
