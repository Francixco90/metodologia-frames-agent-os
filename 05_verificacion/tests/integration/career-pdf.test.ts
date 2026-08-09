import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const runtime = vi.hoisted(() => ({
  launch: vi.fn(),
  route: vi.fn(),
  abort: vi.fn(),
  continue: vi.fn(),
  setContent: vi.fn(),
  pdf: vi.fn(),
  closeContext: vi.fn(),
  close: vi.fn(),
  version: vi.fn(),
  extract: vi.fn(),
  triggerNetwork: false,
}));

vi.mock('playwright', () => ({chromium: {launch: runtime.launch}}));
vi.mock('workflows/career/_runner/pdf-evidence.ts', () => ({
  extractPdfTextEvidence: runtime.extract,
}));

import {renderCareerPdf} from 'workflows/career/_runner/pdf-adapter.ts';

const temporaryDirs: string[] = [];
const makeInput = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-career-pdf-'));
  temporaryDirs.push(root);
  const htmlPath = resolve(root, 'candidate.html');
  mkdirSync(resolve(root, 'work/private'), {recursive: true});
  writeFileSync(
    htmlPath,
    '<!doctype html><html><body><main><h1>Candidate</h1><p>Evidence-led profile.</p></main></body></html>',
    'utf8',
  );
  return {
    root,
    htmlPath,
    pdfPath: resolve(root, 'work/private/candidate.pdf'),
    manifestPath: resolve(root, 'work/private/candidate.manifest.json'),
  };
};

const bundledBrowser = () => ({
  newContext: vi.fn(() =>
    Promise.resolve({
      route: runtime.route,
      newPage: vi.fn(() => Promise.resolve({setContent: runtime.setContent, pdf: runtime.pdf})),
      close: runtime.closeContext,
    }),
  ),
  close: runtime.close,
  version: runtime.version,
});

beforeEach(() => {
  vi.clearAllMocks();
  runtime.triggerNetwork = false;
  runtime.route.mockImplementation(async (_pattern, handler) => {
    if (runtime.triggerNetwork) {
      const routeHandler = handler as (route: {
        request: () => {url: () => string};
        abort: typeof runtime.abort;
        continue: typeof runtime.continue;
      }) => Promise<void>;
      await routeHandler({
        request: () => ({url: () => 'https://tracker.invalid/pixel'}),
        abort: runtime.abort,
        continue: runtime.continue,
      });
    }
  });
  runtime.pdf.mockResolvedValue(Buffer.from('%PDF-1.4\nSYNTHETIC ATS PDF\n', 'utf8'));
  runtime.version.mockReturnValue('pinned-test-browser');
  runtime.extract.mockReturnValue({
    text_sha256: 'a'.repeat(64),
    semantic_sha256: 'b'.repeat(64),
    page_count: 1,
  });
  runtime.launch.mockResolvedValue(bundledBrowser());
});

afterEach(() => {
  for (const directory of temporaryDirs.splice(0)) {
    rmSync(directory, {recursive: true, force: true});
  }
});

describe('Career ATS PDF boundary', () => {
  it('aborts every network request before loading the offline HTML', async () => {
    runtime.triggerNetwork = true;
    const result = await renderCareerPdf(makeInput());

    expect(runtime.route).toHaveBeenCalledWith('**/*', expect.any(Function));
    expect(runtime.abort).toHaveBeenCalledTimes(2);
    expect(runtime.setContent).toHaveBeenCalledWith(expect.stringContaining('<main>'), {
      waitUntil: 'domcontentloaded',
    });
    expect(result).toMatchObject({
      status: 'BLOCKED',
      pdf_sha256: null,
      blocked_requests: ['https://tracker.invalid/pixel'],
    });
    expect(result.gaps).toContain('external_request_blocked');
  });

  it('replays fixed HTML twice with byte-identical PDF and manifest digests', async () => {
    const input = makeInput();
    const first = await renderCareerPdf(input);
    const firstBytes = readFileSync(input.pdfPath);
    const second = await renderCareerPdf(input);

    expect(second).toEqual(first);
    expect(readFileSync(input.pdfPath)).toEqual(firstBytes);
    expect(second.pdf_sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(second.extracted_text_sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(second.replay).toMatchObject({
      semantic_match: true,
      text_match: true,
      page_count_match: true,
    });
  });

  it('keeps system Chrome explicitly UNKNOWN even when text extraction succeeds', async () => {
    runtime.launch.mockReset();
    runtime.launch.mockRejectedValueOnce(new Error('bundled browser missing'));
    runtime.launch.mockResolvedValueOnce(bundledBrowser());

    const result = await renderCareerPdf(makeInput());

    expect(runtime.launch).toHaveBeenNthCalledWith(2, {headless: true, channel: 'chrome'});
    expect(result.status).toBe('UNKNOWN');
    expect(result.gaps).toContain('system_chrome_unpinned');
  });
});
