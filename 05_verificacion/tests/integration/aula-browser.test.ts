import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium, type Browser} from 'playwright';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
const manifest = JSON.parse(
  readFileSync('04_estado/registries/skills/aula-decks-package.json', 'utf8'),
) as {skills: {name: string; kind: string; edition: string}[]};
let browser: Browser;
let root: string;
beforeAll(async () => {
  root = mkdtempSync(resolve(realpathSync(tmpdir()), 'frames-aula-browser-'));
  for (const item of manifest.skills)
    execFileSync(
      'python3',
      [
        '03_artefactos/renderers/frames-aula/runtime.py',
        'build',
        '--kind',
        item.kind,
        '--edition',
        item.edition,
        '--input',
        `03_artefactos/renderers/frames-aula/examples/${item.kind}.json`,
        '--out',
        resolve(root, item.name),
      ],
      {timeout: 60_000, env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}},
    );
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}
      : {}),
  });
}, 60_000);
afterAll(async () => {
  if (browser) await browser.close();
  if (root) rmSync(root, {recursive: true, force: true});
});
describe('Aula offline browser checks', () => {
  it.each([
    ['es', 'Revisión humana pendiente', 'Saltar al contenido', 'Idioma', 'Secciones'],
    ['en', 'Human review pending', 'Skip to content', 'Language', 'Sections'],
    ['pt', 'Revisão humana pendente', 'Ir para o conteúdo', 'Idioma', 'Seções'],
    ['fr', 'Relecture humaine en attente', 'Aller au contenu', 'Langue', 'Sections'],
  ])(
    'localizes initial HTML and shell labels in %s for both editions',
    async (lang, status, skip, languageLabel, navigationLabel) => {
      for (const edition of ['metodologia', 'white-label']) {
        const data = JSON.parse(
          readFileSync('03_artefactos/renderers/frames-aula/examples/workbook.json', 'utf8'),
        ) as {language: string; title: string | Record<string, string>};
        data.language = lang;
        const input = resolve(root, `shell-${edition}-${lang}.json`);
        const output = resolve(root, `shell-${edition}-${lang}`);
        writeFileSync(input, JSON.stringify(data));
        execFileSync(
          'python3',
          [
            '03_artefactos/renderers/frames-aula/runtime.py',
            'build',
            '--kind',
            'workbook',
            '--edition',
            edition,
            '--input',
            input,
            '--out',
            output,
          ],
          {timeout: 60_000},
        );
        const artifact = resolve(output, 'artifact.html');
        const title = typeof data.title === 'string' ? data.title : data.title[lang];
        expect(readFileSync(artifact, 'utf8')).toContain(`<html lang="${lang}">`);
        expect(readFileSync(artifact, 'utf8')).toContain(`<title>${title}</title>`);
        const page = await browser.newPage();
        await page.goto(pathToFileURL(artifact).href);
        for (const width of [1440, 768, 390]) {
          await page.setViewportSize({width, height: 900});
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth + 1,
            ),
          ).toBe(true);
        }
        expect(await page.locator('html').getAttribute('lang')).toBe(lang);
        expect(await page.title()).toBe(title);
        expect(await page.locator('footer').innerText()).toBe(`RENDERED_DRAFT · ${status}`);
        expect(await page.locator('a.skip').innerText()).toBe(skip);
        expect(await page.locator('#language').getAttribute('aria-label')).toBe(languageLabel);
        expect(await page.locator('nav').getAttribute('aria-label')).toBe(navigationLabel);
        await page.locator('#language').selectOption('es');
        expect(await page.locator('footer').innerText()).toBe(
          'RENDERED_DRAFT · Revisión humana pendiente',
        );
        await page.locator('#language').selectOption(lang);
        expect(await page.locator('#language').getAttribute('aria-label')).toBe(languageLabel);
        await page.close();
      }
    },
  );
  it.each(manifest.skills)('$name works in desktop, tablet and mobile', async (item) => {
    const page = await browser.newPage({reducedMotion: 'reduce'});
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    const network: string[] = [];
    await page.route(/^https?:\/\//u, (route) => {
      network.push(route.request().url());
      return route.abort();
    });
    const name = item.kind === 'module' ? 'index.html' : 'artifact.html';
    await page.goto(pathToFileURL(resolve(root, item.name, name)).href);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({width, height: 900});
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
    }
    await page.keyboard.press('Tab');
    expect(await page.locator(':focus').count()).toBe(1);
    if (item.kind !== 'module') {
      expect(await page.locator('footer').innerText()).toContain('RENDERED_DRAFT');
      expect(await page.locator('#language').getAttribute('aria-label')).toBe('Idioma');
      expect(await page.locator('#brand').innerText()).toContain(
        item.edition === 'metodologia' ? 'MetodologIA' : 'Tu marca',
      );
      const moving = page.locator('.moving');
      if (await moving.count())
        expect(await moving.first().evaluate((el) => getComputedStyle(el).animationName)).toBe(
          'none',
        );
      await page.emulateMedia({media: 'print'});
      expect(await page.locator('header').isVisible()).toBe(false);
    }
    expect(network).toEqual([]);
    expect(failures).toEqual([]);
    await page.close();
  });
});
