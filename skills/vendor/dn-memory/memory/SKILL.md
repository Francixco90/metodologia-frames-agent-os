---
name: memory
description: Maintain durable, hierarchical memory files so context persists across sessions. Use when the user mentions "memory", "context files", "MEMORY.md", "USER.md", project context, codebase documentation, or user preferences, or wants to bootstrap, read, or update durable context, or remember/forget something. Also when starting work in a repository (check for existing MEMORY.md; auto-bootstrap if absent) and after code changes that alter a module's purpose, public surface, or conventions. Owns MEMORY.md (codebase facts) and USER.md (user facts); AGENTS.md belongs to the agents-dox skill. Err toward using it — undertriggering is the bigger failure mode.
---

# Memory

This skill manages two kinds of long-lived context:

- **User memory** — facts about the person Claude is working with: their role, preferences, ongoing projects, things they've asked to be remembered. Lives in one file: `~/.memory/USER.md`.
- **Codebase memory** — facts about a codebase: architecture, conventions, what each module does, gotchas. Lives in a hierarchy: `MEMORY.md` at the repo root, plus `MEMORY.md` in each significant subfolder.
Both kinds of memory follow the same three-operation lifecycle: **bootstrap** (create from scratch), **read** (load before doing related work), **update** (keep in sync as things change).

This skill works standalone. It owns `MEMORY.md` and `~/.memory/USER.md` only. If the repo uses `AGENTS.md` files (the DOX contract hierarchy), those are owned by the **agents-dox** skill — don't bootstrap, rewrite, or manage `AGENTS.md` here. The two are complementary: `MEMORY.md` holds durable *facts* about the code; `AGENTS.md` holds *instructions and contracts*. Keep facts here and contracts there rather than duplicating.

---

## When to use this skill

Use it on any of these cues. The list is non-exhaustive — when in doubt, use it.

| Cue | Operation |
|---|---|
| "Set up memory for this project / repo" | Bootstrap (codebase) |
| "Remember that I prefer X" / "I'm working on Y" / "I'm a Z by trade" | Update (user) |
| "What do you know about me?" / "What's in user memory?" | Read (user) |
| Starting work on an unfamiliar repo | Read (codebase) — if no `MEMORY.md` exists, **auto-bootstrap** |
| Starting any session | Read (user) — load `~/.memory/USER.md` if it exists |
| User asks Claude to forget something durable | Update (user, removal) |
| After adding/removing a module, renaming, or shifting a folder's purpose | Update (codebase) |
| Architecture or convention change | Update (codebase, root) |

Before any operation, always check whether the relevant file exists rather than assuming. For codebase memory, a missing file means "bootstrap now" (see below). For user memory, a missing file means "nothing to read yet" — don't fabricate.

### Auto-bootstrap on first use in a repo

If the skill triggers in a repository context and **no `MEMORY.md` exists at the repo root**, treat that as the signal to bootstrap the structure right away — don't ask first. Run the **Bootstrap codebase memory** workflow below, then continue with whatever the user originally asked for. Tell the user briefly what you created (e.g. "I didn't see any memory files here, so I set up `MEMORY.md` at the root and in `src/auth/`, `src/api/`. Now, about your question…"). The user can always edit or delete the files afterward.

Skip auto-bootstrap only if: (a) the current directory is clearly not a repo (no VCS marker, no project manifest), (b) the user explicitly says not to create memory files, or (c) the workspace is read-only.

---

## File locations

- **User memory:** `~/.memory/USER.md`. Create the `~/.memory/` directory if it doesn't exist.
- **Codebase root memory:** `<repo-root>/MEMORY.md`.
- **Folder-level codebase memory:** `<folder>/MEMORY.md` inside each significant subfolder.
A folder is **significant** if all of these hold:

