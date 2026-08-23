import {mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {planOrVerifyGeneralVideoMethodExplainer} from 'workflows/video-os/index.ts';

import {
  assertCeiling,
  type Bundle,
  expected,
  makeBundle,
  materialize,
  snapshotTree,
  temporary,
  verifyRequest,
} from './video-os-general-video-method-explainer-adapter.helpers.ts';

describe('General Video method-explainer VERIFY_EXISTING adapter', () => {
  it('validates canonical material without writing or mutating inputs', async () => {
    const {bundle, root} = materialize();
    const request = verifyRequest(bundle);
    const before = structuredClone(request);
    const filesBefore = snapshotTree(root);
    const result = await planOrVerifyGeneralVideoMethodExplainer(request, {baseDir: root});
    expect(result).toMatchObject({
      operation: 'VERIFY_EXISTING',
      verdict: 'VALIDATED_CANDIDATE',
      next_gate: 'VO_DIRECTION_APPROVED',
      reason_code: null,
      evidence: {kind: 'VERIFY_EXISTING', ...expected(bundle)},
    });
    expect(request).toEqual(before);
    expect(snapshotTree(root)).toEqual(filesBefore);
    assertCeiling(result);
  });

  it('is deterministic across repeated verification', async () => {
    const {bundle, root} = materialize();
    const request = verifyRequest(bundle);
    expect(await planOrVerifyGeneralVideoMethodExplainer(request, {baseDir: root})).toEqual(
      await planOrVerifyGeneralVideoMethodExplainer(request, {baseDir: root}),
    );
  });

  it('requires a material root and still stops at the direction gate', async () => {
    const bundle = makeBundle();
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle));
    expect(result).toMatchObject({
      verdict: 'BLOCKED',
      reason_code: 'ADAPTER-MATERIAL-ROOT-REQUIRED',
      next_gate: 'VO_DIRECTION_APPROVED',
    });
    assertCeiling(result);
  });

  it.each([
    'bundle_sha256',
    'spec_sha256',
    'contract_set_sha256',
    'build_manifest_sha256',
    'unattended_run_sha256',
  ] as const)('rejects expected %s drift', async (key) => {
    const {bundle, root} = materialize();
    const request = verifyRequest(bundle);
    request.expected[key] = '0'.repeat(64);
    const result = await planOrVerifyGeneralVideoMethodExplainer(request, {baseDir: root});
    expect(result).toMatchObject({
      verdict: 'BLOCKED',
      reason_code: 'ADAPTER-EXPECTED-HASH-MISMATCH',
    });
    assertCeiling(result);
  });

  it.each([
    ['spec', (bundle: Bundle) => (bundle.beat_budget.spec_sha256 = '0'.repeat(64))],
    ['beat', (bundle: Bundle) => (bundle.diagram.beat_budget_sha256 = '0'.repeat(64))],
    ['diagram', (bundle: Bundle) => (bundle.hashes.diagram = '0'.repeat(64))],
    ['build', (bundle: Bundle) => (bundle.unattended_run.build_manifest_sha256 = '0'.repeat(64))],
    ['run', (bundle: Bundle) => (bundle.unattended_run_material.sha256 = '0'.repeat(64))],
    ['script binding', (bundle: Bundle) => (bundle.build_manifest.script.sha256 = '0'.repeat(64))],
    ['audio binding', (bundle: Bundle) => (bundle.build_manifest.audio.sha256 = '0'.repeat(64))],
  ] as const)('rejects structurally valid %s drift', async (_, mutate) => {
    const {bundle, root} = materialize();
    mutate(bundle);
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
      baseDir: root,
    });
    expect(result.verdict).toBe('BLOCKED');
    expect(result.reason_code).toMatch(/^(?:METHOD-EXPLAINER-|ADAPTER-REQUEST-INVALID)/u);
    assertCeiling(result);
  });

  it.each([
    ['authority', (bundle: Bundle): string => bundle.method_content.authority_refs[0]!.ref],
    ['script', (bundle: Bundle): string => bundle.build_manifest.script.ref],
    ['audio', (bundle: Bundle): string => bundle.build_manifest.audio.ref],
    ['asset', (bundle: Bundle): string => bundle.build_manifest.assets[0]!.ref],
    ['component', (bundle: Bundle): string => bundle.build_manifest.components[0]!.ref],
    ['checkpoint', (bundle: Bundle): string => bundle.unattended_run.stages[0]!.checkpoint!.ref],
    ['render', (bundle: Bundle): string => bundle.build_manifest.required_outputs.primary_mp4.ref],
  ] as const)(
    'rejects %s material byte drift with a sanitized reason',
    async (_, refFor: (bundle: Bundle) => string) => {
      const {bundle, root} = materialize();
      const ref = refFor(bundle);
      writeFileSync(resolve(root, ref), `${readFileSync(resolve(root, ref), 'utf8')}x`);
      const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
        baseDir: root,
      });
      expect(result).toMatchObject({
        verdict: 'BLOCKED',
        reason_code: 'METHOD-EXPLAINER-MATERIAL-SIZE-MISMATCH',
      });
      expect(result.reason_code).not.toContain(root);
      assertCeiling(result);
    },
  );

  it('rejects missing and directory materials without leaking the root', async () => {
    const {bundle, root} = materialize();
    const target = resolve(root, bundle.build_manifest.audio.ref);
    rmSync(target);
    mkdirSync(target);
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
      baseDir: root,
    });
    expect(result.verdict).toBe('BLOCKED');
    expect(result.reason_code).toMatch(/^METHOD-EXPLAINER-MATERIAL-/u);
    expect(JSON.stringify(result)).not.toContain(root);
  });

  it('rejects a symlink escape and sanitizes the external locator', async () => {
    const {bundle, root} = materialize();
    const outside = resolve(tmpdir(), `gv-adapter-outside-${process.pid}.txt`);
    temporary.push(outside);
    writeFileSync(outside, 'host-v1');
    const target = resolve(root, bundle.build_manifest.assets[0]!.ref);
    rmSync(target);
    symlinkSync(outside, target);
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
      baseDir: root,
    });
    expect(result).toMatchObject({
      verdict: 'BLOCKED',
      reason_code: 'METHOD-EXPLAINER-MATERIAL-ESCAPES-ROOT',
    });
    expect(JSON.stringify(result)).not.toContain(outside);
  });

  it.each([
    '/tmp/authority.json',
    '../authority.json',
    'private/authority.json',
    'https://x.test/a',
  ])('rejects unsafe authority ref %s at the strict request boundary', async (ref) => {
    const bundle = structuredClone(makeBundle());
    bundle.method_content.authority_refs[0]!.ref = ref;
    const result = await planOrVerifyGeneralVideoMethodExplainer(verifyRequest(bundle), {
      baseDir: tmpdir(),
    });
    expect(result).toMatchObject({verdict: 'BLOCKED', reason_code: 'ADAPTER-REQUEST-INVALID'});
    expect(JSON.stringify(result)).not.toContain(ref);
    assertCeiling(result);
  });

  it('rejects additional request and bundle fields', async () => {
    const {bundle, root} = materialize();
    const withRequestField = {...verifyRequest(bundle), unexpected: true};
    const withBundleField = verifyRequest({...bundle, unexpected: true} as Bundle);
    for (const candidate of [withRequestField, withBundleField]) {
      const result = await planOrVerifyGeneralVideoMethodExplainer(candidate, {baseDir: root});
      expect(result).toMatchObject({verdict: 'BLOCKED', reason_code: 'ADAPTER-REQUEST-INVALID'});
      assertCeiling(result);
    }
  });
});
