"""Material checks for the gallery overlay, including real browser interaction."""
import importlib.util
import json
import pathlib
import subprocess
import tempfile
import unicodedata
import unittest

SCRIPT = pathlib.Path(__file__).with_name('build-aula-gallery.py')
spec = importlib.util.spec_from_file_location('aula_gallery', SCRIPT)
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)


def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value) if not unicodedata.combining(c)).lower().strip()


BROWSER_PROBE = r'''
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const browser = await chromium.launch({headless:true, ...(process.env.AULA_CHROMIUM_EXECUTABLE ? {executablePath:process.env.AULA_CHROMIUM_EXECUTABLE} : {})});
const results = [];
try {
  for (const repo of data.repos) for (const width of [320,1280]) {
    const context = await browser.newContext({viewport:{width,height:900}});
    const page = await context.newPage();
    const errors = [], network = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('request', request => {if (/^https?:/.test(request.url())) network.push(request.url());});
    await context.route(/^https?:/, route => route.abort());
    await page.goto(pathToFileURL(`${data.dest}/public-repos/${repo}/gallery/index.html`).href);
    await page.evaluate(() => document.fonts.ready);
    const input = page.getByRole('searchbox', {name:'Buscar por intención',exact:true});
    const clear = page.getByRole('button', {name:'Limpiar',exact:true});
    const count = page.getByRole('status');
    const visible = () => page.locator('#asset-grid article:not([hidden])').evaluateAll(cards => cards.map(card => card.dataset.assetId).sort());
    assert.equal((await visible()).length,416);
    const measurements = [];
    for (const [query, expected] of Object.entries(data.expected)) {
      await input.fill(query);
      assert.deepEqual(await visible(),expected,`Search mismatch: ${repo}/${width}/${query}`);
      assert.equal(await count.textContent(),`${expected.length} de 416 assets disponibles`);
      measurements.push({query,results:expected.length});
    }
    await clear.click();
    assert.equal(await input.inputValue(),'');
    assert.equal(await input.evaluate(node => node === document.activeElement),true);
    assert.equal((await visible()).length,416);
    assert.equal(await count.textContent(),'416 de 416 assets disponibles');
    await input.fill('decisión');
    await input.press('Tab');
    assert.equal(await clear.evaluate(node => node === document.activeElement),true);
    await clear.press('Enter');
    assert.equal(await input.inputValue(),'');
    assert.equal(await input.evaluate(node => node === document.activeElement),true);
    const layout = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.search-controls input,.search-controls button')].map(node => node.getBoundingClientRect().height)}));
    assert.equal(layout.scroll,layout.width);
    assert.equal(layout.controls.every(height => height>=44),true);
    assert.deepEqual(errors,[]); assert.deepEqual(network,[]);
    results.push({repo,width,queries:measurements,clearFocus:true,keyboard:true,horizontalOverflow:false,externalRequests:0});
    await context.close();
  }
} finally {await browser.close();}
process.stdout.write(JSON.stringify(results));
'''


class GallerySearchTests(unittest.TestCase):
    def test_reproducible_overlay_preserves_runtime(self):
        with tempfile.TemporaryDirectory() as temporary:
            dest = pathlib.Path(temporary)
            g.m.generate(dest)
            frozen = {p.relative_to(dest): g.m.sha(p.read_bytes()) for p in dest.rglob('*') if p.is_file()}
            first = g.build(dest, canonical=True)
            g.build(dest, check=True, canonical=True)
            second = g.build(dest, canonical=True)
            self.assertEqual(first, second)
            allowed = {pathlib.Path('asset-release-summary.json')} | set().union(*(g.mutable_paths(repo) for repo in g.REPOS))
            changed = {relative for relative, digest in frozen.items() if g.m.sha((dest / relative).read_bytes()) != digest}
            self.assertEqual(changed, allowed)
            self.assertEqual(len(changed), 13)
            self.assertEqual(g.m.sha(g.SCRIPT.read_bytes()), g.BASELINE_SHA)

    def test_native_search_desktop_mobile_offline(self):
        with tempfile.TemporaryDirectory() as temporary:
            dest = pathlib.Path(temporary)
            g.m.generate(dest)
            g.build(dest)
            catalog = json.loads((dest / 'public-repos' / g.REPOS[0] / 'catalog.json').read_text())
            rows = catalog['scenes'] + catalog['icons']
            expected = {}
            for query in ('decisión', 'decision', 'DECISIÓN', 'formación', 'route', 'noexisteconsulta'):
                words = normalize(query).split()
                expected[query] = sorted(row['id'] for row in rows if all(word in normalize(g.search_text(row)) for word in words))
            self.assertEqual(expected['decisión'], expected['decision'])
            self.assertGreater(len(expected['decisión']), 0)
            self.assertEqual(len(expected['formación']), 256)  # uses-only metadata
            self.assertGreater(len(expected['route']), 0)     # tags-only metadata
            probe = dest / 'probe.json'
            probe.write_text(json.dumps({'dest': str(dest), 'repos': g.REPOS, 'expected': expected}, ensure_ascii=False))
            result = subprocess.run(['node', '--input-type=module', '-e', BROWSER_PROBE, str(probe)], cwd=g.m.ROOT, capture_output=True, text=True, timeout=60)
            self.assertEqual(result.returncode, 0, result.stderr)
            results = json.loads(result.stdout)
            self.assertEqual(len(results), 4)
            print('\nBROWSER_SENSOR ' + json.dumps(results, ensure_ascii=False))


if __name__ == '__main__':
    unittest.main()
