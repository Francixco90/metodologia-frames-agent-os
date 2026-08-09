import {spawnSync} from 'node:child_process';

const checks = [
  ['--import', 'tsx', '02_proceso/workflows/documentation/generate.ts'],
  ['--import', 'tsx', '05_verificacion/scripts/generate-ecosystem-inventory.ts'],
  ['--import', 'tsx', '05_verificacion/scripts/check-mutation-profiles.ts'],
];

const failures: string[] = [];
for (const args of checks) {
  const result = spawnSync(process.execPath, args, {cwd: process.cwd(), encoding: 'utf8'});
  if (result.status !== 0) failures.push(`${args.at(-1)}\n${result.stdout}${result.stderr}`);
  else if (result.stdout.trim()) process.stdout.write(result.stdout);
}
if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    'PASS documentation-os: workflows, portal, inventory and mutation profiles current.\n',
  );
}
