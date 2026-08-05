# TypeScript / Node — typescript-language-server

**Server command:** `typescript-language-server --stdio` (auto-detected from `tsconfig.json` or `package.json`)

**Install:** `npm i -g typescript-language-server typescript`
The server needs a `typescript` package; the global one works, but it prefers the project's own `node_modules/typescript` when present (keeps diagnostics consistent with the project's TS version).

**Startup:** fast (1–3 s on medium projects). Default `--retry 5` is enough.

## Quirks

- **Monorepos:** run with `--root` pointing at the package that owns the `tsconfig.json` governing your file, not the repo root — otherwise project resolution may pick the wrong config.
- **JS projects:** works on plain JS too (`allowJs`); results are best-effort without type annotations.
- **Path aliases** (`paths` in tsconfig) resolve correctly — a key advantage over grep.

## Smoke test

```bash
cd <a-ts-project>
python <skill-dir>/scripts/lsp.py --root . references src/index.ts:1:14
```

Expect a list of `file:line:col — snippet` lines. Then try `rename` on a local variable (dry run) and confirm the touched lines look right.
