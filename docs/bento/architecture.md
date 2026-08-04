# Bento → Frames ContentOS architecture mapping

> Reference for Frames ContentOS Fase 2C. Maps the vendored Bento skills
> (`skills/vendor/bento/`) onto the MetodologIA `content-os-bento-*`
> homólogos. MIT-licensed reference; homólogos are locally-authored adaptations.

## Bento model (as vendored)

3 skills, all MIT:

- `bento` (bergside/awesome-design-skills @ `f631a09b`) — grid layout design
  skill (principal). SKILL.md + DESIGN.md.
- `bento-slides` (nyblnet/bento @ `cc038183`) — single-file SKILL.md for
  authoring `.bento.html` decks (JSON-in-HTML; references `bento.page` app).
- `apple-bento-grid` (hubeiqiao/apple-bento-grid @ `235f740b`) — Apple-style
  bento grid presentation card generator (self-contained HTML; screenshot
  export via Playwright).

## Frames ContentOS paradigm

The repo already has `content-os-core` (HTML composition foundation) and
the `content-os-*` family. Fase 2C adds **`content-os-bento-*` homólogos**
derived (locally-authored adaptation) from the vendored Bento skills.

## Capability mapping (vendored → Frames ContentOS homólogo, Fase 2C)

| vendored skill     | Frames ContentOS homólogo (Fase 2C) | type                                                            |
| ------------------ | ----------------------------------- | --------------------------------------------------------------- |
| `bento`            | `content-os-bento-grid`             | build (principal; grid layout design; dep `content-os-core`)    |
| `bento-slides`     | `content-os-bento-slides`           | build (deck authoring; .bento.html JSON-in-HTML; network-aware) |
| `apple-bento-grid` | `content-os-apple-bento-grid`       | build (Apple-style stat cards; self-contained HTML; screenshot) |

## License guard

- Vendored skills are **MIT** (all 3 verified). MIT permits redistribution +
  modification with attribution.
- Homólogos are **locally-authored adaptations** (`LicenseRef-MetodologIA-Internal`,
  `derivation_mode: locally-authored-adaptation`). MIT attribution preserved
  in each `LINEAGE.yml` (`Derivada de <vendor-skill> (<repo>, MIT)`).
- `check-skill.mjs` per homólogo is self-contained (no import of vendor code
  at runtime; vendor path is read-only reference).
- `runtime-boundary.yml` declares no new runtime dep. `apple-bento-grid`
  screenshot export references Playwright — already toolchain-available;
  optional, not a hard dep. No `package.json` mutation expected.

## Determinism contract

Bento grids are static HTML (deterministic layout). Frames ContentOS inherits:
no `Date.now()` / `Math.random()` in composition code, no network in render
path, fail-closed remote adapters, hash-bound homólogos (4 lifecycle events,
append-only).

## What Fase 1C does NOT do

- Does not register vendored skills in any registry (vendors bypass
  `verify:skills`).
- Does not add a runtime dep (no `package.json` mutation; Playwright already
  toolchain-available as optional).
- Does not build, type-check, lint or execute vendor files.
- Does not create any `content-os-bento-*` native skill (Fase 2C homólogos,
  separate PRs).

## Fase 2C inputs (from this audit)

- This mapping + the locally-authored derivation mode.
- MIT attribution per `LINEAGE.yml`.
- 1 PR batched 3 (`content-os-bento-grid`, `content-os-bento-slides`,
  `content-os-apple-bento-grid`). Dep `content-os-core` (exists).
