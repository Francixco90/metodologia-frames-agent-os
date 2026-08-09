import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

import {assertReleaseContentSafe, relativeReleaseFile} from './safe-release-file.ts';

const COMMIT = /^[a-f0-9]{40}$/u;
const hash = (value: Buffer): string => createHash('sha256').update(value).digest('hex');

export const assertLocalReleaseCommit = (root: string, commitSha: string): void => {
  if (!COMMIT.test(commitSha)) throw new Error('EXP-RELEASE-COMMIT: full SHA required');
  try {
    execFileSync('git', ['-C', root, 'cat-file', '-e', `${commitSha}^{commit}`], {
      stdio: 'ignore',
    });
  } catch {
    throw new Error(`EXP-RELEASE-COMMIT: commit unavailable locally ${commitSha}`);
  }
};

export const readCommittedReleaseFile = (
  root: string,
  commitSha: string,
  value: string,
): {ref: string; content: Buffer; sha256: string} => {
  assertLocalReleaseCommit(root, commitSha);
  const ref = relativeReleaseFile(root, value);
  let content: Buffer;
  try {
    content = execFileSync('git', ['-C', root, 'show', `${commitSha}:${ref}`], {
      encoding: 'buffer',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error(`EXP-RELEASE-SOURCE: unavailable at commit ${ref}`);
  }
  assertReleaseContentSafe(content.toString('utf8'), ref);
  return {ref, content, sha256: hash(content)};
};
