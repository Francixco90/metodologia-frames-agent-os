// CI must run the same aggregate gate as `pnpm verify`; this check fails when the workflow
// drifts from the package.json chain. [CÓDIGO]
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';

const WORKFLOW = '.github/workflows/validate.yml';

type Workflow = {jobs?: Record<string, {steps?: Array<{run?: unknown}>}>};

export const verifyScripts = (verifyCommand: string): string[] =>
  verifyCommand
    .split('&&')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('pnpm '))
    .map((part) => part.slice('pnpm '.length).trim());

export const workflowRuns = (yamlSource: string): string[] => {
  const workflow = parse(yamlSource) as Workflow;
  return Object.values(workflow.jobs ?? {})
    .flatMap((job) => job.steps ?? [])
    .map((step) => (typeof step.run === 'string' ? step.run.trim() : ''))
    .filter((run) => run.length > 0);
};

export const missingVerifySteps = (verifyCommand: string, yamlSource: string): string[] => {
  const runs = workflowRuns(yamlSource);
  if (runs.includes('pnpm verify')) return [];
  const covered = new Set(runs.flatMap((run) => verifyScripts(run)));
  return verifyScripts(verifyCommand).filter((script) => !covered.has(script));
};

const main = (root = process.cwd()): void => {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const verify = pkg.scripts?.verify;
  if (!verify) {
    console.error('CI-PARITY001 package.json has no verify script');
    process.exitCode = 1;
    return;
  }
  const missing = missingVerifySteps(verify, readFileSync(resolve(root, WORKFLOW), 'utf8'));
  if (missing.length > 0) {
    console.error(`CI-PARITY002 ${WORKFLOW} does not run: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.info(`PASS CI PARITY: ${WORKFLOW} runs the full verify chain.`);
};

if (process.argv[1] && /check-ci-parity\.ts$/u.test(process.argv[1])) main();
