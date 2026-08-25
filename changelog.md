# Changelog

Append-only record of merged PRs and programa milestones (ADR 0027: the
repo's only versioned temporal trace besides `04_estado/receipts/**` and
`04_estado/tasks/**`). Newest entry first. Never rewrite past entries. [CONFIG]

## 2026-08 — Method explainer contract and diagram candidate

- **Aclaración de procedencia** — En la entrada inmediata siguiente, los
  identificadores **#142–#149, #170, #173 y #197–#210** corresponden a PRs de
  `JaviMetodologIA/metodologia-frames-agent-os` y acreditan únicamente la
  procedencia allí registrada. No son números de PR del fork público ni prueban
  su integración. Cada replay público se acredita por sus propios PRs, commits y
  gates en el repositorio donde se fusiona; este changelog no asigna números a
  esos replays. [CONFIG]

- **PRs #142–#149, #170, #173 y #197–#210** — Video OS incorpora de forma
  incremental contratos hash-bound para intención, supuestos, modelo del método,
  beats, voz, diagramas, manifiesto de build y checkpoints; un adapter de General
  Video limitado a `PLAN_VERIFY_ONLY`; `DiagramStage` con geometría y guards
  deterministas; políticas declarativas de captions/ASR y observación de audio; y
  lectura estable de materiales frente a symlinks y drift. El adapter conserva
  `render_authority:false`, `publication_authority:false`, estado máximo
  `BLOCKED` y el gap `GENERAL_VIDEO_METHOD_EXPLAINER_NOT_PROMOTED`. La skill
  `metodologia-explainer-diagram-design` permanece
  `UNREGISTERED_DRAFT · CANDIDATE_PENDING_GATE`; ASR/captions son
  `DECLARATIVE_ONLY`; no se acreditan TTS, normalización, escucha, composición
  end-to-end, MP4 ni publicación. [CONFIG]

## 2026-08 — Frames Content Workflow deployment closure

- **PRs #2–#39** — 41 commits integrados secuencialmente en `origin/main`
  mediante 38 PRs y merge commits, sin squash, force, admin bypass ni
  publicación. El train incorpora brief universal, routing adaptativo,
  contratos y catálogo de 39 entregables, workflows P00–P09, 39 templates
  Markdown + 39 HTML MetodologIA, generación/paridad determinista, autoridad de
  fuentes/actores y placeholders fail-closed. Candidate `e4223ead`; merge final
  `42203b7`; tree común `35a8ff6b`. Read-back limpio y `pnpm verify` post-merge:
  21 gates, 88 archivos y 746 tests PASS. GitHub Actions permaneció activo pero
  no emitió runs ante `pull_request` ni `push main`; se registra como
  `coverage_gap`, no como PASS. Estado máximo: runtime `active/local-evaluation`,
  templates `DRAFT`, materiales verificados `RENDERED_DRAFT`. Remotion comercial
  (`BLOCKED_LICENSE`), cuatro textos canónicos, distribución y publicación
  permanecen fail-closed. Evidencia append-only: PRs y merge commits #2–#39. [CONFIG]

## 2026-08 — Atemporal + simplicity lift

- **Fase 7 phase 3** — continued `.md` 10× lift on the quick-win band
  (1201–1299 words). **5 more advisory skills cleared** (11/47 total):
  `dev-plan-ceo-review` (1209→1176, operator-confirmation + coverage_gap
  restatement dropped), `dev-document-release` (1213→1177, anti-skip
  restatement tightened + coverage_gap restatement dropped),
  `design-threejs-r3f` (1218→1171, intro fail-closed recap dropped —
  duplicated in §fail-closed / coverage_gap), `dev-document-generate`
  (1218→1189, duplicate provenance line + coverage_gap restatement dropped),
  `dev-health` (1240→1189, intro premise restatement + coverage_gap
  restatement dropped). Each underwent the full hash-bound cascade
  (0.1.0→0.2.0 in 4 places + both sha256 recomputed + 5th revision event
  `EVT-SKL-{PCR,DRL,TRF,DGN,HLT}-H03-005`). `verify:skills` PASS (152 H03 +
  11 v2, 0 orphans). md-budgets advisory 43→38, enforce_violations=0.
  Gates green: check:repo, G_INBOX PASS. **Remaining 38 advisory** as
  coverage_gap worklist (phased remediation continues).
