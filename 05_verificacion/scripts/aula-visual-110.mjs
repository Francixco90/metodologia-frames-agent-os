#!/usr/bin/env node
// Run material Aula artifacts, all scenes and controls; captures are draft evidence.
import assert from 'node:assert/strict';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

import {measureAulaFrame110} from '../tests/fixtures/experience/aula-geometry-sensor.mjs';
export {measureAulaFrame110};

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
