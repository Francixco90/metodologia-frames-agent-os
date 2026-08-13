---
name: metodologia-trainer-workbook
description: This skill should be used when the user asks to "create a Trainer OS workbook", "build the workshop workbook", "compile a three-route training workbook", or "verify a multilingual no-JS workbook".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-candidate-routing-only}
---

# Trainer OS Workbook

Route an approved `trainer-adapter-content-v1` workbook to the shared Trainer OS compiler.

Select this candidate only for a `trainer-run-manifest-v1` run. Route standalone HTML workbook
requests to `metodologia-workbook-html` and block ambiguous requests before loading both.

1. Require hash-bound intake, route spec, design lock, artifact plan, rights and evidence authority.
2. Require exactly three routes: session, deepening and consolidation, with globally unique step IDs.
3. Require `dist/workbook/{locale}/index.html` for every requested locale and exact structural parity.
4. Invoke the shared compiler. Never author or patch derived HTML in this skill.
5. Verify exact replay, semantic DOM, keyboard use, print behavior, no-JS access and no response persistence.
6. Preserve MetodologIA as the visible identity and stop at `RENDERED_DRAFT`.

Until Trainer OS evaluation promotes this skill, stop after routing with `coverage_gap`; do not
invoke compilation from the candidate skill.

Block missing evidence, stale hashes, noncanonical paths, route drift, duplicate IDs, participant
response storage, private locators, network access, connectors and publication.