- **Fase 7 phase 2** — continued `.md` 10× lift on the quick-win band
  (1201–1299 words). **3 more advisory skills cleared** (6/47 total):
  `design-framer-motion` (1261→1191, intro fail-closed recap dropped —
  duplicated in §Fail-closed), `design-desktop-principles` (1251→1192,
  blockquote fail-closed recap dropped — duplicated in §Runtime Boundary,
  generic fail-closed boilerplate removed, density + animation prose
  tightened), `content-os-captions-overlay` (1201→1178, Why-section
  restatement bullets collapsed to dense prose). Each underwent the full
  hash-bound cascade (0.1.0→0.2.0 in 4 places + both sha256 recomputed +
  5th revision event `EVT-SKL-{FRM,DKP,COV}-H03-005`).
  `verify:skills` PASS after each (152 H03 + 11 v2). md-budgets advisory
  46→43. Gates green: check:repo, typecheck, tests 630/630. **Remaining 43
  advisory** as coverage_gap worklist (phased remediation continues).
- **Fase 7** — `.md` 10× lift (B3): densify authored SKILL.md corpus to the
  ≤1200-word budget, respecting the hash-bound append-only registry cascade.
  Phase 1 of phased remediation: **3/47 advisory skills cleared** —
  `dev-writing-skills` (1656→≤1200), `dev-writing-plans` (1313→≤1200, fixtures
  `example.md` → descriptive `*.yml` + `check-skill.mjs` refs updated),
  `dev-executing-plans` (1233→≤1200, lineage ref moved to top). Each underwent
  the full hash-bound cascade: version 0.1.0→0.2.0 in 4 places
  (`creation-v3-skills.json` `version` field, SKILL.md frontmatter, LINEAGE.yml,
  registry entry) + `content_sha256` + `package_manifest_sha256` recomputed via
  `packageDigest` (sha256 of sorted `<sha256(fileBytes)>  <relpath>` lines over
  the whole skill dir) + 5th revision event (active→active,
  `EVT-SKL-XXX-H03-005`, `actor_id: RT-10-H03-INTEGRATION`) appended to the
  registry's append-only `events:` block. `verify:skills` PASS after each
  (152 H03 + 11 v2 hash-bound, 0 orphans, event_ids unique). md-budgets
  advisory count 49→46. Proven rebind procedure (per skill, ~10 tool calls):
  (1) read SKILL.md, densify to ≤1200 preserving value; (2) `git mv` fixtures
  if extension wrong, update `check-skill.mjs` refs; (3) bump version in JSON +
  SKILL.md + LINEAGE.yml; (4) recompute both hashes via `packageDigest` helper;
  (5) rebind registry entry version + both hashes; (6) append `EVT-...-005`
  revision event; (7) `pnpm verify:skills` must PASS. **Remaining 46 advisory
  as coverage_gap worklist** (phased remediation — per-skill cascade cost
  ~10–15 tool calls each, not feasible in one session; policy is report-mode +
  phased, not silent fail). Top offenders: `content-os-cut-the-curve` (2849),
  `design-paint` (2599), `gstack-openclaw-office-hours` (2527), `design-cast`
  (2218), `content-os-embedded-captions` (2064); 16 skills in the 1201–1299
  band (quick wins, ~50–100 word trims each). All 46 are in the creation-v3
  registry → full cascade required for each. Densification principle held: lift
  by removing redundancy/repetition + tightening prose, not by cutting content
  — every trimmed skill preserves its receta, fixtures, checker rules,
  fail-closed boundary, and validation section intact. Fase 7 phase 1 closed;
  phases 2–N continue with the same procedure on the 46-skill worklist.
