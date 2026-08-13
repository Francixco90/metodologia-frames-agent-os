---
name: metodologia-trainer-landing
description: This skill should be used when the user asks to "create a Trainer OS landing", "build the training landing page", "compile an eight-section workshop landing", or "verify a multilingual training landing".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-candidate-routing-only}
---

# Trainer OS Landing

Route an approved `trainer-adapter-content-v1` landing to the shared Trainer OS compiler.

1. Require hash-bound intake, route spec, design lock, artifact plan, rights and evidence authority.
2. Require exactly eight useful sections and a one-to-three-word fragment CTA with a real target.
3. Require `dist/landing/{locale}/index.html` for every requested locale; reject fallback or partial translation.
4. Invoke the shared compiler. Never author or patch derived HTML in this skill.
5. Verify exact replay, semantic DOM, keyboard navigation, no-JS operation, privacy and local assets.
6. Preserve MetodologIA as the visible identity and stop at `RENDERED_DRAFT`.

Block missing evidence, stale hashes, noncanonical paths, extra or absent sections, external CTAs,
tracking, private locators, network access, connectors and publication.
