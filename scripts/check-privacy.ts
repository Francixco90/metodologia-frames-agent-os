import {execFileSync} from 'node:child_process';
import {readFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const versionable = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard'],
  {encoding: 'utf8'},
)
  .split('\n')
  .filter(Boolean);

const forbiddenPathPatterns = [/\.env(?:\.|$)/u, /work\/private\/(?!\.gitkeep)/u];

const forbiddenContentPatterns = [
  /\/Users\/[a-z0-9._-]+\//iu,
  /\/home\/[a-z0-9_-]+\//iu,
  /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/u,
];

const secretPatterns = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/u,
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/u,
  /\bAIza[0-9A-Za-z_-]{30,}\b/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
];

const privateLocatorKeys =
  /(?:private_locator|notebook_uuid|cookie|access_token|refresh_token)\s*[:=]/iu;
const errors: string[] = [];
const isAdversarialFixture = (relativePath: string): boolean =>
  relativePath.includes('/fixtures/negative/') ||
  relativePath.startsWith('tests/negative/') ||
  relativePath === 'tests/unit/core/contracts.test.ts';

for (const relativePath of versionable) {
  if (forbiddenPathPatterns.some((pattern) => pattern.test(relativePath))) {
    errors.push(`${relativePath}: ruta prohibida versionada`);
    continue;
  }
  const absolutePath = resolve(root, relativePath);
  if (!statSync(absolutePath).isFile()) continue;
  const content = readFileSync(absolutePath);
  if (content.includes(0)) continue;
  const text = content.toString('utf8');
  if (
    !isAdversarialFixture(relativePath) &&
    forbiddenContentPatterns.some((pattern) => pattern.test(text))
  ) {
    errors.push(`${relativePath}: locator o ruta local detectada`);
  }
  if (secretPatterns.some((pattern) => pattern.test(text))) {
    errors.push(`${relativePath}: patrón de secreto detectado`);
  }
  if (
    privateLocatorKeys.test(text) &&
    !relativePath.startsWith('tests/negative/') &&
    !relativePath.includes('schema')
  ) {
    errors.push(`${relativePath}: clave de locator privado fuera de fixture/schema`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS PRIVACY: ${versionable.length} archivos versionables sin secretos ni locators privados.`,
  );
}
