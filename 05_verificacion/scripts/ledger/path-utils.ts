// ledger/path-utils.ts — versionable-path normalization under the NN_slug
// taxonomy. Cardinal buckets (00_inbox … 06_archive) carry retro symlinks at
// repo root; policy constants are authored in legacy root-relative form, so
// `git ls-files` output is inverted back to legacy paths. [CÓDIGO]
import {type Dirent, existsSync, lstatSync, readdirSync, readlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {isAbsolute, relative, resolve} from 'node:path';

export const legacyPathInversions = (root: string): Array<{link: string; target: string}> => {
  const inversions: Array<{link: string; target: string}> = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(root, {withFileTypes: true});
  } catch {
    return inversions;
  }
  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue;
    try {
      let target = readlinkSync(resolve(root, entry.name));
      // Windows junctions return absolute paths (e.g. C:\...\03_artefactos\content).
      // Normalise to a repo-relative path so the inversion logic works cross-platform.
      if (isAbsolute(target)) {
        target = relative(root, target);
      }
      // Normalise backslashes to forward slashes for cross-platform path matching.
      target = target.split('\\').join('/');
      // Only relative in-repo targets that include a path separator map a
      // cardinal bucket back to a legacy root-relative name.
      if (!target.startsWith('/') && !target.startsWith('..') && target.includes('/')) {
        inversions.push({link: entry.name, target});
      }
    } catch {
      /* ignore unreadable symlink */
    }
  }
  inversions.sort((left, right) => right.target.length - left.target.length);
  return inversions;
};

export const normalizeToLegacyPath = (
  path: string,
  inversions: ReadonlyArray<{link: string; target: string}>,
): string => {
  for (const {link, target} of inversions) {
    if (path === target || path.startsWith(`${target}/`)) {
      return `${link}${path.slice(target.length)}`;
    }
  }
  return path;
};

export const versionablePaths = (root: string): string[] => {
  const inversions = legacyPathInversions(root);
  return (
    execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(
        (path) =>
          path.length > 0 &&
          path !== 'node_modules' &&
          !path.startsWith('node_modules/') &&
          existsSync(resolve(root, path)) &&
          lstatSync(resolve(root, path)).isFile(),
      )
      .map((path) => normalizeToLegacyPath(path, inversions))
      // Deduplicate after junction normalisation: on Windows, git ls-files
      // returns the same file under both the real path (03_artefactos/content/)
      // and the junction path (content/), which collapse to the same legacy path.
      .filter((path, index, array) => array.indexOf(path) === index)
      .sort()
  );
};

export const globPatternToRegExp = (pattern: string): RegExp => {
  const placeholder = '\u0000';
  const protectedPattern = pattern.replaceAll('**', placeholder);
  let expression = '';
  for (const character of protectedPattern) {
    if (character === placeholder) expression += '.*';
    else if (character === '*') expression += '[^/]*';
    else if (character === '?') expression += '[^/]';
    else if ('.+^${}()|\\'.includes(character)) expression += `\\${character}`;
    else expression += character;
  }
  return new RegExp(`^${expression}$`, 'u');
};
