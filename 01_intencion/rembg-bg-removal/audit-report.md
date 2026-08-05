# rembg-bg-removal vendor audit — Fase 1J

> Audit date: 2026-08-04 · Auditor: lead · 1 skill, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json). **FAIL-CLOSED tool skill.**

## Scope

1 skill vendored text-only into `skills/vendor/rembg-bg-removal/rembg/` as
**reference-only** input for the locally-authored `media-rembg` homólogo
(expansion Fase 2P, media-* family, H-03 path, **fail-closed**). 4 text files
copied (SKILL.md + 1 reference + 2 shell scripts), 0 binaries excluded. Source
is **MIT licensed** (LICENSE at repo root, "Copyright (c) 2026 Haizhou Ge").

## Source resolution

| skill   | source repo                | commit    | license | source path | files vendored                       |
| ------- | -------------------------- | --------- | ------- | ----------- | ------------------------------------ |
| `rembg` | `OpenGHz/rembg-bg-removal` | `3e9e829` | MIT     | `/` (root)  | 4 (SKILL.md + reference + 2 scripts) |

- **rembg** (background-removal tool): SKILL.md describes invoking the `rembg`
  binary via `scripts/run_rembg.sh` + `scripts/setup_env.sh` to remove image
  backgrounds. **TOOL skill** — invokes an external binary. Vendored as
  reference-only; homólogo `media-rembg` is **fail-closed** (describes capability
  in prose, gates execution behind user confirmation, NO auto-execute
  binary/install/network).

## License

Source is **MIT** (LICENSE file at repo root, "Copyright (c) 2026 Haizhou Ge").
MIT permits redistribution and modification with attribution. Homólogo
(`media-rembg`, Fase 2P) derives under `LicenseRef-MetodologIA-Internal` with
`derivation_mode: clean-room-prose-from-permissive-reference` (MIT-compatible;
attribution preserved in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (LICENSE file at root)

- MIT per LICENSE file at repo root ("Copyright (c) 2026 Haizhou Ge").
- No source-available / NOT-OSI risk. MIT is OSI-approved.

### 2. Binaries excluded

None. `skills/vendor/rembg-bg-removal/rembg/` contains SKILL.md (UTF-8 text),
`references/models_and_flags.md` (UTF-8 text), `scripts/run_rembg.sh` (shell
script, UTF-8 text), `scripts/setup_env.sh` (shell script, UTF-8 text). `file`
reports no binary/executable/image/font in the vendored set. The shell scripts
are vendored as **text reference** (not executable in vendor context;
`execution_status: reference-only-no-auto-execution`).

### 3. Secrets / PII / private locators

None. SKILL.md + references + scripts reference public concepts (rembg models,
pip install, U2Net). No credentials, tokens, internal hostnames, or PII.

### 4. Network / execution surface

**Present but contained.** rembg is a TOOL skill that invokes the `rembg` binary
via shell scripts (pip install + model download + image processing). Vendored
as **reference-only** — scripts are NOT executed, NOT made executable, NOT
registered, NOT wired into any validator. Homólogo `media-rembg` (Fase 2P,
media-* family) is **fail-closed**: `execution_boundary:
requires_user_confirmation`, describes the capability in prose, gates any
execution behind explicit user confirmation, NO auto-execute
binary/install/network. Matches MetodologIA "no activar conectores ni publicar".

### 5. Content-type verification

SKILL.md + reference + 2 shell scripts are UTF-8 text. 0 binary leaks.

## Per-skill checklist

### rembg

- [x] License: MIT (LICENSE file at repo root)
- [x] Attribution: "Copyright (c) 2026 Haizhou Ge" preserved
- [x] Source commit pinned: `3e9e829db5921e5754fd82af645f82b7357446ee`
- [x] Text-only: 4 files (SKILL.md + reference + 2 shell scripts), 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`:
      `SKILL.md = c6eb1fc3995816fde910a2e2af97bf7131092f8b44ff4069ae5450e48d0cb05c`
- [x] Shell scripts vendored as text (not executable in vendor context)
- [x] **Fail-closed homólogo required** (media-rembg, Fase 2P)

## Verdict

**PASS.** 1 skill, MIT (LICENSE at root), 5 text files vendored (SKILL.md +
reference + 2 scripts + LICENSE), 0 binaries, 0 secrets. TOOL skill contained as
reference-only; fail-closed homólogo required. Ready for `media-rembg` homólogo
(Fase 2P, media-* family, H-03 path, fail-closed).
