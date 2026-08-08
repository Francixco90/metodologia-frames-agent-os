import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {TaskContractSchema} from '../../../core/contracts/index.ts';
import {PromptSpecFrontmatterSchema} from '../_schema/prompt-spec-v1.schema.ts';
import {MultimediaWorkflowSchema} from '../_schema/workflow-v1.schema.ts';

export const ROOT = process.cwd();
export const MULTIMEDIA_DIR = resolve(ROOT, '02_proceso/workflows/multimedia');
export const RECEIPTS_DIR = resolve(ROOT, '04_estado/receipts/workflows');

export const sha256 = (value: string | Buffer): string =>
  createHash('sha256').update(value).digest('hex');

const parseFrontmatter = (md: string): Record<string, unknown> | null => {
  const match = md.match(/^---\n([\s\S]*?)\n---/u);
  return match?.[1] ? (parse(match[1]) as Record<string, unknown>) : null;
};

export const parseArgs = (
  argv: string[],
): {
  workflow: string;
  dryRun: boolean;
  outputSelection?: string;
  intent?: string;
  workOrder?: string;
} => {
  const result: {
    workflow: string;
    dryRun: boolean;
    outputSelection?: string;
    intent?: string;
    workOrder?: string;
  } = {
    workflow: '',
    dryRun: false,
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') result.dryRun = true;
    else if (arg.startsWith('--workflow=')) result.workflow = arg.slice('--workflow='.length);
    else if (arg.startsWith('--output-selection=')) {
      result.outputSelection = arg.slice('--output-selection='.length);
    } else if (arg.startsWith('--intent=')) result.intent = arg.slice('--intent='.length);
    else if (arg.startsWith('--work-order=')) result.workOrder = arg.slice('--work-order='.length);
    else if (/^P[0-9]{2}$/u.test(arg)) result.workflow = arg;
  }
  return result;
};

const resolveWorkflowDir = (workflowId: string): string | null => {
  const prefix = `p${workflowId.slice(1)}-`;
  const entries = readdirSync(MULTIMEDIA_DIR, {withFileTypes: true}).filter(
    (entry) =>
      entry.isDirectory() &&
      entry.name.startsWith(prefix) &&
      existsSync(resolve(MULTIMEDIA_DIR, entry.name, 'workflow.yml')),
  );
  return entries.length === 1 && entries[0] ? resolve(MULTIMEDIA_DIR, entries[0].name) : null;
};

export const loadWorkflowContract = (workflowId: string) => {
  const dir = resolveWorkflowDir(workflowId);
  if (dir === null) return null;
  const workflowPath = resolve(dir, 'workflow.yml');
  const promptSpecPath = resolve(dir, 'prompt-spec.md');
  const taskTemplatePath = resolve(dir, 'task-template.yaml');
  const workflowRawYaml = readFileSync(workflowPath, 'utf8');
  const workflow = MultimediaWorkflowSchema.parse(parse(workflowRawYaml) as unknown);
  const frontmatter = PromptSpecFrontmatterSchema.parse(
    parseFrontmatter(readFileSync(promptSpecPath, 'utf8')),
  );
  const taskTemplate = TaskContractSchema.parse(
    parse(readFileSync(taskTemplatePath, 'utf8')) as unknown,
  );
  const inputResolutions = workflow.inputs.map((input) => {
    const resolved = resolve(MULTIMEDIA_DIR, input);
    return {input, resolved, exists: existsSync(resolved)};
  });
  return {
    dir,
    workflowPath,
    promptSpecPath,
    taskTemplatePath,
    workflowRawYaml,
    workflow,
    frontmatter,
    taskTemplate,
    inputResolutions,
  };
};

export const isoWithOffset = (date: Date): string => {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const pad = (value: number) => String(value).padStart(2, '0');
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return offset === 0 ? `${base}Z` : `${base}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};
