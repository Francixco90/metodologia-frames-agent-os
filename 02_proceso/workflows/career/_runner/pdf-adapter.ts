import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import {chromium} from 'playwright';

const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex');
const normalizedText = (value: string): string =>
  value
    .normalize('NFC')
    .replaceAll('\r\n', '\n')
    .replace(/[ \t]+/gu, ' ')
    .trim();

export type CareerPdfManifestV1 = {
  schema_version: 'career-pdf-manifest-v1';
  status: 'PASS' | 'UNKNOWN' | 'BLOCKED';
  html_sha256: string;
  pdf_sha256: string | null;
  extracted_text_sha256: string | null;
  pdf_ref: string | null;
  toolchain: {
    playwright: string;
    chromium: 'available' | 'unavailable';
    pdftotext: 'available' | 'unavailable';
    browser_source: 'playwright_bundle' | 'system_chrome' | 'unavailable';
    browser_version: string | null;
  };
  gaps: string[];
};

const assertPrivateOutput = (root: string, output: string): void => {
  const privateRoot = resolve(root, 'work/private');
  const target = resolve(output);
  const offset = relative(privateRoot, target);
  if (offset.startsWith('..') || offset === '' || resolve(dirname(target)) === resolve(root)) {
    throw new Error('CAREER-PDF-PRIVATE-001 output must be inside work/private');
  }
};

const persistManifest = (path: string | undefined, manifest: CareerPdfManifestV1): void => {
  if (!path) return;
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
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
  const base: CareerPdfManifestV1 = {
    schema_version: 'career-pdf-manifest-v1',
    status: 'UNKNOWN',
    html_sha256: sha256(html),
    pdf_sha256: null,
    extracted_text_sha256: null,
    pdf_ref: null,
    toolchain: {
      playwright: '1.61.1',
      chromium: 'unavailable',
      pdftotext: 'unavailable',
      browser_source: 'unavailable',
      browser_version: null,
    },
    gaps: [],
  };
  let browser;
  let browserSource: 'playwright_bundle' | 'system_chrome' = 'playwright_bundle';
  try {
    browser = await chromium.launch({headless: true});
  } catch {
    try {
      browser = await chromium.launch({headless: true, channel: 'chrome'});
      browserSource = 'system_chrome';
    } catch {
      const manifest = {...base, gaps: ['chromium_unavailable']};
      persistManifest(input.manifestPath, manifest);
      return manifest;
    }
  }
  try {
    const page = await browser.newPage();
    await page.setContent(html, {waitUntil: 'domcontentloaded'});
    const bytes = await page.pdf({format: 'A4', printBackground: true, preferCSSPageSize: true});
    mkdirSync(dirname(input.pdfPath), {recursive: true});
    writeFileSync(input.pdfPath, bytes);
    const extracted = spawnSync('pdftotext', [input.pdfPath, '-'], {encoding: 'utf8'});
    const hasText = extracted.status === 0 && normalizedText(extracted.stdout).length > 0;
    const manifest: CareerPdfManifestV1 = {
      ...base,
      status: hasText && browserSource === 'playwright_bundle' ? 'PASS' : 'UNKNOWN',
      pdf_sha256: sha256(bytes),
      extracted_text_sha256: hasText ? sha256(normalizedText(extracted.stdout)) : null,
      pdf_ref: relative(resolve(input.root), resolve(input.pdfPath)).replaceAll('\\', '/'),
      toolchain: {
        playwright: '1.61.1',
        chromium: 'available',
        pdftotext: hasText ? 'available' : 'unavailable',
        browser_source: browserSource,
        browser_version: browser.version(),
      },
      gaps: [
        ...(hasText ? [] : ['pdftotext_unavailable_or_empty']),
        ...(browserSource === 'system_chrome' ? ['system_chrome_unpinned'] : []),
      ],
    };
    persistManifest(input.manifestPath, manifest);
    return manifest;
  } finally {
    await browser.close();
  }
};
