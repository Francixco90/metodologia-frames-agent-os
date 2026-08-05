# Architecture decision record set

| ADR | Decision                                                                      |
| --- | ----------------------------------------------------------------------------- |
| 001 | Greenfield repository isolated from the host worktree.                        |
| 002 | MetodologIA is the only visible product identity.                             |
| 003 | Strict TypeScript monorepo with exact dependency versions.                    |
| 004 | Shared core with Web and Content/Motion ports.                                |
| 005 | One project dossier is the material source of truth.                          |
| 006 | Zod runtime contracts with portable JSON representations.                     |
| 007 | State transitions are allowlisted and fail closed.                            |
| 008 | Receipts and portable IDs are append-only.                                    |
| 009 | Material creative choices use five proposals and one synthesis.               |
| 010 | Persist decisions, evidence, scores and dissent; never chain-of-thought.      |
| 011 | Remotion is the deterministic renderer.                                       |
| 012 | Canonical local skill is `remotion-video-production`; legacy is quarantined.  |
| 013 | NotebookLM is a read-only grounding adapter with explicit coverage.           |
| 014 | n8n transports approved hash-bound packages and defaults to dry-run.          |
| 015 | Producer, verifier, Guardian and human approver are distinct actors.          |
| 016 | Determinism is measured on normalized frame/audio outputs and hashes.         |
| 017 | Parallel work is bounded by a canonical ownership manifest.                   |
| 018 | Release and publication require separate authorization and rollback evidence. |
| 019 | Prior homologs are reference material, never silent forks.                    |
| 020 | Worktrees become permissible only after the first clean target commit.        |

## Recorded compatibility exception

Remotion `4.0.494` references a global `Timer` type from two published
declaration files without defining it. The repository supplies the narrow
ambient alias `types/remotion-timer.d.ts` and keeps `skipLibCheck=false`.
Removing or broadening the alias requires a toolchain ADR update plus a green
typecheck. [CÓDIGO][CONFIG]

## Recorded pnpm execution policy

pnpm `11.9.0` defaults `verifyDepsBeforeRun` to an install action. In the managed
runtime this could purge a valid `node_modules` and initiate an implicit network
install before a read-only `pnpm run` or `pnpm exec`. The workspace fixes
`verifyDepsBeforeRun: false`; dependency mutation is allowed only through the
explicit, reviewable gate `pnpm install --frozen-lockfile`. CI and local closeout
must execute that gate before any script. [CÓDIGO][CONFIG]
