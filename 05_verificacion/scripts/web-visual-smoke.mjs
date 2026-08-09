import {existsSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const root = process.cwd();
const artifact = resolve(root, 'projects/vs-001-source-to-campaign/web/artifact/index.html');
const reportPath = resolve(
  root,
  'projects/vs-001-source-to-campaign/web/artifact/visual-smoke.json',
);
const browserOptions = process.env.CHROME_PATH
  ? {headless: true, executablePath: process.env.CHROME_PATH}
  : {headless: true, channel: 'chrome'};
const profiles = [
  {id: 'desktop', width: 1440, height: 1000},
  {id: 'mobile', width: 390, height: 844},
];

if (!existsSync(resolve(root, 'package.json'))) {
  throw new Error('WEB-SMOKE-ROOT001: ejecuta este comando desde la raíz del repositorio.');
}
if (!existsSync(artifact)) {
  throw new Error(
    'WEB-SMOKE-ARTIFACT001: no existe el artefacto Web. Ejecuta primero `pnpm web:build`.',
  );
}

const browser = await chromium.launch(browserOptions);
const results = [];

for (const profile of profiles) {
  const page = await browser.newPage({
    viewport: {width: profile.width, height: profile.height},
    deviceScaleFactor: 1,
  });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(pathToFileURL(artifact).href, {waitUntil: 'load'});
  const audit = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    h1Count: document.querySelectorAll('h1').length,
    h2Count: document.querySelectorAll('h2').length,
    mainCount: document.querySelectorAll('main').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    sourceReferences: document.querySelectorAll('.claim__source').length,
    bodyTextLength: document.body.innerText.length,
  }));
  const screenshotPath = resolve(
    root,
    `projects/vs-001-source-to-campaign/web/artifact/review-${profile.id}.png`,
  );
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    timeout: 120_000,
  });
  results.push({...profile, ...audit, consoleErrors, screenshotPath: `review-${profile.id}.png`});
  await page.close();
}

await browser.close();
const pass = results.every(
  (result) =>
    result.lang === 'es' &&
    result.h1Count === 1 &&
    result.h2Count >= 3 &&
    result.mainCount === 1 &&
    !result.horizontalOverflow &&
    result.sourceReferences >= 3 &&
    result.consoleErrors.length === 0,
);
writeFileSync(reportPath, `${JSON.stringify({schema_version: 1, pass, results}, null, 2)}\n`);
console.info(JSON.stringify({pass, reportPath, results}, null, 2));
if (!pass) process.exitCode = 1;
