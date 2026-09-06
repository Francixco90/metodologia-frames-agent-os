# MetodologIA Brand Content Studio · Canon v3

Private successor package for `MetodologIA · Brand Content Studio · Canon v2`.

Canon v3 is an English-authored, multilingual knowledge system. It responds in the language of the request; Spanish output uses neutral Latin American Spanish (`es-419`), `tú`, and no voseo. [METODOLOGIA]

## State

- Local state: `VERIFIED_LOCAL`.
- External notebook: not created by this package until `NLM_PLAN_APPROVED` is consumed.
- Canon v2: frozen historical evidence; no deletion, replacement, or Studio mutation is authorized.
- Sharing and publication: `BLOCKED`.

## Package boundaries

- `knowledge-base/`: active Markdown controls, canon, evidence, templates, references, assets, operations, and pedagogy.
- `prompt-system/`: machine-readable prompt schema and registry.
- `audit/`: portable, locator-free evidence from the v2 baseline and negative production fixtures.
- `LINEAGE.yml`: immutable v2-to-v3 succession boundary and promotion state.
- `coverage-gaps.yml`: explicit unresolved evidence, rights, pedagogy, and provenance gaps.
- `grounding-suite-v1.yml`: seven source-bounded readback tests to run after materialization.
- `profile.yml`: runtime policy and source budgets.
- `notebook-import-plan-v2.yml`: ordered, gated materialization plan.
- `source-manifest.yml`: generated portable identity, provenance, rights, and lifecycle state for every admitted source.

The 43 canonical and historical PDFs and eight original images remain in the existing v2 source packs. Canon v3 references those bytes by repository-relative path and hash instead of duplicating binaries. [METODOLOGIA]

## Non-negotiable runtime rules

1. Markdown governs; PDFs and images inspire.
2. Asset authority may veto any visual use.
3. Chat uses 3–8 selected sources, Studio uses 4–12, and broad audits use batches of at most 20.
4. Empty and all-source selections fail closed.
5. A Studio raw artifact is not an editable or accessible deliverable.
6. `VERIFIED_DRAFT`, `HUMAN_APPROVED`, `READY`, and `PUBLISHED` are separate states.

## Reproduce and validate

```bash
pnpm build:notebooklm-canon-v3
pnpm check:notebooklm-canon-v3
python3 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/scripts/validate_prompt_system.py
pnpm vitest run 05_verificacion/tests/unit/notebooklm-canon-v3-contracts.test.ts \
  05_verificacion/tests/unit/notebooklm-canon-v3-filesystem-happy.test.ts \
  05_verificacion/tests/unit/notebooklm-canon-v3-filesystem-failures.test.ts
```

Building regenerates the source manifest, profile, and import plan from admitted files and hashes. It does not call NotebookLM or consume an external gate. [METODOLOGIA]
