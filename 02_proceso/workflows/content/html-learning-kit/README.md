# Generic HTML learning kit workflow

[METODOLOGIA] This content-owned workflow compiles a trilingual landing, workbook and
masterclass from typed source models. It contains no course-specific content and keeps brand
authority in hash-bound external references.

## Contract

`Spec → Compile → Verify → Review`

- `contracts.ts` defines strict runtime and TypeScript contracts.
- `compiler.ts` validates every binding before writing, builds in a fresh staging tree and safely
  promotes nine HTML pages, copied cleared assets, a manifest and a receipt.
- `verifier.ts` reads the resulting bytes and fails closed on stale bindings, missing or modified
  outputs, symlinks, residual files/directories, private locators and learner-response persistence.
- `fixture.ts` and `fixtures/` are synthetic only.
- `test.ts` proves deterministic replay and negative gates without network access.

Run the focused validation from the repository root:

```text
node --import tsx 02_proceso/workflows/content/html-learning-kit/test.ts
```

[PEDAGOGIA] Workbooks and masterclasses remain separate typed models linked by explicit targets.
[NEUROCIENCIA] No neuroscience claims are encoded. [SUPUESTO] Human review remains the next gate;
the compiler cannot grant publication authority.
