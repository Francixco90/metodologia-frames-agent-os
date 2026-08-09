import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';

import {writeCapsuleAtomically} from '../experience/atomic-capsule-store.ts';
import {assertSafeReleasePath} from '../experience/safe-release-file.ts';
import {SkillReleaseCapsuleV1Schema} from './contracts.ts';

const sha = (value: string): string => createHash('sha256').update(value).digest('hex');
const stable = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export const buildSkillReleaseCapsuleV1 = (input: unknown, root: string) => {
  const capsule = SkillReleaseCapsuleV1Schema.parse(input);
  const actors = capsule.approvals.map(({actor_id}) => actor_id);
  if (new Set(actors).size !== 4) throw new Error('SSS_RELEASE_ACTOR_SEPARATION001');
  const roles = capsule.approvals.map(({role}) => role).sort();
  if (roles.join(',') !== 'APPROVER,AUTHOR,GUARDIAN,REVIEWER')
    throw new Error('SSS_RELEASE_ROLES001');
  if (capsule.state === 'APPROVED') throw new Error('SSS_RELEASE_H01_REQUIRED');
  for (const file of capsule.files) {
    const safe = assertSafeReleasePath(root, file.ref);
    if (sha(readFileSync(safe.real, 'utf8')) !== file.sha256)
      throw new Error(`SSS_RELEASE_HASH001:${file.ref}`);
  }
  for (const approval of capsule.approvals) {
    const safe = assertSafeReleasePath(root, approval.receipt_ref);
    const receipt = JSON.parse(readFileSync(safe.real, 'utf8')) as Record<string, unknown>;
    if (
      receipt.release_id !== capsule.release_id ||
      receipt.actor_id !== approval.actor_id ||
      receipt.role !== approval.role ||
      receipt.decision !== 'APPROVE' ||
      receipt.commit_sha !== capsule.commit_sha ||
      receipt.package_sha256 !== capsule.package_sha256
    )
      throw new Error(`SSS_RELEASE_APPROVAL001:${approval.receipt_ref}`);
  }
  const portable = capsule.compatibility.find(({profile}) => profile === 'P0_PORTABLE');
  if (portable?.status !== 'PASS') throw new Error('SSS_RELEASE_PORTABLE001');
  for (const host of ['Codex', 'Claude', 'Gemini', 'ChatGPT']) {
    const entry = capsule.compatibility.find(({profile}) => profile === host);
    if (entry && entry.status === 'PASS')
      throw new Error(`SSS_RELEASE_HOST_PROBE_REQUIRED:${host}`);
  }
  return capsule;
};

export const storeSkillReleaseCandidateV1 = (root: string, outputRef: string, input: unknown) => {
  if (path.isAbsolute(outputRef) || outputRef.includes('..') || outputRef.includes('\\'))
    throw new Error('SSS_RELEASE_PATH001');
  const capsule = buildSkillReleaseCapsuleV1(input, root);
  const manifest = stable(capsule);
  const sums = `${sha(manifest)}  release-manifest.json\n`;
  writeCapsuleAtomically(root, path.resolve(root, outputRef), {
    'release-manifest.json': manifest,
    SHA256SUMS: sums,
  });
  return {status: 'CANDIDATE', output_ref: outputRef, manifest_sha256: sha(manifest)} as const;
};
