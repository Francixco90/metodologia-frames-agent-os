import {lstatSync, realpathSync} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

import {type ContextSurfaceV1} from '../../02_proceso/core/contracts/context-surface-v1.ts';

const inside = (root: string, candidate: string): boolean => {
  const offset = relative(root, candidate);
  return (
    offset === '' || (!offset.startsWith(`..${sep}`) && offset !== '..' && !isAbsolute(offset))
  );
};

const validatePaths = (root: string, surface: ContextSurfaceV1): string[] => {
  const issues: string[] = [];
  try {
    const target = resolve(root, surface.root);
    if (lstatSync(target).isSymbolicLink()) issues.push(`CTX-PATH001 symlink root ${surface.root}`);
    if (!inside(realpathSync(root), realpathSync(target)))
      issues.push(`CTX-PATH002 root escape ${surface.root}`);
  } catch {
    issues.push(`CTX-PATH003 missing root ${surface.root}`);
  }
  for (const ref of [
    ...surface.authority_refs,
    ...surface.load_first,
    ...surface.load_on_demand,
    ...surface.read_set,
  ]) {
    try {
      const target = resolve(root, ref);
      if (lstatSync(target).isSymbolicLink()) issues.push(`CTX-REF001 symlink ref ${ref}`);
      if (!inside(realpathSync(root), realpathSync(target)))
        issues.push(`CTX-REF002 ref escape ${ref}`);
    } catch {
      issues.push(`CTX-REF003 missing ref ${surface.context_id}:${ref}`);
    }
  }
  return issues;
};

export const validateContextGraph = (
  root: string,
  surfaces: ContextSurfaceV1[],
  expectedCount = 55,
): string[] => {
  const issues: string[] = [];
  const ids = new Map(surfaces.map((surface) => [surface.context_id, surface]));
  const roots = new Set<string>();
  if (ids.size !== surfaces.length) issues.push('CTX-GRAPH001 duplicate context_id');
  for (const surface of surfaces) {
    if (roots.has(surface.root)) issues.push(`CTX-GRAPH002 duplicate root ${surface.root}`);
    roots.add(surface.root);
    issues.push(...validatePaths(root, surface));
    for (const child of surface.children) {
      const target = ids.get(child);
      if (!target) issues.push(`CTX-GRAPH003 unknown child ${surface.context_id}:${child}`);
      else if (surface.root !== '.' && !target.root.startsWith(`${surface.root}/`))
        issues.push(`CTX-GRAPH004 non-descendant child ${surface.context_id}:${child}`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) issues.push(`CTX-GRAPH005 cycle at ${id}`);
    if (visiting.has(id) || visited.has(id)) return;
    visiting.add(id);
    for (const child of ids.get(id)?.children ?? []) visit(child);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids.keys()) visit(id);
  if (surfaces.length !== expectedCount)
    issues.push(`CTX-COVERAGE001 expected ${expectedCount}, found ${surfaces.length}`);
  return [...new Set(issues)].sort();
};