- **Fase 6** — local skills review (E1, E2, E3). Audited the 5 hardening
  core skills (`dev-writing-skills`, `dev-skillify`, `dev-spec`,
  `dev-writing-plans`, `metodologia-find-skills`) against
  `01_intencion/contributing/adding-artifacts.md` § Skill. All 5 pass
  frontmatter (`name`, description starts "This skill should be used when",
  `license: LicenseRef-MetodologIA-Internal`, `metadata.lifecycle_state:
active`, `metadata.execution_scope`), LINEAGE (`content_origin:
locally_authored_adaptation`, `publication_authority: false`), fixtures
  present (positive + negative), no absolute locators, and registry entries
  with `content_sha256` + `package_manifest_sha256`. 4 of 5 are full entries
  in `creation-v3-skill-registry.yml` (H03 registry holds all authored
  skills, not just content workflows); `metodologia-find-skills` is in
  `skill-registry.yml` (discovery skill, separate registry — correct).
  Findings deferred to Fase 7: (1) `dev-writing-skills` SKILL.md 1656 words
  > 1200 and `dev-writing-plans` 1313 > 1200 (advisory, in the 49-violation
  > batch); (2) `dev-writing-plans` fixtures are `example.md` (both positive
  > and negative) — spec requires `*.yml` with descriptive names, and
  > `check-skill.mjs` lines 11/12/49 pin `example.md`. Remediation requires
  > the hash-bound append-only version-bump cascade (new registry entry +
  > `supersedes` + 4 lifecycle events + license receipt + validator allowlist
  - `package_manifest_sha256` rebind via `packageDigest` = sha256 of sorted
    `<fileSha>  <relpath>` lines). Consolidated into Fase 7 to avoid touching
    the append-only registry twice and to preserve producer/verifier/Guardian
    separation (fail-closed: delicate hash-bound mutation not shipped silently
    as advisory). E2 `harness-creator` `skills-lock.json` path
    `skills/vendor/harness-creator/SKILL.md` verified consistent: resolves via
    the `skills` symlink → `03_artefactos/skills/vendor/harness-creator`
    → `.agents/skills/harness-creator/` (canonical, git-tracked). No fix
    needed; plan premise was stale (the on-disk copies are symlinked, not
    divergent). `harness-creator` correctly absent from MetodologIA registry
    (vendored external, `source: walkinglabs/learn-harness-engineering`).
    All `harness-creator/references/*.md` ≤300 lines (max 264,
    `lifecycle-bootstrap-pattern.md`). E3 confirmed: 0 katas, 0 tool-use-
    named local skills (those are plugin skills — `claude-native-toolkit`,
    Tessl, mao); the 5 hardening core are the local material;
    `tool-registry-pattern.md` (199) + `skill-runtime-pattern.md` (43) ≤300.
    `verify:skills` baseline green (152 H03 + 11 v2 hash-bound, 0 orphans, 0
    cross-registry dupes). Fase 6 closed.
- **Fase 5** — unit-test coverage for Fase 4 ledger leaf modules. New
  `05_verificacion/tests/unit/ledger-path-utils.test.ts` (10 tests):
  `globPatternToRegExp` (double-star semantics, single-star, question mark,
  metachar escaping, `prefix/**` form), `normalizeToLegacyPath` (rewrite,
  longest-target precedence, no-match passthrough),
  `legacyPathInversions` (separator filter, longest-first sort, missing-dir
  `[]`). Documented two latent properties as test assertions: (1) `a/**/b`
  compiles to `^a/.*/b$` requiring ≥1 intermediate segment — zero-segment
  matching (`a/b`) is unsupported, a harmless limitation since every real
  ownership-manifest pattern is `prefix/**` form; (2) `docs -> 01_intencion`
  is deliberately excluded from inversions because its single-segment target
  has no path separator, so `normalizeToLegacyPath` never rewrites
  `01_intencion/...` back to `docs/...` (the ledger's `docs/...` references
  are authored string literals, not normalized git paths). New
  `ledger-decision.test.ts` (11 tests): `isGeneratedProjection`,
  `isAuthoredEligible`, `decisionFor` (immutable_history, quarantined,
  verified_no_change, generator_fixed, refactored), `currentBytesFor`
  (existing/missing/directory). Suite 609 → 630 tests (71 → 73 files);
  baselines held (BASELINE_FILE_COUNT=387, baseline_words=92187,
  baseline_loc=34789). Gate suite green: typecheck, lint, check:repo, G21
  atemporal (4631 scanned, 0 violations), doctor 10/10, inbox coherence
  exit=0, md-budgets 49 advisory unchanged (Fase 7). `versionablePaths` is
  the sole consumer of `legacyPathInversions`/`normalizeToLegacyPath`; the
  ledger generator itself emits paths as-is from `git ls-tree` and authors
  `docs/...` legacy literals directly. Fase 5 closed. Deeper unit coverage
  for Fase 4 pure builders (`prepare-project/buildProps`/`buildComponents`,
  `doctor/checks/*`) deferred as coverage_gap: they are exercised
  end-to-end by `check:repo` and `pnpm doctor` (byte-identity verified for
  prepare-project in Fase 4); per-builder unit tests would duplicate
  fixture setup without surfacing new failure modes.
