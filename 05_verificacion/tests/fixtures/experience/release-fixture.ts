import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {
  EXPERIENCE_RELEASE_SURFACE_V1,
  computeReleaseCandidateSha256,
  type BuildReleaseOptions,
} from 'workflows/experience/index.ts';

const digest = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

const git = (root: string, args: string[], env?: NodeJS.ProcessEnv): string =>
  execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    env: {...process.env, ...env},
  }).trim();

export const createExperienceReleaseRepository = (): {root: string; commit: string} => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-experience-release-git-'));
  EXPERIENCE_RELEASE_SURFACE_V1.forEach((ref, index) => {
    const path = resolve(root, ref);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, `Frames Experience release fixture ${index + 1}.\n`, 'utf8');
  });
  mkdirSync(resolve(root, '04_estado/releases/experience'), {recursive: true});
  git(root, ['init', '-q']);
  git(root, ['add', '--', ...EXPERIENCE_RELEASE_SURFACE_V1]);
  git(root, ['commit', '-q', '-m', 'Experience fixture'], {
    GIT_AUTHOR_NAME: 'Frames Test',
    GIT_AUTHOR_EMAIL: 'frames@example.invalid',
    GIT_COMMITTER_NAME: 'Frames Test',
    GIT_COMMITTER_EMAIL: 'frames@example.invalid',
    GIT_AUTHOR_DATE: '2026-08-09T12:00:00Z',
    GIT_COMMITTER_DATE: '2026-08-09T12:00:00Z',
  });
  return {root, commit: git(root, ['rev-parse', 'HEAD'])};
};

const identity = (root: string, commit: string, releaseId: string) => ({
  root,
  releaseId,
  parentRelease: null,
  releaseClass: 'COMPATIBLE',
  repositoryCommit: commit,
  files: [...EXPERIENCE_RELEASE_SURFACE_V1],
});

export const createApprovedReleaseOptions = (
  root: string,
  commit: string,
  releaseId: string,
): BuildReleaseOptions => {
  const base = identity(root, commit, releaseId);
  const candidateSha256 = computeReleaseCandidateSha256(base);
  const probeRef = '05_verificacion/quality/experience/launch-probes/codex.json';
  const probePath = resolve(root, probeRef);
  mkdirSync(dirname(probePath), {recursive: true});
  writeFileSync(
    probePath,
    `${JSON.stringify({
      schemaVersion: 'experience-host-launch-probe-v1',
      probeId: 'PROBE-CODEX',
      host: 'CODEX',
      status: 'PASS',
      releaseId,
      candidateCommit: commit,
      candidateSha256,
      adapterRef: '03_artefactos/skills/content-os-router/scripts/route-intent.mjs',
      localOnly: true,
      externalEffects: false,
    })}\n`,
    'utf8',
  );
  const approvals = [
    ['04_estado/approvals/experience/rt09.json', 'RT-09', 'RT-09', 'PASS'],
    ['04_estado/receipts/experience/rt11.json', 'RT-11', 'RT-11', 'PASS'],
    ['05_verificacion/quality/experience/h01.json', 'H01', 'H01', 'APPROVE'],
  ] as const;
  const decisions = approvals.map(([ref, role, actorId, decision]) => {
    const path = resolve(root, ref);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(
      path,
      `${JSON.stringify({
        schemaVersion: 'experience-approval-receipt-v1',
        releaseId,
        role,
        actorId,
        decision,
        candidateCommit: commit,
        candidateSha256,
      })}\n`,
      'utf8',
    );
    return {role, actorId, decision, evidence: {ref, sha256: digest(readFileSync(path))}};
  });
  return {
    ...base,
    output: resolve(root, '04_estado/releases/experience', releaseId),
    status: 'APPROVED',
    decisions,
    hostProbes: [{ref: probeRef, sha256: digest(readFileSync(probePath))}],
  };
};
