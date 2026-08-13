# Prompt library operating contract

[METODOLOGIA] Accept only hash-bound `trainer-extended-content-v1`; route declared
`dist/prompt-library/{locale}/index.html` outputs to the shared adapter. Reject materialization IDs
on prompt artifacts.

[PEDAGOGIA] Require unique step IDs and a bijection between playbook steps and prompts. Require
ordered levels `1, 2, 3, 4`; levels describe structure, not quality. Preserve exact step backlinks.

Render semantic headings, icon-only copy controls with accessible names, `aria-live` feedback and
manual-copy fallback. Keep core content and navigation usable without JS; copy is optional. Store
or transmit no participant input. Replay exact bytes, manifests, receipts and output trees. Reject
duplicates, missing/extra bindings, level drift, response persistence, network, tracking, private
locators, stale hashes and publication.

`coverage_gap`: cross-locale structural parity requires a dedicated adapter-contract change and
evaluation. [INFERENCIA] Copy affordances do not prove usefulness. [SUPUESTO] Use synthetic
fixtures only while candidate. [NEUROCIENCIA] Reject unsupported cognitive claims.
