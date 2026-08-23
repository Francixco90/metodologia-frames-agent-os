import {createHash} from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export class CheckError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export const fail = (code) => {
  throw new CheckError(code);
};
export const sha = (value) =>
  createHash('sha256')
    .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value))
    .digest('hex');
export const canonicalRelationKey = ({source, target, kind, direction}) => {
  const endpoints = direction === 'bidirectional' ? [source, target].sort() : [source, target];
  return [...endpoints, kind, direction].join('\0');
};
export const assertUniqueSemanticRelations = (relations, code = 'CHECK_RELATION_EVIDENCE') => {
  const keys = relations.map(canonicalRelationKey);
  if (relations.some(({source, target}) => source === target) || new Set(keys).size !== keys.length)
    fail(code);
};

export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const repoRoot = resolve(packageRoot, '../../../../../../..');
export const validator = join(packageRoot, 'scripts/validate-diagram-contract.ts');
export const compiler = join(packageRoot, 'scripts/compile-diagram-contract.ts');
export const executionSchema = join(
  repoRoot,
  '02_proceso/workflows/video-os/_schema/method-explainer-execution-v1.schema.ts',
);
export const planningSchema = join(
  repoRoot,
  '02_proceso/workflows/video-os/_schema/method-explainer-planning-v1.schema.ts',
);
export const videoOsSchema = join(
  repoRoot,
  '02_proceso/workflows/video-os/_schema/video-os-v1.schema.ts',
);
export const localSourcePins = new Map([
  [validator, '54128b69c0dda2a3a2d2824fd081f56a6ceec57c27029f4d449575b94afa7402'],
  [compiler, '897fa24b177cf407959969bbf05bc87848e6530ec50d6b5fc20c08f9661e907f'],
  [executionSchema, 'e0ea4ebf7d71beef7665f57a44709192f3fa937d7db24aa5830d1e5ca941e2bd'],
  [planningSchema, '8e61fb471f8e5b37c81d7e7d844898aef9a10937978c2204e2166031a82ba9cb'],
  [videoOsSchema, 'd9ec567667c62611bbe8931abfb6fdd50d300f36aedfe12a77f9d5edb330a39e'],
]);
export const positives = ['positive/pasa-flow.json', 'positive/pivote-radial-lenses.json'];
export const negatives = [
  ['negative/premature-edge.json', 'DIAGRAM_EDGE_TIMING_INVALID'],
  ['negative/safe-zone-overflow.json', 'DIAGRAM_NODE_OUTSIDE_SAFE_ZONE'],
  ['negative/duplicate-node-id.json', 'DIAGRAM_DUPLICATE_NODE_ID'],
];

export const parseOutput = (serialized, code) => {
  try {
    return JSON.parse(serialized);
  } catch {
    return fail(code);
  }
};
const contained = (root, file) => {
  const rel = relative(realpathSync(root), realpathSync(file));
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};
export const readRegularContained = (root, file, code = 'CHECK_RESOURCE_NOT_REGULAR') => {
  const lexical = resolve(file);
  const lexicalRel = relative(resolve(root), lexical);
  if (lexicalRel === '..' || lexicalRel.startsWith(`..${sep}`) || isAbsolute(lexicalRel)) fail(code);
  const info = lstatSync(lexical);
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || !contained(root, lexical))
    fail(code);
  const descriptor = openSync(lexical, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor);
    if (before.dev !== info.dev || before.ino !== info.ino || before.nlink !== 1) fail(code);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs
    )
      fail(code);
    return bytes;
  } finally {
    closeSync(descriptor);
  }
};
const walk = (root) =>
  readdirSync(root, {withFileTypes: true}).flatMap((entry) => {
    const absolute = join(root, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
export const snapshot = () =>
  Object.fromEntries(
    walk(packageRoot)
      .sort()
      .map((file) => [relative(packageRoot, file), sha(readRegularContained(packageRoot, file))]),
  );
export const assertContainedCache = (cacheRoot) => {
  for (const path of walk(cacheRoot)) {
    if (lstatSync(path).isSymbolicLink()) fail('CHECK_CACHE_ESCAPE');
    const rel = relative(cacheRoot, realpathSync(path));
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail('CHECK_CACHE_ESCAPE');
  }
};
