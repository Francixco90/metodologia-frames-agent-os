import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {
  buildSkillReleaseCapsuleV1,
  storeSkillReleaseCandidateV1,
} from '../../../02_proceso/workflows/skill-systems/release.ts';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const commit = 'a'.repeat(64);
const packageSha = 'b'.repeat(64);

const fixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'frames-sss-release-'));
  await mkdir(path.join(root, 'skills/demo'), {recursive: true});
  await mkdir(path.join(root, 'approvals'), {recursive: true});
  await mkdir(path.join(root, 'releases'), {recursive: true});
  const skill = '# Demo\n';
  await writeFile(path.join(root, 'skills/demo/SKILL.md'), skill);
  const roles = ['AUTHOR', 'REVIEWER', 'GUARDIAN', 'APPROVER'] as const;
  const approvals = [];
  for (const role of roles) {
    const actor = `ACTOR-${role}`;
    const ref = `approvals/${role.toLowerCase()}.json`;
    await writeFile(
      path.join(root, ref),
      JSON.stringify({
        release_id: 'REL-001',
        actor_id: actor,
        role,
        decision: 'APPROVE',
        commit_sha: commit,
        package_sha256: packageSha,
      }),
    );
    approvals.push({role, actor_id: actor, receipt_ref: ref});
  }
  return {
    root,
    capsule: {
      schema_version: 'skill-release-capsule-v1',
      release_id: 'REL-001',
      parent_release_id: null,
      commit_sha: commit,
      package_sha256: packageSha,
      files: [{ref: 'skills/demo/SKILL.md', sha256: sha(skill)}],
      compatibility: [
        {profile: 'P0_PORTABLE', status: 'PASS'},
        {profile: 'Codex', status: 'UNKNOWN'},
        {profile: 'Claude', status: 'UNKNOWN'},
        {profile: 'Gemini', status: 'UNKNOWN'},
        {profile: 'ChatGPT', status: 'UNKNOWN'},
      ],
      approvals,
      restore_ref: 'restore.md',
      state: 'CANDIDATE',
    },
  };
};

describe('Skill release capsule', () => {
  it('stores a candidate once and verifies material approvals', async () => {
    const {root, capsule} = await fixture();
    expect(storeSkillReleaseCandidateV1(root, 'releases/REL-001', capsule)).toMatchObject({
      status: 'CANDIDATE',
    });
    expect(
      JSON.parse(await readFile(path.join(root, 'releases/REL-001/release-manifest.json'), 'utf8')),
    ).toMatchObject({release_id: 'REL-001'});
    expect(() => storeSkillReleaseCandidateV1(root, 'releases/REL-001', capsule)).toThrow(
      'EXP-RELEASE-EXISTS',
    );
  });

  it('blocks stale approvals and unproven host PASS', async () => {
    const {root, capsule} = await fixture();
    await writeFile(path.join(root, 'approvals/reviewer.json'), '{}');
    expect(() => buildSkillReleaseCapsuleV1(capsule, root)).toThrow('SSS_RELEASE_APPROVAL001');
    const next = await fixture();
    next.capsule.compatibility[1] = {profile: 'Codex', status: 'PASS'};
    expect(() => buildSkillReleaseCapsuleV1(next.capsule, next.root)).toThrow(
      'SSS_RELEASE_HOST_PROBE_REQUIRED:Codex',
    );
  });

  it('never treats CANDIDATE evidence as H01 approval', async () => {
    const {root, capsule} = await fixture();
    expect(() => buildSkillReleaseCapsuleV1({...capsule, state: 'APPROVED'}, root)).toThrow(
      'SSS_RELEASE_H01_REQUIRED',
    );
  });
});
