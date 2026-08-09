import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import path from 'node:path';

import {stableStringify} from '../../02_proceso/workflows/multimedia/_runner/brief-model.ts';
import type {SkillMaterialRefV1} from '../../02_proceso/workflows/skill-systems/gate-contracts.ts';

const sha = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

export const readSkillMaterialV1 = (root: string, material: SkillMaterialRefV1): string => {
  const absoluteRoot = realpathSync(root);
  const lexical = path.resolve(root, material.ref);
  if (lexical !== root && !lexical.startsWith(`${path.resolve(root)}${path.sep}`))
    throw new Error(`SSS_MATERIAL_PATH001:${material.ref}`);
  let cursor = path.resolve(root);
  for (const segment of path.relative(root, lexical).split(path.sep)) {
    cursor = path.join(cursor, segment);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error(`SSS_MATERIAL_PATH001:${material.ref}`);
  }
  if (!lstatSync(lexical).isFile()) throw new Error(`SSS_MATERIAL_FILE001:${material.ref}`);
  const real = realpathSync(lexical);
  if (real !== absoluteRoot && !real.startsWith(`${absoluteRoot}${path.sep}`))
    throw new Error(`SSS_MATERIAL_PATH001:${material.ref}`);
  const bytes = readFileSync(real);
  if (sha(bytes) !== material.sha256) throw new Error(`SSS_MATERIAL_HASH001:${material.ref}`);
  return bytes.toString('utf8');
};

export const assertSkillContentHashV1 = (record: Record<string, unknown>): void => {
  const declared = record.content_sha256;
  const canonical = {...record};
  delete canonical.content_sha256;
  if (declared !== sha(stableStringify(canonical))) throw new Error('SSS_CONTENT_HASH001');
};
