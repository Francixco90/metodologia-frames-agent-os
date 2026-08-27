import {readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse as parseYaml} from 'yaml';

export const root = process.cwd();
export const errors: string[] = [];
export const fixtureRoot = '05_verificacion/fixtures/notebooklm-os';
export const templateRoot =
  '03_artefactos/skills/notebooklm-brand-content-director/assets/prompt-templates';

export const read = (relativePath: string): string =>
  readFileSync(resolve(root, relativePath), 'utf8');
export const readYaml = (relativePath: string): unknown => parseYaml(read(relativePath)) as unknown;
export const add = (condition: boolean, message: string): void => {
  if (!condition) errors.push(message);
};
export const unique = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;

export const walkFiles = (relativeDirectory: string): string[] => {
  const entries = readdirSync(resolve(root, relativeDirectory), {withFileTypes: true});
  return entries.flatMap((entry) => {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    return entry.isDirectory() ? walkFiles(relativePath) : [relativePath];
  });
};

export const parseFrontMatter = (
  raw: string,
  relativePath: string,
): Record<string, unknown> | null => {
  const match = /^---\n([\s\S]*?)\n---\n/u.exec(raw);
  if (!match?.[1]) {
    errors.push(`${relativePath}: falta front matter YAML`);
    return null;
  }
  const parsed = parseYaml(match[1]) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    errors.push(`${relativePath}: front matter inválido`);
    return null;
  }
  return parsed as Record<string, unknown>;
};

export const validateXmlSandwich = (raw: string, relativePath: string): void => {
  const xml = raw.slice(raw.indexOf('\n---\n') + 5);
  const tokens = xml.matchAll(/<(\/)?([a-z][a-z0-9_-]*)(?:\s[^<>]*)?(\/?)>/gu);
  const stack: string[] = [];
  for (const token of tokens) {
    const closing = token[1] === '/';
    const name = token[2];
    const selfClosing = token[3] === '/';
    if (!name || selfClosing) continue;
    if (closing) {
      const open = stack.pop();
      if (open !== name) {
        errors.push(`${relativePath}: XML desbalanceado; cierra ${name} sobre ${open ?? 'vacío'}`);
        return;
      }
    } else stack.push(name);
  }
  add(stack.length === 0, `${relativePath}: XML desbalanceado; quedan ${stack.join(', ')}`);
  for (const section of [
    'prompt_template',
    'abstract',
    'routing',
    'inputs',
    'source_selection',
    'output_contract',
    'negative_prompt',
    'acceptance',
    'idempotency',
  ]) {
    add(xml.includes(`<${section}>`), `${relativePath}: falta <${section}>`);
    add(xml.includes(`</${section}>`), `${relativePath}: falta </${section}>`);
  }
};
