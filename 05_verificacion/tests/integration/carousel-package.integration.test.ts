import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

const root = process.cwd();
const artifactRoot = resolve(root, 'projects/pilot-carousel-001/artifacts');
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

describe('carousel pilot package', () => {
  it('contains eight exact-size PNGs and hash-bound offline review outputs', () => {
    const manifestPath = resolve(artifactRoot, 'asset-manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      state: string;
      files: Array<{path: string; sha256: string; mediaType: string}>;
      renderPolicy: {
        networkRequests: number;
        deterministicDoubleCapture: boolean;
      };
      rights: {publicationAuthorized: boolean};
    };
    expect(manifest.state).toBe('RENDERED_DRAFT');
    expect(manifest.renderPolicy).toMatchObject({
      networkRequests: 0,
      deterministicDoubleCapture: true,
    });
    expect(manifest.rights.publicationAuthorized).toBe(false);

    const slides = manifest.files.filter(({path}) => /slide-\d{2}\.png$/u.test(path));
    expect(slides).toHaveLength(8);
    for (const slide of slides) {
      const value = readFileSync(resolve(root, slide.path));
      expect(sha256(value)).toBe(slide.sha256);
      expect(value.readUInt32BE(16)).toBe(1080);
      expect(value.readUInt32BE(20)).toBe(1350);
    }

    for (const file of [
      'index.html',
      'contact-sheet.png',
      'review-desktop.png',
      'review-mobile.png',
    ]) {
      expect(existsSync(resolve(artifactRoot, file))).toBe(true);
    }
    const gallery = readFileSync(resolve(artifactRoot, 'index.html'), 'utf8');
    expect(gallery).not.toMatch(/https?:\/\//u);
    expect(gallery).not.toContain('tailwind');
  });
});
