# rembg-bg-removal vendor architecture — Fase 1J

> Vendor root: `skills/vendor/rembg-bg-removal/` · 1 skill · MIT ·
> Reference-only · **FAIL-CLOSED tool skill.**

## Layout

```
skills/vendor/rembg-bg-removal/
├── LICENSE                              (MIT, from source root)
└── rembg/
    ├── SKILL.md                         (background-removal tool guidance)
    ├── references/
    │   └── models_and_flags.md          (support text, rembg models + CLI flags)
    └── scripts/
        ├── run_rembg.sh                 (shell script — text reference, NOT executed)
        └── setup_env.sh                 (shell script — text reference, NOT executed)
```

5 files total (4 in skill dir + 1 LICENSE at vendor root).

## Source map

| vendored skill | source repo                | commit    | license | source path | destination                             | files       |
| -------------- | -------------------------- | --------- | ------- | ----------- | --------------------------------------- | ----------- |
| `rembg`        | `OpenGHz/rembg-bg-removal` | `3e9e829` | MIT     | `/` (root)  | `skills/vendor/rembg-bg-removal/rembg/` | 4 + LICENSE |

Source commit: `3e9e829db5921e5754fd82af645f82b7357446ee`. LICENSE at source root
("Copyright (c) 2026 Haizhou Ge") — copied to vendor root.

## Toolchain isolation

Vendored skill is **post-closure reference-only** and excluded from the
toolchain:

- **tsconfig.json** line 23: `"exclude": [..., "skills/vendor/**"]` — not typechecked.
- **.prettierignore** line 30: `skills/vendor/**` — not formatted.
- **eslint**: vendor dirs excluded.
- **check-privacy.ts** line 40: `isVendor()` bypass — not privacy-scanned.
- **reconcile-skill-registries.ts** line 139: `if (name === 'vendor') return false`
  — vendor dirs bypass reconcile gate RCN-009.
- **Shell scripts NOT executable**: vendored as text reference; no `chmod +x`,
  no shebang execution, not invoked by any validator or runtime.
- **Post-closure no baseline shift**: ledger regen absorbs new vendor files
  without shifting authored-corpus baseline.

## Homólogo wiring

| vendored skill | MetodologIA homólogo | validator | registry                                           | per-skill runtime-boundary      | execution boundary           |
| -------------- | -------------------- | --------- | -------------------------------------------------- | ------------------------------- | ---------------------------- |
| `rembg`        | `media-rembg`        | H-03      | `registries/skills/creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` | `requires_user_confirmation` |

### Homólogo derivation contract (fail-closed)

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `execution_boundary: requires_user_confirmation` — **fail-closed**
- `authority_refs`:
  - `skills/vendor/rembg-bg-removal/rembg/SKILL.md` (read-only reference)
  - `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de rembg (OpenGHz/rembg-bg-removal, MIT)`

### What the homólogo preserves vs. adapts

**Preserves (clean-room prose):**

- Background-removal capability intent: remove image backgrounds via rembg.
- Model + flag reference (references/models_and_flags.md) — described in prose.
- Setup + run workflow (scripts) — described in prose, NOT executed.

**Adapts (MetodologIA context, fail-closed):**

- Attribution: `Derivada de rembg (OpenGHz/rembg-bg-removal, MIT)`.
- Registry: H-03 per-skill runtime-boundary with
  `execution_boundary: requires_user_confirmation`.
- `check-skill.mjs` self-contained (no import of vendor code; scans tokens;
  forbids `Math.random`/`Date.now`; forbids auto-execution of binary/network).
- Homólogo **describes** the capability in prose and **gates** any execution
  behind explicit user confirmation. NO auto-execute binary/install/network.
  Matches MetodologIA "no activar conectores ni publicar".

## License guard

- Vendored skill is **MIT** (LICENSE at source root, copied to vendor root). MIT
  permits redistribution + modification with attribution.
- Homólogo is a **clean-room prose adaptation** (`LicenseRef-MetodologIA-Internal`,
  `derivation_mode: clean-room-prose-from-permissive-reference`,
  `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- `check-skill.mjs` self-contained (no import of vendor code) → no viral license
  surface.
- Vendor copy (incl. shell scripts) excluded from toolchain → not typechecked,
  not linted, not executed, not in `verify:skills`.

## Per-file hashes

| file                                   | sha256                                                             |
| -------------------------------------- | ------------------------------------------------------------------ |
| `rembg/SKILL.md`                       | `c6eb1fc3995816fde910a2e2af97bf7131092f8b44ff4069ae5450e48d0cb05c` |
| `rembg/references/models_and_flags.md` | `531d06b477fc51dee54f32f921e1546ba8a9e66224adb3382874ae791e927acc` |
| `rembg/scripts/run_rembg.sh`           | `c822e4e0d5befcaafe016e5b55934bc43595c02a40d7d369e4b62021c9a46903` |
| `rembg/scripts/setup_env.sh`           | `c8a25341be98b4f19beb13bc5a5c5f3ca7a9278ed1946d728f32b52f611eca22` |
| `LICENSE`                              | `ea3939ecbdc77e211cc9cfd0779890addf17fba86c275983c82c3e7ba7a42d76` |

Full lock: [`source-lock.json`](./source-lock.json).
