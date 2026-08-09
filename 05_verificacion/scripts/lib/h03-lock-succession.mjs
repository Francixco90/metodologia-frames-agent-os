import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {relative, resolve, sep} from 'node:path';

import {parse} from 'yaml';

export const H02_LOCK_SHA256 = 'c73533cf14815fc883b2e166c0a40c00fcac11fc62bf1081c45ba023db00fc82';
export const H03_LOCK_SUCCESSION_REF = 'receipts/dependency-audits/H03-LOCK-SUCCESSION-003.yml';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fileSha256 = (root, ref) => sha256(readFileSync(resolve(root, ref)));
const portableRef = (root, ref) => {
  if (typeof ref !== 'string' || ref.length === 0) return false;
  const rel = relative(root, resolve(root, ref));
  return rel !== '' && !rel.startsWith(`..${sep}`) && rel !== '..' && !rel.startsWith(sep);
};

export const verifyApprovedH03LockSuccession = (
  root,
  {lockfileRef = 'pnpm-lock.yaml', previousLockSha256} = {},
) => {
  if (!portableRef(root, lockfileRef) || !existsSync(resolve(root, lockfileRef))) {
    throw new Error('H03_LOCK_SUCCESSION_INVALID: lockfile_ref');
  }
  const receipt = parse(readFileSync(resolve(root, H03_LOCK_SUCCESSION_REF), 'utf8'));
  const auditRef = receipt.audit_receipt?.ref;
  const currentLockSha256 = fileSha256(root, lockfileRef);
  const currentPackageSha256 = fileSha256(root, 'package.json');
  const auditValid =
    portableRef(root, auditRef) &&
    existsSync(resolve(root, auditRef)) &&
    receipt.audit_receipt?.sha256 === fileSha256(root, auditRef);
  const audit = auditValid ? JSON.parse(readFileSync(resolve(root, auditRef), 'utf8')) : undefined;

  if (
    receipt.schema_version !== 'dependency-lock-succession-v1' ||
    receipt.receipt_id !== 'H03-LOCK-SUCCESSION-003' ||
    receipt.supersedes_receipt_id !== 'H03-LOCK-SUCCESSION-002' ||
    receipt.approval_phrase !== 'APRUEBO HITO H-03' ||
    receipt.previous?.lock_sha256 !== (previousLockSha256 ?? currentLockSha256) ||
    receipt.current?.lock_sha256 !== currentLockSha256 ||
    receipt.current?.package_sha256 !== currentPackageSha256 ||
    receipt.production_state !== 'ACTIVE_LOCAL_EVALUATION' ||
    receipt.distribution_state !== 'NOT_DESIGNED' ||
    receipt.publication_authority !== false ||
    receipt.append_only !== true ||
    !auditValid ||
    audit?.status !== 'passed' ||
    audit?.pnpmLockSha256 !== currentLockSha256 ||
    audit?.packageJsonSha256 !== currentPackageSha256
  ) {
    throw new Error('H03_LOCK_SUCCESSION_INVALID: receipt_or_audit');
  }
  return {receipt, audit, currentLockSha256, currentPackageSha256};
};
