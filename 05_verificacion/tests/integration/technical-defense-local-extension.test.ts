import {cpSync, mkdirSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {technicalDefenseRunnerSha256V1} from 'workflows/local-extensions/executor-v1.ts';
import {SandboxProbeSchema, discoverLocalExtensions} from 'workflows/local-extensions/index.ts';
import {TECHNICAL_DEFENSE_OUTPUT_REFS_V1} from 'projects/agentic-workflow-adoption-v1/local-extensions/technical-defense/handler.ts';
import {
  bundleRoot,
  createTechnicalDefenseTemporaryRoot,
  digest,
  loadTechnicalDefenseBundle,
  setupTechnicalDefenseRun,
} from './technical-defense-local-extension.harness.ts';

describe('R8 technical-defense PROJECT_LOCAL bundle', () => {
  it('keeps manifest, runner, probe and bundled evidence physically hash-bound', () => {
    const binding = loadTechnicalDefenseBundle();
    const probe = SandboxProbeSchema.parse(JSON.parse(binding.probeBytes.toString('utf8')));
    expect(binding.record).toMatchObject({
      extension_id: 'local.metodologia.technical-defense-preparation',
      state: 'ACTIVE_LOCAL',
      scope: 'PROJECT_LOCAL',
      reason_codes: [],
    });
    expect(binding.receipt.sandbox_probe_sha256).toBe(binding.record.sandbox_probe_sha256);
    expect(probe).toMatchObject({network: 'DENIED', deterministic_replay: 'PASS'});
    expect(probe.runner_sha256).toBe(technicalDefenseRunnerSha256V1());
    expect(probe.manifest_sha256).toBe(binding.record.manifest_sha256);
    for (const item of probe.evidence)
      expect(digest(readFileSync(resolve(bundleRoot, item.ref)))).toBe(item.sha256);
  });

  it('materializes into an isolated root and activates only with the trusted runner', () => {
    const repository = createTechnicalDefenseTemporaryRoot('frames-r8-bundle-');
    const target = resolve(
      repository,
      '04_estado/local/extensions/metodologia/technical-defense-preparation',
    );
    mkdirSync(target, {recursive: true});
    cpSync(bundleRoot, target, {recursive: true});
    const probe = SandboxProbeSchema.parse(
      JSON.parse(readFileSync(resolve(target, 'sandbox-probe.json'), 'utf8')),
    );
    const [record] = discoverLocalExtensions({
      repository_root: repository,
      trusted_sandbox_runners: {[probe.runner_id]: probe.runner_sha256},
    }).records;
    expect(record).toMatchObject({
      extension_id: 'local.metodologia.technical-defense-preparation',
      scope: 'PROJECT_LOCAL',
      state: 'ACTIVE_LOCAL',
      reason_codes: [],
      sandbox_probe_sha256: digest(readFileSync(resolve(target, 'sandbox-probe.json'))),
    });
  });

  it('executes through TransactionKernelV1 with nine exact labeled outputs', async () => {
    const binding = loadTechnicalDefenseBundle();
    const run = setupTechnicalDefenseRun('r8-success', binding);
    const receipt = await run.execute();
    expect(receipt).toMatchObject({state: 'EFFECT_SUCCEEDED', errorCode: null, coverageGaps: []});
    expect(receipt.outputs.map(({ref}) => ref)).toEqual(TECHNICAL_DEFENSE_OUTPUT_REFS_V1);
    expect(readdirSync(run.effect).sort()).toEqual([...TECHNICAL_DEFENSE_OUTPUT_REFS_V1].sort());
    for (const ref of TECHNICAL_DEFENSE_OUTPUT_REFS_V1)
      expect(readFileSync(resolve(run.effect, ref), 'utf8')).toContain(
        'BORRADOR LOCAL · NO VERIFICADO · LOCAL_SIMULATION',
      );
    const packageMd = readFileSync(resolve(run.effect, 'technical-defense-package.md'), 'utf8');
    const packageHtml = readFileSync(resolve(run.effect, 'technical-defense-package.html'), 'utf8');
    const brief = readFileSync(resolve(run.effect, 'brief.md'), 'utf8');
    const rehearsal = readFileSync(resolve(run.effect, 'rehearsal-report.md'), 'utf8');
    const requirement = binding.positive.requirements[0]!;
    const finding = binding.positive.red_team.findings[0]!;
    expect(packageMd).toContain('Estado máximo: ACTIVE_LOCAL');
    for (const output of [brief, packageMd, packageHtml]) {
      expect(output).toContain(requirement.id);
      expect(output).toContain(requirement.text);
    }
    for (const output of [rehearsal, packageMd, packageHtml]) {
      expect(output).toContain(finding.description);
      expect(output).toContain(finding.limitation);
      expect(output).toContain(finding.owner);
      expect(output).toContain(finding.signoff_sha256);
    }
  });

  it('replays deterministically in fresh effect and state roots', async () => {
    const first = await setupTechnicalDefenseRun(
      'r8-replay',
      loadTechnicalDefenseBundle(),
    ).execute();
    const second = await setupTechnicalDefenseRun(
      'r8-replay',
      loadTechnicalDefenseBundle(),
    ).execute();
    expect(first.outputs).toEqual(second.outputs);
    expect(first.candidateSha256).toBe(second.candidateSha256);
  });
});
