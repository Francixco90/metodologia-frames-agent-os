import {readFileSync, readdirSync, statSync} from 'node:fs';
import {basename, relative, resolve, sep} from 'node:path';

import {parse as parseYaml} from 'yaml';
import {ZodError} from 'zod';

export const walkFiles = (directory: string): string[] =>
  readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(path);
    return entry.isFile() ? [path] : [];
  });

export const portableRelative = (root: string, path: string): string =>
  relative(root, path).split(sep).join('/');

export const errorDetail = (error: unknown): string => {
  if (error instanceof ZodError) {
    return error.issues
      .map(({path, message}) => `${path.length > 0 ? path.join('.') : '<root>'}: ${message}`)
      .join('; ');
  }
  return error instanceof Error ? error.message : String(error);
};

export const splitFrontMatter = (
  path: string,
  content: string,
): {metadata: unknown; body: string} => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/u.exec(content);
  if (!match) throw new Error(`${path}: missing YAML front matter.`);
  return {metadata: parseYaml(match[1]!) as unknown, body: content.slice(match[0].length)};
};

export const statSafe = (path: string): boolean => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

export const statSafeDirectory = (path: string): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

export const findSingleFile = (root: string, filename: string): string => {
  const matches = walkFiles(root).filter((path) => basename(path) === filename);
  if (matches.length !== 1)
    throw new Error(`Expected exactly one ${filename}; found ${matches.length}.`);
  return matches[0]!;
};

export const readStructured = (path: string): unknown => {
  const content = readFileSync(path, 'utf8');
  return path.endsWith('.json')
    ? (JSON.parse(content) as unknown)
    : (parseYaml(content) as unknown);
};

export const sameSet = (left: string[], right: Set<string>): boolean =>
  left.length === right.size && left.every((item) => right.has(item));
