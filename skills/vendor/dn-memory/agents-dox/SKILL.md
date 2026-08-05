---
name: agents-dox
description: Use when working in a repository that uses the DOX AGENTS.md hierarchy — a tree of AGENTS.md files that act as binding work contracts for their subtrees. Before editing any file, read the applicable chain of AGENTS.md from the repo root down to the nearest one covering the path; after every meaningful change, run a DOX pass to update the nearest owning AGENTS.md and any affected parents or children. Trigger on any edit in a repo that contains AGENTS.md files, when the user mentions DOX, AGENTS.md, or doc contracts, and when asked to set up, index, or maintain the AGENTS.md tree. If a repo has no AGENTS.md yet, bootstrap the tree before continuing. Err on trigger.
---

# DOX framework

DOX is a high-performance AGENTS.md hierarchy: a tree of `AGENTS.md` files that serve as binding work contracts for the subtrees they govern. This skill makes the agent read the applicable DOX chain before editing and refresh it after — so the project stays understandable and the contracts stay true.

Follow DOX instructions across any edits.

## Core Contract

- `AGENTS.md` files are binding work contracts for their subtrees.
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable `AGENTS.md` plus every parent `AGENTS.md` above it.

## Read Before Editing

1. Read the root `AGENTS.md`.
2. Identify every file or folder you expect to touch.
3. Walk from the repository root to each target path.
4. Read every `AGENTS.md` found along each route.
5. If a parent `AGENTS.md` lists a child `AGENTS.md` whose scope contains the path, read that child and continue from there.
6. Use the nearest `AGENTS.md` as the local contract and parent docs for repo-wide rules.
7. If docs conflict, the closer doc controls local work details — but no child doc may weaken DOX.

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning `AGENTS.md` when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- `AGENTS.md` creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root `AGENTS.md` is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index.
- Child `AGENTS.md` files own domain-specific instructions and their own Child DOX Index.
- Each parent explains what its direct children cover and what stays owned by the parent.
- The closer a doc is to the work, the more specific and practical it must be.

## Child Doc Shape

- Create a child `AGENTS.md` when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards.
- **Work Guidance** must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty.
- **Verification** must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists.

Default section order:

- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational.
- Document stable contracts, not diary entries.
- Put broad rules in parent docs and concrete details in child docs.
- Prefer direct bullets with explicit names.
- Do not duplicate rules across many files unless each scope needs a local version.
- Delete stale notes instead of explaining history.
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist.

## Closeout

1. Re-check changed paths against the DOX chain.
2. Update nearest owning docs and any affected parents or children.
3. Refresh every affected Child DOX Index.
4. Remove stale or contradictory text.
5. Run existing verification when relevant.
6. Report any docs intentionally left unchanged and why.

## User Preferences

When the user requests a durable behavior change, record it in the root `AGENTS.md` (for project-wide preferences) or the relevant child `AGENTS.md` (for scoped ones).

## Bootstrapping a repo (no AGENTS.md yet)

If the skill triggers in a repository that has **no root `AGENTS.md`**, build the DOX tree before continuing with the original task:

1. Scan the project recursively. Go deep — read files, not just folder names — to evaluate complexity and find the durable boundaries that deserve their own contract.
2. Create the root `AGENTS.md` using the template below, filling the Child DOX Index with the children you identified.
3. Create a child `AGENTS.md` in each durable boundary (per **Child Doc Shape**), nesting further where complexity warrants it.
4. Tell the user what you created, then resume their task.

Root `AGENTS.md` template:

```markdown
# <Project> — DOX Root

## Purpose
<What this project is and who it's for.>

## Ownership
<Who/what owns the top level; what stays owned by the root vs delegated to children.>

## Local Contracts
<Project-wide instructions, global preferences, durable workflow rules.>

## Work Guidance
<Current project standards / user instructions. Leave empty if none yet.>

## Verification
<Existing checks (build/test/lint commands). Leave empty if none yet.>

## Child DOX Index
- `<path>/AGENTS.md` — <what this child covers>
- `<path>/AGENTS.md` — <what this child covers>
```

When a fresh root `AGENTS.md` has not been indexed yet, its Child DOX Index should carry this directive until the scan is done:

> This project is not yet indexed. Before continuing you must scan the project, build the DOX tree, and replace this message with the actual index. Go deep and scan files recursively to properly evaluate complexity and create nested DOX files where needed.

## Composing with other skills

This skill is self-contained — it never depends on another skill being installed. It also composes:

- **DOX vs `memory`** — `AGENTS.md` (DOX) holds *binding instructions and contracts* for a subtree; `MEMORY.md` (the `memory` skill) holds *durable factual context* about the codebase. They are complementary: use DOX for "what the rules are here," memory for "what this code is and how it works." A repo can run both; keep contracts in `AGENTS.md` and facts in `MEMORY.md` rather than duplicating.
- **DOX + `codebase-guardian`** — in a DOX repo, guardian's loop runs *inside* the DOX contract: read the applicable `AGENTS.md` chain during Orient, honor the nearest contract while editing, and include the DOX pass (update owning `AGENTS.md` + indexes) in guardian's Phase 4 closeout.
- **DOX + `teammates`** — every peer reads the same DOX chain before claiming work and runs a DOX pass on its own changes, so parallel edits don't drift from the contracts.
