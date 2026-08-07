// check-brand/locator-scan.ts — scans brand/registry text for non-portable
// locators and raw colors outside the token projections. [CÓDIGO]
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';

const RAW_COLOR_ALLOWED = new Set([
  'brand/tokens/brand-tokens.yml',
  'brand/generated/social-light.tokens.json',
  'brand/generated/social-light.css',
  'brand/generated/social-light.tokens.ts',
]);

const walk = (root: string, directory: string, accumulator: string[]): void => {
  for (const entry of readdirSync(resolve(root, directory), {withFileTypes: true})) {
    const child = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(root, child, accumulator);
    } else if (entry.isFile()) {
      accumulator.push(child);
    }
  }
};

export const scanLocatorsAndColors = (root: string): string[] => {
  const errors: string[] = [];
  const governedTextPaths = ['docs/program/instagram-content-network-v2.md'];
  for (const directory of [
    'brand',
    'registries/brand',
    'registries/channels',
    'registries/content-types',
  ]) {
    walk(root, directory, governedTextPaths);
  }
  for (const relativePath of governedTextPaths) {
    const bytes = readFileSync(resolve(root, relativePath));
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(text)) {
      errors.push(`BR009 non-portable locator in ${relativePath}`);
    }
    if (!RAW_COLOR_ALLOWED.has(relativePath) && /#[0-9a-f]{3,8}\b/iu.test(text)) {
      errors.push(`BR004 raw color outside token projection in ${relativePath}`);
    }
  }
  return errors;
};
