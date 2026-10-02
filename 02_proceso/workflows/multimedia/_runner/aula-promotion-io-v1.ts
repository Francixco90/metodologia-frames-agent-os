import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {RelativePathSchema, PortableIdSchema} from '../../../core/contracts/index.ts';
import {
  assertContainedInputFileV1,
  prepareContainedDirectoryV1,
} from '../../core/safe-local-path-v1.ts';
export const DEFAULT_AULA_EVALUATION_REF = '04_estado/receipts/aula-decks-evaluation-20261001.json';
export function assertAulaEvaluationRefV1(ref: string) {
  if (
    ref !== DEFAULT_AULA_EVALUATION_REF &&
    !/^04_estado\/receipts\/check-runs\/aula-evaluation-[0-9]{8}-[0-9]{3}\.json$/u.test(ref)
  )
    throw new Error('AULA_EVALUATION_REF_INVALID');
  return ref;
}
export function parseAulaPromotionArgsV1(args: string[]) {
  const mode = args[0];
  if (mode !== '--evaluate' && mode !== '--activate')
    throw new Error('AULA_PROMOTION_MODE_INVALID');
  const options = new Map<string, string>();
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index],
      value = args[index + 1];
    if (
      !flag ||
      !['--evaluation-ref', '--review'].includes(flag) ||
      options.has(flag) ||
      !value ||
      value.startsWith('--')
    )
      throw new Error('AULA_PROMOTION_ARGUMENT_INVALID');
    options.set(flag, value);
  }
  const evaluationRef = assertAulaEvaluationRefV1(
    options.get('--evaluation-ref') ?? DEFAULT_AULA_EVALUATION_REF,
  );
  const reviewRef = options.get('--review');
  if (reviewRef) RelativePathSchema.parse(reviewRef);
  if (mode === '--activate' && !reviewRef) throw new Error('AULA_INDEPENDENT_REVIEW_REQUIRED');
  if (mode === '--evaluate' && reviewRef) throw new Error('AULA_PROMOTION_ARGUMENT_INVALID');
  return {mode, evaluationRef, reviewRef};
}
export function assertAulaEvaluationAbsentV1(root: string, ref: string) {
  assertAulaEvaluationRefV1(ref);
  prepareContainedDirectoryV1(root, dirname(ref));
  if (existsSync(resolve(root, ref))) throw new Error('AULA_EVALUATION_IMMUTABLE_USE_SUCCESSOR');
}
export function writeAulaEvaluationV1(root: string, ref: string, bytes: string) {
  assertAulaEvaluationAbsentV1(root, ref);
  writeFileSync(resolve(root, ref), bytes, {flag: 'wx'});
}
export function readAulaEvaluationV1(root: string, ref: string) {
  return readFileSync(assertContainedInputFileV1(root, assertAulaEvaluationRefV1(ref)));
}
export function aulaPackageDigestV1(root: string, id: string) {
  PortableIdSchema.parse(id);
  const directory = resolve(root, '03_artefactos/skills', id);
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name),
        stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error('AULA_PACKAGE_SYMLINK_FORBIDDEN');
      return stat.isDirectory() ? walk(path) : [path];
    });
  const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
  return hash(
    walk(directory)
      .sort()
      .map(
        (path) => `${hash(readFileSync(path))}  ${relative(directory, path).replaceAll('\\', '/')}`,
      )
      .join('\n') + '\n',
  );
}
export const AULA_PROMOTION_IMPLEMENTATION_REFS = [
  '02_proceso/workflows/multimedia/_runner/aula-material-handler-v1.ts',
  '02_proceso/workflows/multimedia/_runner/aula-work-order-v1.ts',
  '02_proceso/workflows/multimedia/_runner/aula-continuation-v1.ts',
  '02_proceso/workflows/multimedia/_schema/aula-approval-v1.ts',
  '05_verificacion/tests/integration/aula-continuation.test.ts',
  '02_proceso/workflows/multimedia/_runner/aula-engine-authority-v1.ts',
  '02_proceso/workflows/multimedia/_runner/aula-build-dependencies-v1.ts',
  '02_proceso/workflows/multimedia/_schema/aula-dependencies-v1.ts',
  '02_proceso/workflows/multimedia/_schema/aula-promotion-review-v1.ts',
  '02_proceso/workflows/multimedia/_runner/aula-promotion-io-v1.ts',
  '05_verificacion/scripts/promote-aula-decks.mjs',
];
