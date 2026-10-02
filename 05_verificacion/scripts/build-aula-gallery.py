#!/usr/bin/env python3
"""Reproducible native gallery search overlay; frozen runtime banks stay intact.

This is the two-stage entrypoint: build-aula-assets.py in temporary staging,
then this gallery-only overlay. --check compares that complete chain and, with
--canonical, the original canonical assets. Only gallery/release metadata are
written into an existing release; unrelated repository files remain untouched.
"""
import argparse
import html
import importlib.util
import json
import pathlib
import re
import tempfile

SCRIPT = pathlib.Path(__file__).with_name('build-aula-assets.py')
BASELINE_SHA = '67a7b431f3a06b41ec31415b8b691a1588e656a784189bd41cc597af281b885b'
spec = importlib.util.spec_from_file_location('frozen_aula_assets', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
REPOS = ('metodologia-aula-assets', 'white-label-aula-assets')
SOURCE = '05_verificacion/scripts/build-aula-gallery.py'

SEARCH_STYLE = '''
.search-controls{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin:24px 0}
.search-field{flex:1 1 260px;min-width:0}.search-field label{display:block;font-weight:700;margin-bottom:6px}
.search-field input{box-sizing:border-box;width:100%;min-height:48px;padding:10px 12px;font:inherit;color:inherit;border:2px solid currentColor;border-radius:8px;background:white}
.search-controls button{min-height:48px;padding:10px 16px;font:inherit;color:inherit;border:2px solid currentColor;border-radius:8px;background:white;cursor:pointer}
.search-controls input:focus-visible,.search-controls button:focus-visible{outline:3px solid currentColor;outline-offset:3px}
.result-count{flex-basis:100%;margin:0}article[hidden]{display:none!important}
'''
SEARCH_CONTROLS = '''
<form class="search-controls" role="search" aria-label="Buscar assets por intención">
<div class="search-field"><label for="asset-search">Buscar por intención</label>
<input id="asset-search" type="search" placeholder="Por ejemplo: decisión, evidencia o práctica" aria-controls="asset-grid" autocomplete="off" spellcheck="false"></div>
<button id="clear-search" type="button">Limpiar</button>
<p id="result-count" class="result-count" role="status" aria-live="polite" aria-atomic="true">416 de 416 assets disponibles</p>
</form>
'''
SEARCH_SCRIPT = '''
<script>
(() => {
  const input = document.getElementById('asset-search');
  const clear = document.getElementById('clear-search');
  const count = document.getElementById('result-count');
  const cards = Array.from(document.querySelectorAll('#asset-grid article[data-search]'));
  const normalize = value => String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('es').trim();
  const entries = cards.map(card => ({card, search: normalize(card.dataset.search)}));
  const update = () => {
    const terms = normalize(input.value).split(/\\s+/).filter(Boolean);
    let visible = 0;
    entries.forEach(({card, search}) => {
      card.hidden = !terms.every(term => search.includes(term));
      if (!card.hidden) visible += 1;
    });
    count.textContent = `${visible} de ${cards.length} assets disponibles`;
  };
  input.addEventListener('input', update);
  input.form.addEventListener('submit', event => { event.preventDefault(); update(); });
  clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
  update();
})();
</script>
'''


def search_text(row):
    """Only public intent metadata becomes the searchable string."""
    values = [row['id'], row['title'], row['meaning'], *row['tags'], *row['uses']]
    assert all(isinstance(value, str) for value in values)
    return ' '.join(values)


def searchable_html(baseline, catalog):
    rows = iter(catalog['scenes'] + catalog['icons'])
    total = 0

    def card(match):
        nonlocal total
        row = next(rows)
        total += 1
        return match.group(0)[:-1] + ' data-asset-id="' + html.escape(row['id'], quote=True) + '" data-search="' + html.escape(search_text(row), quote=True) + '">'

    result = re.sub(r'<article(?: class="icon")?>', card, baseline)
    assert total == 416 and next(rows, None) is None, 'Gallery/catalog card mismatch'
    assert result.count('</style>') == result.count('<main>') == result.count('</html>') == 1
    result = result.replace('</style>', SEARCH_STYLE + '</style>')
    result = result.replace('<main>', SEARCH_CONTROLS + '<main id="asset-grid">')
    return result.replace('</html>', SEARCH_SCRIPT + '</html>').encode()


def overlay_generated(dest):
    """Apply to a fresh baseline tree only; never changes runtime members."""
    summaries = []
    producer_sha = m.sha(pathlib.Path(__file__).read_bytes())
    for repo in REPOS:
        target = dest / 'public-repos' / repo
        catalog = json.loads((target / 'catalog.json').read_text())
        gallery = target / 'gallery'
        index = searchable_html((gallery / 'index.html').read_text(), catalog)
        m.write(gallery, 'index.html', index)
        readme = (gallery / 'README.md').read_text() + (
            '\nNative search matches meaning, tags, uses, title and ID. It ignores accents and letter case, combines query words, announces the result count and restores focus after clearing. No network or JavaScript dependency is required.\n'
            '\nReproducibility in the Frames source checkout: build-aula-gallery.py is the two-stage entrypoint (frozen build-aula-assets.py, then search overlay). Use --dest RELEASE --canonical --check to verify both the complete release and canonical geometry. The older builder alone describes the baseline gallery.\n'
        )
        m.write(gallery, 'README.md', readme.encode())
        manifest = json.loads((gallery / 'manifest.json').read_text())
        manifest['files']['index.html'] = m.sha(index)
        manifest['files']['README.md'] = m.sha(readme.encode())
        manifest['search'] = {'fields': ['meaning', 'tags', 'uses', 'title', 'id'], 'matching': 'all-query-words; case-and-diacritic-insensitive', 'cards': 416, 'native': True, 'offline': True}
        manifest['producer'] = {'source': SOURCE, 'sha256': producer_sha, 'baselineGeneratorSha256': BASELINE_SHA}
        m.write(gallery, 'manifest.json', m.jsonbytes(manifest))
        previews = {name: (gallery / name).read_bytes() for name in manifest['files']}
        previews['manifest.json'] = (gallery / 'manifest.json').read_bytes()
        gallery_zip = target / 'dist' / f'{repo}-{m.VERSION}-gallery.zip'
        m.zip_files({'gallery/' + name: data for name, data in previews.items()}, gallery_zip)
        summary = json.loads((target / 'release.json').read_text())
        summary['galleryArchiveSha256'] = m.sha(gallery_zip.read_bytes())
        m.write(target, 'release.json', m.jsonbytes(summary))
        m.write(target, 'SHA256SUMS', (summary['sha256'] + '  ' + summary['archive'] + '\n' + summary['galleryArchiveSha256'] + '  dist/' + gallery_zip.name + '\n').encode())
        summaries.append(summary)
    m.write(dest, 'asset-release-summary.json', m.jsonbytes({'version': m.VERSION, 'banks': summaries}))
    return summaries


def mutable_paths(repo):
    prefix = pathlib.Path('public-repos') / repo
    return {prefix / name for name in ('gallery/index.html', 'gallery/manifest.json', 'gallery/README.md', f'dist/{repo}-{m.VERSION}-gallery.zip', 'release.json', 'SHA256SUMS')}


def build(dest, check=False, canonical=False):
    assert m.sha(SCRIPT.read_bytes()) == BASELINE_SHA, 'Frozen asset generator changed'
    dest = pathlib.Path(dest).resolve()
    mutable = {pathlib.Path('asset-release-summary.json')} | set().union(*(mutable_paths(repo) for repo in REPOS))
    with tempfile.TemporaryDirectory(prefix='aula-gallery-chain-') as temporary:
        stage = pathlib.Path(temporary)
        expected_assets = stage / 'canonical-assets'
        m.generate(stage, canonical, expected_assets)
        summaries = overlay_generated(stage)
        expected = [p for p in stage.rglob('*') if p.is_file() and not p.is_relative_to(expected_assets)]
        for p in expected:
            relative = p.relative_to(stage)
            actual = dest / relative
            # Validate every frozen runtime/gallery-preview byte before writes.
            if check or relative not in mutable:
                assert actual.is_file() and not actual.is_symlink() and actual.read_bytes() == p.read_bytes(), 'Release differs: ' + str(relative)
        if canonical:
            for p in expected_assets.rglob('*'):
                if p.is_file():
                    actual = m.ASSETS / p.relative_to(expected_assets)
                    assert actual.is_file() and actual.read_bytes() == p.read_bytes(), 'Canonical assets differ: ' + str(p.relative_to(expected_assets))
        if not check:
            for relative in sorted(mutable):
                target = dest / relative
                assert not target.is_symlink(), 'Refusing symlink: ' + str(relative)
                m.write(dest, relative, (stage / relative).read_bytes())
    return summaries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dest', required=True)
    parser.add_argument('--canonical', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    summaries = build(args.dest, args.check, args.canonical)
    print('PASS reproducible baseline + searchable gallery; frozen runtime preserved' if args.check else json.dumps(summaries, ensure_ascii=False))


if __name__ == '__main__':
    main()
