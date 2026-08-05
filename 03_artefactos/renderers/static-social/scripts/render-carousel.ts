import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {chromium, type Browser, type Page} from 'playwright';
import {parse} from 'yaml';

import {
  hashCarouselSpec,
  orderedCarouselCards,
  validateCarouselSpec,
} from 'workflows/content/types/carousel/plugin.ts';
import {buildCarouselDocument, buildRenderedCarouselReviewDocument} from '../src/carousel-html.ts';

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

const portable = (value: string): string => value.replaceAll('\\', '/');

const mediaTypeFor = (path: string): string => {
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
};

const fontCssFor = (root: string, outputRoot: string): string => {
  const fonts = [
    {
      family: 'Poppins',
      weight: '400',
      path: 'brand/fonts/vendor/poppins/Poppins-Regular.ttf',
    },
    {
      family: 'Poppins',
      weight: '700',
      path: 'brand/fonts/vendor/poppins/Poppins-Bold.ttf',
    },
    {
      family: 'Poppins',
      weight: '800',
      path: 'brand/fonts/vendor/poppins/Poppins-ExtraBold.ttf',
    },
    {
      family: 'Montserrat',
      weight: '100 900',
      path: 'brand/fonts/vendor/montserrat/Montserrat-VariableFont_wght.ttf',
    },
  ] as const;

  return fonts
    .map((font) => {
      const absolutePath = resolve(root, font.path);
      if (!existsSync(absolutePath)) {
        throw new Error(`RIGHTS_GAP: offline brand font missing: ${font.path}`);
      }
      const relativePath = portable(relative(outputRoot, absolutePath));
      return `@font-face{font-family:"${font.family}";src:url("${relativePath}") format("truetype");font-style:normal;font-weight:${font.weight};font-display:block}`;
    })
    .join('\n');
};

const loadFile = async (page: Page, path: string, networkViolations: string[]): Promise<void> => {
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('file:') && !url.startsWith('data:')) networkViolations.push(url);
  });
  await page.goto(pathToFileURL(path).href, {waitUntil: 'load'});
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
};

type RenderOptions = {
  readonly root?: string;
  readonly specPath?: string;
  readonly outputRoot?: string;
  readonly browser?: Browser;
};

type RenderResult = {
  readonly outputRoot: string;
  readonly manifestPath: string;
  readonly receiptPath: string;
  readonly deterministic: boolean;
  readonly files: readonly {path: string; sha256: string; bytes: number; mediaType: string}[];
};

