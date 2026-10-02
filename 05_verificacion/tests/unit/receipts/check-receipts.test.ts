import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {validateReceipts} from '../../../scripts/check-receipts.ts';

const root = process.cwd();

const scaffoldReceiptRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'receipts-test-'));
  for (const family of ['imports', 'renders', 'dependency-audits', 'migrations', 'check-runs']) {
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

const nativeReviewFixture = () => {
  const dir = scaffoldReceiptRoot();
  const evaluation: Record<string, unknown> = {
    schemaVersion: 'frames-aula-evaluation-v1',
    receiptId: 'aula-evaluation-20261001-001',
    appendOnly: true,
    status: 'PASS',
    actorId: 'AUTOMATED-PORTABLE-CHECKS',
  };
  const evaluationPath = join(dir, 'receipts/check-runs/aula-evaluation-20261001-001.json');
  const bytes = JSON.stringify(evaluation);
  const review: Record<string, unknown> = {
    status: 'PASS',
    role: 'RT-11',
    actorId: 'GUARDIAN-FIXTURE',
    evaluationSha256: createHash('sha256').update(bytes).digest('hex'),
  };
  const reviewPath = join(dir, 'receipts/check-runs/aula-review-20261001-001.json');
  writeFileSync(evaluationPath, bytes);
  writeFileSync(reviewPath, JSON.stringify(review));
  return {dir, evaluation, evaluationPath, review, reviewPath};
};

describe('native Aula review receipt contract', () => {
  it('accepts the four-field native contract without rewriting append-only bytes', () => {
    const {dir, reviewPath} = nativeReviewFixture();
    const before = readFileSync(reviewPath);
    expect(validateReceipts(dir)).toStrictEqual([]);
    expect(readFileSync(reviewPath)).toEqual(before);
  });
  it.each([
    'unknown field',
    'stale hash',
    'same actor',
    'producer actor',
    'missing evaluation',
    'altered evaluation',
    'non-PASS evaluation',
    'invalid role',
    'invalid status',
    'mismatched evaluation id',
    'wrong evaluation schema',
    'evaluation symlink',
    'filename outside pattern',
    'wrong family',
  ])('rejects %s without weakening generic receipt lint', (fault) => {
    const f = nativeReviewFixture();
    if (fault === 'unknown field') f.review.extra = true;
    if (fault === 'stale hash') f.review.evaluationSha256 = '0'.repeat(64);
    if (fault === 'same actor') f.review.actorId = f.evaluation.actorId;
    if (fault === 'producer actor') f.review.actorId = 'RT-07';
    if (fault === 'invalid role') f.review.role = 'RT-09';
    if (fault === 'invalid status') f.review.status = 'FAIL';
    writeFileSync(f.reviewPath, JSON.stringify(f.review));
    if (
      [
        'altered evaluation',
        'non-PASS evaluation',
        'mismatched evaluation id',
        'wrong evaluation schema',
      ].includes(fault)
    ) {
      if (fault === 'altered evaluation') f.evaluation.changed = true;
      if (fault === 'non-PASS evaluation') f.evaluation.status = 'FAIL';
      if (fault === 'mismatched evaluation id')
        f.evaluation.receiptId = 'aula-evaluation-20261001-002';
      if (fault === 'wrong evaluation schema') f.evaluation.schemaVersion = 'other-v1';
      const bytes = JSON.stringify(f.evaluation);
      writeFileSync(f.evaluationPath, bytes);
      if (fault !== 'altered evaluation') {
        f.review.evaluationSha256 = createHash('sha256').update(bytes).digest('hex');
        writeFileSync(f.reviewPath, JSON.stringify(f.review));
      }
    }
    if (fault === 'missing evaluation') unlinkSync(f.evaluationPath);
    if (fault === 'evaluation symlink') {
      const target = join(f.dir, 'evaluation.data');
      renameSync(f.evaluationPath, target);
      symlinkSync(target, f.evaluationPath);
    }
    if (fault === 'filename outside pattern')
      renameSync(f.reviewPath, f.reviewPath.replace('001.json', '001-extra.json'));
    if (fault === 'wrong family')
      renameSync(f.reviewPath, join(f.dir, 'receipts/imports/aula-review-20261001-001.json'));
    expect(validateReceipts(f.dir).join('\n')).toMatch(
      /revisión Aula nativa inválida|sin portable id|sin schema_version/,
    );
  });
});
