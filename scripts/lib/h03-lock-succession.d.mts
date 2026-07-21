export const H02_LOCK_SHA256: string;
export const H03_LOCK_SUCCESSION_REF: string;

export interface H03LockSuccessionResult {
  receipt: {
    approval_phrase?: string;
    previous?: {lock_sha256?: string};
    current?: {lock_sha256?: string; package_sha256?: string};
    publication_authority?: boolean;
  };
  audit: {status?: string; pnpmLockSha256?: string; packageJsonSha256?: string};
  currentLockSha256: string;
  currentPackageSha256: string;
}

export function verifyApprovedH03LockSuccession(
  root: string,
  options?: {lockfileRef?: string; previousLockSha256?: string},
): H03LockSuccessionResult;
