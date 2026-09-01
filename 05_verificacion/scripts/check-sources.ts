import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  runProjectLocalSourceGovernanceCheck,
  runSourceGovernanceCheck,
} from './lib/source-governance/run.ts';

export {runProjectLocalSourceGovernanceCheck, runSourceGovernanceCheck};
export type {SourceGovernanceCheckResult} from './lib/source-governance/run.ts';

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  const projectLocal = process.argv.slice(2).includes('--project-local');
  const result = projectLocal
    ? runProjectLocalSourceGovernanceCheck(process.cwd())
    : runSourceGovernanceCheck(process.cwd());
  if (!result.ok) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      projectLocal
        ? `PASS PROJECT_LOCAL SOURCES: ${result.sourceCount} fuentes donantes; overlay aislado.`
        : `PASS G02/G03/G06 SOURCES: ${result.sourceCount} fuentes; ` +
            'fixture activa y corpus canónico 0/4 fail-closed.',
    );
  }
}
