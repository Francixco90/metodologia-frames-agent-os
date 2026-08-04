# find-skills → MetodologIA architecture mapping

> Reference for Design-OS Fase 2A. Maps the vendored find-skills skill
> (`skills/vendor/vercel-skills/find-skills/`) onto the MetodologIA
> `metodologia-find-skills` homólogo. MIT-licensed reference; homólogo is a
> locally-authored clean-room adaptation.

## find-skills model (as vendored)

1 skill, MIT (Vercel, Inc. 2026):

- `find-skills` (vercel-labs/skills @ `ab4fc49`) — meta-discovery skill.
  Single SKILL.md (141 lines). Guides the agent through discovering and
  installing skills from the open agent skills ecosystem (skills.sh) via the
  `npx skills` CLI (`find`, `add`, `update`). 6-step workflow: understand need
  → check leaderboard → search → verify quality (install count, source
  reputation, GitHub stars) → present options → offer to install. Capability
  category table (web dev, testing, devops, docs, code quality, design,
  productivity).

## MetodologIA paradigm

The repo already has the `metodologia-*` meta family in the v2 registry:
`metodologia-brand-router` and `metodologia-certificate-builder`. Fase 2A
adds **`metodologia-find-skills`** derived (clean-room prose from permissive
reference) from the vendored find-skills skill. v2 path: registered in
`registries/skills/skill-registry.yml`, validated by
`scripts/check-instagram-v2-skills.ts`, bound to the shared content-license
receipt `skills/instagram-v2-content-license-receipt.yml` (9th `package_ref`
→ cascade re-hash of the 8 existing v2 entries' `receipt_sha256`).

## Capability mapping (vendored → MetodologIA homólogo, Fase 2A)

| vendored skill | MetodologIA homólogo (Fase 2A) | validator path | receipt binding                    |
| -------------- | ------------------------------ | -------------- | ---------------------------------- |
| `find-skills`  | `metodologia-find-skills`      | v2             | shared receipt (9th `package_ref`) |

### Homólogo derivation contract

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`:
  - `skills/vendor/vercel-skills/find-skills/SKILL.md` (read-only reference)
  - `core/contracts/creation-v3.ts` (H-03 contract; v2 entry cites via
    `content_license_evidence.receipt_ref` → shared receipt)
- SKILL.md line: `Derivada de find-skills (vercel-labs/skills, MIT)`

## What the homólogo preserves vs. adapts

**Preserves (clean-room prose, same capability):**

- Meta-discovery intent: help users find skills for a task.
- 6-step workflow shape: understand need → check leaderboard → search →
  verify quality → present options → offer to install.
- Quality-verification guidance (install count, source reputation, GitHub
  stars) before recommending.
- Capability-category awareness (design, web dev, testing, etc.).

**Adapts (MetodologIA context):**

- CLI commands: homólogo describes `npx skills find/add` as the upstream
  ecosystem CLI but gates any install/execute behind explicit user
  confirmation (fail-closed, per "no activar conectores ni publicar" +
  `RENDERED_DRAFT != ... != PUBLISHED`). No auto-install.
- Attribution: `Derivada de find-skills (vercel-labs/skills, MIT)`.
- Registry: v2 path with shared receipt cascade (not H-03 per-skill
  runtime-boundary).
- `check-skill.mjs` self-contained (no import of vendor code; scans tokens;
  forbids `Math.random`/`Date.now`).

## License guard

- Vendored skill is **MIT** (verified). MIT permits redistribution +
  modification with attribution.
- Homólogo is a **clean-room prose adaptation**
  (`LicenseRef-MetodologIA-Internal`, `derivation_mode:
clean-room-prose-from-permissive-reference`, `external_fragments_reused:
false`). MIT attribution preserved in `LINEAGE.yml` (`Derivada de
find-skills (vercel-labs/skills, MIT)`).
- `check-skill.mjs` self-contained (no import of vendor code) → no viral
  license surface.
- Vendor copy excluded from toolchain (`skills/vendor/**` in tsconfig,
  prettierignore, eslint, check-privacy) → not typechecked, not linted, not
  in `verify:skills`.
