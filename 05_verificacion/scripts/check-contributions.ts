import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';

import {ContributionEntrySchema} from '../../registries/contributions/schemas/contribution-entry.ts';

const root = process.cwd();
const entriesDir = resolve(root, 'registries/contributions/entries');
const errors: string[] = [];
const seenIds = new Set<string>();
const seenAliases = new Set<string>();

const piiPatterns = [/[A-Z][a-z]+@[A-Z][a-z]+\.com/iu, /^github:/iu, /^@[a-z0-9-]+$/iu];

const files = readdirSync(entriesDir).filter((f) => f.endsWith('.yml'));

for (const file of files) {
  const path = resolve(entriesDir, file);
  const text = readFileSync(path, 'utf8');
  const parsed = parse(text) as unknown;

  const result = ContributionEntrySchema.safeParse(parsed);
  if (!result.success) {
    errors.push(`${file}: schema validation failed: ${result.error.message}`);
    continue;
  }

  const entry = result.data;

  if (seenIds.has(entry.registry_entry_id)) {
    errors.push(`${file}: duplicate registry_entry_id ${entry.registry_entry_id}`);
  }
  seenIds.add(entry.registry_entry_id);

  for (const pattern of piiPatterns) {
    if (pattern.test(entry.contributor_alias)) {
      errors.push(`${file}: contributor_alias may contain PII: ${entry.contributor_alias}`);
    }
  }
  seenAliases.add(entry.contributor_alias);

  if (file.replace('.yml', '') !== entry.registry_entry_id) {
    errors.push(`${file}: filename must match registry_entry_id`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(`PASS CONTRIBUTIONS: ${files.length} entries valid, ${seenIds.size} unique IDs.`);
}
