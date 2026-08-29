import {Buffer} from 'node:buffer';

import {RelativePathSchema, Sha256Schema} from '../primitives.ts';
import {GitSha1ObjectIdSchema, sameArray} from './common.ts';

export type PinnedRepositoryManifestRowV1 = {
  path: string;
  blobSha1: string;
  sourceSha256: string;
  bytes: number;
};

export const parsePinnedRepositoryManifestV1 = (
  sourceId: string,
  bytes: Uint8Array,
  errors: string[],
): PinnedRepositoryManifestRowV1[] => {
  let text: string;
  try {
    text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    errors.push(`${sourceId}: selected-paths manifest is not valid UTF-8`);
    return [];
  }
  if (text.includes('\r') || !text.endsWith('\n')) {
    errors.push(`${sourceId}: selected-paths manifest must use LF and one terminal newline`);
  }
  const lines = text.replace(/\n$/u, '').split('\n');
  const rows: PinnedRepositoryManifestRowV1[] = [];
  for (const [index, line] of lines.entries()) {
    const fields = line.split('\t');
    if (fields.length !== 4) {
      errors.push(`${sourceId}: manifest row ${index + 1} does not have four TSV columns`);
      continue;
    }
    const [repositoryPath = '', blobSha1 = '', sourceSha256 = '', byteText = ''] = fields;
    const byteCount = Number(byteText);
    if (!RelativePathSchema.safeParse(repositoryPath).success) {
      errors.push(`${sourceId}: manifest row ${index + 1} has a non-portable path`);
    }
    if (!GitSha1ObjectIdSchema.safeParse(blobSha1).success) {
      errors.push(`${sourceId}: manifest row ${index + 1} has an invalid Git blob SHA-1`);
    }
    if (!Sha256Schema.safeParse(sourceSha256).success) {
      errors.push(`${sourceId}: manifest row ${index + 1} has an invalid source SHA-256`);
    }
    if (!Number.isSafeInteger(byteCount) || byteCount < 0) {
      errors.push(`${sourceId}: manifest row ${index + 1} has an invalid byte count`);
    }
    rows.push({path: repositoryPath, blobSha1, sourceSha256, bytes: byteCount});
  }
  const paths = rows.map(({path}) => path);
  const sortedPaths = [...paths].sort((first, second) =>
    Buffer.compare(Buffer.from(first), Buffer.from(second)),
  );
  if (!sameArray(paths, sortedPaths) || new Set(paths).size !== paths.length) {
    errors.push(`${sourceId}: manifest paths are not unique and bytewise sorted`);
  }
  return rows;
};
