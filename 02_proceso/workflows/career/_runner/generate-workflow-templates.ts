import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {renderCareerWorkflowTemplateHtml} from './workflow-template-model.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TEMPLATES = [
  'c00-intake/templates/candidate-foundation-brief-v1.template',
  'c01-evidence/templates/evidence-bank-v1.template',
  'c02-positioning/templates/positioning-charter-v1.template',
  'c03-discovery/templates/job-search-brief-v1.template',
  'c04-scoring/templates/fit-scorecard-v1.template',
  'c05-application-design/templates/application-brief-v1.template',
  'c06-cv/templates/cv-source-v2.template',
  'c07-cover-letter/templates/cover-letter-v1.template',
  'c08-package-qa/templates/cv-package-v3.template',
  'c09-submission/templates/submission-preview-v1.template',
] as const;

export type CareerTemplateGenerationResult = {
  status: 'PASS';
  mode: 'write' | 'check';
  entries: readonly {source: string; output: string; status: 'CURRENT' | 'GENERATED' | 'DRIFT'}[];
};

export class CareerTemplateDriftError extends Error {
  public constructor(public readonly outputs: readonly string[]) {
    super(`CAREER-TEMPLATE-DRIFT: ${outputs.join(', ')}`);
    this.name = 'CareerTemplateDriftError';
  }
}

const readOptional = (path: string): string | null => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
};

export const generateCareerWorkflowTemplates = (
  input: {
    check?: boolean;
    root?: string;
  } = {},
): CareerTemplateGenerationResult => {
  const root = input.root ?? ROOT;
  const entries = TEMPLATES.map((stem) => {
    const sourcePath = resolve(root, `${stem}.md`);
    const outputPath = resolve(root, `${stem}.html`);
    const expected = renderCareerWorkflowTemplateHtml(readFileSync(sourcePath, 'utf8'));
    const current = readOptional(outputPath);
    const relativeSource = `${stem}.md`;
    const relativeOutput = `${stem}.html`;
    if (current === expected) {
      return {source: relativeSource, output: relativeOutput, status: 'CURRENT' as const};
    }
    if (input.check) {
      return {source: relativeSource, output: relativeOutput, status: 'DRIFT' as const};
    }
    writeFileSync(outputPath, expected, 'utf8');
    return {source: relativeSource, output: relativeOutput, status: 'GENERATED' as const};
  });
  const drift = entries.filter(({status}) => status === 'DRIFT').map(({output}) => output);
  if (drift.length > 0) throw new CareerTemplateDriftError(drift);
  return {
    status: 'PASS',
    mode: input.check ? 'check' : 'write',
    entries,
  };
};

if (process.argv[1]?.endsWith('generate-workflow-templates.ts')) {
  const result = generateCareerWorkflowTemplates({check: process.argv.includes('--check')});
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
