# lsp

Semantic code navigation for Claude Code via real language servers — because grep finds *text*, but a language server finds *the symbol*.

## What this does

A bundled, stdlib-only Python client (`scripts/lsp.py`) drives a language server over JSON-RPC/stdio, one shot per invocation:

- **definition / references / hover** — where a symbol is defined, every place it's used, its type and docs
- **symbols / workspace-symbols** — file outlines and project-wide symbol search
- **diagnostics** — analyzer errors/warnings for given files
- **rename** — project-wide symbol rename: dry run by default, `--apply` to write, validation after
- **batch** — several queries in one server session (one startup cost)

## Supported stacks

The same four stacks as codebase-guardian, with per-stack details in `references/`:

| Stack | Server | Reference |
|-------|--------|-----------|
| TypeScript / Node | typescript-language-server | `references/typescript.md` |
| Python | pyright-langserver | `references/python.md` |
| Dart / Flutter | dart language-server | `references/flutter.md` |
| Rust | rust-analyzer | `references/rust.md` |

The script auto-detects the stack from project markers; `--server` overrides for anything else that speaks LSP.

## When it fires

"Where is X defined", "find all usages", "who calls this", "rename X to Y everywhere", impact analysis before a refactor, exploring large codebases where text search drowns in false positives.

If the language server isn't installed, the skill shows the install hint and falls back to grep — it never blocks a task.

## Companion skills (optional)

- [`codebase-guardian`](../codebase-guardian/SKILL.md) — impact analysis during Orient; toolchain verification after `rename --apply`.
- [`memory`](../memory/SKILL.md) — per-project server quirks accumulate in `MEMORY.md`.

## Protocol details

See [SKILL.md](SKILL.md) for the full workflow, command reference, rename safety flow, and limitations.
