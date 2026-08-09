import {existsSync, lstatSync, readFileSync, readdirSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';

import {ContextSurfaceRegistryV1Schema} from '../../02_proceso/core/contracts/context-surface-v1.ts';
import {
  REGISTRY_PATH,
  loadContextSurfaces,
  projections,
  validateContextGraph,
} from './context-surface-lib.ts';

const findContextFiles = (root: string): string[] => {
  const found: string[] = [];
  const walk = (directory: string, relativeDirectory: string): void => {
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      const relative =
        relativeDirectory.length === 0 ? entry.name : `${relativeDirectory}/${entry.name}`;
      if (entry.isSymbolicLink() || ['.git', 'node_modules'].includes(entry.name)) continue;
      if (entry.isDirectory()) walk(resolve(directory, entry.name), relative);
      else if (entry.isFile() && entry.name === 'context.md') found.push(relative);
    }
  };
  walk(root, '');
  return found.sort();
};

export const checkContextSurfaces = (root: string): string[] => {
  const issues: string[] = [];
  const registry = ContextSurfaceRegistryV1Schema.parse(
    parse(readFileSync(resolve(root, REGISTRY_PATH), 'utf8')),
  );
  const surfaces = loadContextSurfaces(root);
  const expected = projections(surfaces);
  issues.push(...validateContextGraph(root, surfaces));
  for (const [path, content] of expected) {
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) issues.push(`CTX-COVERAGE002 missing ${path}`);
    else if (lstatSync(absolute).isSymbolicLink())
      issues.push(`CTX-PATH004 projection is symlink ${path}`);
    else if (readFileSync(absolute, 'utf8') !== content) issues.push(`CTX-DRIFT002 stale ${path}`);
  }
  const skillContexts = registry.expected_skill_projections;
  const expectedSkills = [
    'content-os-router',
    'career-application-orchestrator',
    'frames-token-efficiency-orchestrator',
    'content-os-core',
    'content-os-creative',
    'metodologia-brand-router',
    'context-save',
    'context-restore',
    'context-memory',
    'context-teammates',
    'dev-writing-plans',
    'dev-verification-before-completion',
  ];
  const presentSkills = expectedSkills.filter((skill) =>
    existsSync(resolve(root, `03_artefactos/skills/${skill}/context.md`)),
  );
  if (presentSkills.length !== skillContexts) {
    issues.push(
      `CTX-COVERAGE003 expected ${skillContexts} skill contexts, found ${presentSkills.length}`,
    );
  }
  const allowed = new Set([
    ...expected.keys(),
    ...expectedSkills.map((skill) => `03_artefactos/skills/${skill}/context.md`),
  ]);
  for (const path of findContextFiles(root)) {
    if (!allowed.has(path)) issues.push(`CTX-COVERAGE004 unregistered ${path}`);
  }
  if (
    !/reads: \['context\.md'\]/u.test(
      readFileSync(resolve(root, '02_proceso/governance/router.yml'), 'utf8'),
    )
  ) {
    issues.push('CTX-ROUTE001 R0 must read public context.md');
  }
  if (
    readFileSync(resolve(root, '02_proceso/governance/router.yml'), 'utf8').includes('CONTEXT.md')
  ) {
    issues.push('CTX-ROUTE002 router may not load private CONTEXT.md');
  }
  return issues.sort();
};

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  const issues = checkContextSurfaces(process.cwd());
  if (issues.length > 0) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
  } else console.info('PASS context surfaces: 50 public + 12 skill projections');
}
