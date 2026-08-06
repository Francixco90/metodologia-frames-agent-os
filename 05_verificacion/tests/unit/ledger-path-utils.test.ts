import {describe, expect, it} from 'vitest';

import {
  globPatternToRegExp,
  legacyPathInversions,
  normalizeToLegacyPath,
} from '../../scripts/ledger/path-utils.ts';
import {resolve} from 'node:path';

const root = process.cwd();

describe('globPatternToRegExp', () => {
  it('translates double-star to a cross-directory wildcard', () => {
    // `a/**/b` compiles to `^a/.*/b$`, so at least one intermediate path
    // segment is required. Zero-segment matching (`a/**/b` → `a/b`) is NOT
    // supported. This is a latent limitation, not an active bug: every real
    // ownership-manifest pattern is `prefix/**` form, which never relies on
    // zero-segment `**`. [CÓDIGO]
    const re = globPatternToRegExp('a/**/b');
    expect(re.test('a/x/y/b')).toBe(true);
    expect(re.test('a/x/b')).toBe(true);
    expect(re.test('a/b')).toBe(false);
    expect(re.test('a/x/b/y')).toBe(false);
  });

  it('translates prefix double-star to match any nested path under it', () => {
    // `prefix/**` → `^prefix/.*$` is the form every real pattern uses.
    const re = globPatternToRegExp('docs/**');
    expect(re.test('docs/program/dag.yml')).toBe(true);
    expect(re.test('docs/a/b/c.yml')).toBe(true);
    expect(re.test('scripts/x.ts')).toBe(false);
  });

  it('translates single-star to a within-segment wildcard', () => {
    const re = globPatternToRegExp('a/*.ts');
    expect(re.test('a/x.ts')).toBe(true);
    expect(re.test('a/x/y.ts')).toBe(false);
  });

  it('translates question mark to one non-slash character', () => {
    const re = globPatternToRegExp('a/?.ts');
    expect(re.test('a/x.ts')).toBe(true);
    expect(re.test('a/xy.ts')).toBe(false);
    expect(re.test('a//.ts')).toBe(false);
  });

  it('escapes regex metacharacters and anchors the match', () => {
    const re = globPatternToRegExp('a.+^${}()|\\b');
    expect(re.test('a.+^${}()|\\b')).toBe(true);
    expect(re.test('ax')).toBe(false);
  });
});

describe('normalizeToLegacyPath', () => {
  it('rewrites a cardinal target to its legacy link prefix', () => {
    const inversions = [{link: 'docs', target: '01_intencion'}];
    expect(normalizeToLegacyPath('01_intencion/foo.md', inversions)).toBe('docs/foo.md');
    expect(normalizeToLegacyPath('01_intencion', inversions)).toBe('docs');
  });

  it('prefers the longest target when two links could match', () => {
    const inversions = [
      {link: 'scripts', target: '05_verificacion/scripts'},
      {link: 'docs', target: '01_intencion'},
    ];
    expect(normalizeToLegacyPath('05_verificacion/scripts/ledger/x.ts', inversions)).toBe(
      'scripts/ledger/x.ts',
    );
    expect(normalizeToLegacyPath('01_intencion/x.md', inversions)).toBe('docs/x.md');
  });

  it('returns the path unchanged when no inversion matches', () => {
    expect(normalizeToLegacyPath('package.json', [])).toBe('package.json');
  });
});

describe('legacyPathInversions', () => {
  it('returns only relative in-repo symlinks with a path separator, longest target first', () => {
    const inversions = legacyPathInversions(root);
    for (const {target} of inversions) {
      expect(target.startsWith('/')).toBe(false);
      expect(target.startsWith('..')).toBe(false);
      expect(target.includes('/')).toBe(true);
    }
    for (let i = 1; i < inversions.length; i += 1) {
      const prev = inversions[i - 1];
      const curr = inversions[i];
      if (prev === undefined || curr === undefined) throw new Error('inversion pair missing');
      expect(prev.target.length).toBeGreaterThanOrEqual(curr.target.length);
    }
    // `scripts -> 05_verificacion/scripts` (target has a path separator) is
    // present. `docs -> 01_intencion` is deliberately excluded: its target is
    // a single segment with no separator, so it never inverts a cardinal path
    // back to a legacy `docs/...` form via `normalizeToLegacyPath`. [CÓDIGO]
    expect(inversions.some(({link}) => link === 'scripts')).toBe(true);
    expect(inversions.some(({link}) => link === 'docs')).toBe(false);
  });

  it('returns an empty list for a missing directory', () => {
    expect(legacyPathInversions(resolve(root, 'no-such-dir-xyz'))).toStrictEqual([]);
  });
});