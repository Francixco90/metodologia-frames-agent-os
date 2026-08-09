import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, relative, resolve} from 'node:path';

const PRIVATE_DATA = [
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu,
  /(?:^|["'\s])\/(?:Users|home)\/[^\s"']+/u,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /(?:AKIA|ghp_|github_pat_|sk-)[A-Za-z0-9_-]{12,}/u,
  /(?:effects?|effect_class|publication_authorized|publicationAuthorized|connectors_enabled)\s*[":=]+\s*["']?(?:external|irreversible|publish|send|upload|true)/iu,
  /(?:secret|password|access_token|api_key)\s*[":=]+\s*["']?\S+/iu,
];
const hash = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');
const portable = (value: string): string => value.replaceAll('\\', '/');

export const relativeReleaseFile = (root: string, value: string): string => {
  const absoluteRoot = resolve(root);
  const path = portable(isAbsolute(value) ? relative(absoluteRoot, value) : value);
  if (path.startsWith('../') || path.includes('/../') || path.startsWith('/')) {
    throw new Error(`EXP-RELEASE-PATH: outside repository: ${value}`);
  }
  return path;
};

export const readSafeReleaseFile = (
  root: string,
  value: string,
): {ref: string; content: string; sha256: string} => {
  const absoluteRoot = resolve(root);
  const rootStat = lstatSync(absoluteRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('EXP-RELEASE-PATH: repository root must be a regular directory');
  }
  const ref = relativeReleaseFile(absoluteRoot, value);
  const segments = ref.split('/');
  let cursor = absoluteRoot;
  for (const [index, segment] of segments.entries()) {
    cursor = resolve(cursor, segment);
    const stat = lstatSync(cursor);
    const final = index === segments.length - 1;
    if (stat.isSymbolicLink() || (final ? !stat.isFile() : !stat.isDirectory())) {
      throw new Error(`EXP-RELEASE-FILE: regular non-symlink path required: ${ref}`);
    }
  }
  const realRoot = realpathSync(absoluteRoot);
  const real = realpathSync(cursor);
  if (!real.startsWith(`${realRoot}/`)) {
    throw new Error(`EXP-RELEASE-PATH: realpath outside repository: ${ref}`);
  }
  const content = readFileSync(real, 'utf8');
  if (PRIVATE_DATA.some((pattern) => pattern.test(content))) {
    throw new Error(`EXP-RELEASE-PRIVATE: PII, secret or external effect in ${ref}`);
  }
  return {ref, content, sha256: hash(content)};
};