- **Fase 4** (in progress) — code simplicity. `generate-file-disposition-ledger.ts`
  isMain fix: `realpathSync` both sides so symlinked entry path
  (`scripts/` → `05_verificacion/scripts/`) matches `import.meta.url`; unblocks
  `pnpm ledger:generate` via wrapper (SOC-LEDGER003/005 self-heal). `doctor.ts`
  split 487 → 7 files ≤100 (orchestrator 64 + `doctor/{types,checks-pnpm,
checks-toolchain,checks-governance,checks-symlinks,checks-continuity}.ts`).
  `check-creation-v3-skills.ts` split 912 → 54 (orchestrator) + 90 (checks) +
  26 (types) + `creation-v3-skills.json` data file (152 entries, exempt).
  `generate-file-disposition-ledger.ts` split 962 → 474 (dense-core carve-out:
  `buildLedger` + `budgetMetricsFor` + `validateDispositionLedger` kept cohesive
  — splitting `budgetMetricsFor` per budget-surface would duplicate the shared
  `currentMetrics`/`v2ClosurePaths` maps or thread a context through six leaves;
  flagged coverage_gap against the 100-line norm with rationale) + 8 leaf modules
  ≤100: `ledger/{git-walker(84),path-utils(76),ownership(42),generator-refs(32),
decision(98),schemas(83),markdown-tables(31),markdown-rows(88),markdown(52)}.ts`.
  `parseGitCatFileBatch` re-exported from main for the batch-parser test.
  `check-brand.ts` split 754 → 34 (orchestrator, re-exports pinned by
  `brand-v2.test.ts`) + 8 sub-modules under `check-brand/`: `schemas-core(211)`
  - `schemas-channels-fonts(156)` are contract carve-outs ≤300 (D8 zod schemas);
    `expected-sources(89)` data, `validators(75)`, `validate-brand(77)`,
    `channel-validators(52)`, `locator-scan(46)`, `font-rights(41)`, `helpers(9)`.
    Gate suite green: verify:brand, check:repo, G21, md-budgets (49 advisory
    unchanged), doctor 10/10. Ledger regen held baselines 92187/34789/40566
    (check-brand shrank; v3ImpactedAdjustment stays 0). Remotion
    `prepare-project.ts` split 642 → 87 (orchestrator) + 12 leaf modules ≤100
    (max 99) under `prepare-project/`: `font-assets(50)`, `component-files(54)`,
    `component-categories(69)`, `build-components(99)`, `validate-inputs(86)`,
    `build-props(62)`, `build-assets-manifest(82)`, `build-component-registry(35)`,
    `build-preflight(42)`, `build-rights-receipt(43)`, `build-render-manifest(86)`,
    `postproduction-ledger(40)`, `outputs(36)`. Verified byte-identical to the
    original script (diff -rq against original-run outputs = no drift); the
    orchestrator computes hash-bound digests for assets-manifest, component-registry
    and input-props via `writeText` with pre-formatted text, while non-digest
    outputs use `createWriter` helpers. Outputs restored to HEAD after verification
    (committed outputs were stale vs current font license files — pre-existing
    source drift, coverage_gap, requires Guardian re-review). `inspect-renders.ts`
    (606) split DEFERRED as coverage_gap: pre-existing `pnpm-lock.yaml` drift vs
    `test-report-v2.json` pinned hash blocks runtime verification (script throws
    at the validated-input gate before any writes); the script's append-only
    receipt (`RCP-REMOTION-VS001-002.json`) and hash-bound outputs cannot be
    byte-verified without a Guardian re-review that regenerates the test report
    against the current lockfile. Fail-closed: an unverified split of a delicate
    append-only/hash-bound script is not shipped. Five further MetodologIA-authored
    scripts >100 lines DEFERRED as coverage_gap to Fase 5: `scaffold-multimedia-
workflow.ts` (702, CLI with parseArgs), `build-carousel-pilot.ts` (589),
    `build-carousel-orchestration-run.ts` (406), `backfill-tasks.ts` (356),
    `check-carousel.ts` (352). Rationale: no test pinning, side-effecting build
    scripts with uncertain runtime verifiability; Fase 5 adds unit-test coverage
    that makes future splits safe rather than shipping unverified refactors. No
    automated code-line gate exists (D8 is a review norm, not an enforced gate);
    carve-outs (contracts ≤300, tests ≤300, vendored gstack exempt) documented in
    `02_proceso/governance/docs-budget-policy.yml`. Fase 4 closed.