- It contains source/config files that a person would reasonably read as a unit.
- It has its own coherent purpose (a module, a service, a feature area).
- It's not generated, vendored, or build output.
Skip: `node_modules`, `.git`, `dist`, `build`, `out`, `target`, `.next`, `.venv`, `venv`, `__pycache__`, `.cache`, `coverage`, `vendor`, any folder listed in `.gitignore`, and folders with fewer than ~3 meaningful files (just inline their info into the parent's `MEMORY.md`).

---

## Workflows

### 1. Bootstrap codebase memory

Triggered by: "set up memory for this repo," "create MEMORY files," "initialize project context," **or automatically when the skill triggers in a repo that has no `MEMORY.md`** (see Auto-bootstrap above).

Steps:

1. **Survey the repo.** List the top-level structure, identify the language(s), framework(s), build system, and entry points. Read `README*`, `package.json`/`pyproject.toml`/`Cargo.toml`/`go.mod`, top-level config, and the main entry file(s).
2. **Write the root `MEMORY.md`** using the **Root template** below. Be concrete — name actual files, actual commands, actual conventions you observed. Do not write filler.
3. **Walk the directory tree.** For each significant folder (per the rule above), read enough files to understand its purpose, then write `MEMORY.md` using the **Folder template** below.
4. **Verify.** Re-read each new file. Anything vague ("contains various utilities") is a smell — replace with specifics or delete the line.
5. **Tell the user** which files were created and offer to commit them.
Keep each file short. The root should fit on a screen or two (~50–150 lines). Folder files are usually shorter (~20–80 lines). If a folder file is growing past ~150 lines, that's a signal the folder has multiple concerns — consider whether to split conceptually rather than padding the file.

### 2. Read codebase memory

Triggered by: starting work on a codebase, being asked about a part of the project, or before making changes to a folder.

Steps:

1. Check whether `<repo-root>/MEMORY.md` exists. **If not, run the Bootstrap workflow above first** (don't ask, just do it — then continue), unless one of the auto-bootstrap skip conditions applies.
2. Load the root `MEMORY.md`.
3. For each folder you'll touch, load that folder's `MEMORY.md` if it exists. Also load `MEMORY.md` for any intermediate parent folders on the path — they may carry inherited conventions.
4. If the memory looks stale (mentions files/symbols that don't exist, or contradicts what you see in the code), flag it to the user and offer to update before proceeding.
### 3. Update codebase memory

Triggered by: finishing a non-trivial change, the user saying "update the memory," noticing memory is stale during a read, or moving/adding/removing a folder.

Decision rule: update memory if the change affects something a future reader would need to know — purpose of a module, key entry points, public API surface, dependencies between folders, conventions, gotchas. Don't update for routine internal edits.

Steps:

1. Identify which `MEMORY.md` files are affected. A change to `src/auth/login.ts` likely affects `src/auth/MEMORY.md`. A new top-level folder affects the root `MEMORY.md` (architecture section) and needs a new folder `MEMORY.md`.
2. Read the affected files. Make targeted edits — don't rewrite the file unless its structure is genuinely outdated.
3. If a folder was deleted, delete its `MEMORY.md`. If a folder was renamed, rename and update cross-references.
4. After edits, scan for now-broken references in other `MEMORY.md` files (file paths, symbol names).
### 4. Bootstrap user memory

Triggered by: first time the user wants persistent user-level memory, or `~/.memory/USER.md` doesn't exist when needed.

Steps:

1. Create `~/.memory/` if it doesn't exist.
2. Create `USER.md` from the **User template** below with empty sections or whatever the user has told you so far. Don't fabricate.
3. Tell the user the file exists and how it'll be used.
### 5. Read user memory

Triggered by: session start (if the file exists), or any question that requires knowing the user's preferences/context.

Steps:

1. Read `~/.memory/USER.md`.
2. Apply silently — don't recite it back unless asked. Use the information naturally the way a colleague would, not as if reading from a dossier.
### 6. Update user memory

Triggered by: the user saying "remember that X," "I prefer Y," "I'm working on Z," "forget about W," or anything else that's clearly a durable fact rather than a passing comment.

Steps:

1. Decide which section the fact belongs in (Identity, Preferences, Current Projects, Notes).
2. Read the existing file, make a targeted edit, write it back.
3. Confirm briefly to the user (e.g., "Updated — noted that you prefer tabs over spaces."). Don't dump the whole file back.
Do **not** silently add things the user merely *mentioned* in passing. The bar is "the user clearly wants this to persist," not "the user said it once." When unsure, ask.

Never write into user memory: passwords, API keys, secrets, financial account numbers, government IDs, full addresses, or anything else sensitive enough that a leak of the file would matter.

---

## Templates

### Root `MEMORY.md` template

```markdown
# <Project Name>

<1–3 sentence description of what this project is and who it's for.>

## Stack
- Language(s): ...
- Framework(s): ...
- Build / package manager: ...
- Notable libraries: ...

## Commands
- Install: `...`
- Build: `...`
- Test: `...`
- Lint / format: `...`
- Run locally: `...`

## Architecture
<Short prose or bullet list describing top-level layout and how data/control flows. Name the actual folders.>

## Conventions
- <Concrete convention, e.g. "All async functions use `async`/`await`, never raw promise chains.">
- <Concrete convention, e.g. "Tests live next to source as `*.test.ts`.">

## Where to find things
- <Topic>: `<path>`
- <Topic>: `<path>`

## Gotchas
- <Non-obvious thing a new contributor would trip on.>
```

### Folder `MEMORY.md` template

```markdown
# <folder-name>

## Purpose
<1–3 sentences. What does this folder do, why does it exist?>

## Key files
- `<file>` — <one-line role>
- `<file>` — <one-line role>

## Depends on
- `<other folder>` — <why>

## Used by
- `<other folder>` — <how>

## Patterns / gotchas
- <Non-obvious thing — convention, edge case, historical reason something is the way it is.>
```

Drop any section that genuinely has nothing to say — don't pad.

### `USER.md` template

```markdown
# User Memory

## Identity
<Name, role, relevant background. Only what the user has shared.>

## Preferences
- Communication: <e.g. "Direct, minimal preamble.">
- Formatting: <e.g. "Avoid bullet points in casual replies.">
- Tools: <e.g. "Uses neovim, zsh, Linux.">
- Code style: <e.g. "Tabs. Single quotes in JS.">

## Current projects
- <Project name> — <one-line description, current focus>

## Notes
- <Durable fact the user asked to remember.>
```

---

## Conventions for writing memory files

1. **Be specific.** "Handles authentication" is useless. "Issues JWTs signed with RS256; refresh tokens stored in Redis with 7-day TTL" is useful.
2. **Prefer facts over advice.** Memory files describe what *is*, not what *should be done next time*.
3. **Don't restate code.** If something is obvious from a 10-second look at the file, don't write it down.
4. **Cross-reference, don't duplicate.** If two folders share a convention, put it in the root and reference it.
5. **Keep it current or delete it.** Stale memory is worse than no memory.
6. **No secrets.** Ever.
---

## Failure modes to avoid

- **Hallucinating contents during bootstrap.** Read the actual code before writing about it.
- **Writing memory files for every folder.** Trivial folders (1–2 files, no coherent identity) belong inline in the parent.
- **Updating user memory from a passing comment.** The user mentioning they "tried Rust once" is not a durable fact.
- **Silently overwriting user-edited files.** If a `MEMORY.md` has clearly been hand-edited and you're about to clobber it during a re-bootstrap, ask first.
- **Reciting user memory back unprompted.** Use it the way you'd use anything else you know — naturally, not performatively.
- **Auto-bootstrapping in the wrong place.** Don't create `MEMORY.md` files in a directory that isn't a repo, or when the user has said not to.
