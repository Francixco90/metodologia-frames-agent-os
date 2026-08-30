import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  createLocalActivationReceipt,
  discoverLocalExtensions,
  resolveLocalExtensionCandidates,
} from 'workflows/local-extensions/index.ts';
import {
  hashTechnicalDefenseRuntimeInputsV1,
  technicalDefenseRunnerSha256V1,
  technicalDefenseRuntimeAttestationRefsV1,
  validateTechnicalDefenseActivationV1,
  type LocalExtensionExecutionInputV1,
} from 'workflows/local-extensions/technical-defense-executor-attestation-v1.ts';

const roots: string[] = [];
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const workspace = () => {
  const repository = mkdtempSync(join(tmpdir(), 'frames-local-extension-'));
  roots.push(repository);
  const project = join(repository, '04_estado/local/extensions');
  mkdirSync(project, {recursive: true});
  return {repository, project};
};

const write = (root: string, ref: string, value: string): void => {
  const path = join(root, ref);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, value);
};

const installDeclarative = (
  root: string,
  extensionId = 'local.frames.review-deck',
  overrides: Record<string, unknown> = {},
): void => {
  const content = '# Local review\n';
  const documentation = '# Uso\n';
  const fixture = '{}\n';
  write(root, 'SKILL.md', content);
  write(root, 'README.md', documentation);
  write(root, 'fixtures/positive.json', fixture);
  write(root, 'fixtures/adversarial.json', fixture);
  const manifest = {
    schema_version: 'frames-local-extension-v1',
    extension_id: extensionId,
    version: '1.0.0',
    scope: 'PROJECT_LOCAL',
    kind: 'skill',
    lifecycle: 'READY',
    enabled: true,
    override_policy: 'never',
    description: 'Revisa una presentación local.',
    triggers: ['revisar presentación'],
    capabilities: ['review.deck'],
    inputs: [],
    outputs: ['review.md'],
    dependencies: [],
    effect_class: 'read_only',
    tools: [],
    read_set: [],
    write_set: [],
    routing: {priority: 'after_canonical', complements: []},
    execution: {mode: 'declarative'},
    content: [
      {ref: 'SKILL.md', sha256: sha256(content)},
      {ref: 'README.md', sha256: sha256(documentation)},
      {ref: 'fixtures/positive.json', sha256: sha256(fixture)},
      {ref: 'fixtures/adversarial.json', sha256: sha256(fixture)},
    ],
    documentation: ['README.md'],
    fixtures: {positive: 'fixtures/positive.json', adversarial: 'fixtures/adversarial.json'},
    budgets: {max_files: 6, max_context_files: 10},
    ...overrides,
  };
  write(root, 'extension.json', `${JSON.stringify(manifest, null, 2)}\n`);
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

describe('local extension discovery and routing', () => {
  it('calculates ACTIVE_LOCAL and a deterministic hash-bound receipt', () => {
    const {repository, project} = workspace();
    const extension = join(project, 'review-deck');
    mkdirSync(extension);
    installDeclarative(extension);

    const discovery = discoverLocalExtensions({repository_root: repository});
    expect(discovery.records).toHaveLength(1);
    expect(discovery.records[0]).toMatchObject({
      extension_id: 'local.frames.review-deck',
      state: 'ACTIVE_LOCAL',
      reason_codes: [],
      scope: 'PROJECT_LOCAL',
    });
    const first = createLocalActivationReceipt(discovery.records[0]!);
    const second = createLocalActivationReceipt(discovery.records[0]!);
    expect(first).toEqual(second);
    expect(first.sandbox_probe_sha256).toBeNull();
    expect(first.receipt_sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('preserves canonical precedence and marks local matches as supplements', () => {
    const {repository, project} = workspace();
    const extension = join(project, 'review-deck');
    mkdirSync(extension);
    installDeclarative(extension);
    const discovery = discoverLocalExtensions({repository_root: repository});
    const resolution = resolveLocalExtensionCandidates({
      discovery,
      canonical: [
        {
          route_id: 'R6',
          triggers: ['revisar presentación'],
          capabilities: ['content.review'],
        },
      ],
      signals: ['revisar presentación'],
    });
    expect(resolution.canonical.map(({route_id}) => route_id)).toEqual(['R6']);
    expect(resolution.local).toHaveLength(1);
    expect(resolution.local[0]?.role).toBe('SUPPLEMENT');
  });

  it('blocks stale content and unresolved or cyclic dependencies', () => {
    const {repository, project} = workspace();
    const stale = join(project, 'stale');
    mkdirSync(stale);
    installDeclarative(stale, 'local.frames.stale', {
      content: [{ref: 'SKILL.md', sha256: '0'.repeat(64)}],
    });
    const missing = join(project, 'missing');
    mkdirSync(missing);
    installDeclarative(missing, 'local.frames.missing', {
      dependencies: ['local.frames.not-installed'],
    });
    const first = join(project, 'cycle-a');
    const second = join(project, 'cycle-b');
    mkdirSync(first);
    mkdirSync(second);
    installDeclarative(first, 'local.frames.cycle-a', {dependencies: ['local.frames.cycle-b']});
    installDeclarative(second, 'local.frames.cycle-b', {dependencies: ['local.frames.cycle-a']});

    const byId = new Map(
      discoverLocalExtensions({repository_root: repository}).records.map((record) => [
        record.extension_id,
        record,
      ]),
    );
    const staleRecord = byId.get('local.frames.stale');
    const missingRecord = byId.get('local.frames.missing');
    const cycleA = byId.get('local.frames.cycle-a');
    const cycleB = byId.get('local.frames.cycle-b');
    expect(staleRecord?.state).toBe('BLOCKED');
    expect(staleRecord?.reason_codes).toContain('CONTENT_HASH_MISMATCH');
    expect(missingRecord?.state).toBe('BLOCKED');
    expect(missingRecord?.reason_codes).toContain('MISSING_LOCAL_DEPENDENCY');
    expect(cycleA?.state).toBe('BLOCKED');
    expect(cycleA?.reason_codes).toContain('CIRCULAR_LOCAL_DEPENDENCY');
    expect(cycleB?.state).toBe('BLOCKED');
    expect(cycleB?.reason_codes).toContain('CIRCULAR_LOCAL_DEPENDENCY');
  });
});

describe('technical-defense runtime attestation', () => {
  it('hashes a deterministic transitive superset and rejects drift before activation input', () => {
    const refs = [...technicalDefenseRuntimeAttestationRefsV1()];
    expect(refs).toEqual([...refs].sort());
    expect(new Set(refs).size).toBe(refs.length);
    expect(refs).toEqual(
      expect.arrayContaining([
        '.npmrc',
        'package.json',
        'pnpm-lock.yaml',
        'pnpm-workspace.yaml',
        'tsconfig.json',
        '02_proceso/core/contracts/transaction-kernel-v1.ts',
        '02_proceso/core/orchestration/transaction-kernel-v1.ts',
        '02_proceso/workflows/core/material-skill-adapter-v2.ts',
        '02_proceso/workflows/local-extensions/contracts.ts',
        '02_proceso/workflows/local-extensions/dependencies.ts',
        '02_proceso/workflows/local-extensions/loader.ts',
        '02_proceso/workflows/local-extensions/paths.ts',
        '02_proceso/workflows/local-extensions/receipt.ts',
        '03_artefactos/projects/agentic-workflow-adoption-v1/local-extensions/technical-defense/handler.ts',
        '03_artefactos/projects/agentic-workflow-adoption-v1/local-extensions/technical-defense/technical-defense-contracts-v1.ts',
        '03_artefactos/projects/agentic-workflow-adoption-v1/local-extensions/technical-defense/technical-defense-render-v1.ts',
      ]),
    );

    const decisiveRef = '02_proceso/workflows/local-extensions/dependencies.ts';
    const trustedDigest = technicalDefenseRunnerSha256V1();
    const driftedDigest = hashTechnicalDefenseRuntimeInputsV1((ref) => {
      const bytes = readFileSync(join(process.cwd(), ref));
      return ref === decisiveRef ? Buffer.concat([bytes, Buffer.from('\n// drift')]) : bytes;
    });
    expect(driftedDigest).not.toBe(trustedDigest);

    let activationInputRead = false;
    const guardedInput = new Proxy({} as LocalExtensionExecutionInputV1, {
      get() {
        activationInputRead = true;
        throw new Error('ACTIVATION_INPUT_READ_BEFORE_RUNTIME_ATTESTATION');
      },
    });
    expect(() =>
      validateTechnicalDefenseActivationV1(guardedInput, {
        runnerId: 'frames.local-extension-executor-v1',
        runnerSha256: driftedDigest,
      }),
    ).toThrowError(/runner authority drifted/u);
    expect(activationInputRead).toBe(false);
  });
});
