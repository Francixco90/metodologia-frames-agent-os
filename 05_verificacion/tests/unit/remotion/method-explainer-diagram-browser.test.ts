import {describe, expect, it, vi} from 'vitest';
import {
  assertBrowserSnapshot,
  assertPinnedManifest,
  PINNED_PLAYWRIGHT,
  verifyPinnedExecutable,
} from '../../../scripts/method-explainer-diagram-browser-policy.ts';
import {runDiagramBrowserProbe} from '../../../scripts/method-explainer-diagram-browser-probe.ts';

const profile = process.env.METODOLOGIA_TOOLCHAIN_PROFILE ?? 'local-full';
if (!['ci-code-only', 'local-full'].includes(profile)) throw new Error('BROWSER_PROFILE_INVALID');
const pinnedManifest = {
  browsers: [
    {
      browserVersion: PINNED_PLAYWRIGHT.browserVersion,
      name: 'chromium',
      revision: PINNED_PLAYWRIGHT.revision,
    },
  ],
};
const stat = (kind: 'file' | 'symlink') => ({
  isDirectory: () => false,
  isFile: () => kind === 'file',
  isSymbolicLink: () => kind === 'symlink',
  mode: 0o700,
});
const dependencies = (kind: 'file' | 'symlink', version: string) => ({
  access: vi.fn(() => Promise.resolve()),
  hash: vi.fn(() => Promise.resolve('a'.repeat(64))),
  lstat: vi.fn(() => Promise.resolve(stat(kind))),
  realpath: vi.fn((path: string) => Promise.resolve(path)),
  version: vi.fn(() => version),
});

describe('method explainer pinned browser policy', () => {
  it('binds Playwright manifest, canonical bytes, and the observed executable label', async () => {
    expect(() =>
      assertPinnedManifest(PINNED_PLAYWRIGHT.packageVersion, pinnedManifest),
    ).not.toThrow();
    const path = '/external-cache/chrome';
    await expect(
      verifyPinnedExecutable(
        path,
        dependencies(
          'file',
          `${PINNED_PLAYWRIGHT.executableLabel} ${PINNED_PLAYWRIGHT.browserVersion}`,
        ),
      ),
    ).resolves.toEqual({
      path,
      sha256: 'a'.repeat(64),
      version: 'Google Chrome for Testing 149.0.7827.55',
    });
  });

  it('rejects manifest, symlink, and exact-version drift', async () => {
    expect(() => assertPinnedManifest('1.61.0', pinnedManifest)).toThrow(
      'BROWSER_PLAYWRIGHT_MANIFEST_DRIFT',
    );
    await expect(
      verifyPinnedExecutable('/external-cache/link', dependencies('symlink', 'IGNORED')),
    ).rejects.toThrow('BROWSER_EXECUTABLE_SYMLINK');
    await expect(
      verifyPinnedExecutable(
        '/external-cache/chrome',
        dependencies('file', 'Chromium 149.0.7827.55'),
      ),
    ).rejects.toThrow('BROWSER_EXECUTABLE_VERSION_DRIFT');
    const invalidHash = dependencies('file', 'Google Chrome for Testing 149.0.7827.55');
    invalidHash.hash.mockResolvedValue('not-a-sha');
    await expect(verifyPinnedExecutable('/external-cache/chrome', invalidHash)).rejects.toThrow(
      'BROWSER_EXECUTABLE_HASH_INVALID',
    );
  });
});

if (profile === 'ci-code-only') {
  describe('method explainer diagram code-only profile', () => {
    it('reports the explicit local browser coverage gap without installing or rendering', () => {
      expect(profile).toBe('ci-code-only');
      expect('BROWSER_PROOF_REQUIRES_LOCAL_FULL').toContain('REQUIRES_LOCAL_FULL');
    });
  });
} else {
  describe('method explainer diagram browser proof', () => {
    let proof: ReturnType<typeof runDiagramBrowserProbe> | undefined;
    const run = () => (proof ??= runDiagramBrowserProbe());
    it('mounts canonical PIVOTE at deterministic mandatory poses', async () => {
      const report = await run();
      expect(report.status).toBe('PASS');
      expect(report.publicationAllowed).toBe(false);
      expect(report.playwrightVersion).toBe('1.61.1');
      expect(report.playwrightRevision).toBe('1228');
      expect(report.browserVersion).toBe('Google Chrome for Testing 149.0.7827.55');
      expect(report.browserExecutableSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(report.requestPolicy).toBe('CDP_HTTP_HTTPS_ATTACHED_PAGE_TARGETS_DENY');
      expect(report.remoteHttpRequestsObserved).toEqual([]);
      expect(report.coverageGap).toBe('BROWSER_BACKGROUND_AND_PRE_ATTACHMENT_TRAFFIC_NOT_OBSERVED');
      expect(report.frames.map(({frame, snapshot}) => [frame, snapshot.pose])).toEqual([
        [59, 'pre-container'],
        [60, 'container'],
        [300, 'components-settled'],
        [306, 'components-settled'],
        [412, 'connectors-complete'],
        [2100, 'closing'],
      ]);
      expect(report.frames[1]!.snapshot.edges).toEqual([]);
      expect(report.frames[3]!.snapshot.edges).toEqual(['EDGE-PI']);
      expect(report.frames[4]!.snapshot.edges).toHaveLength(6);
      expect(report.frames.every(({snapshot}) => snapshot.guardCount === 1)).toBe(true);
      expect(new Set(report.frames.map(({domSha256}) => domSha256)).size).toBe(6);
      expect(new Set(report.frames.map(({imageSha256}) => imageSha256)).size).toBe(4);
      expect(report.frames[0]!.imageSha256).toBe(report.frames[1]!.imageSha256);
      expect(report.frames[4]!.imageSha256).toBe(report.frames[5]!.imageSha256);
    }, 120_000);

    it('fails closed on measured guard, safe-zone, overflow, and edge attacks', async () => {
      const report = await run();
      const base = report.frames[3]!.snapshot;
      const attack = (change: (value: typeof base) => void) => {
        const value = structuredClone(base);
        change(value);
        return () => assertBrowserSnapshot(value);
      };
      expect(attack((value) => (value.guardCount = 0))).toThrow('BROWSER_LAYOUT_GUARD_ABSENT');
      expect(attack((value) => (value.rootRect[2] = 0))).toThrow('BROWSER_ROOT_GEOMETRY_MISMATCH');
      expect(attack((value) => (value.nodes[0]!.rect[0] = -0.5))).toThrow(
        'BROWSER_SAFE_ZONE_VIOLATION',
      );
      expect(
        attack((value) => (value.nodes[0]!.scroll[0] = value.nodes[0]!.client[0]! + 1)),
      ).toThrow('BROWSER_NODE_OVERFLOW');
      expect(attack((value) => value.edges.pop())).toThrow('BROWSER_EDGE_MISSING');
    }, 120_000);
  });
}
