# Rust — rust-analyzer

**Server command:** `rust-analyzer` (auto-detected from `Cargo.toml`)

**Install:** `rustup component add rust-analyzer` (or a standalone binary on PATH).

**Startup: slow.** rust-analyzer runs `cargo metadata` and indexes the whole crate graph before answering queries — 10–60 s on real projects, cold cache. This is the stack where the script's retry flag matters:

```
--retry 30 --timeout 90
```

Always use `batch` for multiple queries on Rust projects — paying the index twice is the single biggest time waster.

## Quirks

- **Empty results during indexing:** rust-analyzer answers `null`/`[]` to queries that arrive before indexing finishes; the retry window exists for exactly this. If results are still empty after a long retry, the symbol may be behind a disabled feature flag (`--server "rust-analyzer"` honors the default feature set only).
- **Macro-generated code:** definitions inside macro expansions resolve to the macro call site; references inside heavy macro use (e.g. Tauri `#[command]`, serde derives) can be incomplete — cross-check with `cargo check` and grep when a count looks low.
- **Workspaces:** point `--root` at the workspace root (where the top `Cargo.toml` lives) so cross-crate references resolve.

## Smoke test

```bash
cd <a-rust-project>
python <skill-dir>/scripts/lsp.py --root . --retry 30 --timeout 90 workspace-symbols main
```

Expect at least the crate's `main` function with its location.
