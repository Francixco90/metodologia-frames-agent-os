# crawl4ai-skill vendor architecture — Fase 1K

> Vendor root: `skills/vendor/crawl4ai-skill/` · 1 skill · MIT OR Apache-2.0
> (dual) · Reference-only · **FAIL-CLOSED tool skill.**

## Layout

```
skills/vendor/crawl4ai-skill/
├── LICENSE                              (dual-license notice)
├── LICENSE-MIT                          (MIT text, from source root)
├── LICENSE-APACHE                       (Apache-2.0 text, from source root)
└── crawl4ai/
    ├── SKILL.md                         (web crawling/scraping tool guidance)
    ├── references/
    │   ├── anti-detection.md
    │   ├── cli-guide.md
    │   ├── complete-sdk-reference.md
    │   ├── content-filters.md
    │   ├── escalation.md
    │   ├── recipes.md
    │   ├── sdk-guide.md
    │   ├── troubleshooting.md
    │   └── url-discovery.md
    └── evals/
        ├── README.md
        ├── eval-01-spa-markdown.md
        ├── eval-02-extract-products.md
        ├── eval-03-topic-domain-crawl.md
        └── eval-04-render-cached-html.md
```

17 files total (14 in skill dir + 3 LICENSE files at vendor root).

## Source map

| vendored skill | source repo                  | commit    | license                  | source path | destination                              | files           |
| -------------- | ---------------------------- | --------- | ------------------------ | ----------- | ---------------------------------------- | --------------- |
| `crawl4ai`     | `brettdavies/crawl4ai-skill` | `c696921` | MIT OR Apache-2.0 (dual) | `/` (root)  | `skills/vendor/crawl4ai-skill/crawl4ai/` | 14 + 3 LICENSEs |

