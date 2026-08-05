import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {ContributionEntrySchema} from '../../../registries/contributions/schemas/contribution-entry.ts';
import {describe, expect, it} from 'vitest';

const root = process.cwd();
const entriesDir = resolve(root, 'registries/contributions/entries');

describe('Contribution registry', () => {
  const files = readdirSync(entriesDir).filter((f) => f.endsWith('.yml'));

  it('has at least one entry', () => {
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('all entries pass schema validation', () => {
    for (const file of files) {
      const text = readFileSync(resolve(entriesDir, file), 'utf8');
      const parsed = parse(text) as unknown;
      expect(() => ContributionEntrySchema.parse(parsed), `${file} failed`).not.toThrow();
    }
  });

  it('all registry_entry_ids are unique', () => {
    const ids = new Set<string>();
    for (const file of files) {
      const text = readFileSync(resolve(entriesDir, file), 'utf8');
      const entry = ContributionEntrySchema.parse(parse(text) as unknown);
      expect(ids.has(entry.registry_entry_id), `duplicate ${entry.registry_entry_id}`).toBe(false);
      ids.add(entry.registry_entry_id);
    }
  });

  it('no contributor_alias contains email-like PII', () => {
    for (const file of files) {
      const text = readFileSync(resolve(entriesDir, file), 'utf8');
      const entry = ContributionEntrySchema.parse(parse(text) as unknown);
      expect(entry.contributor_alias).not.toMatch(/@/u);
      expect(entry.contributor_alias).not.toMatch(/\./u);
    }
  });

  it('filename matches registry_entry_id', () => {
    for (const file of files) {
      const text = readFileSync(resolve(entriesDir, file), 'utf8');
      const entry = ContributionEntrySchema.parse(parse(text) as unknown);
      expect(file.replace('.yml', '')).toBe(entry.registry_entry_id);
    }
  });

  it('allows duplicate original_folio_id across entries', () => {
    const folios: string[] = [];
    for (const file of files) {
      const text = readFileSync(resolve(entriesDir, file), 'utf8');
      const entry = ContributionEntrySchema.parse(parse(text) as unknown);
      folios.push(entry.original_folio_id);
    }
    // Duplicates are allowed — this test verifies no error is thrown
    expect(folios.length).toBe(files.length);
  });
});
