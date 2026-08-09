import {createHash} from 'node:crypto';
import {
  cpSync,
  existsSync,
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

import {
  buildReleaseCapsule,
  computeReleaseCandidateSha256,
  verifyReleaseCapsule,
} from 'workflows/experience/index.ts';

const ROOT = process.cwd();
const COMMIT = 'a'.repeat(40);
const trackedFiles = [
  '03_artefactos/content/experience/frames-experience-blueprint.md',
  '03_artefactos/content/experience/frames-experience-blueprint.html',
  '03_artefactos/content/experience/projection-manifest.json',
];
const receiptRefs = [
  '04_estado/approvals/experience/rt09.json',
  '04_estado/receipts/experience/rt11.json',
  '05_verificacion/quality/experience/h01.json',
] as const;
const temporary: string[] = [];
const hash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, {recursive: true, force: true});
});

const createRoot = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-experience-release-root-'));
  temporary.push(root);
  for (const relative of trackedFiles) {
    const target = resolve(root, relative);
    mkdirSync(dirname(target), {recursive: true});
    cpSync(resolve(ROOT, relative), target);
  }
  mkdirSync(resolve(root, '04_estado/releases/experience'), {recursive: true});
  return root;
};

const identityOptions = (root: string, releaseId: string) => ({
  root,
  releaseId,
  parentRelease: null,
  releaseClass: 'COMPATIBLE',
  repositoryCommit: COMMIT,
  files: trackedFiles,
});

const decisionsFor = (root: string, releaseId: string) => {
  const candidateSha256 = computeReleaseCandidateSha256(identityOptions(root, releaseId));
  const identities = [
    {actorId: 'RT-09', role: 'RT-09' as const, decision: 'PASS' as const},
    {actorId: 'RT-11', role: 'RT-11' as const, decision: 'PASS' as const},
    {actorId: 'H01', role: 'H01' as const, decision: 'APPROVE' as const},
  ];
  return identities.map((identity, index) => {
    const ref = receiptRefs[index]!;
    const path = resolve(root, ref);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(
      path,
      `${JSON.stringify({
        schemaVersion: 'experience-approval-receipt-v1',
        releaseId,
        ...identity,
        candidateCommit: COMMIT,
        candidateSha256,
      })}\n`,
      'utf8',
    );
    return {...identity, evidence: {ref, sha256: hash(readFileSync(path))}};
  });
};

const approvedOptions = (root: string, releaseId: string) => ({
  ...identityOptions(root, releaseId),
  output: resolve(root, '04_estado/releases/experience', releaseId),
  status: 'APPROVED' as const,
  decisions: decisionsFor(root, releaseId),
});

