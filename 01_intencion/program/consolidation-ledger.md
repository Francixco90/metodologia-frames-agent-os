# Consolidation ledger · Frames ContentOS 2026-09

Append-only record of the 2026-09-05 consolidation that produced this repository
(`frames-contentos`) from three divergent Git lines and 22 worktrees with
uncommitted work. Newest entry first. Never rewrite past entries. [CONFIG]

## F14 · Handlers for R1, R2, R3, R3-LOOSE and R5 (2026-09-05)

- `02_proceso/workflows/core/governed-legacy-routes-v1.ts`: four planning handlers in the
  maintenance pattern (zod strict input, `request_hash`, `ROUTED | NEEDS_INPUT`, declared write
  set, `read_only_until_<gate>`); R2 lists candidates and never chooses. Wired into
  `route-intent.mjs` (intent domains `project`, `project-continue`, `task`, `eval`) and the
  first-turn gateway, which now resolves governed routes through handlers instead of the
  `legacy-route-block-v1.ts` coverage-gap envelope (file removed). [CODE]
- Gates `PJ_SCAFFOLD_APPROVED`, `PJ_RESUME_CONFIRMED`, `TK_CONTRACT_APPROVED`, `EV_RUN_APPROVED`
  (manual, fail-closed; 72 → 76) and the `PJ_ | TK_ | EV_` prefixes in `commands-schema.ts`;
  `router.yml` productive handlers active with stop gates; `check-experience-os` expects all
  twelve routes active. Materialization (scaffold, task contract, eval run) stays out of scope:
  the handlers plan, the gates authorize. [CONFIG]

## F13 · Vendor packs and source locks (2026-09-05)

- Finding: 22 of the 23 locked vendor packs are `authority_refs` of first-party hash-bound skills
  (gstack 54 skills, hyperframes 26, genjutsu 17, superpowers 14, remotion-publisher 11, …) and
  `check-creation-v3-skills` / `check-instagram-v2-skills` `stat` those files. Extracting them
  breaks the authority model, so they stay tracked; only the uncited `gsap-skills` (220 KB)
  leaves the tree. The 63 MB question moves to a follow-up program: either registries bind the
  lock's hash instead of the bytes, or vendor stays in tree by design. [CODE]
- Tooling landed: `05_verificacion/scripts/check-vendor-locks.ts` — `pnpm vendor:check` (in
  `verify`) verifies untracked materialized packs against their locks (tracked packs reported as
  registry-governed, absent packs allowed) and `pnpm vendor:sync <pack>` re-materializes from the
  pinned upstream commit; unit test with a local upstream fixture; byte archive
  `~/Agentic_Space/frames-vendor-archive` (26 packs + locks, no remote). [CODE]
- Pre-existing lock drift surfaced: `cinematic-scroll` (15 files), `scroll-world` (7) and
  `crawl4ai-skill/references/content-filters.md` do not match their recorded hashes; locks not
  rewritten. Coverage gap until re-audit. [CODE]
- Receipts `RCP-DEP-PRODUCTION-20260905-002` and `H03-LOCK-SUCCESSION-017` (scripts-only
  `package.json` change); sandbox probe rebound. [CONFIG]

## F10 · Evaluation of the `wip/*` branches (2026-09-05)

Cherry-pick and budget analysis against `main` after F9 (`c5fdb38f`). No branch lands in this
pass; every one keeps `evaluate` with the blocking cause so a later series can resolve it. [CODE]

