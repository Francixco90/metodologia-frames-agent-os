import {describe, expect, it} from 'vitest';
import {resolve} from 'node:path';

import {buildEcosystemInventoryV1} from 'workflows/maintenance/index.ts';
import type {LocalExtensionDiscovery} from 'workflows/local-extensions/index.ts';
import {
  renderInventoryHtmlV1,
  renderInventoryMarkdownV1,
} from 'scripts/generate-ecosystem-inventory.ts';

const root = process.cwd();
const privateRoot = resolve(root, '..', 'private-fixture', 'secret');
const localDiscovery: LocalExtensionDiscovery = {
  schema_version: 'frames-local-extension-discovery-v1',
  project_root: `${root}/04_estado/local/extensions`,
  user_root: resolve(root, '..', 'private-fixture'),
  records: [
    {
      extension_id: 'local.frames.private-review',
      scope: 'USER_LOCAL',
      source_root: privateRoot,
      manifest_ref: 'private-review/extension.yml',
      manifest_sha256: 'a'.repeat(64),
      state: 'ACTIVE_LOCAL',
      reason_codes: [],
    },
  ],
};

const identity = (item: {kind: string; id: string}): string => `${item.kind}\0${item.id}`;

describe('ecosystem inventory projections', () => {
  it('keeps the public inventory canonical, exact and deterministic', () => {
    const first = buildEcosystemInventoryV1(root);
    const second = buildEcosystemInventoryV1(root);
    expect(first).toEqual(second);
    expect(first.scope).toBe('PUBLIC');
    expect(first.items.every(({scope}) => scope === 'CANONICAL')).toBe(true);
    expect(first.items.every(({ref}) => !ref.startsWith('04_estado/local/'))).toBe(true);
    const identities = first.items.map(identity);
    expect(new Set(identities).size).toBe(identities.length);
    expect(first.sourceSha256).toMatch(/^[a-f0-9]{64}$/u);
    for (const sourceId of ['SRC-PROPOSAL-MEASURE-E0D6BA4', 'SRC-TECHNICAL-DEFENSE-78FD383']) {
      expect(first.items.find(({kind, id}) => kind === 'SOURCE' && id === sourceId)).toMatchObject({
        state: 'EVALUATED',
      });
    }
  });

  it('combines one sanitized local record without exposing private locators', () => {
    const publicInventory = buildEcosystemInventoryV1(root);
    const local = buildEcosystemInventoryV1(root, localDiscovery);
    expect(local.scope).toBe('LOCAL_COMBINED');
    expect(local.items.filter(({kind}) => kind === 'LOCAL_EXTENSION')).toEqual([
      {
        kind: 'LOCAL_EXTENSION',
        id: 'local.frames.private-review',
        ref: '04_estado/local/user-extensions/local.frames.private-review',
        scope: 'USER_LOCAL',
        state: 'ACTIVE_LOCAL',
      },
    ]);
    expect(local.items.filter(({scope}) => scope === 'CANONICAL')).toEqual(publicInventory.items);
    expect(JSON.stringify(local)).not.toContain(privateRoot);
    expect(JSON.stringify(local)).not.toContain('private-fixture');
  });

  it('renders JSON, Markdown and HTML deterministically without private data', () => {
    const inventory = buildEcosystemInventoryV1(root, localDiscovery);
    const json = `${JSON.stringify(inventory, null, 2)}\n`;
    const markdown = renderInventoryMarkdownV1(inventory);
    const html = renderInventoryHtmlV1(inventory);
    expect(`${JSON.stringify(inventory, null, 2)}\n`).toBe(json);
    expect(renderInventoryMarkdownV1(inventory)).toBe(markdown);
    expect(renderInventoryHtmlV1(inventory)).toBe(html);
    for (const projection of [json, markdown, html]) {
      expect(projection).not.toContain(privateRoot);
      expect(projection).not.toContain('private-fixture');
    }
    expect(markdown).toContain('LOCAL_EXTENSION');
    expect(html).toContain("default-src 'none'");
    expect(html).not.toMatch(/https?:\/\//u);
  });
});
