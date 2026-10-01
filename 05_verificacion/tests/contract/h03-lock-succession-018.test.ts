import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {parse, stringify} from 'yaml';
import {verifyApprovedH03LockSuccession} from '../../scripts/lib/h03-lock-succession.mjs';
const roots: string[] = [];
const receiptRef = '04_estado/receipts/dependency-audits/H03-LOCK-SUCCESSION-018.yml';
function fixture() {
  const root = mkdtempSync(resolve(realpathSync(tmpdir()), 'h03-lock-succession-'));
  roots.push(root);
  for (const ref of [
    'package.json',
    'pnpm-lock.yaml',
    receiptRef,
    '04_estado/receipts/dependency-audits/H03-LOCK-SUCCESSION-017.yml',
    '04_estado/receipts/dependency-audits/RCP-DEP-PRODUCTION-20261001-002.json',
    '04_estado/receipts/dependency-audits/H03-LIC-AJV-001.yml',
  ]) {
    mkdirSync(resolve(root, ref, '..'), {recursive: true});
    cpSync(resolve(ref), resolve(root, ref));
  }
  symlinkSync('04_estado/receipts', resolve(root, 'receipts'), 'dir');
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});
describe('H03 lock succession 018 binds current approved task without changing 017', () => {
  it('validates current package, unchanged lock, actual audit and prior lineage', () => {
    const root = fixture();
    const before = readFileSync(
      resolve(root, 'receipts/dependency-audits/H03-LOCK-SUCCESSION-017.yml'),
    );
    expect(verifyApprovedH03LockSuccession(root).receipt.approval_phrase).toBe(
      'PLEASE IMPLEMENT THIS PLAN',
    );
    expect(
      readFileSync(resolve(root, 'receipts/dependency-audits/H03-LOCK-SUCCESSION-017.yml')),
    ).toEqual(before);
  });
  it.each([
    {approval_phrase: 'go'},
    {approval_scope: 'frames_consolidation_f13_vendor_locks_gate_without_dependency_change'},
    {dependency_change: true},
    {publication_authority: true},
    {supersedes_receipt_id: 'H03-LOCK-SUCCESSION-016'},
  ])('rejects stale authorization or broken scope %j', (patch) => {
    const root = fixture();
    const receipt = parse(readFileSync(resolve(root, receiptRef), 'utf8')) as Record<
      string,
      unknown
    >;
    writeFileSync(resolve(root, receiptRef), stringify({...receipt, ...patch}));
    expect(() => verifyApprovedH03LockSuccession(root)).toThrow('receipt_or_audit');
  });
  it('rejects changed package bytes after audit', () => {
    const root = fixture();
    writeFileSync(
      resolve(root, 'package.json'),
      readFileSync(resolve(root, 'package.json'), 'utf8') + ' ',
    );
    expect(() => verifyApprovedH03LockSuccession(root)).toThrow('receipt_or_audit');
  });
  it('rejects altered audit evidence', () => {
    const root = fixture();
    const ref = resolve(root, 'receipts/dependency-audits/RCP-DEP-PRODUCTION-20261001-002.json');
    const audit = JSON.parse(readFileSync(ref, 'utf8')) as {status: string};
    audit.status = 'failed';
    writeFileSync(ref, JSON.stringify(audit));
    const receipt = parse(readFileSync(resolve(root, receiptRef), 'utf8')) as {
      audit_receipt: {sha256: string};
    };
    receipt.audit_receipt.sha256 = createHash('sha256').update(readFileSync(ref)).digest('hex');
    writeFileSync(resolve(root, receiptRef), stringify(receipt));
    expect(() => verifyApprovedH03LockSuccession(root)).toThrow('receipt_or_audit');
  });
});
