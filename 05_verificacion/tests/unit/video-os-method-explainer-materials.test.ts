import {spawnSync} from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  assertMethodExplainerContractBundle,
  assertMethodExplainerMaterialBundle,
  canonicalSha256,
  MAX_MATERIAL_BYTES,
} from 'workflows/video-os/index.ts';

import {
  type Bundle,
  expectRejected,
  makeBundle,
  materializeBundle,
  type Mutation,
  refreshRunMaterial,
  sha256,
  temporaryDirectories,
} from './video-os-method-explainer-fixture.ts';

describe('material hashes and output-drift gates', () => {
  it.each([
    [
      'spec drift in the beat budget',
      (bundle) => {
        bundle.beat_budget.spec_sha256 = sha256('other-spec');
      },
    ],
    [
      'spec drift in the diagram',
      (bundle) => {
        bundle.diagram.spec_sha256 = sha256('other-spec');
      },
    ],
    [
      'spec drift in the build manifest',
      (bundle) => {
        bundle.build_manifest.spec_sha256 = sha256('other-spec');
      },
    ],
    [
      'spec drift in the unattended run',
      (bundle) => {
        bundle.unattended_run.spec_sha256 = sha256('other-spec');
        refreshRunMaterial(bundle);
      },
    ],
    [
      'intent content drift after hashing',
      (bundle) => {
        bundle.intent.audience = 'Una audiencia distinta';
      },
    ],
    [
      'diagram output drift after hashing',
      (bundle) => {
        bundle.diagram.grammar = 'cycle';
      },
    ],
    [
      'video spec drift after canonical hashing',
      (bundle) => {
        bundle.video_spec.duration_seconds = 16;
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, Mutation]>)('rejects %s', (_, mutate) => {
    expectRejected(mutate);
  });
});

describe('material file authority and byte-drift gates', () => {
  it('accepts a bundle only when every bound material exists as matching bytes', async () => {
    const {bundle, root} = materializeBundle();
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).resolves.toEqual(bundle);
  });

  it('rejects a missing bound material with a sanitized stable code', async () => {
    const {bundle, root} = materializeBundle();
    rmSync(resolve(root, bundle.build_manifest.audio.ref));
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /^METHOD-EXPLAINER-MATERIAL-FS-ERROR$/u,
    );
  });

  it('rejects a directory substituted for a bound file', async () => {
    const {bundle, root} = materializeBundle();
    const path = resolve(root, bundle.build_manifest.script.ref);
    rmSync(path);
    mkdirSync(path);
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /METHOD-EXPLAINER-MATERIAL-NOT-FILE/u,
    );
  });

  it('rejects a symlink that resolves outside the material root', async () => {
    const {bundle, root} = materializeBundle();
    const outside = mkdtempSync(resolve(tmpdir(), 'method-explainer-outside-'));
    temporaryDirectories.push(outside);
    const outsideFile = resolve(outside, 'escaped-audio.wav');
    writeFileSync(outsideFile, 'audio-v1');
    const path = resolve(root, bundle.build_manifest.audio.ref);
    rmSync(path);
    symlinkSync(outsideFile, path);
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /METHOD-EXPLAINER-MATERIAL-ESCAPES-ROOT/u,
    );
  });

  it.each([
    ['authority', (bundle: Bundle): string => bundle.method_content.authority_refs[0]!.ref],
    ['script', (bundle: Bundle): string => bundle.build_manifest.script.ref],
    ['audio', (bundle: Bundle): string => bundle.build_manifest.audio.ref],
    ['asset', (bundle: Bundle): string => bundle.build_manifest.assets[0]!.ref],
    ['component', (bundle: Bundle): string => bundle.build_manifest.components[0]!.ref],
    ['render A', (bundle: Bundle): string => bundle.build_manifest.required_outputs.render_a.ref],
    ['render B', (bundle: Bundle): string => bundle.build_manifest.required_outputs.render_b.ref],
    [
      'primary MP4',
      (bundle: Bundle): string => bundle.build_manifest.required_outputs.primary_mp4.ref,
    ],
    ['unattended run', (bundle: Bundle): string => bundle.unattended_run_material.ref],
    ['checkpoint', (bundle: Bundle): string => bundle.unattended_run.stages[12]!.checkpoint!.ref],
  ] as const)(
    'rejects %s drift in material bytes',
    async (_, selectRef: (bundle: Bundle) => string) => {
      const {bundle, root} = materializeBundle();
      const path = resolve(root, selectRef(bundle));
      const mutated = readFileSync(path);
      mutated[0] = mutated[0] === 0x78 ? 0x79 : 0x78;
      writeFileSync(path, mutated);
      await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
        /METHOD-EXPLAINER-MATERIAL-HASH-MISMATCH/u,
      );
    },
  );

  it('rejects a declared size that differs from the material bytes', async () => {
    const {bundle, root} = materializeBundle();
    writeFileSync(resolve(root, bundle.build_manifest.audio.ref), 'material:audio/narration.wav!');
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /METHOD-EXPLAINER-MATERIAL-SIZE-MISMATCH/u,
    );
  });

  it('rejects an individual material above the configured limit', () => {
    const bundle = makeBundle();
    bundle.build_manifest.required_outputs.render_a.size_bytes = MAX_MATERIAL_BYTES + 1;
    expect(() => assertMethodExplainerContractBundle(bundle)).toThrow();
  });

  it('rejects aggregate material above the configured limit before hashing sparse files', async () => {
    const {bundle, root} = materializeBundle();
    const oversized = [
      bundle.build_manifest.required_outputs.source_pack,
      bundle.build_manifest.required_outputs.socratic_debate,
      bundle.build_manifest.required_outputs.caption_track,
      bundle.build_manifest.required_outputs.storyboard,
      bundle.build_manifest.required_outputs.asset_manifest,
    ];
    for (const binding of oversized) {
      binding.size_bytes = MAX_MATERIAL_BYTES;
      truncateSync(resolve(root, binding.ref), MAX_MATERIAL_BYTES);
    }
    bundle.hashes.build_manifest = canonicalSha256(bundle.build_manifest);
    bundle.unattended_run.build_manifest_sha256 = bundle.hashes.build_manifest;
    refreshRunMaterial(bundle);
    writeFileSync(
      resolve(root, bundle.unattended_run_material.ref),
      JSON.stringify(bundle.unattended_run),
    );
    await expect(assertMethodExplainerMaterialBundle(bundle, root)).rejects.toThrow(
      /METHOD-EXPLAINER-MATERIAL-TOTAL-SIZE/u,
    );
  });

  it('keeps CLI material failures coded and free of the private absolute base path', () => {
    const {bundle, root} = materializeBundle();
    rmSync(resolve(root, bundle.build_manifest.required_outputs.primary_mp4.ref));
    const bundlePath = resolve(root, 'bundle.json');
    writeFileSync(bundlePath, JSON.stringify(bundle));
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        bundlePath,
      ],
      {cwd: process.cwd(), encoding: 'utf8'},
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('METHOD-EXPLAINER-MATERIAL-FS-ERROR');
    expect(result.stderr).not.toContain(root);
    expect(result.stderr).not.toContain(bundlePath);
  });

  it('validates a complete material bundle through the CLI file boundary', () => {
    const {bundle, root} = materializeBundle();
    const bundlePath = resolve(root, 'bundle.json');
    writeFileSync(bundlePath, JSON.stringify(bundle));
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        bundlePath,
      ],
      {cwd: process.cwd(), encoding: 'utf8'},
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      schema_version: 'method-explainer-contract-bundle-v1',
      run_representation: 'embedded-post-build',
    });
  });

  it('rejects stdin above 8 MiB with a sanitized stable code', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        '-',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        input: 'x'.repeat(8 * 1024 * 1024 + 1),
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('METHOD-EXPLAINER-BUNDLE_TOO_LARGE');
    expect(result.stderr).not.toContain('xxxxxxxxxxxxxxxx');
  });

  it('rejects invalid JSON with a sanitized stable code', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        '-',
      ],
      {cwd: process.cwd(), encoding: 'utf8', input: '{invalid-json'},
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('METHOD-EXPLAINER-BUNDLE_PARSE');
    expect(result.stderr).not.toContain('{invalid-json');
  });

  it('rejects an unreadable bundle locator without echoing it', () => {
    const missing = resolve(tmpdir(), 'method-explainer-bundle-does-not-exist.json');
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/video-os/_runner/video-os.ts',
        'check-method-explainer',
        missing,
      ],
      {cwd: process.cwd(), encoding: 'utf8'},
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('METHOD-EXPLAINER-BUNDLE_READ');
    expect(result.stderr).not.toContain(missing);
  });
});
