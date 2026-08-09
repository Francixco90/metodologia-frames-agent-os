import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {discoverLocalExtensions} from 'workflows/local-extensions/index.ts';

const roots: string[] = [];
const digest = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const write = (root: string, ref: string, value: string): void => {
  const path = join(root, ref);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, value);
};

const workspace = () => {
  const repository = mkdtempSync(join(tmpdir(), 'frames-local-security-'));
  roots.push(repository);
  const project = join(repository, '04_estado/local/extensions');
  mkdirSync(project, {recursive: true});
  return {repository, project};
};

const installCode = (root: string): {runnerId: string; runnerHash: string} => {
  const handler = 'export const run = () => "ok";\n';
  const evidence = '{"network":"denied"}\n';
  const documentation = '# Code extension\n';
  const fixture = '{}\n';
  write(root, 'handler.ts', handler);
  write(root, 'README.md', documentation);
  write(root, 'fixtures/positive.json', fixture);
  write(root, 'fixtures/adversarial.json', fixture);
  write(root, 'evidence/sandbox.json', evidence);
  const manifest = {
    schema_version: 'frames-local-extension-v1',
    extension_id: 'local.frames.code-review',
    version: '1.0.0',
    scope: 'PROJECT_LOCAL',
    kind: 'skill',
    lifecycle: 'READY',
    enabled: true,
    override_policy: 'never',
    description: 'Extensión local con código.',
    triggers: ['revisión local'],
    capabilities: ['review.code'],
    inputs: [],
    outputs: ['review.md'],
    dependencies: [],
    effect_class: 'read_only',
    tools: [],
    read_set: [],
    write_set: [],
    routing: {priority: 'after_canonical', complements: []},
    execution: {mode: 'code', handler: 'handler.ts', sandbox_probe: 'probe.json'},
    content: [
      {ref: 'handler.ts', sha256: digest(handler)},
      {ref: 'README.md', sha256: digest(documentation)},
      {ref: 'fixtures/positive.json', sha256: digest(fixture)},
      {ref: 'fixtures/adversarial.json', sha256: digest(fixture)},
    ],
    documentation: ['README.md'],
    fixtures: {positive: 'fixtures/positive.json', adversarial: 'fixtures/adversarial.json'},
    budgets: {max_files: 8, max_context_files: 10},
  };
  write(root, 'extension.json', `${JSON.stringify(manifest, null, 2)}\n`);
  const runnerId = 'frames-sandbox-v1';
  const runnerHash = 'b'.repeat(64);
  const probe = {
    schema_version: 'frames-local-sandbox-probe-v1',
    extension_id: manifest.extension_id,
    manifest_sha256: digest(readFileSync(join(root, 'extension.json'))),
    runner_id: runnerId,
    runner_sha256: runnerHash,
    status: 'PASS',
    filesystem: 'CONSTRAINED',
    process: 'CONTROLLED',
    network: 'DENIED',
    deterministic_replay: 'PASS',
    write_set_check: 'PASS',
    evidence: [{ref: 'evidence/sandbox.json', sha256: digest(evidence)}],
  };
  write(root, 'probe.json', `${JSON.stringify(probe, null, 2)}\n`);
  return {runnerId, runnerHash};
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

describe('local extension fail-closed security', () => {
  it('does not trust a self-authored sandbox PASS', () => {
    const {repository, project} = workspace();
    const extension = join(project, 'code-review');
    mkdirSync(extension);
    const {runnerId, runnerHash} = installCode(extension);

    const untrusted = discoverLocalExtensions({repository_root: repository}).records[0];
    expect(untrusted).toMatchObject({
      state: 'VALIDATED_NOT_RUNNABLE',
      reason_codes: ['SANDBOX_RUNNER_UNTRUSTED'],
    });
    const trusted = discoverLocalExtensions({
      repository_root: repository,
      trusted_sandbox_runners: {[runnerId]: runnerHash},
    }).records[0];
    expect(trusted).toMatchObject({state: 'ACTIVE_LOCAL', reason_codes: []});
  });

  it('invalidates code activation when material evidence changes', () => {
    const {repository, project} = workspace();
    const extension = join(project, 'code-review');
    mkdirSync(extension);
    const {runnerId, runnerHash} = installCode(extension);
    write(extension, 'evidence/sandbox.json', '{"network":"unknown"}\n');

    expect(
      discoverLocalExtensions({
        repository_root: repository,
        trusted_sandbox_runners: {[runnerId]: runnerHash},
      }).records[0],
    ).toMatchObject({
      state: 'VALIDATED_NOT_RUNNABLE',
      reason_codes: ['SANDBOX_EVIDENCE_HASH_MISMATCH'],
    });
  });

  it('blocks symlinked content instead of following it', () => {
    const {repository, project} = workspace();
    const extension = join(project, 'linked');
    const outside = join(repository, 'outside.md');
    mkdirSync(extension);
    writeFileSync(outside, '# private\n');
    symlinkSync(outside, join(extension, 'SKILL.md'));
    write(extension, 'README.md', '# Linked\n');
    write(extension, 'fixtures/positive.json', '{}\n');
    write(extension, 'fixtures/adversarial.json', '{}\n');
    const manifest = {
      schema_version: 'frames-local-extension-v1',
      extension_id: 'local.frames.linked',
      version: '1.0.0',
      scope: 'PROJECT_LOCAL',
      kind: 'skill',
      lifecycle: 'READY',
      enabled: true,
      override_policy: 'never',
      description: 'No debe seguir enlaces.',
      triggers: ['linked'],
      capabilities: ['linked'],
      effect_class: 'read_only',
      routing: {priority: 'after_canonical', complements: []},
      execution: {mode: 'declarative'},
      content: [
        {ref: 'SKILL.md', sha256: digest('# private\n')},
        {ref: 'README.md', sha256: digest('# Linked\n')},
        {ref: 'fixtures/positive.json', sha256: digest('{}\n')},
        {ref: 'fixtures/adversarial.json', sha256: digest('{}\n')},
      ],
      documentation: ['README.md'],
      fixtures: {positive: 'fixtures/positive.json', adversarial: 'fixtures/adversarial.json'},
      budgets: {max_files: 6, max_context_files: 10},
    };
    write(extension, 'extension.json', `${JSON.stringify(manifest, null, 2)}\n`);

    const record = discoverLocalExtensions({repository_root: repository}).records[0];
    expect(record?.state).toBe('BLOCKED');
    expect(record?.reason_codes).toContain('LOCAL_EXTENSION_SYMLINK');
  });
});
