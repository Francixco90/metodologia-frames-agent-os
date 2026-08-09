import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';

import {
  ContextSurfaceRegistryV1Schema,
  ContextSurfaceShardV1Schema,
  contextProjectionPath,
  type ContextSurfaceV1,
} from '../../02_proceso/core/contracts/context-surface-v1.ts';
import {renderContextSurface} from './context-surface-render.ts';

export {validateContextGraph} from './context-surface-validation.ts';

export const REGISTRY_PATH = '02_proceso/governance/context-surfaces/registry.yml';

export const loadContextSurfaces = (
  root: string,
  scope: 'non_skill' | 'all' = 'non_skill',
): ContextSurfaceV1[] => {
  const registry = ContextSurfaceRegistryV1Schema.parse(
    parse(readFileSync(resolve(root, REGISTRY_PATH), 'utf8')),
  );
  const shardPaths =
    scope === 'all' ? [...registry.shards, ...registry.skill_shards] : registry.shards;
  return shardPaths.flatMap((shardPath) => {
    const shard = ContextSurfaceShardV1Schema.parse(
      parse(readFileSync(resolve(root, shardPath), 'utf8')),
    );
    return shard.surfaces;
  });
};

export const projections = (surfaces: ContextSurfaceV1[]): Map<string, string> =>
  new Map(
    surfaces.map((surface) => [contextProjectionPath(surface), renderContextSurface(surface)]),
  );
