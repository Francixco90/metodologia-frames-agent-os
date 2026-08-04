# Design-OS Fase 1A — verification report

> Date: 2026-08-04 · Branch: `feat/vendor-find-skills` · Base: `b0122bd`
> (post-Fase 3 reconcile gate, PR #49 merged). 1 source, MIT.

## Objective

Vendor 1 find-skills skill (MIT) as text-only, reference-only input for
Design-OS Fase 2A `metodologia-find-skills` homólogo (v2 path + shared
receipt cascade). No execution, no registration, no runtime dependency added.

## What was done

1. Verified source repo + license: `vercel-labs/skills` (MIT, Copyright (c)
   2026 Vercel, Inc.) via LICENSE file at repo root.
2. Cloned at depth 50: `vercel-labs/skills` @
   `ab4fc49265c443279a5deae20297e631470da68c` (`fix(find): show all returned
search results (#1748)`, Bulat Yapparov).
3. Audited file types. `skills/find-skills/` contains a single `SKILL.md`
   (141 lines, 5.4 KB, UTF-8 text). `file` reports no binary/executable.
4. Copied text-only (`.md`) to `skills/vendor/vercel-skills/find-skills/SKILL.md`.
   Copied `LICENSE` to vendor root `skills/vendor/vercel-skills/LICENSE`.
   Excluded repo-root `src/`, `bin/`, `tests/`, `scripts/`, `package.json`,
   `pnpm-lock.yaml`, `.github/`, `.husky/`, `AGENTS.md`, `README.md`,
   `ThirdPartyNoticeText.txt`, `build.config.mjs` (the `skills` CLI package
   itself; not part of the skill).
5. Generated `docs/find-skills/source-lock.json` — 1 vendor entry, per-file
   sha256 (1 file), MIT attribution, known risks, update procedure.
6. Wrote `docs/find-skills/audit-report.md` (per-skill checklist + global
   findings) and `docs/find-skills/architecture.md` (mapping +
   locally-authored derivation contract).
7. Content-type verified: SKILL.md is UTF-8 text (ASCII subset), 0 binary
   leaks.

## Inventory

- 1 skill dir under `skills/vendor/vercel-skills/find-skills/`.
- 1 text file copied (SKILL.md); 0 binaries; 0 binary leaks.
- `docs/find-skills/`: `source-lock.json`, `audit-report.md`,
  `architecture.md`, `verification-report.md` (this file).

### Files vendored

| path                                               | sha256                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `skills/vendor/vercel-skills/LICENSE`              | `661142e53c313d2bb5e1b055f5c0a39001450ff1b5e27b89dc4bc7de9a6352ca` |
| `skills/vendor/vercel-skills/find-skills/SKILL.md` | `c00eeea0e13e74fe4a9d84ba0a8542205a1b736d65f13134fe1a6647eb14976f` |

## Gates

Vendors are post-closure reference-only and excluded from the toolchain
(`skills/vendor/**` in tsconfig, prettierignore, eslint, check-privacy).
Expected: `verify:skills` unaffected (vendor dirs bypass reconcile gate
RCN-009 via `if (name === 'vendor') return false`). Ledger regen absorbs
new vendor files without shifting authored-corpus baseline (vendors are not
authored-eligible).

Run (pending): `pnpm check:repo && pnpm verify:contributions && pnpm
verify:skills && pnpm typecheck && pnpm lint && pnpm test && pnpm
format:check && pnpm ledger:generate`.

## Risks

- find-skills recommends `npx skills find/add` (external CLI, network).
  Vendored reference-only; homólogo must gate install/execute behind user
  confirmation (fail-closed).
- Source repo is the `skills` CLI package; only `skills/find-skills/SKILL.md`
  vendored (not the CLI `src/`/`bin/`). Documented in `audit-report.md`.

## Next gate

Fase 2A — `metodologia-find-skills` homólogo: SKILL.md + LINEAGE.yml +
fixtures + check-skill.mjs, v2 validator `skills[]` entry, shared receipt
9th `package_ref` + cascade re-hash of 8 existing v2 entries'
`receipt_sha256`, registry entry + 4 append-only events, baseline update,
ledger regen, PR upstream Francixco90.
