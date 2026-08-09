import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';

import {chromium, type Browser} from 'playwright';

import {extractPdfTextEvidence, type PdfTextEvidence} from './pdf-evidence.ts';

const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex');

type BrowserSource = 'playwright_bundle' | 'system_chrome' | 'unavailable';
type Replay = {
  first_pdf_sha256: string;
  second_pdf_sha256: string;
  semantic_match: boolean;
  text_match: boolean;
  page_count_match: boolean;
};
export type CareerPdfManifestV1 = {
  schema_version: 'career-pdf-manifest-v1';
  status: 'PASS' | 'UNKNOWN' | 'BLOCKED';
  html_sha256: string;
  pdf_sha256: string | null;
  extracted_text_sha256: string | null;
  semantic_sha256: string | null;
  page_count: number | null;
  pdf_ref: string | null;
  replay: Replay | null;
  blocked_requests: string[];
  toolchain: {
    playwright: string;
    chromium: 'available' | 'unavailable';
    pdftotext: 'available' | 'unavailable';
    browser_source: BrowserSource;
    browser_version: string | null;
  };
  gaps: string[];
};

const assertPrivateOutput = (root: string, output: string): void => {
  const offset = relative(resolve(root, 'work/private'), resolve(output));
  if (!offset || offset.startsWith('..')) throw new Error('CAREER-PDF-PRIVATE-001');
};

const persist = (path: string | undefined, manifest: CareerPdfManifestV1): void => {
  if (!path) return;
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
};

const launch = async (): Promise<{browser: Browser | null; source: BrowserSource}> => {
  try {
    return {browser: await chromium.launch({headless: true}), source: 'playwright_bundle'};
  } catch {
    try {
      return {
        browser: await chromium.launch({headless: true, channel: 'chrome'}),
        source: 'system_chrome',
      };
    } catch {
      return {browser: null, source: 'unavailable'};
    }
  }
};

const renderOnce = async (
  browser: Browser,
  html: string,
): Promise<{bytes: Buffer; blocked: string[]; evidence: PdfTextEvidence | null}> => {
  const blocked: string[] = [];
  const context = await browser.newContext({serviceWorkers: 'block'});
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (/^(about:|data:|blob:)/u.test(url)) await route.continue();
    else {
      blocked.push(url);
      await route.abort('blockedbyclient');
    }
  });
  try {
    const page = await context.newPage();
    await page.setContent(html, {waitUntil: 'domcontentloaded'});
    const bytes = await page.pdf({format: 'A4', printBackground: true, preferCSSPageSize: true});
    return {bytes, blocked: [...new Set(blocked)].sort(), evidence: extractPdfTextEvidence(bytes)};
  } finally {
    await context.close();
  }
};

export const renderCareerPdf = async (input: {
  root: string;
  htmlPath: string;
  pdfPath: string;
  manifestPath?: string;
}): Promise<CareerPdfManifestV1> => {
  assertPrivateOutput(input.root, input.pdfPath);
  if (input.manifestPath) assertPrivateOutput(input.root, input.manifestPath);
  const html = readFileSync(input.htmlPath, 'utf8');
  const launched = await launch();
  const chromiumStatus: 'available' | 'unavailable' = launched.browser
    ? 'available'
    : 'unavailable';
  const base = {
    schema_version: 'career-pdf-manifest-v1' as const,
    html_sha256: sha256(html),
    toolchain: {
      playwright: '1.61.1',
      chromium: chromiumStatus,
      pdftotext: 'unavailable' as 'available' | 'unavailable',
      browser_source: launched.source,
      browser_version: launched.browser?.version() ?? null,
    },
  };
  if (!launched.browser) {
    const result: CareerPdfManifestV1 = {
      ...base,
      status: 'UNKNOWN',
      pdf_sha256: null,
      extracted_text_sha256: null,
      semantic_sha256: null,
      page_count: null,
      pdf_ref: null,
      replay: null,
      blocked_requests: [],
      gaps: ['chromium_unavailable'],
    };
    persist(input.manifestPath, result);
    return result;
  }
  try {
    const first = await renderOnce(launched.browser, html);
    const second = await renderOnce(launched.browser, html);
    const blocked = [...new Set([...first.blocked, ...second.blocked])].sort();
    const replay: Replay = {
      first_pdf_sha256: sha256(first.bytes),
      second_pdf_sha256: sha256(second.bytes),
      semantic_match: first.evidence?.semantic_sha256 === second.evidence?.semantic_sha256,
      text_match: first.evidence?.text_sha256 === second.evidence?.text_sha256,
      page_count_match: first.evidence?.page_count === second.evidence?.page_count,
    };
    const hasEvidence = Boolean(first.evidence && second.evidence);
    const replayPass =
      hasEvidence && replay.semantic_match && replay.text_match && replay.page_count_match;
    const blockedResult = blocked.length > 0 || (hasEvidence && !replayPass);
    const status = blockedResult
      ? 'BLOCKED'
      : replayPass && launched.source === 'playwright_bundle'
        ? 'PASS'
        : 'UNKNOWN';
    if (!blockedResult) {
      mkdirSync(dirname(input.pdfPath), {recursive: true});
      writeFileSync(input.pdfPath, first.bytes);
    }
    const result: CareerPdfManifestV1 = {
      ...base,
      status,
      pdf_sha256: blockedResult ? null : sha256(first.bytes),
      extracted_text_sha256: first.evidence?.text_sha256 ?? null,
      semantic_sha256: first.evidence?.semantic_sha256 ?? null,
      page_count: first.evidence?.page_count ?? null,
      pdf_ref: blockedResult
        ? null
        : relative(resolve(input.root), resolve(input.pdfPath)).replaceAll('\\', '/'),
      replay,
      blocked_requests: blocked,
      toolchain: {...base.toolchain, pdftotext: hasEvidence ? 'available' : 'unavailable'},
      gaps: [
        ...(!hasEvidence ? ['pdftotext_unavailable_or_empty'] : []),
        ...(!replayPass && hasEvidence ? ['pdf_replay_mismatch'] : []),
        ...(blocked.length > 0 ? ['external_request_blocked'] : []),
        ...(launched.source === 'system_chrome' ? ['system_chrome_unpinned'] : []),
      ],
    };
    persist(input.manifestPath, result);
    return result;
  } finally {
    await launched.browser.close();
  }
};
