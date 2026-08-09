import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {
  DocumentationInventoryV1Schema,
  type DocumentationInventoryV1,
} from '../../02_proceso/core/contracts/documentation-inventory-v1.ts';

const REPORT = '05_verificacion/quality/reports/documentation-inventory-v1.json';
const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
type MarkdownClass =
  | 'authored_control'
  | 'workflow'
  | 'template'
  | 'skill'
  | 'generated'
  | 'vendor'
  | 'evidence'
  | 'historical';
const trackedMarkdown = (root: string): string[] => {
  const result = spawnSync('git', ['ls-files', '-z', '--', '*.md'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || 'git ls-files failed');
  return result.stdout.split('\0').filter(Boolean).sort();
};

const classify = (path: string): MarkdownClass => {
  if (path.startsWith('03_artefactos/skills/vendor/')) return 'vendor';
  if (path.startsWith('04_estado/receipts/') || path.startsWith('05_verificacion/quality/')) {
    return 'evidence';
  }
  if (/^03_artefactos\/skills\/[^/]+\/SKILL\.md$/u.test(path)) return 'skill';
  if (path.includes('/generated/') || path.endsWith('.generated.md')) return 'generated';
  if (path === 'changelog.md' || path.endsWith('/lessons-learned.md') || path.includes('/adrs/')) {
    return 'historical';
  }
  if (path.endsWith('.template.md')) return 'template';
  if (path.startsWith('02_proceso/workflows/')) return 'workflow';
  return 'authored_control';
};

const isCritical = (path: string): boolean =>
  ['README.md', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].includes(path) ||
  path.startsWith('02_proceso/governance/');

const brokenCriticalLinks = (root: string, path: string, content: string): string[] => {
  if (!isCritical(path)) return [];
  const links = [...content.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)].map((match) => match[1]!);
  return links
    .filter((target) => !/^(?:https?:|mailto:|#)/u.test(target))
    .map((target) => target.split('#')[0]!)
    .filter(Boolean)
    .filter((target) => !existsSync(resolve(root, dirname(path), target)));
};

const evaluate = (root: string, path: string, docClass: MarkdownClass) => {
  const content = readFileSync(resolve(root, path), 'utf8');
  const lines = content.split('\n').length;
  const words = content.trim().length === 0 ? 0 : content.trim().split(/\s+/u).length;
  const threshold = isCritical(path) ? 90 : 80;
  const findings: Array<{code: string; severity: 'low' | 'medium' | 'high'; detail: string}> = [];
  let score = 100;
  if (!/^#\s+\S/mu.test(content)) {
    findings.push({code: 'DOC-HEADING001', severity: 'medium', detail: 'Falta un H1.'});
    score -= 15;
  }
  if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(content)) {
    findings.push({
      code: 'DOC-PRIVACY001',
      severity: 'high',
      detail: 'Contiene un locator local absoluto.',
    });
    score -= 30;
  }
  const broken = brokenCriticalLinks(root, path, content);
  if (broken.length > 0) {
    findings.push({
      code: 'DOC-LINK001',
      severity: 'high',
      detail: `Referencias no resolubles: ${broken.join(', ')}`,
    });
    score -= Math.min(30, broken.length * 10);
  }
  if (path === 'CLAUDE.md' && !/```(?:bash|sh|shell)\n/iu.test(content)) {
    findings.push({
      code: 'DOC-COMMAND001',
      severity: 'medium',
      detail: 'Falta un bloque de comandos copy-paste-ready.',
    });
    score -= 20;
  }
  if (path === 'README.md' && /152 entradas|Total: 162 skills|550\+ casos/u.test(content)) {
    findings.push({
      code: 'DOC-DRIFT001',
      severity: 'high',
      detail: 'Conserva conteos manuales obsoletos.',
    });
    score -= 20;
  }
  const decision =
    docClass === 'historical' || docClass === 'evidence'
      ? 'FREEZE'
      : lines > 400 || words > 2500
        ? 'SPLIT'
        : score < threshold
          ? 'REFACTOR'
          : 'KEEP';
  return {
    path,
    class: docClass,
    sha256: hash(content),
    words,
    lines,
    score: Math.max(0, score),
    threshold,
    decision,
    findings,
  } as const;
};

export const buildDocumentationInventory = (root = process.cwd()): DocumentationInventoryV1 => {
  const paths = trackedMarkdown(root);
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
  for (const path of paths) classPaths[classify(path)].push(path);
  const auditedClasses = new Set<MarkdownClass>([
    'authored_control',
    'workflow',
    'template',
    'historical',
    'evidence',
  ]);
  const evaluations = paths
    .map((path) => [path, classify(path)] as const)
    .filter(([, docClass]) => auditedClasses.has(docClass))
    .map(([path, docClass]) => evaluate(root, path, docClass));
  const repositoryTreeSha256 = hash(
    paths.map((path) => `${path}:${hash(readFileSync(resolve(root, path), 'utf8'))}`).join('\n'),
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
        classPaths.vendor.length +
        classPaths.evidence.length +
        evaluations.filter(({decision}) => decision === 'FREEZE').length,
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
  } else {
    const actual = existsSync(resolve(process.cwd(), REPORT))
      ? readFileSync(resolve(process.cwd(), REPORT), 'utf8')
      : '';
    if (actual !== expected) {
      console.error('DOC-INVENTORY-DRIFT: run docs:audit -- --write');
      process.exitCode = 1;
    } else {
      console.info(
        `PASS DOC INVENTORY: ${inventory.totalMarkdown} Markdown; ${inventory.auditedAuthored} authored/control audited.`,
      );
    }
  }
};

const invoked = process.argv[1];
if (invoked !== undefined && resolve(fileURLToPath(import.meta.url)) === resolve(invoked)) main();
