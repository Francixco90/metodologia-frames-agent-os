#!/usr/bin/env node
// Run material Aula artifacts, all scenes and controls; captures are draft evidence.
import assert from 'node:assert/strict';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

export function measureAulaFrame110() {
  const errors = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  if (document.documentElement.scrollWidth > innerWidth + 1) errors.push('horizontal-overflow');
  for (const svg of document.querySelectorAll('svg.scene')) {
    if (!visible(svg)) continue;
    const box = svg.getBoundingClientRect();
    const texts = [...svg.querySelectorAll('text')].filter(visible);
    for (const text of texts) {
      const r = text.getBoundingClientRect(),
        m = text.getScreenCTM();
      const size = parseFloat(getComputedStyle(text).fontSize) * Math.hypot(m.c, m.d);
      if (innerWidth <= 600 && size < 13.9) errors.push('mobile-small-label:' + text.textContent);
      if (
        r.left < box.left - 2 ||
        r.right > box.right + 2 ||
        r.top < box.top - 2 ||
        r.bottom > box.bottom + 2
      )
        errors.push('scene-text-outside:' + text.textContent);
    }
    // ponytail: pairwise check is bounded to a scene's small label set; spatial index if that contract grows.
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i].getBoundingClientRect(),
          b = texts[j].getBoundingClientRect();
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2
        )
          errors.push('scene-label-overlap:' + texts[i].textContent + '/' + texts[j].textContent);
      }
  }
  for (const el of document.querySelectorAll('button,input,select,textarea,summary')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) errors.push('small-control:' + el.tagName);
  }
  const rgb = (color) =>
    color
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number);
  const luminance = (color) =>
    rgb(color)
      ?.map((n) => {
        const c = n / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      })
      .reduce((n, c, i) => n + c * [0.2126, 0.7152, 0.0722][i], 0);
  for (const el of document.querySelectorAll(
    'h1,h2,h3,p,li,dt,dd,figcaption,summary,button,label,svg text',
  )) {
    if (!visible(el) || el.disabled || !el.textContent.trim()) continue;
    let parent = el,
      background;
    while (parent) {
      const color = getComputedStyle(parent).backgroundColor;
      if (!color.endsWith(', 0)') && color !== 'transparent') {
        background = color;
        break;
      }
      parent = parent.parentElement;
    }
    const style = getComputedStyle(el),
      foreground = el.matches('svg text') ? style.fill : style.color;
    const a = luminance(foreground),
      b = luminance(background || 'rgb(255,255,255)');
    if (a === undefined || b === undefined) {
      errors.push('contrast-sensor-gap');
      continue;
    }
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      large = parseFloat(style.fontSize) >= 24;
    if (ratio < (large ? 3 : 4.5))
      errors.push('text-contrast:' + ratio.toFixed(2) + ':' + el.textContent.slice(0, 60));
  }
  for (const icon of document.querySelectorAll('.asset-icon')) {
    if (!visible(icon)) continue;
    const style = getComputedStyle(icon),
      a = luminance(style.color),
      b = luminance(style.backgroundColor);
    if (a === undefined || b === undefined) errors.push('icon-contrast-sensor-gap');
    else if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3) errors.push('icon-contrast');
  }
  const fonts = [...document.fonts].map((f) => ({family: f.family, status: f.status}));
  return {
    errors,
    fonts,
    visibleScenes: [...document.querySelectorAll('svg.scene')].filter(visible).length,
  };
}

export async function inspectAula110(files, output, capture = true) {
  mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}
      : {}),
  });
  const results = [];
  try {
    for (const file of files) {
      const source = JSON.parse(
        /id="payload">([\s\S]*?)<\/script>/u.exec(readFileSync(file, 'utf8'))[1],
      );
      for (const [width, height] of [
        [1920, 1080],
        [1366, 768],
        [768, 1024],
        [390, 844],
      ]) {
        const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce'});
        const errors = [],
          network = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.route(/^https?:\/\//u, (route) => {
          network.push(route.request().url());
          return route.abort();
        });
        await page.goto(pathToFileURL(resolve(file)).href);
        await page.evaluate(() => document.fonts.ready);
        for (const [index, section] of source.data.sections.entries()) {
          if (index) await page.locator('#next').click();
          const geometry = await page.evaluate(measureAulaFrame110);
          errors.push(...geometry.errors.map((e) => section.id + ':' + e));
          if (source.brand.name === 'MetodologIA') {
            assert(
              geometry.fonts.some((f) => f.family.includes('Poppins') && f.status === 'loaded'),
              'Poppins not loaded',
            );
            assert(
              geometry.fonts.some((f) => f.family.includes('Montserrat') && f.status === 'loaded'),
              'Montserrat not loaded',
            );
          }
          if (capture) {
            const name = resolve(
              output,
              `${file.split('/').slice(-3, -1).join('-')}-${file.split('/').at(-1).replace('.html', '')}-${width}-${String(index + 1).padStart(2, '0')}.png`,
            );
            await page.screenshot({path: name, fullPage: true});
          }
        }
        await page.keyboard.press('Tab');
        assert(await page.locator(':focus').count(), 'No keyboard focus');
        const focused = await page.locator(':focus').getAttribute('id');
        await page.locator('#projection').focus();
        await page.locator('#projection').click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator(':focus').getAttribute('id'), 'projection');
        for (const lang of source.data.languages || ['es']) {
          await page.locator('#language').selectOption(lang);
          assert.equal(await page.locator('html').getAttribute('lang'), lang);
          errors.push(
            ...(await page.evaluate(measureAulaFrame110)).errors.map((e) => lang + ':' + e),
          );
        }
        await page.emulateMedia({media: 'print'});
        assert.equal(await page.locator('header').isVisible(), false);
        results.push({
          file: file.split('/').slice(-3).join('/'),
          width,
          height,
          scenes: source.data.sections.length,
          network,
          errors,
          priorFocus: focused,
        });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  const report = {
    state: 'RENDERED_DRAFT',
    status: results.every((r) => !r.errors.length && !r.network.length) ? 'PASS' : 'FAIL',
    results,
  };
  writeFileSync(resolve(output, 'visual-report.json'), JSON.stringify(report, null, 2) + '\n');
  assert.equal(report.status, 'PASS', JSON.stringify(results.filter((r) => r.errors.length)));
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [output, ...files] = process.argv.slice(2);
  if (!output || !files.length)
    throw new Error('usage: aula-visual-110.mjs OUTPUT ARTIFACT.html...');
  const result = await inspectAula110(files, resolve(output), !process.env.AULA_NO_CAPTURES);
  console.log(
    JSON.stringify({
      status: result.status,
      viewports: result.results.length,
      sceneChecks: result.results.reduce((n, r) => n + r.scenes, 0),
    }),
  );
}
