# Design-OS Fase 1B — verification report

> Date: 2026-08-04 · Branch: `feat/vendor-impeccable` · Base: `b0122bd`
> (post-Fase 3 reconcile gate, PR #49 merged). 1 source, Apache-2.0.

## Objective

Vendor 1 impeccable generator-based design skill (Apache-2.0) as text-only,
reference-only input for Design-OS Fase 2B `design-impeccable` homólogo (H-03
path, per-skill runtime-boundary). No execution, no registration, no runtime
dependency added.

## What was done

1. Verified source repo + license: `pbakaus/impeccable` (Apache-2.0,
   Copyright pbakaus) via LICENSE file at repo root.
2. Cloned at depth 50: `pbakaus/impeccable` @ `ae5e951` (`Sync generated
provider output`).
3. Audited file types. Canonical skill at `skill/SKILL.src.md` (85 lines) +
   `skill/agents/` (4) + `skill/reference/` (35) + `skill/scripts/` (86) +
   `cli/` (25, the `npx impeccable` engine) + root manifest docs. `file`
   reports all as text (node scripts as `text executable` with shebang, not
   binaries).
4. Copied text-only via `rsync` (excluding `node_modules`/`.git`):
   - `skill/` → `skills/vendor/impeccable/impeccable/skill/`
   - `cli/` → `skills/vendor/impeccable/impeccable/cli/`
   - Root: `LICENSE` → `skills/vendor/impeccable/LICENSE`; `NOTICE.md`,
     `DESIGN.md`, `PRODUCT.md`, `package.json`, `README.md`, `README.npm.md`,
     `biome.json`, `skills-lock.json` → `skills/vendor/impeccable/impeccable/`.
5. Excluded: 16 agent-platform install copies (`.claude/`, `.cursor/`,
   `.gemini/`, `.grok/`, `.qoder/`, `.trae/`, `.trae-cn/`, `.vibe/`, `.kiro/`,
   `.pi/`, `.rovodev/`, `.opencode/`, `.agents/`, `.github/skills/`,
   `plugin/skills/` — redundant distribution targets), `tests/` (89),
   `extension/`, `demos/`, `docs/` (6 dev ADRs), `scripts/` root (20
   build/release/test), `bun.lock`, `node_modules/`, `.git/`, `.impeccable/`,
   `.codex/`, `.github/`.
6. Generated `docs/impeccable/source-lock.json` — 1 vendor entry, 159
   per-file sha256 under `impeccable/` + vendor_root_hashes LICENSE, Apache-2.0
   attribution + NOTICE, known risks, update procedure. (Generated
   programmatically via node: walk + sha256.)
7. Wrote `docs/impeccable/audit-report.md` (per-skill checklist + global
   findings) and `docs/impeccable/architecture.md` (mapping +
   locally-authored derivation contract).
8. Content-type verified: all 160 files text (UTF-8/ASCII), 0 binary leaks.

## Inventory

- 1 skill dir under `skills/vendor/impeccable/impeccable/` (`skill/` +
  `cli/` + root manifest docs) + `skills/vendor/impeccable/LICENSE`.
- 159 text files under `impeccable/` + 1 LICENSE at vendor root = 160 total.
- 0 binaries; 0 binary leaks.
- `docs/impeccable/`: `source-lock.json`, `audit-report.md`,
  `architecture.md`, `verification-report.md` (this file).

### Files vendored (summary by subtree)

| subtree                            | files   | content                                                                                                                                                                  |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `impeccable/skill/SKILL.src.md`    | 1       | canonical doctrine (85 lines)                                                                                                                                            |
| `impeccable/skill/agents/`         | 4       | manual-edit-applier, asset-producer, documenter, finish-reviewer                                                                                                         |
| `impeccable/skill/reference/`      | 35      | new-work, craft-floor, operate, shape, typography, color, motion, ios, android, anti-patterns, design-system, extract, redesign, critique, harden, polish, animate, live |
| `impeccable/skill/scripts/`        | 86      | context, palette, image-gen, live-edit, critique-storage, hooks                                                                                                          |
| `impeccable/cli/`                  | 25      | `npx impeccable` engine (antipattern, design-system, findings, screenshots, fonts, registry)                                                                             |
| `impeccable/` root docs            | 8       | NOTICE.md, DESIGN.md, PRODUCT.md, package.json, README.md, README.npm.md, biome.json, skills-lock.json                                                                   |
| `skills/vendor/impeccable/LICENSE` | 1       | Apache-2.0 LICENSE                                                                                                                                                       |
| **total**                          | **160** |                                                                                                                                                                          |

Per-file sha256 in `source-lock.json` (159 hashes + vendor_root_hashes
LICENSE).

## Gates

Vendors are post-closure reference-only and excluded from the toolchain
(`skills/vendor/**` in tsconfig, prettierignore, eslint, check-privacy).
Expected: `verify:skills` unaffected (vendor dirs bypass reconcile gate
RCN-009 via `if (name === 'vendor') return false`). Ledger regen absorbs new
vendor files without shifting authored-corpus baseline (vendors are not
authored-eligible; not in baseline tree).

Run (pending): `pnpm check:repo && pnpm verify:contributions && pnpm
verify:skills && pnpm verify:content-os && pnpm verify:ai-runtime && pnpm
typecheck && pnpm lint && pnpm test && pnpm format:check && pnpm
ledger:generate`.

## Risks

- Generator-based: `cli/` + `skill/scripts/` are runtime-executable in
  upstream. Vendored reference-only; homólogo must gate execute/screenshot/
  install behind user confirmation (fail-closed).
- `NOTICE.md`: ios.md/android.md distilled from ehmo/platform-design-skills
  (MIT). MIT-compatible; attribution preserved in vendored `NOTICE.md`.
- Source canónico `skill/SKILL.src.md` (not `SKILL.md`); 16 agent-platform
  copies NOT vendored (redundant). Documented in `audit-report.md`.

## Next gate

Fase 2B — `design-impeccable` homólogo (batch with `design-ui-ux-pro-max` +
`design-frontend-design`): SKILL.md + LINEAGE.yml + fixtures +
check-skill.mjs + per-skill `receipts/runtime-boundary.yml`, H-03 validator
`skills[]` entry, registry entry + 4 append-only events, baseline update,
ledger regen, PR upstream Francixco90.
