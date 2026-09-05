# Consolidation ledger · Frames ContentOS 2026-09

Append-only record of the 2026-09-05 consolidation that produced this repository
(`frames-contentos`) from three divergent Git lines and 22 worktrees with
uncommitted work. Newest entry first. Never rewrite past entries. [CONFIG]

## Bases

| Line                      | Remote                                        | Commit     | Tag                          |
| ------------------------- | --------------------------------------------- | ---------- | ---------------------------- |
| Public (PR target `main`) | `Francixco90/metodologia-frames-agent-os`     | `3f5b31d8` | `consolidation/base-public`  |
| Private (PR target fork)  | `JaviMetodologIA/metodologia-frames-agent-os` | `ba064ac7` | `consolidation/base-private` |
| Merge base                | —                                             | `a70dc1e1` | —                            |

Merge commit: `12c12351` (`merge: consolidate private main (ba064ac7) into public main (3f5b31d8)`).
The resolution policy per path class is recorded in that commit body. [CODE]

## Preservation evidence (outside the repository)

Staging root `~/Downloads/_frames-consolidacion/` with `SHA256SUMS` (176 files):
`bundles/canon-all-20260905.bundle` (all refs of the previous canonical store, 1.2 GB,
`git bundle verify` PASS), `lfs/canon-lfs.tar` (65 LFS objects, 590 MB), `untracked/*.tar`
(29 archives, one per dirty worktree, taken before any commit), `frames-secure/` (offline
vault + personal `revision-cv/`, never versioned), `quarantine/` (metadata and bundle of the
2026-08-29 quarantine). [CODE]

## Uncommitted work harvested as `wip/*` branches

Each branch = the worktree's branch plus one commit `wip(consolidation): preserve …`.
Working-tree deletions were not committed (they were unmaterialized LFS media). The PII
pre-commit hook was skipped at harvest time (`pii-unscanned`); `pnpm check:privacy` runs on
everything that lands in `main`. [CODE]

| Branch                                 | Origin worktree                                                             | Files | Disposition    | Landed | Note                                                                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------- | ----: | -------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wip/main-notebooklm-os-efficiency-v2` | `metodologia-frames-agent-os` (main clone)                                  |    14 | evaluate (F10) | —      | 9 video-os prep documents carry local locators (`check:privacy` fail-closed) and need sanitising; `study-route-v2` modules exceed the 200-line production-code budget; `.tmp-verify-site.mjs` scratch discarded |
| `wip/authority-capsule-contracts-v1`   | `.worktrees/…-authority-capsule-contracts-v1`                               |     5 | evaluate (F10) | —      | applies cleanly but `unattended-run-state-v2.schema.ts` (321 lines) exceeds the production-code budget                                                                                                          |
| `wip/cv-dsf-v1`                        | `.worktrees/…-cv-dsf-v1`                                                    |     2 | archive        | —      | already present in public main (empty cherry-pick)                                                                                                                                                              |
| `wip/frames-digital-brand-system-v1d`  | `worktrees/frames-digital-brand-system-v1d`                                 |    32 | evaluate (F10) | —      | 20 conflicts on cherry-pick                                                                                                                                                                                     |
| `wip/frames-career-a1`                 | `frames-career-a1`                                                          |    22 | evaluate (F10) | —      | 5 conflicts                                                                                                                                                                                                     |
| `wip/proposal-defense-public-v1`       | `.worktrees/…-proposal-defense-public-v1`                                   |    75 | evaluate (F10) | —      | 7 conflicts; overlaps merged adoption project                                                                                                                                                                   |
| `wip/frames-moneyprinter-skills-v1`    | `worktrees/frames-moneyprinter-skills-v1` (store `frames-local-current-v1`) |    20 | evaluate (F10) | —      | 4 conflicts; vendor `moneyprinter-turbo` needs license receipt                                                                                                                                                  |
| `wip/evidence-first-readiness`         | `.worktrees/…-evidence-first-readiness`                                     |    16 | evaluate (F10) | —      | 14 conflicts                                                                                                                                                                                                    |
| `wip/career-consumers-v1`              | `.worktrees/…-career-consumers-v1`                                          |    11 | evaluate (F10) | —      | 10 conflicts                                                                                                                                                                                                    |
| `wip/faceless-brand-pilot-v1`          | `.worktrees/…-faceless-brand-pilot-v1`                                      |    11 | evaluate (F10) | —      | 4 conflicts                                                                                                                                                                                                     |
| `wip/voice-measurement-v2`             | `.worktrees/…-voice-measurement-v2`                                         |     8 | evaluate (F10) | —      | 4 conflicts                                                                                                                                                                                                     |
| `wip/privacy-skills`                   | `.worktrees/…-privacy-skills`                                               |     5 | evaluate (F10) | —      | 3 conflicts                                                                                                                                                                                                     |
| `wip/contextual-planner-final`         | `.worktrees/…-contextual-planner-final`                                     |    11 | evaluate (F10) | —      | 7 conflicts                                                                                                                                                                                                     |
| `wip/trainer-os-v2-autonomous`         | `worktrees/trainer-os-v2-autonomous`                                        |   337 | evaluate (F10) | —      | largest WIP; own `verify:trainer-os` gate required                                                                                                                                                              |
| `wip/canon-v4`                         | `metodologia-frames-agent-os-canon-v4`                                      |    58 | evaluate (F10) | —      | `brand-knowledge-os-v4` workflow + 9 skills + registry                                                                                                                                                          |
| `wip/notebooklm-hardening-v3`          | `.worktrees/…-notebooklm-hardening-v3`                                      |    51 | evaluate (F10) | —      | overlaps the public notebooklm-os rewrite                                                                                                                                                                       |
| `wip/unattended-state-v1`              | `.worktrees/…-unattended-state-v1`                                          |    10 | archive        | —      | superseded by `wip/unattended-state-integrity-v2` (chain v1 → v2 → integrity-v2)                                                                                                                                |
| `wip/unattended-state-v2`              | `.worktrees/…-unattended-state-v2`                                          |     4 | archive        | —      | superseded by `wip/unattended-state-integrity-v2`                                                                                                                                                               |
| `wip/unattended-state-integrity-v2`    | `.worktrees/…-unattended-state-integrity-v2`                                |     6 | evaluate (F10) | —      | head of the unattended-state chain                                                                                                                                                                              |

Private canon-v3 code (`notebooklm-content-v3` contracts, `notebooklm-canon-v3` scripts and
tests) is not in `main`: it depends on private contract shapes that conflict with the public
`notebooklm-prompt-v1` / `notebooklm-studio-v1` exports. Reachable at
`consolidation/base-private`; disposition evaluate (F10). [CODE]

## Coverage gaps

- `.worktrees/metodologia-frames-agent-os-pr174-integration` was not a Git checkout; archived as
  `untracked/pr174-integration.tar` (node_modules excluded), not landed. [CODE]
- The private GitHub remote returned `Repository not found` for the available credentials; the
  private line exists only in the local object store and its bundle. `fork` remote is configured
  for the user to push when credentials allow. [CODE]
- Video OS `case-longform` unit files time out at 10 s under full-suite load on the pristine
  public base as well (same 8 files, 49 tests); they pass in isolation. Tracked for F8. [CODE]
