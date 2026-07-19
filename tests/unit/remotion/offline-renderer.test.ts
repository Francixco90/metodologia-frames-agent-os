import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import YAML from 'yaml';

const root = process.cwd();
const rendererRoot = resolve(root, 'renderers/remotion');
const projectCompositionRoot = resolve(root, 'projects/vs-001-source-to-campaign/remotion/src');

const walk = (path: string): string[] =>
  readdirSync(path).flatMap((name) => {
    const child = join(path, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });

const rendererCode = [...walk(rendererRoot), ...walk(projectCompositionRoot)]
  .filter((path) => /\.[cm]?[jt]sx?$/u.test(path))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

describe('offline deterministic renderer', () => {
  it('contains no clock, random, network, timer or autonomous CSS APIs', () => {
    for (const pattern of [
      /\bMath\.random\s*\(/u,
      /\brandom\s*\(\s*null\s*\)/u,
      /\bDate\.now\s*\(/u,
      /\bnew\s+Date\s*\(/u,
      /\bperformance\.now\s*\(/u,
      /\bsetTimeout\s*\(/u,
      /\bsetInterval\s*\(/u,
      /\brequestAnimationFrame\s*\(/u,
      /\bfetch\s*\(/u,
      /\banimation\s*:/u,
      /\btransition\s*:/u,
      /\bgsap\.ticker\b/u,
      /\.transition\s*\(/u,
      /\buseFrame\s*\(/u,
    ]) {
      expect(rendererCode).not.toMatch(pattern);
    }
  });

  it('uses frame APIs and calculated metadata', () => {
    expect(rendererCode).toContain('useCurrentFrame');
    expect(rendererCode).toContain('interpolate');
    expect(rendererCode).toContain('calculateMethodologiaVerticalMetadata');
    expect(rendererCode).toContain('methodologiaVerticalPropsSchema');
  });

  it('declares exactly four hash-bound OFL fonts, no audio and no remote assets', () => {
    const manifest = YAML.parse(
      readFileSync(
        resolve(root, 'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml'),
        'utf8',
      ),
    ) as {
      binary_assets: Array<{
        path: string;
        sha256: string;
        license: string;
        license_path: string;
        license_sha256: string;
        verdict: string;
        original_filename: string;
        canonical_source_url: string;
        acquisition_origin: {
          source_package: string;
          package_asset_path: string;
          upstream_release_or_commit: string;
          evaluated_at: string;
        };
      }>;
      audio_assets: unknown[];
      policy: {
        network_allowed: boolean;
        remote_assets_allowed: boolean;
        remote_fonts_allowed: boolean;
      };
      procedural_first_party_elements: Array<{sha256: string; rights_holder: string}>;
    };

    expect(manifest.binary_assets).toHaveLength(4);
    expect(manifest.binary_assets.map(({path}) => path).sort()).toEqual(
      [
        'renderers/remotion/src/assets/fonts/JetBrainsMono-Bold.ttf',
        'renderers/remotion/src/assets/fonts/JetBrainsMono-Regular.ttf',
        'renderers/remotion/src/assets/fonts/WorkSans-Bold.ttf',
        'renderers/remotion/src/assets/fonts/WorkSans-Regular.ttf',
      ].sort(),
    );
    for (const font of manifest.binary_assets) {
      expect(font.sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(font.license).toBe('SIL Open Font License 1.1');
      expect(font.license_path).toMatch(/-OFL\.txt$/u);
      expect(font.license_sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(font.verdict).toBe('allowed_local_test_with_origin_gap');
      expect(font.original_filename).toMatch(/\.ttf$/u);
      expect(font.canonical_source_url).toMatch(/^https:\/\/github\.com\//u);
      expect(font.acquisition_origin).toMatchObject({
        source_package: 'claude-cowork/anthropic-skills@1.0.0',
        upstream_release_or_commit: 'unresolved',
        evaluated_at: '2026-07-19T12:00:00.000Z',
      });
      expect(font.acquisition_origin.package_asset_path).toContain(font.original_filename);
    }
    expect(manifest.audio_assets).toEqual([]);
    expect(manifest.policy).toMatchObject({
      network_allowed: false,
      remote_assets_allowed: false,
      remote_fonts_allowed: false,
    });
    expect(manifest.procedural_first_party_elements.length).toBeGreaterThan(0);
    for (const element of manifest.procedural_first_party_elements) {
      expect(element.sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(element.rights_holder).toBe('MetodologIA');
    }
    expect(rendererCode).toContain('Load and verify four hash-bound OFL fonts');
    expect(rendererCode).toContain("status !== 'loaded'");
    expect(rendererCode).toContain('timeoutInMilliseconds: 30_000');
    expect(rendererCode).not.toContain('document.fonts.ready');
    expect(rendererCode).not.toMatch(/Arial|Helvetica|Courier New/u);
  });
});