export const renderCarouselPackage = async ({
  root = process.cwd(),
  specPath = 'projects/pilot-carousel-001/spec/carousel-spec.yml',
  outputRoot = 'projects/pilot-carousel-001/artifacts',
  browser,
}: RenderOptions = {}): Promise<RenderResult> => {
  const absoluteSpecPath = resolve(root, specPath);
  const absoluteOutputRoot = resolve(root, outputRoot);
  mkdirSync(absoluteOutputRoot, {recursive: true});

  const spec = validateCarouselSpec(parse(readFileSync(absoluteSpecPath, 'utf8')));
  const tokensPath = resolve(root, 'brand/generated/social-light.css');
  if (!existsSync(tokensPath)) {
    throw new Error('BRAND_PROFILE_MISSING: brand/generated/social-light.css');
  }
  const tokensCss = readFileSync(tokensPath, 'utf8').replace(/@font-face\s*\{[\s\S]*?\}\s*/gu, '');
  const fontCss = fontCssFor(root, absoluteOutputRoot);
  const generatedFiles: string[] = [];

  const galleryPath = resolve(absoluteOutputRoot, 'index.html');
  generatedFiles.push(galleryPath);

  const contactHtmlPath = resolve(absoluteOutputRoot, 'contact-sheet.html');
  generatedFiles.push(contactHtmlPath);

  for (const card of orderedCarouselCards(spec)) {
    const slideHtmlPath = resolve(
      absoluteOutputRoot,
      `slide-${String(card.position).padStart(2, '0')}.html`,
    );
    writeFileSync(slideHtmlPath, buildCarouselDocument({spec, tokensCss, fontCss, card}), 'utf8');
    generatedFiles.push(slideHtmlPath);
  }

  const ownedBrowser =
    browser ??
    (await chromium.launch({
      headless: true,
      channel: 'chrome',
    }));
  const networkViolations: string[] = [];
  const browserVersion = ownedBrowser.version();

  try {
    for (const card of orderedCarouselCards(spec)) {
      const label = String(card.position).padStart(2, '0');
      const slideHtmlPath = resolve(absoluteOutputRoot, `slide-${label}.html`);
      const page = await ownedBrowser.newPage({
        viewport: {width: spec.dimensions.width, height: spec.dimensions.height},
        deviceScaleFactor: 1,
      });
      await loadFile(page, slideHtmlPath, networkViolations);
      const geometry = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight,
      }));
      if (
        geometry.width !== spec.dimensions.width ||
        geometry.height !== spec.dimensions.height ||
        geometry.viewportWidth !== spec.dimensions.width ||
        geometry.viewportHeight !== spec.dimensions.height
      ) {
        throw new Error(`CAR-OVERFLOW: slide ${label} geometry mismatch`);
      }

      const first = await page.screenshot({
        animations: 'disabled',
        caret: 'hide',
        fullPage: false,
        type: 'png',
      });
      const second = await page.screenshot({
        animations: 'disabled',
        caret: 'hide',
        fullPage: false,
        type: 'png',
      });
      if (sha256(first) !== sha256(second)) {
        throw new Error(`CAR-NONDETERMINISTIC: slide ${label}`);
      }
      const pngPath = resolve(absoluteOutputRoot, `slide-${label}.png`);
      writeFileSync(pngPath, first);
      generatedFiles.push(pngPath);
      await page.close();
    }

    writeFileSync(
      galleryPath,
      buildRenderedCarouselReviewDocument({spec, tokensCss, fontCss}),
      'utf8',
    );
    writeFileSync(
      contactHtmlPath,
      buildRenderedCarouselReviewDocument({
        spec,
        tokensCss,
        fontCss,
        contactSheet: true,
      }),
      'utf8',
    );

    const contactPage = await ownedBrowser.newPage({
      viewport: {width: 1160, height: 711},
      deviceScaleFactor: 1,
    });
    await loadFile(contactPage, contactHtmlPath, networkViolations);
    const contactSheet = await contactPage.screenshot({
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
      type: 'png',
    });
    const contactSheetPath = resolve(absoluteOutputRoot, 'contact-sheet.png');
    writeFileSync(contactSheetPath, contactSheet);
    generatedFiles.push(contactSheetPath);
    await contactPage.close();

    for (const profile of [
      {id: 'desktop', width: 1440, height: 900},
      {id: 'mobile', width: 390, height: 844},
    ] as const) {
      const page = await ownedBrowser.newPage({
        viewport: {width: profile.width, height: profile.height},
        deviceScaleFactor: 1,
      });
      await loadFile(page, galleryPath, networkViolations);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      if (overflow) throw new Error(`CAR-OVERFLOW: ${profile.id} gallery`);
      const screenshotPath = resolve(absoluteOutputRoot, `review-${profile.id}.png`);
      writeFileSync(
        screenshotPath,
        await page.screenshot({
          animations: 'disabled',
          caret: 'hide',
          fullPage: true,
          type: 'png',
        }),
      );
      generatedFiles.push(screenshotPath);
      await page.close();
    }
  } finally {
    if (browser === undefined) await ownedBrowser.close();
  }

  if (networkViolations.length > 0) {
    throw new Error(`CAR-NETWORK-FORBIDDEN: ${networkViolations.join(', ')}`);
  }

  const files = generatedFiles
    .map((path) => {
      const value = readFileSync(path);
      return {
        path: portable(relative(root, path)),
        sha256: sha256(value),
        bytes: value.byteLength,
        mediaType: mediaTypeFor(path),
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  const specSha256 = sha256(readFileSync(absoluteSpecPath));
  const aggregateSha256 = sha256(
    files.map(({path, sha256: digest}) => `${path}:${digest}`).join('\n'),
  );
  const manifest = {
    schemaVersion: 'carousel-asset-manifest-v1',
    carouselId: spec.carouselId,
    state: 'RENDERED_DRAFT',
    specRef: portable(relative(root, absoluteSpecPath)),
    specSha256,
    canonicalSpecSha256: hashCarouselSpec(spec),
    bindings: spec.bindingHashes,
    files,
    aggregateSha256,
    rights: {
      visualAssets: 'first_party_procedural_only',
      fonts: 'OFL-1.1',
      publicationAuthorized: false,
    },
    renderPolicy: {
      networkRequests: 0,
      randomness: false,
      wallClock: false,
      deterministicDoubleCapture: true,
    },
  };
  const manifestPath = resolve(absoluteOutputRoot, 'asset-manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const receipt = {
    schemaVersion: 'carousel-render-receipt-v1',
    receiptId: 'RCP-CAR-MAO-001-RENDER-001',
    carouselId: spec.carouselId,
    producerActorInstanceId: 'RT-07-CAR-MAO-001',
    verifierActorInstanceId: 'RT-09-CAR-MAO-001',
    generatedAt: spec.generatedAt,
    state: 'RENDERED_DRAFT',
    browser: {engine: 'Chromium', version: browserVersion},
    specSha256,
    manifestRef: portable(relative(root, manifestPath)),
    manifestSha256: sha256(readFileSync(manifestPath)),
    outputAggregateSha256: aggregateSha256,
    deterministic: true,
    networkRequests: 0,
    guardianPassed: false,
    humanApproved: false,
    ready: false,
    publicationAuthorized: false,
    nextGate: 'RIGHTS_A11Y_PASS',
  };
  const receiptPath = resolve(absoluteOutputRoot, 'render-receipt.json');
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  return {
    outputRoot: portable(relative(root, absoluteOutputRoot)),
    manifestPath: portable(relative(root, manifestPath)),
    receiptPath: portable(relative(root, receiptPath)),
    deterministic: true,
    files,
  };
};

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  const result = await renderCarouselPackage();
  console.info(
    `PASS CAROUSEL RENDER: ${result.files.length} artifacts, deterministic, offline, RENDERED_DRAFT.`,
  );
}
