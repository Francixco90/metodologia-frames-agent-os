import {existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  MultimediaWorkflowIdSchema,
  type MultimediaWorkflowId,
} from '../_schema/workflow-v1.schema.ts';
import {
  generateDeliverableTemplates,
  type GeneratedDeliverableTemplate,
} from './deliverable-template-generator.ts';

export type TemplateSelector =
  | {kind: 'all'}
  | {kind: 'stage'; stage: MultimediaWorkflowId}
  | {kind: 'ids'; ids: ReadonlySet<string>};

export interface DeliverableTemplateGenerationOptions {
  root: string;
  outputRoot?: string;
  selector: TemplateSelector;
  write?: boolean;
}

export interface DeliverableTemplateGenerationResult {
  mode: 'check' | 'write';
  selected: number;
  written: string[];
  missing: string[];
  drift: string[];
  extra: string[];
}

const outputEntries = (template: GeneratedDeliverableTemplate) => [
  {path: template.markdownPath, content: template.markdown},
  {path: template.htmlPath, content: template.html},
];

const selectTemplates = (
  all: GeneratedDeliverableTemplate[],
  selector: TemplateSelector,
): GeneratedDeliverableTemplate[] => {
  if (selector.kind === 'all') return all;
  if (selector.kind === 'stage') {
    const selected = all.filter(({workflowId}) => workflowId === selector.stage);
    if (selected.length === 0) throw new Error(`No deliverables for stage ${selector.stage}`);
    return selected;
  }
  const selected = all.filter(({deliverableId}) => selector.ids.has(deliverableId));
  const known = new Set(selected.map(({deliverableId}) => deliverableId));
  const unknown = [...selector.ids].filter((id) => !known.has(id));
  if (unknown.length > 0) throw new Error(`Unknown deliverable ids: ${unknown.join(', ')}`);
  if (selected.length === 0) throw new Error('At least one deliverable id is required');
  return selected;
};

const findExtra = (
  outputRoot: string,
  selected: GeneratedDeliverableTemplate[],
  all: GeneratedDeliverableTemplate[],
): string[] => {
  const known = new Set(all.flatMap(outputEntries).map(({path}) => path));
  const directories = new Set(selected.map(({markdownPath}) => dirname(markdownPath)));
  const found: string[] = [];
  for (const directory of directories) {
    const absolute = resolve(outputRoot, directory);
    if (!existsSync(absolute)) continue;
    for (const entry of readdirSync(absolute, {withFileTypes: true})) {
      if (!entry.isFile() || !/\.template\.(?:md|html)$/u.test(entry.name)) continue;
      const path = `${directory}/${entry.name}`;
      if (!known.has(path)) found.push(path);
    }
  }
  return found.sort();
};

const atomicWrite = (path: string, content: string): void => {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content, 'utf8');
  if (readFileSync(temporary, 'utf8') !== content)
    throw new Error(`Write read-back failed: ${path}`);
  renameSync(temporary, path);
};

export const runDeliverableTemplateGeneration = (
  options: DeliverableTemplateGenerationOptions,
): DeliverableTemplateGenerationResult => {
  const root = resolve(options.root);
  const outputRoot = resolve(options.outputRoot ?? root);
  const all = generateDeliverableTemplates(root);
  const selected = selectTemplates(all, options.selector);
  const entries = selected.flatMap(outputEntries);
  const missing = entries
    .filter(({path}) => !existsSync(resolve(outputRoot, path)))
    .map(({path}) => path);
  const drift = entries
    .filter(({path, content}) => {
      const absolute = resolve(outputRoot, path);
      return existsSync(absolute) && readFileSync(absolute, 'utf8') !== content;
    })
    .map(({path}) => path);
  const extra = findExtra(outputRoot, selected, all);
  if (extra.length > 0) throw new Error(`Extra generated templates: ${extra.join(', ')}`);
  if (!options.write && (missing.length > 0 || drift.length > 0)) {
    throw new Error(`Template check failed; missing=${missing.length} drift=${drift.length}`);
  }
  const written: string[] = [];
  if (options.write) {
    for (const entry of entries) {
      if (!missing.includes(entry.path) && !drift.includes(entry.path)) continue;
      atomicWrite(resolve(outputRoot, entry.path), entry.content);
      written.push(entry.path);
    }
  }
  return {
    mode: options.write ? 'write' : 'check',
    selected: selected.length,
    written,
    missing,
    drift,
    extra,
  };
};

const argumentValue = (args: string[], index: number, name: string): string => {
  const argument = args[index];
  const inline = argument?.startsWith(`${name}=`) ? argument.slice(name.length + 1) : undefined;
  const value = inline ?? args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
};

export const parseDeliverableTemplateArgs = (args: string[]) => {
  let root = process.cwd();
  let outputRoot: string | undefined;
  let selector: TemplateSelector | undefined;
  let write = false;
  let modeDeclared = false;
  const setSelector = (value: TemplateSelector): void => {
    if (selector) throw new Error('Select exactly one of --all, --stage or --ids');
    selector = value;
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--write' || argument === '--check') {
      if (modeDeclared) throw new Error('Select at most one of --write or --check');
      write = argument === '--write';
      modeDeclared = true;
    } else if (argument === '--all') setSelector({kind: 'all'});
    else if (argument === '--root' || argument?.startsWith('--root=')) {
      root = argumentValue(args, index, '--root');
      if (!argument.includes('=')) index += 1;
    } else if (argument === '--output-root' || argument?.startsWith('--output-root=')) {
      outputRoot = argumentValue(args, index, '--output-root');
      if (!argument.includes('=')) index += 1;
    } else if (argument === '--stage' || argument?.startsWith('--stage=')) {
      setSelector({
        kind: 'stage',
        stage: MultimediaWorkflowIdSchema.parse(argumentValue(args, index, '--stage')),
      });
      if (!argument.includes('=')) index += 1;
    } else if (argument === '--ids' || argument?.startsWith('--ids=')) {
      const ids = argumentValue(args, index, '--ids').split(',').filter(Boolean);
      setSelector({kind: 'ids', ids: new Set(ids)});
      if (!argument.includes('=')) index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!selector) throw new Error('Select exactly one of --all, --stage or --ids');
  return {root, ...(outputRoot ? {outputRoot} : {}), selector, write};
};

const invoked = process.argv[1];
if (invoked && resolve(fileURLToPath(import.meta.url)) === resolve(invoked)) {
  const result = runDeliverableTemplateGeneration(
    parseDeliverableTemplateArgs(process.argv.slice(2)),
  );
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
