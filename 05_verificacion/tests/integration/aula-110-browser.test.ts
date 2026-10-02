import {execFileSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium, type Browser} from 'playwright';
import {afterAll, beforeAll, expect, it} from 'vitest';
const skills = (
  JSON.parse(readFileSync('04_estado/registries/skills/aula-decks-package.json', 'utf8')) as {
    skills: {name: string; kind: string; edition: string}[];
  }
).skills;
let root: string, browser: Browser;
const artifact = (name: string, kind: string) =>
  resolve(root, name, kind === 'module' ? 'index.html' : 'artifact.html');
beforeAll(async () => {
  root = mkdtempSync(resolve(realpathSync(tmpdir()), 'aula110-browser-'));
  for (const s of skills)
    execFileSync(
      'python3',
      [
        `03_artefactos/skills/${s.name}/engine/runtime.py`,
        'build',
        '--kind',
        s.kind,
        '--edition',
        s.edition,
        '--input',
        `03_artefactos/skills/${s.name}/examples/input.json`,
        '--out',
        resolve(root, s.name),
      ],
      {env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}, timeout: 60000},
    );
  const dark = JSON.parse(
    readFileSync('03_artefactos/skills/metodologia-edu-workbook/examples/input.json', 'utf8'),
  ) as {theme?: string; sections: Record<string, unknown>[]};
  dark.theme = 'dark';
  dark.sections[0]!.table = {
    headers: Array.from({length: 10}, (_, n) => `Column ${n}`),
    rows: [Array.from({length: 10}, () => 'Wide column value')],
  };
  dark.sections[0]!.assetRefs = [{id: 'learning-reading', kind: 'icon'}];
  const input = resolve(root, 'dark-icon-input.json');
  writeFileSync(input, JSON.stringify(dark));
  execFileSync(
    'python3',
    [
      '03_artefactos/skills/metodologia-edu-workbook/engine/runtime.py',
      'build',
      '--kind',
      'workbook',
      '--edition',
      'metodologia',
      '--input',
      input,
      '--out',
      resolve(root, 'dark-icon'),
    ],
    {env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}},
  );
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}
      : {}),
  });
}, 60000);
afterAll(async () => {
  await browser?.close();
  if (root) rmSync(root, {recursive: true, force: true});
});
it('checks every packaged scene offline in desktop, tablet and mobile', () => {
  const result = execFileSync(
    'node',
    [
      '05_verificacion/scripts/aula-visual-110.mjs',
      resolve(root, 'geometry'),
      ...skills.map((s) => artifact(s.name, s.kind)),
      resolve(root, 'dark-icon/artifact.html'),
    ],
    {encoding: 'utf8', timeout: 120000, env: {...process.env, AULA_NO_CAPTURES: '1'}},
  );
  expect((JSON.parse(result) as {status: string}).status).toBe('PASS');
}, 120000);
it('keeps native arrows in a focused horizontal table', async () => {
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  try {
    await page.goto(pathToFileURL(resolve(root, 'dark-icon/artifact.html')).href);
    await page.locator('.table-region').focus();
    await page.keyboard.press('ArrowRight');
    expect(await page.locator('section.card').first().isVisible()).toBe(true);
    await expect
      .poll(() => page.locator('.table-region').evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
  } finally {
    await page.close();
  }
});
it.each(skills.filter((s) => ['workbook', 'workshop-immersive'].includes(s.kind)))(
  '$name preserves editable prompt, progress and focus',
  async (s) => {
    const page = await browser.newPage();
    const practice = s.kind === 'workshop-immersive' ? 'consigna' : 'practica';
    await page.goto(pathToFileURL(artifact(s.name, s.kind)).href + '#' + practice);
    // Transport stub checks the exact requested clipboard bytes; OS permission is a separate sensor.
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) => {
            document.documentElement.dataset.copied = text;
            return Promise.resolve();
          },
        },
      }),
    );
    const card = page.locator('#' + practice);
    if (s.kind === 'workshop-immersive')
      await card.getByText('Prompt completo', {exact: true}).click();
    await card.locator('textarea').first().fill('equipo ágil\nprueba exacta');
    const expected = await card.locator('pre').innerText();
    expect(expected).toContain('equipo ágil\nprueba exacta');
    await card.getByRole('button', {name: 'Copiar prompt', exact: true}).click();
    expect(await page.locator('html').getAttribute('data-copied')).toBe(expected);
    await card.locator('.completion').click();
    await page.reload();
    expect(await card.locator('textarea').first().inputValue()).toBe('equipo ágil\nprueba exacta');
    expect(await card.locator('.completion').getAttribute('aria-pressed')).toBe('true');
    await card.getByRole('button', {name: 'Proyectar', exact: true}).click();
    await page.keyboard.press('Escape');
    expect(await page.locator(':focus').innerText()).toBe('Proyectar');
    await page.close();
  },
);
it.each(skills.filter((s) => s.kind === 'workshop-immersive'))(
  '$name closes card projection before rerender and keeps its timebox paused',
  async (s) => {
    const page = await browser.newPage();
    try {
      await page.clock.install();
      await page.goto(pathToFileURL(artifact(s.name, s.kind)).href + '#consigna');
      await page.locator('#consigna').getByRole('button', {name: 'Proyectar', exact: true}).click();
      await page.locator('#next').click();
      expect(await page.locator('section.card:visible').count()).toBe(1);
      expect(await page.locator('#practica-individual').isVisible()).toBe(true);
      expect(await page.locator('body').getAttribute('class')).not.toContain('projection-card');
      await page.locator('#timer-toggle-practica-individual').click();
      await page.clock.fastForward(2100);
      expect(await page.locator('#timer-practica-individual').innerText()).toBe('14:58');
      await page.locator('#timer-toggle-practica-individual').click();
      await page.clock.fastForward(10000);
      expect(await page.locator('#timer-practica-individual').innerText()).toBe('14:58');
      const projection = page.locator('#practica-individual').getByRole('button', {
        name: 'Proyectar',
        exact: true,
      });
      await projection.click();
      await page.keyboard.press('Escape');
      expect(await page.locator(':focus').innerText()).toBe('Proyectar');
      await projection.click();
      await page
        .locator('#language')
        .evaluate((el) => el.dispatchEvent(new Event('change', {bubbles: true})));
      expect(await page.locator('section.card:visible').count()).toBe(1);
      expect(await page.locator('body').getAttribute('class')).not.toContain('projection-card');
      expect(await page.locator('#timer-practica-individual').innerText()).toBe('14:58');
    } finally {
      await page.close();
    }
  },
);
it.each(skills.filter((s) => s.kind === 'lean-coffee'))(
  '$name timer pauses, resets and reveals under control',
  async (s) => {
    const page = await browser.newPage();
    await page.clock.install();
    await page.goto(pathToFileURL(artifact(s.name, s.kind)).href);
    const timer = page.locator('#timer-topic-contexto');
    expect(await timer.innerText()).toBe('5:00');
    await page.locator('#timer-toggle-topic-contexto').click();
    await page.clock.fastForward(2100);
    expect(await timer.innerText()).toBe('4:58');
    await page.locator('#timer-toggle-topic-contexto').click();
    const paused = await timer.innerText();
    await page.clock.fastForward(10000);
    expect(await timer.innerText()).toBe(paused);
    await page.getByRole('button', {name: 'Reiniciar', exact: true}).click();
    expect(await timer.innerText()).toBe('5:00');
    const reveal = page.getByRole('button', {name: 'Revelar pregunta', exact: true}).last();
    expect(await reveal.getAttribute('aria-expanded')).toBe('false');
    await reveal.click();
    expect(await reveal.getAttribute('aria-expanded')).toBe('true');
    await page.locator('#next').click();
    expect(await page.locator('#timer-topic-practica').innerText()).toBe('2:00');
    await page.close();
  },
);
it.each(skills.filter((s) => s.kind === 'index' || s.kind === 'module'))(
  '$name delivers actual linked HTML pieces',
  async (s) => {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(artifact(s.name, s.kind)).href);
    for (const href of await page
      .locator('a.piece')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')!))) {
      expect(existsSync(resolve(root, s.name, href))).toBe(true);
    }
    await page.close();
  },
);
it.each(
  skills.filter((s) =>
    ['immersive-class', 'workshop-immersive', 'dynamic-commercial-decks'].includes(s.kind),
  ),
)('$name audience strips notes and motion respects controls', async (s) => {
  const audience = readFileSync(resolve(root, s.name, 'artifact-audience.html'), 'utf8');
  const payload = JSON.parse(/id="payload">([\s\S]*?)<\/script>/u.exec(audience)![1]!) as {
    data: {sections: Record<string, unknown>[]};
  };
  expect(
    payload.data.sections.every(
      (x: Record<string, unknown>) => !x.notes && !x.spoken && !x.facilitatorNotes,
    ),
  ).toBe(true);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(artifact(s.name, s.kind)).href);
  await page.emulateMedia({media: 'print'});
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  for (const section of await page.locator('section.card').all())
    expect(await section.isVisible()).toBe(true);
  await page.emulateMedia({media: 'screen'});
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.locator('#motion').click();
  expect(await page.locator('#motion').getAttribute('aria-pressed')).toBe('true');
  expect(
    await page
      .locator('.scene-layer')
      .first()
      .evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe('paused');
  await page.locator('#next').click();
  for (const layer of await page.locator('section.card:not([hidden]) .scene-layer').all()) {
    expect(await layer.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    expect(await layer.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused');
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  expect(
    await page
      .locator('.scene-layer')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.close();
});