| Branch                                                                                                                                                                            | Blocking cause                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `canon-v4` (brand-knowledge-os-v4)                                                                                                                                                | 10 new production modules of 241–671 lines and two tests of 893/1687 lines exceed the 200/350-line budgets; needs splitting before it can enter.                                                       |
| `trainer-os-v2-autonomous`                                                                                                                                                        | 286 new files, 43 overlapping `main`; needs its own `verify:trainer-os` gate and a change-budget partition set.                                                                                        |
| `proposal-defense-public-v1`                                                                                                                                                      | Rewrites `check-md-budgets.ts`, `file-budget-policy.ts` and `docs-budget-policy.yml` that F3/F8 already changed; two `check-skill.mjs` of 446/345 lines.                                               |
| `notebooklm-hardening-v3`                                                                                                                                                         | Edits `package.json`, the H03 lock-succession chain and `h03-renderer-adapters` test; must be replayed on top of receipt 016.                                                                          |
| `frames-moneyprinter-skills-v1`                                                                                                                                                   | Vendor `moneyprinter-turbo` without a license receipt; rewrites `documentation-inventory.test.ts`.                                                                                                     |
| `voice-measurement-v2`                                                                                                                                                            | Rewrites `method-explainer-voice-v1.schema.ts` and its fixture/test (146/256/217 line deltas) against a moved `main`.                                                                                  |
| `unattended-state-v1` → `v2` → `integrity-v2`, `authority-capsule-contracts-v1`                                                                                                   | One chain: `integrity-v2` re-exports schemas that only exist in the earlier branches and in the capsule (`unattended-run-state-v2.schema.ts`, 321 lines). Land as one series once the schema is split. |
| `frames-digital-brand-system-v1d`, `frames-career-a1`, `evidence-first-readiness`, `career-consumers-v1`, `faceless-brand-pilot-v1`, `privacy-skills`, `contextual-planner-final` | Mostly modifications of files that `main` has since changed (9–20 overlapping files each); 3–20 conflicts per cherry-pick. Manual replay per branch.                                                   |
| `main-notebooklm-os-efficiency-v2`                                                                                                                                                | Video-os prep documents carry local locators (`check:privacy`); `study-route-v2` modules exceed the production budget.                                                                                 |

## F9 · Generated artifacts regenerated and gated (2026-09-05)

- `check:generated` in `verify`: `generate-brand-projections.ts --check` (new mode), ledger,
  ecosystem inventory and documentation portal in check mode. Regeneration order when
  Markdown changes: `docs:audit -- --write` → `ledger:generate` → `inventory:generate`. [CODE]
- `CTX-CONTENT-LIBRARY` surface for `02_proceso/workflows/content` (schema literal and test
  55 → 56). Dependency-audit receipt `RCP-DEP-PRODUCTION-20260905-001` inherited (scripts-only
  `package.json` change, dependency set unchanged). [CONFIG]

## F8 · CI parity and media-grade test timeouts (2026-09-05)

- `.github/workflows/validate.yml` → single `pnpm verify` step; `05_verificacion/scripts/check-ci-parity.ts`
  (in `check:repo`) fails on drift; unit test `check-ci-parity.test.ts`. [CODE]
- `vitest.config.ts` projects `unit` (213 files) and `media` (22 case-longform files, 90 s
  timeout); `video-os-case-longform-preview-render.fixture.ts` memoizes the ffmpeg preview per
  lavfi graph. Full `pnpm verify`: 71 PASS, 236 test files, 2166 tests, 0 timeouts. [CODE]

## Closure of Part A (2026-09-05)

- `main` = `codex/consolidation-2026-09`; remotes `origin` (Francixco90) and `fork`
  (JaviMetodologIA); nothing pushed. Object store repacked: 1 pack, 0 loose objects. [CODE]
- Deleted after the preconditions passed (771/771 refs present in this repository, `git fsck`
  clean, bundles and `SHA256SUMS` verified): 139 registered worktrees, 12 loose clones, the
  separate store `frames-local-current-v1`, `.quarantine`, `.codex-trash`, the old canonical clone
  and the Downloads zip snapshots. Kept untouched: `.frames-secure`, `worktrees/metodologia-brand-system-v3`
  (repo site-metodologia), `worktrees/nivel-0-digital-brand-v1` (repo conoce-nivel-0), every
  MetodologIA OS directory. [CODE]
- Space: `~/Agentic_Space` 54 GB → 9.3 GB; volume free 123 GiB → 133 GiB (pnpm hard links mean
  removed `node_modules` did not all translate into freed blocks). [CODE]

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
