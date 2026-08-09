import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {
  DocumentationInventoryV1Schema,
  type DocumentationInventoryV1,
} from '../../02_proceso/core/contracts/documentation-inventory-v1.ts';
import {buildOwnerResolver} from './ledger/ownership.ts';
import {
  classifyMarkdown,
  evaluateMarkdown,
  hashText,
  type MarkdownClass,
} from './lib/documentation-evaluator.ts';
import {loadPolicy} from './lib/file-budget-policy.ts';

const REPORT = '01_intencion/program/documentation-inventory-v1.json';

const trackedMarkdown = (root: string): string[] => {
  const result = spawnSync('git', ['ls-files', '-z', '--', '*.md'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || 'git ls-files failed');
  return result.stdout.split('\0').filter(Boolean).sort();
};

export const buildDocumentationInventory = (root = process.cwd()): DocumentationInventoryV1 => {
  const paths = trackedMarkdown(root);
  const resolveOwner = buildOwnerResolver(root);
  const budgetRules = loadPolicy(root).budgets;
  const classPaths: Record<MarkdownClass, string[]> = {
    authored_control: [],
    workflow: [],
    template: [],
    skill: [],
    generated: [],
    vendor: [],
    evidence: [],
    historical: [],
  };
  for (const path of paths) classPaths[classifyMarkdown(path)].push(path);
  const auditedClasses = new Set<MarkdownClass>([
    'authored_control',
    'workflow',
    'template',
    'historical',
    'evidence',
  ]);
  const auditedGenerated = new Set([
    '01_intencion/program/file-disposition-ledger.md',
    '02_proceso/workflows/multimedia/_assets/multimedia-library.md',
  ]);
  const evaluations = paths
    .map((path) => [path, classifyMarkdown(path)] as const)
    .filter(([path, docClass]) => auditedClasses.has(docClass) || auditedGenerated.has(path))
    .map(([path, docClass]) => evaluateMarkdown(root, path, docClass, resolveOwner, budgetRules));
  const repositoryTreeSha256 = hashText(
    paths
      .map((path) => `${path}:${hashText(readFileSync(resolve(root, path), 'utf8'))}`)
      .join('\n'),
  );
  return DocumentationInventoryV1Schema.parse({
    schemaVersion: 'documentation-inventory-v1',
    repositoryTreeSha256,
    totalMarkdown: paths.length,
    auditedAuthored: evaluations.length,
    classPaths,
    evaluations,
    summary: {
      keep: evaluations.filter(({decision}) => decision === 'KEEP').length,
      refactor: evaluations.filter(({decision}) => decision === 'REFACTOR').length,
      split: evaluations.filter(({decision}) => decision === 'SPLIT').length,
      regenerate: classPaths.generated.length,
      freeze:
        classPaths.vendor.length + evaluations.filter(({decision}) => decision === 'FREEZE').length,
    },
  });
};

const serialized = (inventory: DocumentationInventoryV1) =>
  `${JSON.stringify(inventory, null, 2)}\n`;

const main = (): void => {
  const inventory = buildDocumentationInventory();
  const expected = serialized(inventory);
  if (process.argv.includes('--write')) {
    writeFileSync(resolve(process.cwd(), REPORT), expected);
    console.info(`WROTE ${REPORT} ${inventory.totalMarkdown}/${inventory.auditedAuthored}`);
    return;
  }
  const path = resolve(process.cwd(), REPORT);
  const actual = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (actual !== expected) {
    console.error('DOC-INVENTORY-DRIFT: run docs:audit -- --write');
    process.exitCode = 1;
    return;
  }
  console.info(
    `PASS DOC INVENTORY: ${inventory.totalMarkdown} Markdown; ${inventory.auditedAuthored} authored/control audited.`,
  );
};

const invoked = process.argv[1];
if (invoked !== undefined && resolve(fileURLToPath(import.meta.url)) === resolve(invoked)) main();
