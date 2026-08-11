// check-brand/locator-scan.ts — scans brand/registry text for non-portable
// locators and raw colors outside the token projections. [CÓDIGO]
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';

const RAW_COLOR_ALLOWED = new Set([
  'brand/tokens/brand-tokens.yml',
  'brand/generated/social-light.tokens.json',
  'brand/generated/social-light.css',
  'brand/generated/social-light.tokens.ts',
]);

const extensionOf = (relativePath: string): string => {
  const filename = relativePath.split('/').at(-1) ?? '';
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot);
};

const walk = (root: string, directory: string, accumulator: string[]): void => {
  if (!existsSync(resolve(root, directory))) return;
  for (const entry of readdirSync(resolve(root, directory), {withFileTypes: true})) {
    const child = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(root, child, accumulator);
    } else if (entry.isFile()) {
      accumulator.push(child);
    }
  }
};

const addMatchingFiles = (
  root: string,
  directory: string,
  accumulator: Set<string>,
  matches: (relativePath: string) => boolean,
): void => {
  const discovered: string[] = [];
  walk(root, directory, discovered);
  for (const relativePath of discovered) {
    if (matches(relativePath)) accumulator.add(relativePath);
  }
};

export const scanLocatorsAndColors = (root: string): string[] => {
  const errors: string[] = [];
  const governedTextPaths = new Set(['docs/program/instagram-content-network-v2.md']);
  for (const directory of [
    'brand',
    'registries/brand',
    'registries/channels',
    'registries/content-types',
  ]) {
    addMatchingFiles(root, directory, governedTextPaths, () => true);
  }
  addMatchingFiles(root, '03_artefactos/renderers', governedTextPaths, () => true);
  addMatchingFiles(root, '02_proceso/workflows', governedTextPaths, (relativePath) =>
    /\/(?:templates|_assets)\//u.test(relativePath),
  );
  for (const directory of ['03_artefactos/content', '03_artefactos/projects']) {
    addMatchingFiles(
      root,
      directory,
      governedTextPaths,
      (relativePath) => extensionOf(relativePath) === '.html',
    );
  }
  for (const relativePath of governedTextPaths) {
    const bytes = readFileSync(resolve(root, relativePath));
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(text)) {
      errors.push(`BR009 non-portable locator in ${relativePath}`);
    }
    const isBrandAuthoritySurface =
      relativePath === 'docs/program/instagram-content-network-v2.md' ||
      relativePath.startsWith('brand/') ||
      relativePath.startsWith('registries/');
    if (
      isBrandAuthoritySurface &&
      !RAW_COLOR_ALLOWED.has(relativePath) &&
      /#[0-9a-f]{3,8}\b/iu.test(text)
    ) {
      errors.push(`BR004 raw color outside token projection in ${relativePath}`);
    }
  }
  return errors;
};
