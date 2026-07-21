import {describe, expect, it} from 'vitest';
import {parseGitCatFileBatch} from '../../scripts/generate-file-disposition-ledger.ts';

describe('Git cat-file batch parser', () => {
  it('preserves empty and binary blobs and rejects truncated framing', () => {
    const ids = ['1'.repeat(40), '2'.repeat(40)];
    const binary = Buffer.from([0, 10, 255, 13]);
    const output = Buffer.concat([
      Buffer.from(`${ids[0]} blob 0\n\n${ids[1]} blob ${binary.length}\n`),
      binary,
      Buffer.from('\n'),
    ]);
    expect(parseGitCatFileBatch(output, ids)).toStrictEqual([Buffer.alloc(0), binary]);
    expect(() => parseGitCatFileBatch(output.subarray(0, -1), ids)).toThrow(
      'payload framing invalid',
    );
  });
});
