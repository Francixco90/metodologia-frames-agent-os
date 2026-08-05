# agents-dox

The **DOX framework** — a high-performance `AGENTS.md` hierarchy where each `AGENTS.md` is a *binding work contract* for the subtree it governs. The skill makes the agent read the applicable chain of contracts before editing and refresh them after, so the project stays understandable from the nearest `AGENTS.md` plus every parent above it.

## What this does

- **Read before editing** — walk from the repo root to each path you'll touch, reading every `AGENTS.md` along the way. The nearest doc is the local contract; parent docs carry repo-wide rules. When docs conflict, the closer one wins on local details, but no child may weaken DOX.
- **Update after editing** — every meaningful change requires a DOX pass: update the nearest owning `AGENTS.md` (and affected parents/children) when purpose, structure, contracts, workflows, inputs/outputs, preferences, or the child index change. Stale or contradictory text is removed immediately.
- **Bootstrap** — if a repo has no root `AGENTS.md`, the skill scans the project recursively, builds the DOX tree (nesting where complexity warrants), and then continues with the original task.

## When it fires

Any edit in a repository that contains `AGENTS.md` files; when the user mentions DOX, `AGENTS.md`, or doc contracts; or when asked to set up, index, or maintain the tree. It errs toward triggering.

## Doc shape

Each `AGENTS.md` follows a default section order — Purpose, Ownership, Local Contracts, Work Guidance, Verification, Child DOX Index — with broad rules kept in parent docs and concrete details pushed down to children. *Work Guidance* and *Verification* are left empty until real standards or checks exist.

## How it relates to the other skills

Each skill here works standalone; `agents-dox` composes with the rest:

- **vs [`memory`](../memory/SKILL.md)** — `AGENTS.md` holds *instructions and contracts*; `MEMORY.md` holds *durable facts* about the code. Complementary, not competing — run both, don't duplicate.
- **with [`codebase-guardian`](../codebase-guardian/SKILL.md)** — guardian's loop runs inside the DOX contract: read the chain during Orient, honor the nearest contract while editing, and fold the DOX pass into Phase 4 closeout.
- **with [`teammates`](../teammates/SKILL.md)** — each peer reads the same DOX chain and runs its own DOX pass, so parallel edits stay true to the contracts.

## Framework details

See [SKILL.md](SKILL.md) for the full contract: Read Before Editing, Update After Editing, Hierarchy, Child Doc Shape, Style, Closeout, and the bootstrap template.
