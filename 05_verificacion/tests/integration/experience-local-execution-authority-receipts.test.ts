import {existsSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';
import {orchestrateLocalExperienceV1} from 'workflows/core/index.ts';

import {
  cleanupWorkspaces,
  materializeAuthorizedSource,
  rewriteAuthorityReceipt,
  selectedLocalInput,
  workspace,
  writeAuthorityReceiptBytes,
} from './experience-local-execution-fixtures.ts';

afterEach(cleanupWorkspaces);

const outputExists = (root: string): boolean =>
  existsSync(resolve(root, 'work/private/experience/content'));

describe('R6 physical source authority receipts', () => {
  it('rejects a duplicate authority receipt ref instead of treating it as a second binding', async () => {
    const root = workspace();
    const first = materializeAuthorizedSource(root, {
      sourceId: 'SRC-DUPLICATE-REF-001',
      slug: 'duplicate-ref-first',
      contents: 'Primera fuente.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const second = materializeAuthorizedSource(root, {
      sourceId: 'SRC-DUPLICATE-REF-002',
      slug: 'duplicate-ref-second',
      contents: 'Segunda fuente.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const input = selectedLocalInput(root);
    input.sourceMaterials = [first.source, second.source];
    input.briefSources = [first.briefSource, second.briefSource];
    input.sourceAuthorityReceipts = [first.authorityReceipt, first.authorityReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-DUPLICATE',
    });
    expect(outputExists(root)).toBe(false);
  });

  it('rejects two distinct receipts bound to the same source identity', async () => {
    const root = workspace();
    const first = materializeAuthorizedSource(root, {
      sourceId: 'SRC-DUPLICATE-BINDING-001',
      slug: 'duplicate-binding-first',
      contents: 'Primera fuente enlazada.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const second = materializeAuthorizedSource(root, {
      sourceId: 'SRC-DUPLICATE-BINDING-002',
      slug: 'duplicate-binding-second',
      contents: 'Segunda fuente enlazada.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const duplicateBindingReceipt = rewriteAuthorityReceipt(
      root,
      second.authorityReceipt,
      (receipt) => {
        receipt.source = first.briefSource;
      },
    );
    const input = selectedLocalInput(root);
    input.sourceMaterials = [first.source, second.source];
    input.briefSources = [first.briefSource, second.briefSource];
    input.sourceAuthorityReceipts = [first.authorityReceipt, duplicateBindingReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-DUPLICATE',
    });
    expect(outputExists(root)).toBe(false);
  });

  it('rejects a lexical alias for an authority receipt ref', async () => {
    const root = workspace();
    const authorized = materializeAuthorizedSource(root, {
      sourceId: 'SRC-ALIAS-001',
      slug: 'aliased-receipt',
      contents: 'Fuente con receipt canónico.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const input = selectedLocalInput(root);
    input.sourceMaterials = [authorized.source];
    input.briefSources = [authorized.briefSource];
    input.sourceAuthorityReceipts = [
      {...authorized.authorityReceipt, ref: 'evidence/./aliased-receipt.authority.json'},
    ];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-ALIAS',
    });
    expect(outputExists(root)).toBe(false);
  });

  it('rejects a symlinked authority receipt before reading its bytes', async () => {
    const root = workspace();
    const authorized = materializeAuthorizedSource(root, {
      sourceId: 'SRC-SYMLINK-001',
      slug: 'symlinked-receipt',
      contents: 'Fuente con receipt no enlazable por symlink.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const receiptPath = resolve(root, authorized.authorityReceipt.ref);
    const targetName = 'symlinked-receipt.target.json';
    writeFileSync(resolve(root, 'evidence', targetName), readFileSync(receiptPath));
    rmSync(receiptPath);
    symlinkSync(targetName, receiptPath);
    const input = selectedLocalInput(root);
    input.sourceMaterials = [authorized.source];
    input.briefSources = [authorized.briefSource];
    input.sourceAuthorityReceipts = [authorized.authorityReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-ALIAS',
    });
    expect(outputExists(root)).toBe(false);
  });

  it('rejects an altered canonical receipt hash after the physical hash is rebound', async () => {
    const root = workspace();
    const authorized = materializeAuthorizedSource(root, {
      sourceId: 'SRC-CANONICAL-DRIFT-001',
      slug: 'canonical-drift',
      contents: 'Fuente cuyo receipt será alterado.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const alteredReceipt = rewriteAuthorityReceipt(
      root,
      authorized.authorityReceipt,
      (receipt) => {
        receipt.canonicalSha256 = 'a'.repeat(64);
      },
      false,
    );
    const input = selectedLocalInput(root);
    input.sourceMaterials = [authorized.source];
    input.briefSources = [authorized.briefSource];
    input.sourceAuthorityReceipts = [alteredReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-CANONICAL-DRIFT',
    });
    expect(outputExists(root)).toBe(false);
  });

  it.each([
    ['forged authority actor identity', 'authorityActorId', 'FORGED-ACTOR'],
    ['forged authority mode', 'authorityMode', 'REMOTE_VERIFIED'],
  ] as const)('normalizes %s to a fail-closed identity code', async (_label, field, value) => {
    const root = workspace();
    const authorized = materializeAuthorizedSource(root, {
      sourceId: 'SRC-FORGED-IDENTITY-001',
      slug: 'forged-identity',
      contents: 'Fuente con identidad local simulada.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const forgedReceipt = rewriteAuthorityReceipt(root, authorized.authorityReceipt, (receipt) => {
      receipt[field] = value;
    });
    const input = selectedLocalInput(root);
    input.sourceMaterials = [authorized.source];
    input.briefSources = [authorized.briefSource];
    input.sourceAuthorityReceipts = [forgedReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-IDENTITY-INVALID',
    });
    expect(outputExists(root)).toBe(false);
  });

  it.each([
    ['incompatible use scope', 'allowedUseScope', 'external_distribution'],
    ['missing fail-closed restriction', 'restrictions', ['no_external_distribution']],
  ] as const)('normalizes %s to a fail-closed scope code', async (_label, field, value) => {
    const root = workspace();
    const authorized = materializeAuthorizedSource(root, {
      sourceId: 'SRC-FORGED-SCOPE-001',
      slug: 'forged-scope',
      contents: 'Fuente restringida a uso interno local.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const forgedReceipt = rewriteAuthorityReceipt(root, authorized.authorityReceipt, (receipt) => {
      receipt[field] = value;
    });
    const input = selectedLocalInput(root);
    input.sourceMaterials = [authorized.source];
    input.briefSources = [authorized.briefSource];
    input.sourceAuthorityReceipts = [forgedReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-SCOPE-INVALID',
    });
    expect(outputExists(root)).toBe(false);
  });

  it('normalizes malformed receipt bytes without leaking parser diagnostics', async () => {
    const root = workspace();
    const authorized = materializeAuthorizedSource(root, {
      sourceId: 'SRC-MALFORMED-001',
      slug: 'malformed-receipt',
      contents: 'Fuente con receipt material.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const malformedReceipt = writeAuthorityReceiptBytes(
      root,
      authorized.authorityReceipt,
      '{not-json}\n',
    );
    const input = selectedLocalInput(root);
    input.sourceMaterials = [authorized.source];
    input.briefSources = [authorized.briefSource];
    input.sourceAuthorityReceipts = [malformedReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-INVALID',
    });
    expect(outputExists(root)).toBe(false);
  });

  it('normalizes malformed receipt fields without leaking schema diagnostics', async () => {
    const root = workspace();
    const authorized = materializeAuthorizedSource(root, {
      sourceId: 'SRC-MALFORMED-SCHEMA-001',
      slug: 'malformed-receipt-schema',
      contents: 'Fuente con receipt cuyo timestamp será inválido.\n',
      authority: 'user_assertion',
      rights: 'restricted',
    });
    const malformedReceipt = rewriteAuthorityReceipt(
      root,
      authorized.authorityReceipt,
      (receipt) => {
        receipt.recordedAt = 'not-a-timestamp';
      },
    );
    const input = selectedLocalInput(root);
    input.sourceMaterials = [authorized.source];
    input.briefSources = [authorized.briefSource];
    input.sourceAuthorityReceipts = [malformedReceipt];
    await expect(orchestrateLocalExperienceV1(input)).resolves.toMatchObject({
      status: 'BLOCKED',
      materialized: false,
      coverageGap: 'EXPERIENCE-SOURCE-AUTHORITY-RECEIPT-INVALID',
    });
    expect(outputExists(root)).toBe(false);
  });
});
