---
name: codebase-guardian
description: Disciplined loop for safely editing existing codebases (TypeScript/Node, Python/Django, Flutter/Dart, Rust/Tauri):  validate changes against the real toolchain (type-checkers, linters, build, tests), match or deliberately change existing patterns/structure/naming/architecture, track the ripple to callers/types/tests/docs/configs, record learnings to MEMORY.md. Trigger on any non-trivial edit — follow the existing pattern, don't break anything, fix without errors, match the codebase, change architecture or state management, refactor the structure, or rename across the project. Err on trigger.
---

# Codebase Guardian

A workflow for changing code that already exists without breaking it, fighting its conventions, or leaving loose ends.

It is built on a simple idea: **an edit isn't done when the diff looks right — it's done when the toolchain is green, it fits the codebase, and everything that depended on the old behavior has been updated.**

This skill does not replace a language server. It tells you to *run the real one* (and the real linter, compiler, and tests) instead of judging code correctness by eye. Eyeballing types is the single biggest source of avoidable errors.

## When this applies

Use it for any meaningful edit to an existing project. Skip it for throwaway scripts, brand-new files in an empty repo, or one-line answers where there's nothing to break.

This skill changes the *real* codebase: it edits actual files, runs the project's real migrations/codegen/formatters, and leaves the repository in a working, applied state — not a description of changes to make later. "Done" means the change is on disk and the toolchain is green.

## Companion: the memory skill (recommended, not required)

This skill is **self-contained** — it runs end to end on its own. It composes with the `memory` skill (or `memory-management`) when that's installed, because `MEMORY.md` is how this skill "improves over time": it's the durable store for conventions, decisions, and ripple traps, so the next session doesn't relearn them.

The MEMORY.md lifecycle is part of this skill's loop either way:

- **At the start of every run**, read `MEMORY.md` (repo root + the relevant module). If none exists, **bootstrap** it before editing — a repo with no memory is the first thing this skill fixes.
- **At the end of every run**, **update** `MEMORY.md` with what was learned.

If the `memory` skill is installed, invoke it to perform those steps — it handles bootstrap/read/update and the file hierarchy for you. If it isn't, do the same read → bootstrap → update lifecycle by hand following this skill's instructions. Either way the workflow is complete; the memory skill just automates the bookkeeping and is strongly recommended.

## The loop

Run these four phases in order. Don't skip ahead — most breakage comes from editing before understanding.

### Phase 1 — Orient (understand before touching)

1. **Read memory first (via the memory skill).** Use the memory skill to load `MEMORY.md` at repo root and in the relevant module/directory — it records architecture, conventions, and past decisions. If none exists, use the memory skill to bootstrap it from the codebase before going further.
2. **Identify the stack.** Detect language and framework from manifest files (`package.json`, `pyproject.toml`/`requirements.txt`, `pubspec.yaml`, `Cargo.toml`). Then read the matching reference for the exact validation commands and per-stack ripple rules:
   - TypeScript / Node → `references/typescript.md`
   - Python / Django → `references/python.md`
   - Flutter / Dart → `references/flutter.md`
   - Rust / Tauri → `references/rust.md`

   The reference files capture the durable workflow, but specific commands, flags, config keys, and APIs drift between versions. **Pin the actual versions in use** (from the lockfile/manifest — e.g. `package.json` + lockfile, `Cargo.lock`, `pubspec.lock`) and, when a version is recent, unfamiliar, or the reference's guidance might be outdated, **search the web for the current official docs for that exact version** before relying on a command or API. Trust the live docs over both the reference and your training data — framework conventions, deprecations, and CLI flags change. Treat the references as the map, the web as the current road conditions.
3. **Study the local pattern.** Before writing anything, read 2-3 sibling files near where you'll edit. Note: naming, file/folder layout, error handling, **state management, and overall architecture** (layering, DI, how features are organized), how dependencies are imported and injected, test style. The goal is that your edit should be indistinguishable in style from code already there — unless the user chose otherwise (Phase 2).
4. **Capture a green baseline.** Run the project's type-check/lint/test commands *before* editing. If something is already red, you need to know now, so you don't get blamed for it later — and so you can tell signal from noise after your change.

### Phase 2 — Decide: match or change

Once you understand the existing pattern, surface a choice rather than silently picking. State the pattern you found in one or two sentences, then offer:

- **Follow it** — your edit conforms to what's there. This is the default and the right call most of the time; consistency beats local cleverness.
- **Change it** — you deviate on purpose (the existing pattern is buggy, deprecated, or genuinely unfit). If so, say *why*, and treat the change as its own ripple: changing a pattern in one place often means it should change everywhere, or the codebase now has two competing patterns (a cost worth naming).

For small, obvious edits where the pattern is unambiguous, just follow it and mention the choice in one line. Reserve the explicit prompt for cases where deviating is tempting or the pattern is contested.

**When the user is the one driving the change.** This skill is just as much for *intentionally reshaping* a codebase as for preserving it — restructuring folders, switching a state-management or error-handling pattern, renaming a concept across the project, splitting or merging modules, or migrating to a new convention. When that's the goal, "change it" is the chosen path from the start. In that case:

- Pin down the *target* pattern as concretely as the current one — what the new structure/naming/convention should be — so the edit is consistent rather than ad hoc.
- Treat the migration as a large ripple (Phase 3): a structural change touches imports, paths, configs, tests, and docs everywhere, not just the renamed thing. Do it completely, or the codebase ends up half-migrated with two competing patterns.
- Decide and state whether this is a *full* migration (change everywhere) or a *beachhead* (new pattern here, old pattern elsewhere for now) — and record that decision so future edits know which side of the line they're on.
- Keep the toolchain green at each meaningful step rather than only at the very end; a big restructure that compiles only at the finish is hard to debug.

**Architecture & state-management decisions are not Claude's to assume.** When a change involves a significant architectural choice — which state-management approach to use (BLoC vs Riverpod vs Provider; Redux vs Zustand vs Context; etc.), overall architecture (layered vs feature-first, clean architecture, MVVM, hexagonal), error-handling strategy, data/dependency-injection approach, API/contract style, or folder structure — and the codebase doesn't already settle it, **ask the user before committing.** Don't silently pick an architecture; these decisions are expensive to reverse and are the user's call.

When asking, present the realistic options with the tradeoff each makes (not just a list), and include a "match what's already here" option when an existing pattern exists. Once the user chooses:

1. **Get the latest reference.** Search the web for the current official docs / recommended patterns for the chosen approach *at the version in the lockfile* — state-management libraries especially change their recommended APIs across major versions (e.g. Riverpod's provider syntax, Bloc's event-handler API). Follow the current guidance, not a remembered older pattern.
2. **Record the decision** in MEMORY.md via the memory skill — what was chosen and why — so it becomes the project's convention and future edits follow it without re-asking.

If the codebase already has a clear, consistent architectural answer and the user hasn't asked to change it, follow it (and note it) rather than re-opening a settled decision.

### Phase 3 — Edit, then trace the ripple

Make the change following the chosen pattern. Then — before declaring done — find everything the change touched indirectly. This is the part that's easy to forget and expensive to miss.

For any symbol you changed (function signature, type/interface, exported name, config key, DB schema, API contract), ask and check:

- **Callers** — who calls this? Did the signature/return/behavior change under them? Grep for the symbol across the repo; don't trust memory.
- **Types** — does a changed shape break a type elsewhere? (Let the type-checker answer — see Phase 4.)
- **Tests** — do existing tests assert the old behavior? Update them to match the new intent (don't just delete failing tests to get green).
- **Docs & comments** — does a README, docstring, or inline comment now lie?
- **Config / env / schema** — renamed a key, env var, route, or migration? Update every place that reads it, on both sides of any client/server boundary.
- **The other side of a contract** — if you changed an API, update the client; if you changed a model, update the serializer/DTO; if you changed a shared type, update both producers and consumers.

The per-stack reference lists the specific ripple traps for each framework (e.g. Django migrations, Flutter `build_runner` codegen, Rust trait impls). Read it.

### Phase 4 — Verify and record

1. **Run the real toolchain again.** Type-check, lint, build, and run the relevant tests. Green is the bar. If you can't run them, say so explicitly and tell the user exactly which commands to run — don't claim correctness you didn't verify.
2. **Compare against baseline.** New failures are yours; pre-existing ones you flag but don't silently inherit.
3. **Record what you learned** to MEMORY.md (via the memory skill): a convention you discovered, a non-obvious dependency between modules, a decision the user made about following vs. changing a pattern, a ripple trap that bit you. Keep entries short and durable — the point is that the next session (you or another agent) doesn't relearn it. This is how the skill "improves over time": the codebase accumulates its own playbook.

## Operating principles

- **Validate with tools, not eyes.** The whole first job — "avoid language errors" — comes down to running the type-checker, linter, and compiler and believing them over your intuition.
- **Apply changes to the real codebase.** Edit the actual files, run the actual migrations/codegen, leave the repo working. Don't hand back a plan when the user asked for a change.
- **Prefer current web docs over memory.** Commands, flags, config keys, and framework APIs go stale. For the version actually in the lockfile, check the official docs on the web before trusting a remembered command — especially for anything recent or unfamiliar.
- **Consistency is a feature.** A slightly worse pattern used everywhere usually beats a slightly better pattern used once.
- **Find dependents by searching, not remembering.** Always grep for a changed symbol across the whole repo before calling an edit complete.
- **Never green-wash.** Deleting a failing test or loosening a type to silence an error is making the problem invisible, not solving it. Say what's actually wrong.
- **Leave the map better than you found it.** Every session should make MEMORY.md a little more useful.

## Reference files

Read the one matching the project's stack in Phase 1 — each has the exact commands and the ripple traps specific to that framework:

- `references/typescript.md` — TypeScript / Node (tsc, ESLint, common TS framework gotchas)
- `references/python.md` — Python / Django (mypy/pyright, ruff, migrations, serializers)
- `references/flutter.md` — Flutter / Dart (analyzer, build_runner codegen, BLoC/router sync)
- `references/rust.md` — Rust / Tauri (cargo check/clippy, trait impls, IPC command contracts)
