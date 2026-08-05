---
name: lsp
description: Semantic code navigation via real language servers — go-to-definition, find-references, hover/type info, file and workspace symbols, diagnostics, and safe project-wide rename. Use whenever a task involves locating where a symbol is defined, finding all usages or callers of a function/class/variable, renaming a symbol across a project, impact analysis before a refactor, or exploring a large codebase where text search returns too many false positives. Covers TypeScript/Node, Python, Dart/Flutter, and Rust through a bundled stdlib-only Python client (scripts/lsp.py). Trigger on phrases like "where is X defined", "find all usages", "who calls this", "rename X to Y everywhere", "what's the type of this". If the needed language server isn't installed, show the install hint and fall back to grep — never block the task.
---

# LSP — Semantic Code Navigation

Grep finds *text*; a language server finds *the symbol*. When the task is "who calls this", "where is this defined", or "rename this everywhere", text search returns shadowed names, comments, strings, and same-named symbols from other scopes. The language server resolves the actual symbol the way the compiler does. Use it.

## The helper script

Everything goes through `scripts/lsp.py` (relative to this skill's directory). It is one-shot: each invocation starts the server, runs the queries, and shuts it down. Python 3, stdlib only — nothing to install besides the language server itself.

```
python <skill-dir>/scripts/lsp.py [--server "<cmd>"] [--root <dir>] [--json] \
    [--timeout <sec>] [--retry <sec>] [--apply] <command> [args...]
```

| Command | Arguments | What it answers |
|---------|-----------|-----------------|
| `definition` | `FILE:LINE:COL` | "Where is the symbol under this position defined?" |
| `references` | `FILE:LINE:COL` | "Every place this symbol is used (incl. declaration)" |
| `hover` | `FILE:LINE:COL` | "What is this symbol's type/signature/docs?" |
| `symbols` | `FILE` | "Outline of this file" |
| `workspace-symbols` | `QUERY` | "Find a symbol by name anywhere in the project" |
| `diagnostics` | `FILE...` | "Compiler/analyzer errors and warnings in these files" |
| `rename` | `FILE:LINE:COL NEW_NAME` | Project-wide rename. **Dry run by default**; `--apply` writes |
| `batch` | (queries on stdin, one per line) | Several queries in one server session |

Positions are **1-based** `FILE:LINE:COL` — the same numbers Read/Grep show you. Output lines are `file:line:col — snippet`, directly usable for follow-up Reads.

## Workflow

### 1. Detect and verify

Identify the stack from project markers (`tsconfig.json`/`package.json`, `pyproject.toml`, `pubspec.yaml`, `Cargo.toml`) and read the matching reference before first use:

- TypeScript / Node → `references/typescript.md`
- Python → `references/python.md`
- Dart / Flutter → `references/flutter.md`
- Rust → `references/rust.md`

The script auto-detects the server from the same markers; pass `--server` only when the reference says to (monorepos, alternative servers). If the server binary is missing, the script prints the install hint and exits — offer the user the install command, then **fall back to grep** for the current query. The skill must never stall a task on a missing server.

### 2. Query — and batch related queries

One invocation pays one server startup. When you need several answers (the common case: definition + references for the same symbol), use `batch`:

```
echo "definition src/api.ts:42:10
references src/api.ts:42:10" | python <skill-dir>/scripts/lsp.py --root . batch
```

For rust-analyzer (slow first index), raise the retry window: `--retry 30`.

### 3. Rename flow (the only write operation)

1. Run `rename FILE:LINE:COL NEW_NAME` — a **dry run** that lists every file and line the edit would touch.
2. Review the list. Sanity-check the count and spread: does it touch roughly the files you expect? Anything suspicious (vendored code, generated files, unrelated modules) → stop and investigate before applying.
3. Re-run with `--apply` to write the edits.
4. Validate. If the codebase-guardian skill is installed, run its Phase 4 verification (type-check, lint, build, tests against the baseline). Otherwise run the project's own type-checker and tests directly.

If the server reports the rename needs file create/rename/delete operations, the script refuses to apply and tells you — do those file operations manually, then re-check with `diagnostics`.

### 4. Record learnings

Server quirks worth keeping (a monorepo needing `--server` with a specific `tsconfig`, a project where rust-analyzer needs `--retry 60`, a venv pyright couldn't find) go to `MEMORY.md` — via the memory skill if installed, by hand otherwise.

## Fallback rule

Any failure — server missing, crash, timeout, empty results you suspect are wrong — means: report what happened in one line, then answer the user's question with Grep/Glob/Read instead. The LSP path is an upgrade, not a dependency.

## Composability (optional, never required)

- **codebase-guardian** — use lsp during guardian's Orient phase for impact analysis (`references` before deciding scope) and guardian's verification loop after `rename --apply`.
- **memory** — accumulate per-project server quirks in `MEMORY.md` so the next session doesn't rediscover them.

## Limitations

- One-shot means big projects re-index per invocation — batch queries to amortize.
- LSP columns count UTF-16 code units; rename application handles this correctly, but printed column numbers on lines with astral-plane characters (emoji) may differ from your editor's display.
- `diagnostics` reports only the files you pass (it relies on push diagnostics for opened documents), not the whole project — use the project's own build/type-check command for a full sweep.
