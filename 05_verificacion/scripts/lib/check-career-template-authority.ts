import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';

type Authority = {template_ref: string; template_sha256: string};
type MigrationAuthority = {deliverable_id: string; ref: string; ref_sha256: string};

const checkAuthority = (
  root: string,
  ref: string,
  expectedHash: string,
  label: string,
  errors: string[],
): void => {
  const absolute = resolve(realpathSync(root), ref);
  try {
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink() || !stat.isFile() || realpathSync(absolute) !== absolute) {
      errors.push(`CAREER-AUTHORITY-001 non-regular ${label}:${ref}`);
      return;
    }
    const actual = createHash('sha256').update(readFileSync(absolute)).digest('hex');
    if (actual !== expectedHash) errors.push(`CAREER-AUTHORITY-002 hash drift ${label}:${ref}`);
  } catch {
    errors.push(`CAREER-AUTHORITY-001 missing ${label}:${ref}`);
  }
};

export const checkCareerTemplateAuthorities = (
  root: string,
  authorities: readonly Authority[],
  errors: string[],
): void => {
  for (const authority of authorities) {
    checkAuthority(root, authority.template_ref, authority.template_sha256, 'template', errors);
  }
};

export const checkCareerMigrationAuthorities = (
  root: string,
  authorities: readonly MigrationAuthority[],
  errors: string[],
): void => {
  for (const authority of authorities) {
    checkAuthority(
      root,
      authority.ref,
      authority.ref_sha256,
      `migration:${authority.deliverable_id}`,
      errors,
    );
  }
};
