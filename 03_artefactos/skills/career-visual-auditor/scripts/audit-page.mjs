#!/usr/bin/env node
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {auditStaticDom, contrastFailures, loadAuditAuthority} from './audit-authority.mjs';

const [input, manifestInput, decisionInput, auditInput] = process.argv.slice(2);
if (!input || !manifestInput || !decisionInput || !auditInput) throw new Error('CAREER-VISUAL-AUDIT-INPUTS-REQUIRED');
const authority = loadAuditAuthority(manifestInput, decisionInput, auditInput);
const chrome = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((path) => path && existsSync(path));
const browser = await chromium.launch({headless: true, ...(chrome ? {executablePath: chrome} : {})});
const failures = [];
const remote = async (context, external) => {
  await context.route('**/*', (route) => (route.request().url().startsWith('file:') ? route.continue() : route.abort()));
  context.on('request', (request) => {
    if (!request.url().startsWith('file:')) external.push(request.url());
  });
};
const binding = async (page) => {
  const observed = await page.evaluate(() => ({
    ...Object.fromEntries(['spec-sha256', 'design-system-sha256', 'decision-sha256', 'composition-id'].map((key) => [key, document.querySelector(`meta[name="career-${key}"]`)?.content])),
    careerStyles: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => new URL(link.href).pathname).filter((path) => path.includes('/career-design-system/')),
  }));
  if (observed['spec-sha256'] !== authority.audit.spec_sha256 || observed['design-system-sha256'] !== authority.audit.design_system_sha256 || observed['decision-sha256'] !== authority.audit.decision_sha256 || observed['composition-id'] !== authority.audit.composition_id) failures.push('render-authority-binding');
  const expectedStyles = authority.manifest.assets.filter((asset) => asset.ref.endsWith('.css')).map((asset) => asset.ref);
  if (!expectedStyles.every((ref) => observed.careerStyles.some((path) => path.endsWith(ref)))) failures.push('render-token-consumption');
};
try {
  let essential = [];
  for (const jsEnabled of [true, false]) {
    const context = await browser.newContext({javaScriptEnabled: jsEnabled});
    const external = [];
    await remote(context, external);
    const page = await context.newPage();
    for (const [width, height] of [[320, 844], [375, 812], [390, 844], [768, 1024], [1024, 768], [1440, 900], [568, 320]]) {
      for (const scale of [1, 2]) {
        await page.setViewportSize({width, height});
        await page.goto(pathToFileURL(resolve(input)).href);
        await binding(page);
        await page.evaluate((value) => {
          document.documentElement.style.fontSize = `${value * 100}%`;
        }, scale);
        for (const theme of ['navy', 'light']) {
          await page.evaluate((value) => {
            document.documentElement.dataset.theme = value;
          }, theme);
          const layout = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            targets: [...document.querySelectorAll('a,button,summary,input,select,textarea,[role="button"]')].filter((element) => {
              const box = element.getBoundingClientRect();
              return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44);
            }).length,
            rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
          }));
          const dom = await auditStaticDom(page);
          if (layout.overflow) failures.push(`${jsEnabled}:${width}:${scale}:${theme}:overflow`);
          if (layout.targets) failures.push(`${jsEnabled}:${width}:${scale}:${theme}:targets`);
          if ((scale === 2 && layout.rootFont < 28) || (scale === 1 && layout.rootFont > 20)) failures.push(`${width}:${scale}:text-resize`);
          if (contrastFailures(dom.textPairs).length) failures.push(`${width}:${theme}:contrast`);
          if (!dom.landmarks || dom.h1 !== 1 || dom.ariaBroken || dom.accessCount > 4 || dom.duplicateRails || !dom.cardContract || !dom.capabilityOrder || dom.rawColor) failures.push(`${width}:${theme}:semantic-economy`);
          if (jsEnabled && !essential.length) essential = dom.essential;
        }
      }
    }
    const dialogCount = await page.locator('[data-dialog-open]').count();
    const dialogDefinitions = await page.locator('dialog').count();
    const iconCount = await page.locator('svg').count();
    if (!dialogCount || dialogDefinitions !== dialogCount || !iconCount) failures.push('required-interaction-sample');
    if (jsEnabled && dialogDefinitions === dialogCount) {
      for (let index = 0; index < dialogCount; index += 1) {
        const trigger = page.locator('[data-dialog-open]').nth(index);
        await trigger.focus();
        await trigger.click();
        const dialog = page.locator('dialog[open]');
        const close = dialog.locator('[data-dialog-close]');
        const box = await close.boundingBox();
        const contract = await dialog.evaluate((element) => ({
          closes: element.querySelectorAll('[data-dialog-close]').length,
          backdrop: getComputedStyle(element, '::backdrop').backgroundColor,
          maxBlock: getComputedStyle(element).maxBlockSize,
          named: Boolean(element.getAttribute('aria-labelledby') || element.getAttribute('aria-label')),
        }));
        if (!box || box.width < 44 || box.height < 44 || contract.closes !== 1 || !contract.named || contract.backdrop === 'rgba(0, 0, 0, 0)' || contract.maxBlock === 'none') failures.push('dialog-contract');
        for (const key of ['Tab', 'Shift+Tab', 'Tab']) {
          await page.keyboard.press(key);
          if (!(await dialog.evaluate((element) => element.contains(document.activeElement)))) failures.push('dialog-trap');
        }
        await page.keyboard.press('Escape');
        if (await dialog.isVisible() || !(await trigger.evaluate((element) => element === document.activeElement))) failures.push('dialog-return');
      }
      const icons = await page.locator('svg').evaluateAll((elements) => elements.map((element) => ({
        remote: Boolean(element.querySelector('[href^="http"],image')),
        control: !element.closest('a,button,summary') || Boolean(element.closest('a,button,summary')?.getAttribute('aria-label') || element.closest('a,button,summary')?.textContent?.trim()),
        semantic: element.getAttribute('aria-hidden') === 'true' || (element.getAttribute('role') === 'img' && Boolean(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.querySelector('title'))),
      })));
      if (icons.some((icon) => icon.remote || !icon.control || !icon.semantic)) failures.push('icon-contract');
    } else {
      const fallbackEntries = await page.locator('[data-fallback-for]').evaluateAll((elements) => elements.filter((element) => getComputedStyle(element).display !== 'none').map((element) => [element.dataset.fallbackFor, element.textContent.replace(/\s+/gu, ' ').trim()]));
      const fallback = new Map(fallbackEntries);
      if (!essential.length || essential.some(([id, text]) => fallback.get(id) !== text)) failures.push('js-off-content-parity');
    }
    if (external.length) failures.push('external-network');
    await context.close();
  }
  const external = [];
  const context = await browser.newContext({reducedMotion: 'reduce', forcedColors: 'active'});
  await remote(context, external);
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve(input)).href);
  await page.locator('[data-dialog-open]').first().focus();
  const media = await page.evaluate(() => ({
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    forced: matchMedia('(forced-colors: active)').matches,
    motion: [...document.querySelectorAll('*')].some((element) => parseFloat(getComputedStyle(element).transitionDuration) > 0.1 || parseFloat(getComputedStyle(element).animationDuration) > 0.1),
    focus: parseFloat(getComputedStyle(document.activeElement).outlineWidth),
  }));
  if (!media.reduced || !media.forced || media.motion || media.focus < 3) failures.push('media-preferences');
  await page.emulateMedia({media: 'print'});
  const print = await page.evaluate(() => ({
    controls: [...document.querySelectorAll('a,button,summary,input,select,textarea,[role="button"]')].some((element) => element.getClientRects().length > 0),
    background: getComputedStyle(document.body).backgroundColor,
    scheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  const channels = (print.background.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
  if (print.controls || channels.some((value) => value < 230) || !print.scheme.includes('light')) failures.push('print-light');
  if (external.length) failures.push('print-external-network');
  await context.close();
} finally {
  await browser.close();
}
if (failures.length) throw new Error(`CAREER-VISUAL-AUDIT ${[...new Set(failures)].join(',')}`);
console.info('PASS career visual audit: material authority, offline matrix, semantic economy, accessible themes, JS-off parity and print.');
