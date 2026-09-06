---
schema: knowledge-document-metadata-v1
document_id: CANON-NEO-SWISS-V3
title: Neo-Swiss Clean and Soft Explainer Visual Canon
version: '3.0'
status: ACTIVE
authority: CANON
layer: 10 Canon
language: en
response_locales: [en, es-419]
routes: ['R10-BRAND', 'R40-CREATE', 'R60-ASSET']
tasks: [design-visual, audit-brand, audit-accessibility]
audiences: [designer, creator, editor]
tags: [neo-swiss, corporate-clean-premium, accessibility, visual-system]
keywords: [grid, whitespace, flat vector, Poppins, Montserrat, Trebuchet]
aliases: [Neo-Swiss Clean and Soft Explainer, Corporate Clean and Premium]
source_refs: [LEGACY-KB-17-VISUAL-V1, EVD-OWNER-VISUAL-20260825]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: [LEGACY-KB-17-VISUAL-V1, LEGACY-KB-17-VISUAL-V1-1]
related_ids: [CANON-CONTENT-STUDIO-V3, ASSET-USAGE-V3, REFERENCE-PDF-GALLERY-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

Neo-Swiss Clean and Soft Explainer combines Swiss editorial order with friendly geometry and accessible explanation. White space, grid, hierarchy, and a functional visual relation produce clarity; illustrations support meaning rather than decorate it. [METODOLOGIA][source_ref:EVD-OWNER-VISUAL-20260825]

</abstract>
<navigation>

# Index

1. Tokens
2. Composition and illustration
3. Accessibility
4. Acceptance

</navigation>
<routing>

# Routing

Use for visible design decisions. Resolve logos, portraits, and rights in `ASSET-USAGE-V3`; study historical PDFs through `REFERENCE-PDF-GALLERY-V3` without promoting their styles.

</routing>
<knowledge>

# Tokens

| Token              | Value     | Function                                      |
| ------------------ | --------- | --------------------------------------------- |
| Institutional navy | `#122562` | titles, structure, deep backgrounds           |
| Decision gold      | `#FFD700` | selection and focus; never long white text    |
| Technical blue     | `#137DC5` | process and supporting links                  |
| Charcoal           | `#1F2833` | primary text on light surfaces                |
| Lavender           | `#BBA0CC` | secondary categories and restrained gradients |
| Gray               | `#808080` | metadata and secondary rules                  |

White is the substrate. Opacity and micro-gradients may derive only from the six colors. Poppins governs headings and decisive figures; Montserrat governs body, tables, and lists; Trebuchet governs notes, chips, footnotes, and callouts. Declare any font fallback. [METODOLOGIA]

# Composition and illustration

Use a consistent Swiss grid, generous negative space, columns, one dominant idea, explicit reading order, and a text-plus-visual relationship. Flat vector illustration may use faceless human figures, soft geometry, simple icons, restrained shadows, and schematic UI elements when they explain an action, relationship, or decision. Use the 12-column deck grid as a construction aid, not a visible decoration.

Block 3D, cyberpunk, neon, cinematic or photorealistic generated scenes, noisy texture, excessive glassmorphism, mixed icon families, dense gradients, text over imagery, external brand colors, and regenerated logos. [METODOLOGIA]

# Accessibility

Use large readable type at actual output size; test contrast rather than inferring it from palette membership. Do not encode state only by color. Give charts labels, units, sources, and logical order. Provide alt text for meaningful visuals; mark decorative visuals accordingly. Preserve comprehension when animation, color, or illustration is removed. Avoid rasterizing text when editability or accessibility is required.

</knowledge>
<evidence>

# Evidence

Visual identity is owner-confirmed brand canon. Accessibility conformance still depends on format-specific measurement and cannot be claimed from this text alone. [METODOLOGIA][source_ref:EVD-OWNER-VISUAL-20260825]

</evidence>
<decisions>

# Decisions

Clarity outranks stylistic fidelity. Gold is scarce and semantic. A visualization is used only when it materially improves understanding. Logos are placed from approved master assets in postproduction.

</decisions>
<assumptions>

# Assumptions

[SUPUESTO] Output tools can reproduce the palette and fonts or disclose fallbacks. [SUPUESTO] The delivery format supports a meaningful accessibility review.

</assumptions>
<limits>

# Limits

The canon does not grant image rights, authorize portrait stylization, or guarantee WCAG conformance. Historical artwork is reference-only and must not be copied.

</limits>
<edge_cases>

# Edge cases

- On a navy background, use the approved reverse logo and verified light text contrast.
- For monochrome or print constraints, preserve hierarchy with weight, spacing, line, and labels.
- If the requested channel is tiny, reduce content rather than shrinking type.
- If generative output corrupts text, rebuild it in an editable layout tool.

</edge_cases>
<acceptance>

# Acceptance

The artifact uses only authorized color tokens, correct font roles or disclosed fallbacks, a consistent grid, functional visuals, readable actual-size text, non-color cues, approved assets, and no blocked aesthetic. Accessibility is tested for the final format, not assumed.

</acceptance>
<related_documents>

# Related documents

`CANON-CONTENT-STUDIO-V3`, `ASSET-USAGE-V3`, `REFERENCE-PDF-GALLERY-V3`.

</related_documents>
<change_log>

# Change log

- v3.0: consolidated owner-confirmed v1.1, separated identity from conformance, and added format-specific accessibility and recovery rules.

</change_log>
</kb_document>
