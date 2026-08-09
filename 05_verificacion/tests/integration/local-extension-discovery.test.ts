import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  createLocalActivationReceipt,
  discoverLocalExtensions,
  resolveLocalExtensionCandidates,
} from 'workflows/local-extensions/index.ts';

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
