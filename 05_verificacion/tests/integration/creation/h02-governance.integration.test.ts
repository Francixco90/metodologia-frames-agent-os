import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {verifyApprovedH03LockSuccession} from '../../../scripts/lib/h03-lock-succession.mjs';

const root = process.cwd();

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

const filesBelow = (directory: string): string[] =>
  readdirSync(directory, {withFileTypes: true})
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? filesBelow(path) : statSync(path).isFile() ? [path] : [];
    })
    .sort();

const treeDigest = (ref: string): string => {
  const directory = resolve(root, ref);
  const ledger = filesBelow(directory)
    .map((path) => `${sha256(readFileSync(path))}  ${relative(root, path).replaceAll('\\', '/')}\n`)
    .join('');
  return sha256(ledger);
};

describe('H-02 governance and preservation', () => {
  it('persists five positions and all twenty directed non-self reviews', () => {
    const committee = readFileSync(
      resolve(root, 'committees/creation/H-02/content-atom-graph.md'),
      'utf8',
    );
    const positionRows = [...committee.matchAll(/^\| P-(RT\d+) \| ([^|]+) \|/gmu)];
    const reviewRows = [
      ...committee.matchAll(/^\| X-(RT\d+)-(RT\d+) \| RT-(\d+)\s*\| RT-(\d+)\s*\|/gmu),
    ];

    expect(positionRows).toHaveLength(5);
    expect(new Set(positionRows.map((match) => match[1]))).toEqual(
      new Set(['RT04', 'RT07', 'RT08', 'RT10', 'RT03']),
    );
    expect(reviewRows).toHaveLength(20);

    const pairs = reviewRows.map((match) => {
      expect(match[1]).toBe(`RT${match[3]}`);
      expect(match[2]).toBe(`RT${match[4]}`);
      expect(match[1]).not.toBe(match[2]);
      return `${match[1]}:${match[2]}`;
    });
    expect(new Set(pairs).size).toBe(20);
    for (const reviewer of ['RT04', 'RT07', 'RT08', 'RT10', 'RT03']) {
      expect(pairs.filter((pair) => pair.startsWith(`${reviewer}:`))).toHaveLength(4);
    }

    expect(committee).toContain('RT-05 propuso `purpose` como ancla única');
    expect(committee).toContain('RT-10 planteó inicialmente compatibilidad posicional');
    expect(committee).toContain('Siguiente gate humano: `APRUEBO HITO H-03`');
  });

  it('keeps H-01, legacy projects and n8n byte-identical and requires lock succession', () => {
    const expectedFiles = new Map([
      [
        'content/pilot-carousel-002/content.md',
        '30a7e195db8c919fc0f34f12032c6e7be118e39d100ff002777e6c5b3ae3b585',
      ],
      [
        'content/pilot-carousel-002/generated/canonical-content-document.json',
        'e177737bd7fb72c4e0af54e06e388c329e373f0216c7addbc405e54c1d1e6c55',
      ],
      [
        'content/pilot-carousel-002/generated/source-freeze-receipt.json',
        '3e3376e84513b360987ccdb900ed46124aa9647aae8da197488c3702e3188f20',
      ],
    ]);

    for (const [ref, digest] of expectedFiles) {
      expect(sha256(readFileSync(resolve(root, ref))), ref).toBe(digest);
    }
    const succession = verifyApprovedH03LockSuccession(root);
    expect(succession.receipt.previous?.lock_sha256).not.toBe(succession.currentLockSha256);
    expect(treeDigest('projects/pilot-carousel-001')).toBe(
      'eeb540327e985bb14ad10a053a2c091dff030706238039aa3fe809cef728a1e2',
    );
    expect(treeDigest('projects/vs-001-source-to-campaign')).toBe(
      '1edb9c64ec591298b88e53a7dca4292c6d4f6f12f85957e485ae3f41a22d36f3',
    );
    expect(treeDigest('adapters/n8n')).toBe(
      'bffe910843fbff2a807f923c3aa24a2ec78392e351e9e478675bee1f1dff1f71',
    );
  });
});
