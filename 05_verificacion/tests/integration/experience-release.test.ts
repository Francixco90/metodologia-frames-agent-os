import {createHash} from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {buildReleaseCapsule, verifyReleaseCapsule} from 'workflows/experience/index.ts';

const ROOT = process.cwd();
const trackedFiles = [
  '03_artefactos/content/experience/frames-experience-blueprint.md',
  '03_artefactos/content/experience/frames-experience-blueprint.html',
  '03_artefactos/content/experience/projection-manifest.json',
];
const decisionRefs = [
  '04_estado/approvals/experience/rt09.json',
  '04_estado/receipts/experience/rt11.json',
  '05_verificacion/quality/experience/h01.json',
] as const;
const hash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, {recursive: true, force: true});
});

const createRoot = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-experience-release-root-'));
  temporary.push(root);
  for (const relative of trackedFiles) {
    const target = resolve(root, relative);
    mkdirSync(dirname(target), {recursive: true});
    cpSync(resolve(ROOT, relative), target, {recursive: true});
  }
  decisionRefs.forEach((relative, index) => {
    const target = resolve(root, relative);
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, `${JSON.stringify({receipt: index + 1, status: 'PASS'})}\n`, 'utf8');
  });
  return root;
};

const decisionsFor = (root: string) => {
  const evidence = decisionRefs.map((ref) => ({
    ref,
    sha256: hash(readFileSync(resolve(root, ref))),
  }));
  return [
    {actorId: 'RT-09', role: 'RT-09' as const, decision: 'PASS' as const, evidence: evidence[0]!},
    {actorId: 'RT-11', role: 'RT-11' as const, decision: 'PASS' as const, evidence: evidence[1]!},
    {actorId: 'H01', role: 'H01' as const, decision: 'APPROVE' as const, evidence: evidence[2]!},
  ];
};

const buildApproved = (root: string): string => {
  const output = resolve(root, '04_estado/releases/experience/experience-1.0.0');
  buildReleaseCapsule({
    root,
    output,
    releaseId: 'experience-1.0.0',
    parentRelease: null,
    releaseClass: 'COMPATIBLE',
    repositoryCommit: 'a'.repeat(40),
    files: trackedFiles,
    status: 'APPROVED',
    decisions: decisionsFor(root),
  });
  return output;
};

describe('Frames Experience release capsule', () => {
  it('builds deterministic candidate bytes and replays every declared hash', () => {
    const root = createRoot();
    const secondRoot = createRoot();
    const first = buildApproved(root);
    const second = buildApproved(secondRoot);
    const capsuleFiles = [
      'release-manifest.json',
      'version-diff.json',
      'compatibility.md',
      'migration.md',
      'restore.md',
      'acceptance-evidence.json',
      'SHA256SUMS',
    ];
    expect(capsuleFiles.map((name) => readFileSync(resolve(first, name)))).toEqual(
      capsuleFiles.map((name) => readFileSync(resolve(second, name))),
    );
    expect(verifyReleaseCapsule(first, root)).toMatchObject({
      ok: true,
      releaseId: 'experience-1.0.0',
      capsuleFiles: 6,
      sourceFiles: trackedFiles.length,
      errors: [],
    });
  });

  it('detects both capsule tampering and source drift', () => {
    const root = createRoot();
    const capsule = buildApproved(root);
    writeFileSync(resolve(capsule, 'compatibility.md'), '# Manipulado\n', 'utf8');
    expect(verifyReleaseCapsule(capsule, root).errors).toContain(
      'capsule-hash-drift:compatibility.md',
    );

    const source = resolve(root, trackedFiles[0]!);
    writeFileSync(source, `${readFileSync(source, 'utf8')}\nCambio no congelado.\n`, 'utf8');
    expect(verifyReleaseCapsule(capsule, root).errors).toContain(
      `source-hash-drift:${trackedFiles[0]}`,
    );
  });

  it('keeps candidates outside the immutable vault', () => {
    const root = createRoot();
    expect(() =>
      buildReleaseCapsule({
        root,
        output: resolve(root, '04_estado/releases/experience/experience-candidate'),
        releaseId: 'experience-candidate',
        parentRelease: null,
        releaseClass: 'COMPATIBLE',
        repositoryCommit: 'a'.repeat(40),
        files: trackedFiles,
      }),
    ).toThrow(/only APPROVED releases may enter the vault/u);
  });

  it('blocks invalid approval evidence and separation before writing the vault', () => {
    const root = createRoot();
    const output = resolve(root, '04_estado/releases/experience/experience-invalid');
    const base = {
      root,
      output,
      releaseId: 'experience-invalid',
      parentRelease: null,
      releaseClass: 'SAFETY',
      repositoryCommit: 'a'.repeat(40),
      files: trackedFiles,
      status: 'APPROVED' as const,
    };
    const decisions = decisionsFor(root);

    expect(() =>
      buildReleaseCapsule({
        ...base,
        decisions: [
          {
            ...decisions[0]!,
            evidence: {...decisions[0]!.evidence, ref: '04_estado/approvals/missing.json'},
          },
          decisions[1]!,
          decisions[2]!,
        ],
      }),
    ).toThrow();
    expect(() =>
      buildReleaseCapsule({
        ...base,
        decisions: [
          {...decisions[0]!, evidence: {...decisions[0]!.evidence, sha256: 'b'.repeat(64)}},
          decisions[1]!,
          decisions[2]!,
        ],
      }),
    ).toThrow(/stale evidence hash/u);
    expect(() =>
      buildReleaseCapsule({
        ...base,
        decisions: decisions.map((item) => ({...item, actorId: 'same-actor'})),
      }),
    ).toThrow(/three distinct actors/u);

    const link = resolve(root, '04_estado/approvals/experience/linked.json');
    symlinkSync(resolve(root, decisionRefs[0]), link);
    expect(() =>
      buildReleaseCapsule({
        ...base,
        decisions: [
          {
            ...decisions[0]!,
            evidence: {
              ...decisions[0]!.evidence,
              ref: '04_estado/approvals/experience/linked.json',
            },
          },
          decisions[1]!,
          decisions[2]!,
        ],
      }),
    ).toThrow(/non-symlink/u);
    expect(() =>
      buildReleaseCapsule({
        ...base,
        decisions: [
          {
            ...decisions[0]!,
            evidence: {...decisions[0]!.evidence, ref: '04_estado/approvals/../escape.json'},
          },
          decisions[1]!,
          decisions[2]!,
        ],
      }),
    ).toThrow(/outside repository/u);
  });

  it('rejects traversal and external-effect or private material', () => {
    const root = createRoot();
    expect(() =>
      buildReleaseCapsule({
        root,
        output: resolve(root, '.candidate/experience-unsafe'),
        releaseId: 'experience-unsafe',
        parentRelease: null,
        releaseClass: 'COMPATIBLE',
        repositoryCommit: 'a'.repeat(40),
        files: ['../outside.md'],
      }),
    ).toThrow(/outside repository/u);

    const unsafe = resolve(root, '03_artefactos/content/experience/private.md');
    writeFileSync(
      unsafe,
      'candidate_email: persona@example.test\neffect: publish\nsecret: synthetic-token\n',
      'utf8',
    );
    expect(() =>
      buildReleaseCapsule({
        root,
        output: resolve(root, '.candidate/experience-private'),
        releaseId: 'experience-private',
        parentRelease: null,
        releaseClass: 'SAFETY',
        repositoryCommit: 'a'.repeat(40),
        files: ['03_artefactos/content/experience/private.md'],
      }),
    ).toThrow(/PII|private|secret|external effect/iu);
  });
});
