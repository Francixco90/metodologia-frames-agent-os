import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

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

  it('keeps H-01, legacy projects, lockfile and n8n byte-identical', () => {
    const expectedFiles = new Map([
      [
        'content/pilot-carousel-002/content.md',
        'b53aa138b8406ebfdcbe6032a646239ec93384561b6a45a74986c62bb75a1382',
      ],
      [
        'content/pilot-carousel-002/generated/canonical-content-document.json',
        '051cf409c8cc2146fefa9c629a34c2135264a4d7f85e9745a634fea1675cd6d1',
      ],
      [
        'content/pilot-carousel-002/generated/source-freeze-receipt.json',
        '73942f3d682a232c9cd5c26b87a6912f5f9907fd99ca43a97465f1a28df0ffb7',
      ],
      ['pnpm-lock.yaml', 'c73533cf14815fc883b2e166c0a40c00fcac11fc62bf1081c45ba023db00fc82'],
    ]);

    for (const [ref, digest] of expectedFiles) {
      expect(sha256(readFileSync(resolve(root, ref))), ref).toBe(digest);
    }
    expect(treeDigest('projects/pilot-carousel-001')).toBe(
      'd9b76dde1a73524ba15d7efb0e0530adfacbd032f1480a00f9250b6bc77ebb78',
    );
    expect(treeDigest('projects/vs-001-source-to-campaign')).toBe(
      '4451cb1829b9c2d5f8cafb7eb77787ee0884fb9f08a42230efe84028225f61f4',
    );
    expect(treeDigest('adapters/n8n')).toBe(
      '3a27f59814a35ce5e0d87aee1a1d5e9645db288c2cbac87b59b6aabd5ffd174d',
    );
  });
});
