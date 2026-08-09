import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {runHostAdapterInstaller} from './lib/host-adapter-installer.ts';

type Args = {
  operation: 'PLAN' | 'APPLY' | 'VERIFY' | 'UNINSTALL';
  scope: 'repository' | 'user' | 'plugin';
  targetRoot: string;
  confirmation?: string;
};

export const parseHostAdapterArgs = (argv: string[], cwd = process.cwd()): Args => {
  let operation: Args['operation'] = 'PLAN';
  let selected = false;
  let scope: Args['scope'] = 'repository';
  let targetRoot = cwd;
  let confirmation: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    const choose = (next: Args['operation']): void => {
      if (selected) throw new Error('HOST-INSTALL-ARG001 select one operation');
      operation = next;
      selected = true;
    };
    if (argument === '--apply') choose('APPLY');
    else if (argument === '--verify') choose('VERIFY');
    else if (argument === '--uninstall') choose('UNINSTALL');
    else if (argument === '--scope') {
      const value = argv[++index];
      if (value !== 'repository' && value !== 'user' && value !== 'plugin') {
        throw new Error('HOST-INSTALL-ARG002 invalid scope');
      }
      scope = value;
    } else if (argument === '--target-root') {
      const value = argv[++index];
      if (!value || value.startsWith('-')) throw new Error('HOST-INSTALL-ARG003 target required');
      targetRoot = resolve(cwd, value);
    } else if (argument === '--confirm') {
      confirmation = argv[++index];
      if (!confirmation) throw new Error('HOST-INSTALL-ARG004 confirmation required');
    } else throw new Error(`HOST-INSTALL-ARG005 unsupported option ${argument}`);
  }
  return {operation, scope, targetRoot, ...(confirmation ? {confirmation} : {})};
};

export const runHostAdapterCli = (argv: string[], cwd = process.cwd()) =>
  runHostAdapterInstaller({sourceRoot: cwd, ...parseHostAdapterArgs(argv, cwd)});

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    process.stdout.write(`${JSON.stringify(runHostAdapterCli(process.argv.slice(2)), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
