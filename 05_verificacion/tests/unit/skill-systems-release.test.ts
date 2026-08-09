import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {
  buildSkillReleaseCapsuleV1,
  storeSkillReleaseCandidateV1,
} from '../../../02_proceso/workflows/skill-systems/release.ts';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const fixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'frames-sss-release-'));
  await mkdir(path.join(root, 'skills/demo'), {recursive: true});
  await mkdir(path.join(root, 'approvals'), {recursive: true});
  await mkdir(path.join(root, 'releases'), {recursive: true});
  const skill = '# Demo\n';
  await writeFile(path.join(root, 'skills/demo/SKILL.md'), skill);
  const restore = '# Restore\n\nReinstala el paquete ligado al manifest.\n';
  await writeFile(path.join(root, 'restore.md'), restore);
  const fileHash = sha(skill);
  const packageSha = sha(`${fileHash}  skills/demo/SKILL.md\n`);
  execFileSync('git', ['-C', root, 'init', '--quiet']);
  execFileSync('git', ['-C', root, 'config', 'user.email', 'fixture@example.invalid']);
  execFileSync('git', ['-C', root, 'config', 'user.name', 'Fixture']);
  execFileSync('git', ['-C', root, 'add', 'skills/demo/SKILL.md', 'restore.md']);
  execFileSync('git', ['-C', root, 'commit', '--quiet', '-m', 'fixture']);
  const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
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
  const compatibility: {
    profile: string;
    status: 'PASS' | 'UNKNOWN' | 'BLOCKED';
    probe_ref: string | null;
    probe_sha256: string | null;
  }[] = [
    {profile: 'P0_PORTABLE', status: 'PASS', probe_ref: null, probe_sha256: null},
    {profile: 'Codex', status: 'UNKNOWN', probe_ref: null, probe_sha256: null},
    {profile: 'Claude', status: 'UNKNOWN', probe_ref: null, probe_sha256: null},
    {profile: 'Gemini', status: 'UNKNOWN', probe_ref: null, probe_sha256: null},
    {profile: 'ChatGPT', status: 'UNKNOWN', probe_ref: null, probe_sha256: null},
  ];
  return {
    root,
    capsule: {
      schema_version: 'skill-release-capsule-v1',
      release_id: 'REL-001',
      parent_release_id: null,
      commit_sha: commit,
      package_sha256: packageSha,
      files: [{ref: 'skills/demo/SKILL.md', sha256: fileHash}],
      compatibility,
      approvals,
      restore_ref: 'restore.md',
      restore_sha256: sha(restore),
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

  it('blocks stale approvals and every unproven host PASS', async () => {
    const {root, capsule} = await fixture();
    await writeFile(path.join(root, 'approvals/reviewer.json'), '{}');
    expect(() => buildSkillReleaseCapsuleV1(capsule, root)).toThrow('SSS_RELEASE_APPROVAL001');
    const next = await fixture();
    next.capsule.compatibility[1] = {
      profile: 'Codex',
      status: 'PASS',
      probe_ref: null,
      probe_sha256: null,
    };
    expect(() => buildSkillReleaseCapsuleV1(next.capsule, next.root)).toThrow(
      'SSS_RELEASE_HOST_UNPROVEN:Codex',
    );
  });

  it('blocks package and restore drift', async () => {
    const first = await fixture();
    expect(() =>
      buildSkillReleaseCapsuleV1({...first.capsule, package_sha256: 'c'.repeat(64)}, first.root),
    ).toThrow('SSS_RELEASE_PACKAGE_HASH001');
    const second = await fixture();
    await writeFile(path.join(second.root, 'restore.md'), 'changed');
    expect(() => buildSkillReleaseCapsuleV1(second.capsule, second.root)).toThrow(
      'SSS_RELEASE_RESTORE_HASH001',
    );
  });

  it('keeps host compatibility UNKNOWN until a separately promoted probe contract exists', async () => {
    const {root, capsule} = await fixture();
    const probeRef = 'approvals/codex-host-probe.json';
    const probe = JSON.stringify({
      schema_version: 'skill-host-probe-v1',
      release_id: capsule.release_id,
      profile: 'Codex',
      surface: 'HOST_BEHAVIOR',
      status: 'PASS',
      package_sha256: capsule.package_sha256,
      network_used: false,
      effects: [],
    });
    await writeFile(path.join(root, probeRef), probe);
    capsule.compatibility[1] = {
      profile: 'Codex',
      status: 'PASS',
      probe_ref: probeRef,
      probe_sha256: sha(probe),
    };
    expect(() => buildSkillReleaseCapsuleV1(capsule, root)).toThrow(
      'SSS_RELEASE_HOST_UNPROVEN:Codex',
    );
  });

  it('binds the capsule to the actual frozen Git candidate', async () => {
    const {root, capsule} = await fixture();
    expect(() =>
      buildSkillReleaseCapsuleV1({...capsule, commit_sha: 'a'.repeat(40)}, root),
    ).toThrow('SSS_RELEASE_COMMIT001');
  });

  it('never treats CANDIDATE evidence as H01 approval', async () => {
    const {root, capsule} = await fixture();
    expect(() => buildSkillReleaseCapsuleV1({...capsule, state: 'APPROVED'}, root)).toThrow(
      'SSS_RELEASE_H01_REQUIRED',
    );
  });
});
