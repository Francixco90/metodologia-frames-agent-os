import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
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
const runtime = '03_artefactos/renderers/frames-aula/runtime.py';
function build(kind: string, edition: string, input: string, out: string) {
  execFileSync(
    'python3',
    [runtime, 'build', '--kind', kind, '--edition', edition, '--input', input, '--out', out],
    {
      timeout: 60_000,
      env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
    },
  );
}
it('rejects incompatible brand surfaces and unsafe color shapes before writing', () => {
  const temporary = mkdtempSync(resolve(realpathSync(tmpdir()), 'frames-aula-contrast-'));
  const data = JSON.parse(
    readFileSync('03_artefactos/renderers/frames-aula/examples/workbook.json', 'utf8'),
  ) as Record<string, unknown>;
  const colors = (night: string, gold: string, white: string) => ({night, gold, white});
  const fallback = colors('#0a122a', '#8a6d00', '#ffffff');
  const neutral = colors('#152238', '#334155', '#ffffff');
  let caseIndex = 0;
  const check = (
    palette: unknown,
    error?: string,
    edition = 'white-label',
    name: unknown = 'Perfil de prueba',
  ) => {
    const input = resolve(temporary, 'input.json');
    const out = resolve(temporary, `output-${caseIndex++}`);
    writeFileSync(
      input,
      JSON.stringify({
        ...data,
        ...(palette === undefined ? {} : {brand: {name, colors: palette}}),
      }),
    );
    const flags = ['--kind', 'workbook', '--edition', edition];
    flags.push('--input', input, '--out', out);
    const result = spawnSync('python3', [runtime, 'build', ...flags], {
      encoding: 'utf8',
      timeout: 60_000,
      env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
    });
    expect(result.status).toBe(error ? 2 : 0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain(error ?? 'RENDERED_DRAFT');
    expect(existsSync(out)).toBe(!error);
    if (error) return;
    const html = readFileSync(resolve(out, 'artifact.html'), 'utf8');
    const payload = JSON.parse(/id="payload">([\s\S]*?)<\/script>/u.exec(html)![1]!) as {
      brand: {colors: Record<string, string>};
    };
    expect(Object.keys(payload.brand.colors).sort()).toEqual(['gold', 'night', 'white']);
    return payload.brand.colors;
  };
  try {
    expect(check(undefined, undefined, 'metodologia')).toEqual(fallback);
    expect(check(undefined)).toEqual(neutral);
    data.brand = {};
    expect(check(undefined)).toEqual(neutral);
    delete data.brand;
    check(colors('#1e293b', '#0f766e', '#f8fafc'));
    check(colors('#ffffff', '#ffff00', '#000000'), 'night sobre blanco fijo');
    check(colors('#152238', '#334155', '#000000'), 'footer/completed sobre canvas');
    check(colors('#152238', '#334155', '#b0b0b0'), 'foco sobre canvas');
    check(colors('#000000', '#000000', '#bbbbbb'), 'foco sobre canvas');
    check(colors('#000000', '#000000', '#cccccc'));
    check({night: '#152238', white: '#e9e9e9'}, 'gold sobre canvas');
    expect(check({})).toEqual(fallback);
    expect(check({night: '#152238'})).toEqual({...fallback, night: '#152238'});
    for (const palette of [null, [], ['#152238'], 3, '#ffffff']) check(palette, 'Color no seguro');
    for (const palette of [{night: 3}, {gold: null}, {extra: '#ffffff'}])
      check(palette, 'Color no seguro');
    for (const name of [3, {label: 'Perfil'}, ['Perfil'], '   '])
      check({}, 'Brand inválida', 'white-label', name);
  } finally {
    rmSync(temporary, {recursive: true, force: true});
  }
});
describe('Aula offline browser checks', () => {
  beforeAll(async () => {
    root = mkdtempSync(resolve(realpathSync(tmpdir()), 'frames-aula-browser-'));
    for (const item of manifest.skills)
      build(
        item.kind,
        item.edition,
        `03_artefactos/renderers/frames-aula/examples/${item.kind}.json`,
        resolve(root, item.name),
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
        build('workbook', edition, input, output);
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
