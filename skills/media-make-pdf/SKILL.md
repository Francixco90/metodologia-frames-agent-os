---
name: media-make-pdf
description: This skill should be used when the user wants to generate a PDF document from text, markdown, or HTML source, describing the capability and required confirmation before any external tool or binary is invoked.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# media-make-pdf — generate a PDF from text, markdown, or HTML

Derivada de `make-pdf` (`garrytan/gstack`, MIT). Locally-authored adaptation for the
MetodologIA toolchain. Vendor reference: `skills/vendor/gstack/make-pdf/SKILL.md`
(read-only authority reference). No vendor code is copied; this file describes the
capability and gates every execution behind explicit user consent.

## What this skill does

`media-make-pdf` describes how to produce a PDF document from one of three supported
source formats: plain text, Markdown, or HTML. The capability covers the common
"turn this into a PDF" request: the user supplies source content and an optional output
path, and the skill explains the rendering path (source → HTML intermediate → paged
PDF) and the options that map to a publication-quality result (margins, page numbers,
cover page, table of contents, running headers, watermark).

This is a **tool skill**: it describes a capability and the boundary that governs it.
It does not ship a binary, a renderer, or a dependency manifest. It exists so an
agent can reason about PDF generation and stop at the fail-closed line.

## When to use

Invoke this skill when the user asks to:

- "generate a PDF from this markdown"
- "export this text as a PDF"
- "turn this HTML into a PDF"
- "make a PDF document"
- "convert this markdown to PDF"

It applies to ad-hoc document generation from authored content. It is not a print
pipeline, a layout engine, or a brand-template formatter — those belong to other
MetodologIA skills. When the request is ambiguous about the source format or the
output target, ask before proceeding.

## Fail-closed boundary (non-negotiable)

This skill **never** executes anything on its own. The boundary is:

- **NEVER** auto-run a binary, a renderer, a shell command, or any external tool.
- **NEVER** auto-install dependencies, packages, fonts, or headless browsers.
- **ALWAYS** require explicit user confirmation before any execution that produces
  the PDF or mutates the environment.
- If the tooling (binary, renderer, headless browser, font set) is not already
  present, the skill stops and reports a `coverage_gap` for the missing tooling
  rather than installing it.

The skill describes the capability and the steps; the user authorizes each
execution. An agent following this skill treats the description as a plan to
confirm, not a script to run.

## Input handling

Accepted source formats:

| Format     | Handling                                                         |
| ---------- | ---------------------------------------------------------------- |
| Plain text | Wrapped into a single-section HTML body before paged rendering.  |
| Markdown   | Parsed to HTML (headings, lists, code, links) before rendering.  |
| HTML       | Used as the intermediate; sanitized of remote scripts/resources. |

The skill does not fetch remote URLs, download images, or resolve network
resources during description. Any external resource needed for the final PDF is
surfaced as a confirmation prompt, not silently pulled.

## Output

The expected output of a confirmed run is a single PDF file at the user-supplied
or negotiated path. The skill does not guarantee a `FINAL`, `HUMAN_APPROVED`,
`READY`, or `PUBLISHED` state — a rendered PDF is `RENDERED_DRAFT` until a human
reviewer promotes it. The output contract (one path on stdout on success,
progress on stderr, non-zero exit on failure) is described here so the user knows
what to expect after they confirm execution.

## Coverage gaps

If the renderer binary, the headless browser, the font set, or any dependency
required to produce the PDF is not already installed on the host, the skill
records a `coverage_gap` with the missing component and stops. It does not
install, it does not guess, and it does not substitute a polished inference for
a missing tool. Escalation beats assumption.

Derivada de make-pdf (garrytan/gstack, MIT).
