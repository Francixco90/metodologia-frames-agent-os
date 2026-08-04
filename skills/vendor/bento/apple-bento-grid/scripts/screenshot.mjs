/**
 * Playwright screenshot capture for Apple Bento Grid HTML files.
 * Captures pixel-perfect PNGs at 2x resolution (Retina quality).
 *
 * Usage:
 *   npm install playwright
 *   npx playwright install chromium
 *   node screenshot.mjs
 *
 * Edit the `pages` array below to point to your HTML files.
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure your HTML files and matching viewport widths here.
// viewportWidth should match the grid width:
//   - 4-col horizontal: 1200
//   - 3-col horizontal: 1100
//   - 2-col vertical:   600
const pages = [
  { file: '../examples/light-horizontal.html', output: '../examples/light-horizontal.png', viewportWidth: 1100 },
  { file: '../examples/dark-horizontal.html',  output: '../examples/dark-horizontal.png',  viewportWidth: 1200 },
  { file: '../examples/light-vertical.html',   output: '../examples/light-vertical.png',   viewportWidth: 600 },
];

async function main() {
  const browser = await chromium.launch();

  for (const { file, output, viewportWidth } of pages) {
    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: 2000 },
      deviceScaleFactor: 2, // 2x for Retina quality
    });
    const page = await context.newPage();
    const filePath = path.resolve(__dirname, file);
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for Google Fonts to load

    const grid = await page.$('.grid') || await page.$('.bento-container') || await page.$('body');
    const box = await grid.boundingBox();
    const outputPath = path.resolve(__dirname, output);
    await page.screenshot({
      path: outputPath,
      clip: { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) },
    });
    console.log(`Captured: ${output} (${Math.ceil(box.width)}x${Math.ceil(box.height)} @2x)`);
    await context.close();
  }

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
