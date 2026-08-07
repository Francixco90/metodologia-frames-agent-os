// prepare-project/outputs.ts — file writer helpers with prettier formatting.
// `writeText` preserves the original trailing-newline normalization. [CÓDIGO]
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {format, type Config as PrettierConfig} from 'prettier';
import YAML from 'yaml';

export type Writer = {
  readonly writeText: (relativePath: string, content: string) => void;
  readonly writeYaml: (relativePath: string, value: unknown) => Promise<void>;
  readonly writeJson: (relativePath: string, value: unknown) => Promise<void>;
  readonly writeMarkdown: (relativePath: string, content: string) => Promise<void>;
};

export const createWriter = (root: string, prettierConfig: PrettierConfig): Writer => {
  const writeText = (relativePath: string, content: string): void => {
    const path = resolve(root, relativePath);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  };
  const writeYaml = async (relativePath: string, value: unknown): Promise<void> => {
    const text = await format(YAML.stringify(value, {lineWidth: 0}), {
      ...prettierConfig,
      parser: 'yaml',
    });
    writeText(relativePath, text);
  };
  const writeJson = async (relativePath: string, value: unknown): Promise<void> => {
    const text = await format(JSON.stringify(value), {...prettierConfig, parser: 'json'});
    writeText(relativePath, text);
  };
  const writeMarkdown = async (relativePath: string, content: string): Promise<void> => {
    const text = await format(content, {...prettierConfig, parser: 'markdown'});
    writeText(relativePath, text);
  };
  return {writeText, writeYaml, writeJson, writeMarkdown};
};