Source commit: `c696921b133dd962f766f596655767c0b894d206`. 3 LICENSE files at
source root (LICENSE, LICENSE-MIT, LICENSE-APACHE, "Copyright (c) 2026 Brett
Davies") — all copied to vendor root.

## Toolchain isolation

Vendored skill is **post-closure reference-only** and excluded from the
toolchain:

- **tsconfig.json** line 23: `"exclude": [..., "skills/vendor/**"]` — not typechecked.
- **.prettierignore** line 30: `skills/vendor/**` — not formatted.
- **eslint**: vendor dirs excluded.
- **check-privacy.ts** line 40: `isVendor()` bypass — not privacy-scanned.
- **reconcile-skill-registries.ts** line 139: `if (name === 'vendor') return false`
  — vendor dirs bypass reconcile gate RCN-009.
- **No script execution**: vendored as text reference; no network fetch, no
  install, no binary invocation in vendor context.
- **Post-closure no baseline shift**: ledger regen absorbs new vendor files
  without shifting authored-corpus baseline.

## Homólogo wiring

| vendored skill | MetodologIA homólogo | validator | registry                                           | per-skill runtime-boundary      | execution boundary           | derivation license     |
| -------------- | -------------------- | --------- | -------------------------------------------------- | ------------------------------- | ---------------------------- | ---------------------- |
| `crawl4ai`     | `web-crawl4ai`       | H-03      | `registries/skills/creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` | `requires_user_confirmation` | MIT (chosen from dual) |

### Homólogo derivation contract (fail-closed)

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `execution_boundary: requires_user_confirmation` — **fail-closed**
- `authority_refs`:
  - `skills/vendor/crawl4ai-skill/crawl4ai/SKILL.md` (read-only reference)
  - `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de crawl4ai (brettdavies/crawl4ai-skill, MIT)`

### What the homólogo preserves vs. adapts

**Preserves (clean-room prose):**

- Web crawling/scraping capability intent: crawl, extract, anti-detect, discover
  URLs via crawl4ai SDK/CLI.
- Reference knowledge (9 reference docs) — described in prose: cli-guide,
  sdk-guide, complete-sdk-reference, anti-detection, content-filters,
  escalation, recipes, troubleshooting, url-discovery.
- Eval scenarios (5 evals) — described in prose as usage examples, NOT executed.

**Adapts (MetodologIA context, fail-closed):**

- Attribution: `Derivada de crawl4ai (brettdavies/crawl4ai-skill, MIT)`.
- Registry: H-03 per-skill runtime-boundary with
  `execution_boundary: requires_user_confirmation`.
- `check-skill.mjs` self-contained (no import of vendor code; scans tokens;
  forbids `Math.random`/`Date.now`; forbids auto-execution of
  network/install/binary).
- Homólogo **describes** the capability in prose and **gates** any execution
  behind explicit user confirmation. NO auto-execute network/install/binary.
  Matches MetodologIA "no activar conectores ni publicar".
- **License choice**: derives under MIT (chosen permissive basis from dual
  MIT OR Apache-2.0); both compatible with `LicenseRef-MetodologIA-Internal`.

## License guard

- Vendored skill is **MIT OR Apache-2.0** (dual; 3 LICENSE files at source root,
  copied to vendor root). Both OSI-approved, permissive.
- Homologue derives under **MIT** (chosen permissive basis; both compatible).
- Homólogo is a **clean-room prose adaptation** (`LicenseRef-MetodologIA-Internal`,
  `derivation_mode: clean-room-prose-from-permissive-reference`,
  `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- `check-skill.mjs` self-contained (no import of vendor code) → no viral license
  surface.
- Vendor copy excluded from toolchain → not typechecked, not linted, not
  executed, not in `verify:skills`.

## Per-file hashes

| file                                            | sha256 (prefix)                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `crawl4ai/SKILL.md`                             | `ac9eb874e2732fc1fb26d902cde1b0e1942982ffbf48d6ca248d53a8a0d694a4` |
| `crawl4ai/references/anti-detection.md`         | `d84b54bc20b18db3175382e545faf84dc0192d21caeb044b0aecd108c925b001` |
| `crawl4ai/references/cli-guide.md`              | `0c76e3bde15c84125fc5617b15885448e665b26ca3336c60e7d78a30df3869a5` |
| `crawl4ai/references/complete-sdk-reference.md` | `a248dc80a65da4d2222ee9b04cbf9e09a8d71a835b175ed319df6b8ed7e0e711` |
| `crawl4ai/references/content-filters.md`        | `8834077412970923ab36387bf1584b0bee33546dadfe24da329f0192402e21e`  |
| `crawl4ai/references/escalation.md`             | `1e5104a7145b4331251a1afb39940798f9bf772da841197d4a0472ec2abb497a` |
| `crawl4ai/references/recipes.md`                | `1c967148cb2ca21e017fe482ad64c243f855d50dd1734ef29d8c3884ecd53120` |
| `crawl4ai/references/sdk-guide.md`              | `cdd42adc25fbaf0d30d4f0414863db49146e77beb0777a9663822e675835e2e0` |
| `crawl4ai/references/troubleshooting.md`        | `ccb35042bb1311fc41aab425e7c849796da335f5b6b2df75e1d575433633da40` |
| `crawl4ai/references/url-discovery.md`          | `571d37b494ebdf9e3edf445e45e575f92006f14829fb0b3a7b014e5feeba5fa1` |
| `crawl4ai/evals/README.md`                      | `32fdad22d460bc7b822be6471eee85c6b56d243689ab48a8674dc525d26dc6bd` |
| `crawl4ai/evals/eval-01-spa-markdown.md`        | `1b0a7f752cf5c8c3ca3d23b8298eb8057c2aa166f84565e036daa2a3223b4b2b` |
| `crawl4ai/evals/eval-02-extract-products.md`    | `79639323f11ecf58756a8df90e992a4bb4ca1d83a1de93bf91e7fd659192f88a` |
| `crawl4ai/evals/eval-03-topic-domain-crawl.md`  | `91d04a30e03b6c631b161c7f89781f9cbe183ff3624f1fea83302fa7168da2af` |
| `crawl4ai/evals/eval-04-render-cached-html.md`  | `baafb71c76acb330e7fc30c38b4918f8ce57a7efb03aa7b1fef41d4cb2140b90` |
| `LICENSE`                                       | `2489880396bc8dfeefafc2bc45756ab519af00992f5d005a838b88ae5e7bc992` |
| `LICENSE-MIT`                                   | `a3f05d297b4a98d39118abcab7ac0495b5ab3ecadd38930c867ec83126ccdd87` |
| `LICENSE-APACHE`                                | `44afcfc1e3d31fb510d5d13047c2768f8e1a98a2c509dbe06b826f2970d595bc` |

Full lock: [`source-lock.json`](./source-lock.json).
