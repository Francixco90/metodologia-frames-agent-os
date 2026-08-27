import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export {
  CANON_V3_BOOTSTRAP_CHARACTER_BUDGET,
  CANON_V3_DEFAULT_ROOT,
  CANON_V3_DUPLICATE_CONTAINMENT_LIMIT,
  CANON_V3_WORD_BUDGET,
  type CanonV3ValidationReport,
  type DuplicatePair,
} from './notebooklm-canon-v3/model.ts';
export {
  assertNotebookLmCanonV3,
  validateNotebookLmCanonV3,
} from './notebooklm-canon-v3/validate.ts';

import {CANON_V3_DEFAULT_ROOT} from './notebooklm-canon-v3/model.ts';
import {assertNotebookLmCanonV3} from './notebooklm-canon-v3/validate.ts';

const cliRoot = (): string => {
  const rootIndex = process.argv.indexOf('--root');
  if (rootIndex === -1) return CANON_V3_DEFAULT_ROOT;
  const value = process.argv[rootIndex + 1];
  if (!value) throw new Error('--root requires a path.');
  return value;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    process.stdout.write(`${JSON.stringify(assertNotebookLmCanonV3(cliRoot()), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