describe('Frames Experience release capsule', () => {
  it('builds deterministic approved bytes from three bound receipts and replays all hashes', () => {
    const roots = [createRoot(), createRoot()];
    const outputs = roots.map((root) => {
      const options = approvedOptions(root, 'experience-1.0.0');
      buildReleaseCapsule(options);
      return options.output;
    });
    const files = [
      'release-manifest.json',
      'version-diff.json',
      'compatibility.md',
      'migration.md',
      'restore.md',
      'acceptance-evidence.json',
      'SHA256SUMS',
    ];
    expect(files.map((name) => readFileSync(resolve(outputs[0]!, name)))).toEqual(
      files.map((name) => readFileSync(resolve(outputs[1]!, name))),
    );
    expect(verifyReleaseCapsule(outputs[0]!, roots[0])).toMatchObject({
      ok: true,
      releaseId: 'experience-1.0.0',
      capsuleFiles: 6,
      sourceFiles: trackedFiles.length,
      errors: [],
    });
  });

  it('detects capsule tampering and source drift', () => {
    const root = createRoot();
    const options = approvedOptions(root, 'experience-tamper');
    buildReleaseCapsule(options);
    writeFileSync(resolve(options.output, 'compatibility.md'), '# Manipulado\n', 'utf8');
    expect(verifyReleaseCapsule(options.output, root).errors).toContain(
      'capsule-hash-drift:compatibility.md',
    );
    const source = resolve(root, trackedFiles[0]!);
    writeFileSync(source, `${readFileSync(source, 'utf8')}\nCambio no congelado.\n`, 'utf8');
    expect(verifyReleaseCapsule(options.output, root).errors).toContain(
      `source-hash-drift:${trackedFiles[0]}`,
    );
  });

  it('rejects a byte-identical source reached through an escaping symlink ancestor', () => {
    const root = createRoot();
    const options = approvedOptions(root, 'experience-source-link');
    buildReleaseCapsule(options);
    const sourceDir = resolve(root, '03_artefactos/content/experience');
    const externalDir = mkdtempSync(resolve(tmpdir(), 'frames-experience-external-source-'));
    temporary.push(externalDir);
    cpSync(sourceDir, externalDir, {recursive: true});
    rmSync(sourceDir, {recursive: true});
    symlinkSync(externalDir, sourceDir, 'dir');

    const report = verifyReleaseCapsule(options.output, root);
    expect(report.ok).toBe(false);
    expect(report.errors).toContain(`source-path-unsafe:${trackedFiles[0]}`);
  });

  it('keeps candidates outside the immutable vault', () => {
    const root = createRoot();
    expect(() =>
      buildReleaseCapsule({
        ...identityOptions(root, 'experience-candidate'),
        output: resolve(root, '04_estado/releases/experience/experience-candidate'),
      }),
    ).toThrow(/only APPROVED releases may enter the vault/u);
  });

  it('blocks missing, stale, symlink, traversal and conflated approval evidence', () => {
    const root = createRoot();
    const releaseId = 'experience-invalid';
    const base = approvedOptions(root, releaseId);
    const decisions = base.decisions;
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
    symlinkSync(resolve(root, receiptRefs[0]), link);
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
    ).toThrow(/unsafe path segment|non-symlink/u);
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

  it('binds every parsed receipt to the exact release, commit, candidate, role and actor', () => {
    const root = createRoot();
    const base = approvedOptions(root, 'experience-bound');
    const decision = base.decisions[0]!;
    const path = resolve(root, decision.evidence.ref);
    const receipt = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
    for (const mutation of [
      {releaseId: 'experience-other'},
      {candidateCommit: 'b'.repeat(40)},
      {candidateSha256: 'b'.repeat(64)},
      {role: 'RT-11'},
      {actorId: 'another-actor'},
    ]) {
      writeFileSync(path, `${JSON.stringify({...receipt, ...mutation})}\n`, 'utf8');
      const changed = [
        {...decision, evidence: {...decision.evidence, sha256: hash(readFileSync(path))}},
        base.decisions[1]!,
        base.decisions[2]!,
      ];
      expect(() => buildReleaseCapsule({...base, decisions: changed})).toThrow(
        /approval binding mismatch/u,
      );
    }
  });

  it('rejects duplicate overwrite and cleans lock/staging without altering the release', () => {
    const root = createRoot();
    const options = approvedOptions(root, 'experience-once');
    buildReleaseCapsule(options);
    const before = readFileSync(resolve(options.output, 'release-manifest.json'));
    expect(() => buildReleaseCapsule(options)).toThrow(/destination already exists/u);
    expect(readFileSync(resolve(options.output, 'release-manifest.json'))).toEqual(before);
    expect(existsSync(`${options.output}.lock`)).toBe(false);
    expect(existsSync(`${options.output}.staging`)).toBe(false);
  });

  it('rejects unsafe output paths, symlink parents, stale staging and private sources', () => {
    const root = createRoot();
    expect(() =>
      buildReleaseCapsule({
        ...identityOptions(root, 'experience-outside'),
        output: resolve(root, '../experience-outside'),
      }),
    ).toThrow(/inside repository/u);

    const realParent = resolve(root, 'candidate-real');
    const linkedParent = resolve(root, 'candidate-link');
    mkdirSync(realParent);
    symlinkSync(realParent, linkedParent);
    expect(() =>
      buildReleaseCapsule({
        ...identityOptions(root, 'experience-link'),
        output: resolve(linkedParent, 'experience-link'),
      }),
    ).toThrow(/non-symlink parent/u);

    const candidateParent = resolve(root, '.candidate');
    const candidateOutput = resolve(candidateParent, 'experience-staging');
    mkdirSync(candidateParent);
    mkdirSync(`${candidateOutput}.staging`);
    expect(() =>
      buildReleaseCapsule({
        ...identityOptions(root, 'experience-staging'),
        output: candidateOutput,
      }),
    ).toThrow(/stale staging/u);
    expect(existsSync(candidateOutput)).toBe(false);
    expect(existsSync(`${candidateOutput}.lock`)).toBe(false);

    const unsafe = resolve(root, '03_artefactos/content/experience/private.md');
    writeFileSync(unsafe, 'candidate_email: persona@example.test\neffect: publish\n', 'utf8');
    expect(() =>
      buildReleaseCapsule({
        ...identityOptions(root, 'experience-private'),
        output: resolve(candidateParent, 'experience-private'),
        files: ['03_artefactos/content/experience/private.md'],
      }),
    ).toThrow(/PII|private|external effect/iu);
  });
});
