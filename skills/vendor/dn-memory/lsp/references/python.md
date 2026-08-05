# Python — pyright-langserver

**Server command:** `pyright-langserver --stdio` (auto-detected from `pyproject.toml`, `setup.py`, or `requirements.txt`)

**Install:** `npm i -g pyright` (yes, npm — pyright is a Node program). Alternative: `pip install pyright` installs a wrapper that downloads Node on first run.

**Startup:** moderate (2–5 s). Default `--retry 5` is usually enough.

## Quirks

- **Virtualenvs:** pyright finds the venv via `pyrightconfig.json` (`venvPath`/`venv`) or an activated environment. If references into site-packages come back empty, add a minimal `pyrightconfig.json` or run from the activated venv.
- **Alternative server:** projects standardized on `python-lsp-server` can use `--server "pylsp"` (`pip install python-lsp-server`); rename support there depends on installed plugins (rope).
- **Django:** dynamic attributes (ORM managers, reverse relations) resolve only as well as the installed type stubs (`django-stubs`) allow. Empty results on ORM symbols are a stubs gap, not a script bug — fall back to grep for those.

## Smoke test

```bash
cd <a-python-project>
python <skill-dir>/scripts/lsp.py --root . hover path/to/module.py:LINE:COL
python <skill-dir>/scripts/lsp.py --root . rename path/to/module.py:LINE:COL new_name   # dry run
```

Hover should print the inferred type; the rename dry run should list plausible edit sites.
