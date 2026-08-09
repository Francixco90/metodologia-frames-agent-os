import {lstatSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';
import {z} from 'zod';

import {loadPolicy} from './lib/file-budget-policy.ts';

const DocumentSchema = z.object({
  path: z.string().min(1),
  audience: z.string().min(1),
  purpose: z.string().min(1),
  required_headings: z.array(z.string().min(1)).min(3),
});
const RegistrySchema = z.object({
  schema_version: z.literal('frames-user-facing-docs-v1'),
  policy_ref: z.literal('02_proceso/governance/ux-writing-policy.md'),
  budget_surface: z.literal('user-facing-explanatory-documentation'),
  documents: z.array(DocumentSchema).min(1),
});

export const validateUserFacingDocs = (root = process.cwd()): string[] => {
  const errors: string[] = [];
  const registry = RegistrySchema.parse(
    parse(readFileSync(resolve(root, '02_proceso/governance/user-facing-docs.yml'), 'utf8')),
  );
  const paths = registry.documents.map(({path}) => path);
  if (new Set(paths).size !== paths.length) errors.push('UXDOC-001 duplicate registered path');
  const policy = loadPolicy(root);
  const exemption = policy.budgets.find(({surface}) => surface === registry.budget_surface);
  if (exemption?.kind !== 'exempt') errors.push('UXDOC-002 exemption is missing');
  if (JSON.stringify(exemption?.match) !== JSON.stringify(paths)) {
    errors.push('UXDOC-003 registry and budget exemption differ');
  }
  for (const document of registry.documents) {
    const path = resolve(root, document.path);
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      errors.push(`UXDOC-004 unsafe document: ${document.path}`);
      continue;
    }
    const markdown = readFileSync(path, 'utf8');
    for (const heading of document.required_headings) {
      if (!markdown.includes(`## ${heading}`)) {
        errors.push(`UXDOC-005 ${document.path}: missing ${heading}`);
      }
    }
  }
  return errors;
};

const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const errors = validateUserFacingDocs();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info('PASS USER DOCS: utility-first registry, headings and budget exemption agree.');
  }
}
