# codebase-guardian

A disciplined workflow for changing code that already exists — without breaking it, fighting its conventions, or leaving loose ends.

It runs on one idea: **an edit isn't done when the diff looks right — it's done when the toolchain is green, it fits the codebase, and everything that depended on the old behavior has been updated.**

## What this does

The skill runs a four-phase loop over any non-trivial edit to an existing project:

1. **Orient** — read `MEMORY.md`, detect the stack, study sibling files, and capture a green baseline before touching anything.
2. **Decide** — surface the choice to *match* the existing pattern (the default) or *deliberately change* it, and never silently assume an architecture or state-management decision that's the user's to make.
3. **Edit, then trace the ripple** — make the change, then find everything it touched indirectly: callers, types, tests, docs, configs, and the other side of every contract.
4. **Verify and record** — re-run the real type-checker, linter, build, and tests, compare against baseline, and write learnings back to `MEMORY.md`.

It validates with tools, not eyes: it tells you to run the real language server, linter, compiler, and tests instead of judging correctness by inspection.

## When it fires

Any meaningful edit to an existing codebase — when the user says *follow the existing pattern*, *don't break anything*, *fix without errors*, *match the codebase*, *change the architecture or state management*, *refactor the structure*, or *rename across the project*.

Skip it for throwaway scripts, brand-new files in an empty repo, or one-line answers where there's nothing to break.

## Supported stacks

Per-stack reference files capture the exact validation commands and ripple traps:

- `references/typescript.md` — TypeScript / Node (tsc, ESLint, framework gotchas)
- `references/python.md` — Python / Django (mypy/pyright, ruff, migrations, serializers)
- `references/flutter.md` — Flutter / Dart (analyzer, build_runner codegen, BLoC/router sync)
- `references/rust.md` — Rust / Tauri (cargo check/clippy, trait impls, IPC command contracts)

## Companion skill (optional)

This skill is self-contained and runs on its own. It **composes** with the [`memory`](../memory/SKILL.md) skill when installed — `MEMORY.md` is how it improves over time, accumulating conventions, decisions, and ripple traps so the next session doesn't relearn them. If `memory` isn't installed, guardian maintains `MEMORY.md` by hand following the same read → bootstrap → update lifecycle; the workflow is complete either way.

## Protocol details

See [SKILL.md](SKILL.md) for the full loop, the match-vs-change decision rules, the architecture/state-management escalation rule, and the per-stack ripple traps.
