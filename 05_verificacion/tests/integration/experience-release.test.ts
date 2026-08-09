import {createHash} from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {canonicalize} from 'core/evidence/canonical-json.ts';
import {
  EXPERIENCE_RELEASE_SURFACE_V1,
  buildReleaseCapsule,
  verifyReleaseCapsule,
} from 'workflows/experience/index.ts';
import {
  createApprovedReleaseOptions,
  createExperienceReleaseRepository,
} from '../fixtures/experience/release-fixture.ts';

const temporary: string[] = [];
const digest = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, {recursive: true, force: true});
});

const approved = (releaseId: string) => {
  const repository = createExperienceReleaseRepository();
  temporary.push(repository.root);
  return {
    ...repository,
    options: createApprovedReleaseOptions(repository.root, repository.commit, releaseId),
  };
};

describe('Frames Experience release capsule', () => {
  it('uses the exact mandatory Git surface, bound probe and three approvals', () => {
    const {root, options} = approved('experience-git-positive');
    expect(options.files).toEqual([...EXPERIENCE_RELEASE_SURFACE_V1]);
    const manifest = buildReleaseCapsule(options);
    expect(manifest).toMatchObject({
      status: 'APPROVED',
      compatibleHosts: ['CODEX'],
      commitSha: options.repositoryCommit,
    });
    expect(verifyReleaseCapsule(options.output, root)).toMatchObject({
      ok: true,
      releaseId: 'experience-git-positive',
      sourceFiles: EXPERIENCE_RELEASE_SURFACE_V1.length,
      errors: [],
    });
  }, 15_000);

  it('produces deterministic capsule bytes from equivalent committed repositories', () => {
    const runs = [approved('experience-deterministic'), approved('experience-deterministic')];
    const files = [
      'release-manifest.json',
      'version-diff.json',
      'compatibility.md',
      'migration.md',
      'restore.md',
      'acceptance-evidence.json',
      'SHA256SUMS',
    ];
    for (const run of runs) buildReleaseCapsule(run.options);
    expect(files.map((name) => readFileSync(resolve(runs[0]!.options.output, name)))).toEqual(
      files.map((name) => readFileSync(resolve(runs[1]!.options.output, name))),
    );
  }, 15_000);

  it('detects capsule tampering and a manifest hash that disagrees with Git-show bytes', () => {
    const {root, options} = approved('experience-tamper');
    buildReleaseCapsule(options);
    writeFileSync(resolve(options.output, 'compatibility.md'), '# Manipulado\n', 'utf8');
    expect(verifyReleaseCapsule(options.output, root).errors).toContain(
      'capsule-hash-drift:compatibility.md',
    );
    const manifestPath = resolve(options.output, 'release-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      releaseId: string;
      parentReleaseId: string | null;
      commitSha: string;
      releaseClass: string;
      artifacts: Array<{ref: string; sha256: string}>;
      canonicalSha256: string;
    };
    const ref = manifest.artifacts[0]!.ref;
    manifest.artifacts[0]!.sha256 = 'f'.repeat(64);
    manifest.canonicalSha256 = digest(
      canonicalize({
        releaseId: manifest.releaseId,
        parentReleaseId: manifest.parentReleaseId,
        commitSha: manifest.commitSha,
        releaseClass: manifest.releaseClass,
        artifacts: manifest.artifacts,
      }),
    );
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    expect(verifyReleaseCapsule(options.output, root).errors).toContain(`source-hash-drift:${ref}`);
  });

  it('rejects byte-identical committed sources reached through an external symlink ancestor', () => {
    const {root, options} = approved('experience-source-link');
    buildReleaseCapsule(options);
    const sourceDir = resolve(root, '02_proceso/core/contracts');
    const externalDir = mkdtempSync(resolve(tmpdir(), 'frames-experience-external-source-'));
    temporary.push(externalDir);
    cpSync(sourceDir, externalDir, {recursive: true});
    rmSync(sourceDir, {recursive: true});
    symlinkSync(externalDir, sourceDir, 'dir');
    const report = verifyReleaseCapsule(options.output, root);
    expect(report.ok).toBe(false);
    expect(report.errors).toContain(
      'source-path-unsafe:02_proceso/core/contracts/experience-assistance-v1.ts',
    );
  });

  it('binds approvals to material hashes and distinct actors', () => {
    const {root, options} = approved('experience-approval-invalid');
    const decisions = options.decisions!;
    expect(() =>
      buildReleaseCapsule({
        ...options,
        decisions: [
          {...decisions[0]!, evidence: {...decisions[0]!.evidence, sha256: 'b'.repeat(64)}},
          decisions[1]!,
          decisions[2]!,
        ],
      }),
    ).toThrow(/stale evidence hash/u);
    expect(() =>
      buildReleaseCapsule({
        ...options,
        decisions: decisions.map((decision) => ({...decision, actorId: 'same-actor'})),
      }),
    ).toThrow(/three distinct actors/u);

    const receiptPath = resolve(root, decisions[0]!.evidence.ref);
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as Record<string, string>;
    writeFileSync(
      receiptPath,
      `${JSON.stringify({...receipt, candidateSha256: 'c'.repeat(64)})}\n`,
    );
    const changed = [
      {
        ...decisions[0]!,
        evidence: {...decisions[0]!.evidence, sha256: digest(readFileSync(receiptPath))},
      },
      decisions[1]!,
      decisions[2]!,
    ];
    expect(() => buildReleaseCapsule({...options, decisions: changed})).toThrow(
      /approval binding mismatch/u,
    );
  });

  it('fails closed for unavailable commits, Git-show gaps and omitted mandatory files', () => {
    const {root, options} = approved('experience-git-negative');
    expect(() => buildReleaseCapsule({...options, repositoryCommit: 'b'.repeat(40)})).toThrow(
      /commit unavailable locally/u,
    );

    const workingOnly = '02_proceso/workflows/core/working-only.ts';
    writeFileSync(resolve(root, workingOnly), 'not committed\n', 'utf8');
    expect(() => buildReleaseCapsule({...options, files: [...options.files, workingOnly]})).toThrow(
      /unavailable at commit/u,
    );
    expect(() => buildReleaseCapsule({...options, files: options.files.slice(1)})).toThrow(
      /EXP-RELEASE-SURFACE: missing/u,
    );
  });

  it('requires at least one exact, hash-bound host launch probe', () => {
    const {root, options} = approved('experience-probe-negative');
    expect(() => buildReleaseCapsule({...options, hostProbes: []})).toThrow(
      /one PASS is required/u,
    );
    const probe = options.hostProbes![0]!;
    const probePath = resolve(root, probe.ref);
    const value = JSON.parse(readFileSync(probePath, 'utf8')) as Record<string, unknown>;
    writeFileSync(probePath, `${JSON.stringify({...value, releaseId: 'experience-other'})}\n`);
    expect(() =>
      buildReleaseCapsule({
        ...options,
        hostProbes: [{...probe, sha256: digest(readFileSync(probePath))}],
      }),
    ).toThrow(/binding mismatch/u);
  });

  it('keeps the approved vault immutable after the first atomic write', () => {
    const {options} = approved('experience-once');
    buildReleaseCapsule(options);
    const before = readFileSync(resolve(options.output, 'release-manifest.json'));
    expect(() => buildReleaseCapsule(options)).toThrow(/destination already exists/u);
    expect(readFileSync(resolve(options.output, 'release-manifest.json'))).toEqual(before);
    expect(existsSync(`${options.output}.lock`)).toBe(false);
    expect(existsSync(`${options.output}.staging`)).toBe(false);
  });
});
