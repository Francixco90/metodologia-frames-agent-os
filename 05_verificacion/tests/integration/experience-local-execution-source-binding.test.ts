import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';
import {orchestrateLocalExperienceV1} from 'workflows/core/index.ts';

import {
  cleanupWorkspaces,
  materializeAuthorizedSource,
  selectedLocalInput,
  workspace,
} from './experience-local-execution-fixtures.ts';

afterEach(cleanupWorkspaces);

const outputExists = (root: string): boolean =>
  existsSync(resolve(root, 'work/private/experience/content'));

describe('R6 local source authority binding', () => {
  it('preserves hash-bound authority and rights instead of promoting a source implicitly', async () => {
    const root = workspace();
    const authorized = materializeAuthorizedSource(root, {
      sourceId: 'SRC-USER-ASSERTION-001',
      slug: 'source',
      contents: 'Afirmación suministrada por el usuario.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const input = selectedLocalInput(root);
    input.sourceMaterials = [authorized.source];
    input.briefSources = [authorized.briefSource];
    input.sourceAuthorityReceipts = [authorized.authorityReceipt];
    const result = await orchestrateLocalExperienceV1(input);
    expect(result).toMatchObject({status: 'AWAITING_APPROVAL', materialized: true});
    const brief = readFileSync(resolve(root, result.brief!.markdownRef), 'utf8');
    expect(brief).toContain('authority: user_assertion');
    expect(brief).toContain('rights: restricted');
    expect(brief).not.toContain('authority: verified');
  });

  it('binds sources, metadata and authority receipts by identity regardless of input order', async () => {
    const root = workspace();
    const first = materializeAuthorizedSource(root, {
      sourceId: 'SRC-ORDER-001',
      slug: 'first',
      contents: 'Primera fuente.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const second = materializeAuthorizedSource(root, {
      sourceId: 'SRC-ORDER-002',
      slug: 'second',
      contents: 'Segunda fuente.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const input = selectedLocalInput(root);
    input.sourceMaterials = [first.source, second.source];
    input.briefSources = [second.briefSource, first.briefSource];
    input.sourceAuthorityReceipts = [second.authorityReceipt, first.authorityReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'AWAITING_APPROVAL',
      materialized: true,
    });
  });

  it('prevalidates source bytes before creating or writing the output directory', async () => {
    const root = workspace();
    const authorized = materializeAuthorizedSource(root, {
      sourceId: 'SRC-TAMPER-001',
      slug: 'tampered',
      contents: 'Bytes reales.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const forgedSha256 = 'a'.repeat(64);
    const input = selectedLocalInput(root);
    input.sourceMaterials = [{...authorized.source, sha256: forgedSha256}];
    input.briefSources = [{...authorized.briefSource, sha256: forgedSha256}];
    input.sourceAuthorityReceipts = [authorized.authorityReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-MATERIAL-HASH-DRIFT',
    });
    expect(outputExists(root)).toBe(false);
  });

  it('keeps the additive V1 contract compatible when the legacy request has no sources', async () => {
    const root = workspace();
    const input = selectedLocalInput(root);
    delete input.briefSources;
    delete input.sourceAuthorityReceipts;
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'AWAITING_APPROVAL',
      materialized: true,
    });
  });

  it('blocks a legacy nonempty source without authority metadata before any output write', async () => {
    const root = workspace();
    mkdirSync(resolve(root, 'evidence'));
    const contents = 'Fuente heredada sin metadatos de autoridad.\n';
    writeFileSync(resolve(root, 'evidence/legacy-source.md'), contents, 'utf8');
    const input = selectedLocalInput(root);
    input.sourceMaterials = [
      {
        ref: 'evidence/legacy-source.md',
        sha256: createHash('sha256').update(contents).digest('hex'),
      },
    ];
    delete input.briefSources;
    delete input.sourceAuthorityReceipts;
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-REQUIRED',
    });
    expect(outputExists(root)).toBe(false);
  });

  it('rejects duplicate source_id bindings before reading receipts or writing outputs', async () => {
    const root = workspace();
    const first = materializeAuthorizedSource(root, {
      sourceId: 'SRC-DUPLICATE-ID-001',
      slug: 'duplicate-id-first',
      contents: 'Primera fuente con identidad única.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const second = materializeAuthorizedSource(root, {
      sourceId: 'SRC-DUPLICATE-ID-002',
      slug: 'duplicate-id-second',
      contents: 'Segunda fuente con identidad física distinta.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const input = selectedLocalInput(root);
    input.sourceMaterials = [first.source, second.source];
    input.briefSources = [
      first.briefSource,
      {...second.briefSource, source_id: first.briefSource.source_id},
    ];
    input.sourceAuthorityReceipts = [first.authorityReceipt, second.authorityReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-ID-DUPLICATE',
    });
    expect(outputExists(root)).toBe(false);
  });

  it.each([
    [
      'missing source authority',
      (input: ReturnType<typeof selectedLocalInput>) => {
        input.sourceMaterials = [{ref: 'evidence/source.md', sha256: 'a'.repeat(64)}];
      },
      'EXPERIENCE-SOURCE-AUTHORITY-REQUIRED',
    ],
    [
      'mismatched authority hash',
      (input: ReturnType<typeof selectedLocalInput>) => {
        input.sourceMaterials = [{ref: 'evidence/source.md', sha256: 'a'.repeat(64)}];
        input.briefSources = [
          {
            source_id: 'SRC-DRIFT-001',
            ref: 'evidence/source.md',
            sha256: 'b'.repeat(64),
            authority: 'verified',
            rights: 'cleared',
          },
        ];
      },
      'EXPERIENCE-SOURCE-AUTHORITY-BINDING-DRIFT',
    ],
    [
      'unknown rights',
      (input: ReturnType<typeof selectedLocalInput>) => {
        input.sourceMaterials = [{ref: 'evidence/source.md', sha256: 'a'.repeat(64)}];
        input.briefSources = [
          {
            source_id: 'SRC-UNKNOWN-001',
            ref: 'evidence/source.md',
            sha256: 'a'.repeat(64),
            authority: 'verified',
            rights: 'unknown',
          },
        ];
      },
      'EXPERIENCE-SOURCE-AUTHORITY-UNKNOWN',
    ],
    [
      'source assertion without a material authority receipt',
      (input: ReturnType<typeof selectedLocalInput>) => {
        input.sourceMaterials = [{ref: 'evidence/source.md', sha256: 'a'.repeat(64)}];
        input.briefSources = [
          {
            source_id: 'SRC-FORGED-001',
            ref: 'evidence/source.md',
            sha256: 'a'.repeat(64),
            authority: 'user_assertion',
            rights: 'restricted',
          },
        ];
      },
      'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-REQUIRED',
    ],
    [
      'verified or cleared authority before ActorAuthorityPort exists',
      (input: ReturnType<typeof selectedLocalInput>) => {
        input.sourceMaterials = [{ref: 'evidence/source.md', sha256: 'a'.repeat(64)}];
        input.briefSources = [
          {
            source_id: 'SRC-FORGED-VERIFIED-001',
            ref: 'evidence/source.md',
            sha256: 'a'.repeat(64),
            authority: 'verified',
            rights: 'cleared',
          },
        ];
      },
      'EXPERIENCE-SOURCE-VERIFIED-AUTHORITY-UNAVAILABLE-V1',
    ],
  ] as const)('blocks %s before any material write', async (_label, mutate, coverageGap) => {
    const root = workspace();
    const input = selectedLocalInput(root);
    mutate(input);
    const result = await orchestrateLocalExperienceV1(input);
    expect(result).toMatchObject({status: 'BLOCKED', materialized: false, coverageGap});
    expect(readdirSync(root)).toEqual([]);
  });
});
