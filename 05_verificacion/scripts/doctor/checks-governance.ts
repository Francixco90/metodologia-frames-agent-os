// doctor/checks-governance.ts — governance manifests exist + parseable.
// Unparseable/missing manifest = hard structural failure. [CONFIG]
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {record, ROOT} from '../doctor/types.ts';

const parseableYamlObject = (path: string, label: string, issues: string[]): void => {
  if (!existsSync(path)) {
    issues.push(`${label} ausente`);
    return;
  }
  try {
    const parsed: unknown = parse(readFileSync(path, 'utf8'));
    if (parsed === null || typeof parsed !== 'object') {
      issues.push(`${label} parsea a no-objeto`);
    }
  } catch (err) {
    issues.push(`${label} no parseable: ${(err as Error).message}`);
  }
};

export const checkGovernance = (): void => {
  const governanceDir = resolve(ROOT, '02_proceso/governance');
  const yamlFiles = ['tool-policy.yml', 'router.yml'] as const;
  const commandsPath = resolve(ROOT, '05_verificacion/scripts/commands.yaml');
  const reconciliationPath = resolve(governanceDir, 'harness-subsystem-reconciliation.md');
  const issues: string[] = [];

  for (const name of yamlFiles) parseableYamlObject(resolve(governanceDir, name), name, issues);
  parseableYamlObject(commandsPath, 'commands.yaml', issues);

  if (!existsSync(reconciliationPath)) {
    issues.push('harness-subsystem-reconciliation.md ausente');
  } else {
    const text = readFileSync(reconciliationPath, 'utf8');
    if (text.trim().length === 0) issues.push('harness-subsystem-reconciliation.md vacío');
  }

  if (issues.length > 0) {
    record('governance', 'fail', issues.join('; '));
  } else {
    record(
      'governance',
      'pass',
      'tool-policy.yml, router.yml, commands.yaml, harness-subsystem-reconciliation.md presentes y parseables',
    );
  }
};
