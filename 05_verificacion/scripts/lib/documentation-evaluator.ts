import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {type BudgetRule, effectiveRules} from './file-budget-policy.ts';

export type MarkdownClass =
  | 'authored_control'
  | 'workflow'
  | 'template'
  | 'skill'
  | 'generated'
  | 'vendor'
  | 'evidence'
  | 'historical';

export const hashText = (value: string): string => createHash('sha256').update(value).digest('hex');

export const classifyMarkdown = (path: string): MarkdownClass => {
  if (path.startsWith('03_artefactos/skills/vendor/')) return 'vendor';
  if (path.startsWith('04_estado/receipts/') || path.startsWith('05_verificacion/quality/')) {
    return 'evidence';
  }
  if (/^03_artefactos\/skills\/[^/]+\/SKILL\.md$/u.test(path)) return 'skill';
  if (
    path === 'context.md' ||
    path.endsWith('/context.md') ||
    path.includes('/generated/') ||
    path.endsWith('.generated.md') ||
    path.endsWith('/file-disposition-ledger.md') ||
    path === '02_proceso/workflows/multimedia/_assets/multimedia-library.md'
  )
    return 'generated';
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

const brokenLinks = (root: string, path: string, content: string): string[] => {
  if (!isCritical(path)) return [];
  return [...content.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)]
    .map((match) => match[1]!)
    .filter((target) => !/^(?:https?:|mailto:|#)/u.test(target))
    .map((target) => target.split('#')[0]!)
    .filter(Boolean)
    .filter((target) => !existsSync(resolve(root, dirname(path), target)));
};

type Finding = {code: string; severity: 'low' | 'medium' | 'high'; detail: string};

export const evaluateMarkdown = (
  root: string,
  path: string,
  docClass: MarkdownClass,
  resolveOwner: (candidate: string) => {owner: string; evidence: string},
  budgetRules: BudgetRule[],
) => {
  const content = readFileSync(resolve(root, path), 'utf8');
  const lines = content.split('\n').length;
  const words = content.trim().length === 0 ? 0 : content.trim().split(/\s+/u).length;
  const threshold = isCritical(path) ? 90 : 80;
  let owner: {owner: string; evidence: string};
  try {
    owner = resolveOwner(path);
  } catch {
    owner = {owner: 'UNRESOLVED', evidence: 'coverage_gap:ownership'};
  }
  const rules = effectiveRules(budgetRules, path, docClass === 'generated');
  const findings: Finding[] = [];
  let score = 100;
  const add = (code: string, severity: Finding['severity'], detail: string, cost: number): void => {
    findings.push({code, severity, detail});
    score -= cost;
  };
  if (owner.owner === 'UNRESOLVED')
    add('DOC-OWNER001', 'high', 'No resuelve un owner canónico.', 30);
  if (rules.length !== 1)
    add('DOC-BUDGET001', 'high', `Resuelve ${rules.length} reglas de presupuesto.`, 30);
  if (!/^#\s+\S/mu.test(content)) add('DOC-HEADING001', 'medium', 'Falta un H1.', 15);
  if (
    /\/Users\/(?!…|\.\.\.)[^/\s`]+\/[^\s`]+|\/home\/(?!…|\.\.\.)[^/\s`]+\/[^\s`]+|[A-Za-z]:\\Users\\[^\\\s`]+\\[^\s`]+/u.test(
      content,
    )
  )
    add('DOC-PRIVACY001', 'high', 'Contiene un locator local absoluto.', 30);
  const broken = brokenLinks(root, path, content);
  if (broken.length > 0)
    add(
      'DOC-LINK001',
      'high',
      `Referencias no resolubles: ${broken.join(', ')}`,
      Math.min(30, broken.length * 10),
    );
  if (path === 'CLAUDE.md' && !/```(?:bash|sh|shell)\n/iu.test(content))
    add('DOC-COMMAND001', 'medium', 'Falta un bloque de comandos ejecutables.', 20);
  if (path === 'README.md' && /152 entradas|Total: 162 skills|550\+ casos/u.test(content))
    add('DOC-DRIFT001', 'high', 'Conserva conteos manuales obsoletos.', 20);
  const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gmu)].map((match) => match[1]!.trim());
  const decision =
    docClass === 'historical' || docClass === 'evidence'
      ? 'FREEZE'
      : docClass === 'generated'
        ? 'REGENERATE'
        : lines > 400 || words > 2500
          ? 'SPLIT'
          : score < threshold
            ? 'REFACTOR'
            : 'KEEP';
  const htmlPeer = path.endsWith('.md') ? path.slice(0, -3) + '.html' : '';
  return {
    path,
    class: docClass,
    owner: owner.owner,
    ownerEvidence: owner.evidence,
    authorityRefs: isCritical(path) && path !== 'AGENTS.md' ? ['AGENTS.md', path] : [path],
    budgetSurface: rules.length === 1 ? rules[0]!.surface : `UNRESOLVED:${rules.length}`,
    sourceRef: docClass === 'generated' ? null : path,
    derivatives: htmlPeer && existsSync(resolve(root, htmlPeer)) ? [htmlPeer] : [],
    lifecycle:
      docClass === 'evidence' || docClass === 'historical'
        ? 'frozen'
        : docClass === 'generated'
          ? 'generated'
          : 'active',
    sha256: hashText(content),
    words,
    lines,
    score: Math.max(0, score),
    threshold,
    decision,
    findings,
    qualitySignals: {
      hasExecutableCommand: /```(?:bash|sh|shell)\n/iu.test(content),
      hasAuthorityLink: /\[[^\]]+\]\([^)]+\)|(?:authority|autoridad)/iu.test(content),
      hasNextAction: /(?:next action|siguiente acci[oó]n|para continuar|ejecuta|run )/iu.test(
        content,
      ),
      duplicateHeadings: headings.length - new Set(headings).size,
    },
  } as const;
};
