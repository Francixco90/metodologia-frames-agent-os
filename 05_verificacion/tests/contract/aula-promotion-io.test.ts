import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {
  DEFAULT_AULA_EVALUATION_REF,
  parseAulaPromotionArgsV1,
  writeAulaEvaluationV1,
  readAulaEvaluationV1,
  aulaPackageDigestV1,
} from '../../../02_proceso/workflows/multimedia/_runner/aula-promotion-io-v1.ts';
const roots: string[] = [];
const workspace = () => {
  const root = mkdtempSync(resolve(realpathSync(tmpdir()), 'aula-promotion-io-'));
  roots.push(root);
  return root;
};
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});
const ref = '04_estado/receipts/check-runs/aula-evaluation-20261001-002.json';
describe('Aula evaluation renewal IO', () => {
  it('preserves the initial default and selects explicit successors', () => {
    expect(parseAulaPromotionArgsV1(['--evaluate']).evaluationRef).toBe(
      DEFAULT_AULA_EVALUATION_REF,
    );
    expect(
      parseAulaPromotionArgsV1(['--activate', '--review', 'review.json', '--evaluation-ref', ref])
        .evaluationRef,
    ).toBe(ref);
  });
  it.each([
    '../escape.json',
    '/absolute.json',
    '04_estado/receipts/check-runs/other.json',
    '04_estado/receipts/check-runs/aula-evaluation-20261001-002.json/extra',
  ])('rejects unbounded evaluation path %s', (value) =>
    expect(() => parseAulaPromotionArgsV1(['--evaluate', '--evaluation-ref', value])).toThrow(),
  );
  it('rejects duplicate, missing, unknown options and omitted independent review', () => {
    for (const args of [
      ['--activate'],
      ['--evaluate', '--evaluation-ref'],
      ['--evaluate', '--force'],
      ['--evaluate', '--evaluation-ref', ref, '--evaluation-ref', ref],
    ])
      expect(() => parseAulaPromotionArgsV1(args)).toThrow();
  });
  it('writes once and preserves exact existing bytes on retry', () => {
    const root = workspace();
    writeAulaEvaluationV1(root, ref, 'first');
    expect(() => writeAulaEvaluationV1(root, ref, 'replacement')).toThrow('IMMUTABLE');
    expect(readAulaEvaluationV1(root, ref).toString()).toBe('first');
  });
  it('rejects symlink ancestors without modifying target', () => {
    const root = workspace(),
      outside = workspace();
    mkdirSync(resolve(root, '04_estado/receipts'), {recursive: true});
    symlinkSync(outside, resolve(root, '04_estado/receipts/check-runs'), 'dir');
    expect(() => writeAulaEvaluationV1(root, ref, 'replacement')).toThrow('FRAMES-OUTPUT-PATH002');
  });
  it('detects package drift from bytes rather than registry assertions', () => {
    const root = workspace(),
      dir = resolve(root, '03_artefactos/skills/fixture');
    mkdirSync(dir, {recursive: true});
    writeFileSync(resolve(dir, 'SKILL.md'), 'first');
    const before = aulaPackageDigestV1(root, 'fixture');
    writeFileSync(resolve(dir, 'SKILL.md'), 'changed');
    expect(aulaPackageDigestV1(root, 'fixture')).not.toBe(before);
    symlinkSync(resolve(dir, 'SKILL.md'), resolve(dir, 'linked.md'));
    expect(() => aulaPackageDigestV1(root, 'fixture')).toThrow('SYMLINK');
    expect(readFileSync(resolve(dir, 'SKILL.md'), 'utf8')).toBe('changed');
  });
  it('renews active skills through the existing same-state freeze without changing packages', () => {
    const root = workspace(),
      source = process.cwd(),
      id = 'metodologia-edu-workbook';
    cpSync(
      resolve(source, `03_artefactos/skills/${id}`),
      resolve(root, `03_artefactos/skills/${id}`),
      {recursive: true},
    );
    const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
    symlinkSync('03_artefactos/skills', resolve(root, 'skills'), 'dir');
    const packageHash = aulaPackageDigestV1(root, id),
      contentHash = hash(readFileSync(resolve(root, `03_artefactos/skills/${id}/SKILL.md`)));
    const entry = {
      skill_id: id,
      current_state: 'active',
      execution_scope: 'local-draft-generation',
      publication_authority: false,
      content_sha256: contentHash,
      package_manifest_sha256: packageHash,
    };
    const registryRef = '04_estado/registries/skills/creation-v3-skill-registry.yml';
    mkdirSync(resolve(root, '04_estado/registries/skills'), {recursive: true});
    writeFileSync(
      resolve(root, registryRef),
      'entries:\n  - ' +
        JSON.stringify(entry) +
        '\nevents:\n  - ' +
        JSON.stringify({
          skill_id: id,
          event_order: 4,
          from: 'evaluated',
          to: 'active',
          actor_id: 'FIXTURE',
        }) +
        '\n',
    );
    writeFileSync(
      resolve(root, '04_estado/registries/skills/aula-decks-package.json'),
      JSON.stringify({skills: [{name: id}]}),
    );
    const refs = [
      '02_proceso/workflows/multimedia/_runner/aula-material-handler-v1.ts',
      '02_proceso/workflows/multimedia/_runner/aula-work-order-v1.ts',
      '02_proceso/workflows/multimedia/_runner/aula-continuation-v1.ts',
      '02_proceso/workflows/multimedia/_schema/aula-approval-v1.ts',
      '05_verificacion/tests/integration/aula-continuation.test.ts',
      '02_proceso/workflows/multimedia/_runner/aula-engine-authority-v1.ts',
      '02_proceso/workflows/multimedia/_runner/aula-build-dependencies-v1.ts',
      '02_proceso/workflows/multimedia/_schema/aula-dependencies-v1.ts',
      '02_proceso/workflows/multimedia/_schema/aula-promotion-review-v1.ts',
      '02_proceso/workflows/multimedia/_runner/aula-promotion-io-v1.ts',
      '05_verificacion/scripts/promote-aula-decks.mjs',
    ];
    for (const path of refs) {
      mkdirSync(resolve(root, path, '..'), {recursive: true});
      cpSync(resolve(source, path), resolve(root, path));
    }
    const cap = '04_estado/registries/renderers/aula-decks-capability-v1.json';
    mkdirSync(resolve(root, cap, '..'), {recursive: true});
    cpSync(resolve(source, cap), resolve(root, cap));
    writeAulaEvaluationV1(root, DEFAULT_AULA_EVALUATION_REF, 'original immutable receipt');
    const evaluation = {
      schemaVersion: 'frames-aula-evaluation-v1',
      receiptId: 'TEST-SUCCESSOR',
      status: 'PASS',
      actorId: 'EVALUATOR-FIXTURE',
      implementation: refs.map((ref) => ({ref, sha256: hash(readFileSync(resolve(root, ref)))})),
      packages: [{skillId: id, contentSha256: contentHash, packageManifestSha256: packageHash}],
    };
    const bytes = JSON.stringify(evaluation);
    writeAulaEvaluationV1(root, ref, bytes);
    const review = '04_estado/receipts/aula-decks-guardian-20261001-002.json';
    writeFileSync(
      resolve(root, review),
      JSON.stringify({
        status: 'PASS',
        role: 'RT-11',
        actorId: 'GUARDIAN-FIXTURE',
        evaluationSha256: hash(bytes),
      }),
    );
    execFileSync(
      process.execPath,
      [
        resolve(source, '05_verificacion/scripts/promote-aula-decks.mjs'),
        '--activate',
        '--evaluation-ref',
        ref,
        '--review',
        review,
      ],
      {cwd: root, timeout: 20_000},
    );
    expect(readAulaEvaluationV1(root, DEFAULT_AULA_EVALUATION_REF).toString()).toBe(
      'original immutable receipt',
    );
    expect(aulaPackageDigestV1(root, id)).toBe(packageHash);
    const registry = readFileSync(resolve(root, registryRef), 'utf8');
    expect(registry).toContain('"from":"active","to":"active"');
    expect(registry).toContain('freeze_verified_local_package_successor');
  });
});
