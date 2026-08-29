import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {runSourceGovernanceCheck} from './lib/source-governance/run.ts';

export {runSourceGovernanceCheck};
export type {SourceGovernanceCheckResult} from './lib/source-governance/run.ts';

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  const result = runSourceGovernanceCheck(process.cwd());
  if (!result.ok) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      `PASS G02/G03/G06 SOURCES: ${result.sourceCount} fuentes; ` +
        'fixture activa y corpus canónico 0/4 fail-closed.',
    );
  }
}
