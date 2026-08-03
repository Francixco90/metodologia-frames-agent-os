import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {validateReceipts} from '../../../scripts/check-receipts.ts';

const root = process.cwd();

const scaffoldReceiptRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'receipts-test-'));
  for (const family of ['imports', 'renders', 'dependency-audits', 'migrations']) {
    mkdirSync(join(dir, 'receipts', family), {recursive: true});
  }
  return dir;
};

describe('check-receipts — ADR 008 structural lint', () => {
  it('passes for all on-disk receipts', () => {
    expect(validateReceipts(root)).toStrictEqual([]);
  });

  it('flags a missing portable id', () => {
    const dir = scaffoldReceiptRoot();
    writeFileSync(
      join(dir, 'receipts', 'imports', 'RCP-X-001.yml'),
      'schema_version: 1\nappend_only: true\n',
      'utf8',
    );
    expect(validateReceipts(dir).join('\n')).toMatch(/sin portable id/);
  });

  it('flags a missing schema version', () => {
    const dir = scaffoldReceiptRoot();
    writeFileSync(
      join(dir, 'receipts', 'renders', 'RCP-X-002.json'),
      JSON.stringify({receiptId: 'RCP-X-002', appendOnly: true}),
      'utf8',
    );
    expect(validateReceipts(dir).join('\n')).toMatch(/sin schema_version|schemaVersion/);
  });

  it('flags append_only declared false (ADR 008 violation)', () => {
    const dir = scaffoldReceiptRoot();
    writeFileSync(
      join(dir, 'receipts', 'imports', 'RCP-X-003.yml'),
      'schema_version: 1\nreceipt_id: RCP-X-003\nappend_only: false\n',
      'utf8',
    );
    expect(validateReceipts(dir).join('\n')).toMatch(/viola ADR 008/);
  });

  it('flags a non-64-hex sha256 field', () => {
    const dir = scaffoldReceiptRoot();
    writeFileSync(
      join(dir, 'receipts', 'dependency-audits', 'RCP-X-004.json'),
      JSON.stringify({
        schemaVersion: 'dependency-audit-receipt-v1',
        receiptId: 'RCP-X-004',
        appendOnly: true,
        packageJsonSha256: 'not-hex',
      }),
      'utf8',
    );
    expect(validateReceipts(dir).join('\n')).toMatch(
      /packageJsonSha256: valor sha256 no es 64-hex/,
    );
  });

  it('accepts a valid receipt with null sha256 and omitted append_only', () => {
    const dir = scaffoldReceiptRoot();
    writeFileSync(
      join(dir, 'receipts', 'renders', 'RCP-X-005.json'),
      JSON.stringify({
        schemaVersion: 'render-receipt-v1',
        receiptId: 'RCP-X-005',
        artifactHash: null,
      }),
      'utf8',
    );
    expect(validateReceipts(dir)).toStrictEqual([]);
  });

  it('flags an unparseable file', () => {
    const dir = scaffoldReceiptRoot();
    writeFileSync(join(dir, 'receipts', 'migrations', 'MIG-X-001.json'), '{not valid json', 'utf8');
    expect(validateReceipts(dir).join('\n')).toMatch(/parse falló/);
  });
});