- **Fase 3** — `.md` budget policy. `02_proceso/governance/docs-budget-policy.yml`
  declares default caps (SKILL.md ≤1200 words/300 lines report-mode; prompt-spec
  ≤400; governance/ADR ≤400/120 enforce). Enforcer `check-md-budgets.ts` added
  to `verify` + `check` chains. 49 advisory SKILL.md violations (report-mode,
  phased remediation Fase 7). Ledger regen: authored corpus 92176→92187 words,
  hard-cap baseline_loc 34788→34789. Unit tests for `check-md-budgets`,
  `deterministic-epoch`, `check-atemporal`. `check-tool-grants` redacts
  `/Users/<user>` locators in receipt detail.
- **ADR 0027** atemporal naming accepted for local evaluation. Policy
  `02_proceso/governance/atemporal-naming-policy.md`. Gate G21 `check:atemporal`.
  4 dated reports → append-only check-run receipts. Font manifest id stripped
  of date. `-vN` formalized as contract identity (not temporal version).

## 2026-08 — Content OS programa (~20 PRs)

- **PR #12** (`99533f2`) — Fase 0: vendor 15 HyperFrames skills (Apache-2.0),
  lockfile + audit + architecture + verification.
- **PR #13** (`627a52f`) — Fase 1: `docs/content-os/{capability-matrix,
architecture,roadmap}.md`. Runtime decision Option D.
- **PR #14** (`3e0e6fe`) — Fase 2a: `content-os-core` (HTML+GSAP contract +
  Playwright→FFmpeg render adapter). 1st H03 skill.
- **PR #15** (`b4cd4d2`) — Fase 2b: `content-os-animation` (GSAP rules,
  seek-safe, offline-first). 4 H03 skills.
- **PR #16** (`6f43c8d`) — Fase 2c: `content-os-keyframes` (pose contract +
  seek-safe lint + snapshot). 5 H03 skills.
- **PR #17** (`05f4448`) — Fase 2d: `content-os-creative` (brand/pacing/
  narration/composition). 6 H03 skills.
- **PR #18** (`0148329`) — Fase 2e: `content-os-media` (dual offline-default +
  remote opt-in, fail-closed). 7 H03 skills.
- **PR #19** (`b889d2e`) — Fase 2f: `content-os-registry` (reusable HTML
  blocks). 8 H03 skills.
- **PR #20** (`e31b759`) — Fase 2g: `content-os-router` (intent router
  source→video). 9 H03 skills. Fase 2 completa.
- **PR #21** (`5d0d285`) — Fase 3.1: `content-os-faceless-explainer` (text →
  faceless video). 10 H03 skills.
- **PR #22** (`cfd2547`) — Fase 3.2: `content-os-pr-to-video` (GitHub PR →
  code-change explainer). 11 H03 skills.
- **PR #23** (`eeca42f`) — Fase 3.3: `content-os-product-launch-video`
  (product/marketing URL → launch video; website-to-video subsumido). 12 H03.
- **PR #24** (`200c067`) — Fase 3.4: `content-os-motion-graphics` (short
  unnarrated, phase-based). 13 H03.
- **PR #25** (`01182b1`) — Fase 3.5: `content-os-embedded-captions` (adds
  captions to existing footage; only Fase 3 with footage:true). 14 H03.
- **PR #26** (`99ee885`) — Fase 3.6: `content-os-slideshow` (navigable HTML
  deck, no MP4). 15 H03.
- **PR #27** — Fase 3.7: `content-os-general-video` (freeform catch-all).
  16 H03. Fase 3 completa (7/7 workflows).
- **PR #28** (`3d190f6`) — Fase 4 bridge: `content-os-remotion-bridge`
  (bidirectional R↔H, 17th H03).
- **PR #29** (`654bdc5`) — Fase 4 hardening: version bump 0.1.0→0.2.0 +
  5th revision event on `motion-library-adapters` + `remotion-video-production`.
- **PR #30** (`784473c`) — Content OS programa closed.

## 2026-08 — Capa B upstream

- **Francixco90/main** `bfb6d5a` — 8 PRs aterrizadas upstream (combined).

## Governance notes

- `784473c` = Content OS programa closure commit (local main baseline).
- `7c26b6719451de7b0101262f3c379f85a251f939` = V2 closure commit
  (immutability baseline for `docs-budget-v2.test.ts`).
- Working docs (`CONTEXT.md`, `TASK.md`, `CLAUDE.md`) are gitignored local
  cabinas; their PR/commit references are mirrors of this append-only log.
