// ledger/git-walker.ts — Git tree/blob walkers + text metrics for the ledger.
// Extracted from generate-file-disposition-ledger.ts so the dense core stays
// focused on budget computation. All functions are pure git/fs reads. [CÓDIGO]
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

import {BASELINE_COMMIT, type TextMetrics} from '../lib/file-disposition-policy-v3.ts';

export const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

export const metricsFor = (bytes: Buffer): TextMetrics => {
  if (bytes.includes(0)) return {format: 'binary', words: 0, loc: 0};
  const text = bytes.toString('utf8');
  const trimmed = text.trim();
  const physicalLines =
    text.length === 0
      ? 0
      : text.split(/\r\n|\r|\n/u).length - (/(?:\r\n|\r|\n)$/u.test(text) ? 1 : 0);
  return {
    format: 'text',
    words: trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length,
    loc: physicalLines,
  };
};

export const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? (numerator === 0 ? 1 : Number.POSITIVE_INFINITY) : numerator / denominator;

export const roundedRatio = (numerator: number, denominator: number): number =>
  Number(ratio(numerator, denominator).toFixed(4));

export const trackedPathsAt = (root: string, commit: string): string[] =>
  execFileSync('git', ['ls-tree', '-r', '--name-only', commit], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .sort();

export const parseGitCatFileBatch = (output: Buffer, objectIds: readonly string[]): Buffer[] => {
  let offset = 0;
  const objects = objectIds.map((objectId) => {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) throw new Error(`Git batch header missing for ${objectId}`);
    const header = output.subarray(offset, headerEnd).toString('ascii');
    const match = /^([0-9a-f]{40,64}) blob ([0-9]+)$/u.exec(header);
    if (match?.[1] !== objectId)
      throw new Error(`Git batch framing mismatch for ${objectId}: ${header}`);
    const size = Number(match[2]);
    const start = headerEnd + 1;
    const end = start + size;
    if (!Number.isSafeInteger(size) || end >= output.length || output[end] !== 0x0a) {
      throw new Error(`Git batch payload framing invalid for ${objectId}`);
    }
    offset = end + 1;
    return output.subarray(start, end);
  });
  if (offset !== output.length) throw new Error('Git batch output contains trailing bytes');
  return objects;
};

export const baselineBlobs = (root: string) => {
  const tree = execFileSync('git', ['ls-tree', '-rz', '--full-tree', BASELINE_COMMIT], {cwd: root});
  const refs = tree
    .subarray(0, tree.length - (tree.at(-1) === 0 ? 1 : 0))
    .toString('utf8')
    .split('\0')
    .map((entry) => {
      const match = /^[0-7]+ blob ([0-9a-f]{40,64})\t([\s\S]+)$/u.exec(entry);
      if (match === null) throw new Error(`Unsupported Git tree entry: ${entry}`);
      return {objectId: match[1] as string, path: match[2] as string};
    })
    .sort(({path: left}, {path: right}) => (left < right ? -1 : left > right ? 1 : 0));
  const output = execFileSync('git', ['cat-file', '--batch'], {
    cwd: root,
    input: `${refs.map(({objectId}) => objectId).join('\n')}\n`,
    maxBuffer: 256 * 1024 * 1024,
  });
  const bytes = parseGitCatFileBatch(
    output,
    refs.map(({objectId}) => objectId),
  );
  return refs.map((ref, index) => ({...ref, bytes: bytes[index] as Buffer}));
};