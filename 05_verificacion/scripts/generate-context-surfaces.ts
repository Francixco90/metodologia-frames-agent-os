import {existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {loadContextSurfaces, projections, validateContextGraph} from './context-surface-lib.ts';

export const generateContextSurfaces = (root: string, write: boolean): string[] => {
  const surfaces = loadContextSurfaces(root, 'all');
  const issues = validateContextGraph(root, surfaces, 62);
  if (issues.length > 0) return issues;
  for (const [path, expected] of projections(surfaces)) {
    const absolute = resolve(root, path);
    if (existsSync(absolute) && lstatSync(absolute).isSymbolicLink()) {
      issues.push(`CTX-PATH004 projection is symlink ${path}`);
      continue;
    }
    if (write) {
      mkdirSync(dirname(absolute), {recursive: true});
      writeFileSync(absolute, expected, 'utf8');
    } else {
      let actual: string;
      try {
        actual = readFileSync(absolute, 'utf8');
      } catch {
        issues.push(`CTX-DRIFT001 missing projection ${path}`);
        continue;
      }
      if (actual !== expected) issues.push(`CTX-DRIFT002 stale projection ${path}`);
    }
  }
  return issues.sort();
};

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  const issues = generateContextSurfaces(process.cwd(), process.argv.includes('--write'));
  if (issues.length > 0) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(`PASS context surfaces (${process.argv.includes('--write') ? 'write' : 'check'})`);
  }
}
