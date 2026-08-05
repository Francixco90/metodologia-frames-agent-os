---
name: content-os-bento-apple-grid
description: This skill should be used when the user asks to "make Apple bento cards", "Apple-style bento grid", "bento stat cards", "project summary cards", "dashboard cards Apple style", "bento grid screenshot export", or "Apple presentation layout". Generate Apple-inspired bento grid presentation cards as self-contained HTML files — zero-gap grids, stat cards, pill tags, bar charts, dark quote cards, screenshot export at 2x. Sits beside `content-os-core` (MetodologIA canonical HTML composition). Clean-room prose from the Bento vendor reference (hubeiqiao/apple-bento-grid, MIT). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-core.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pin (Playwright 1.61.1 for screenshot export). Sits beside `content-os-core`. Apple bento grids are self-contained HTML files for screenshot export. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Apple Bento Grid — self-contained HTML cards for screenshot export

Derivada de `apple-bento-grid` (`hubeiqiao/apple-bento-grid`, MIT). Locally-authored
clean-room prose adaptation for the Frames ContentOS toolchain. Vendor reference:
`skills/vendor/bento/apple-bento-grid/SKILL.md` (read-only). Sits beside `content-os-core`
(MetodologIA canonical HTML composition).

This skill generates **self-contained HTML files** rendering Apple-inspired bento card
grids, ready for Playwright screenshot export at 2x. It does not author `.bento.html`
decks (`content-os-bento-slides`) or design-system guidelines (`content-os-bento-grid`).

## Output format

Always produce a single self-contained HTML file: `<!DOCTYPE html>` + `<html lang="en">`,
Google Fonts `<link>` in `<head>`, all CSS in one `<style>` block, all content in
`<body>` — no JavaScript needed. Light theme tokens (Apple signature #f5f5f7) and dark
theme tokens (#000) available.

## Zero-gap grid rules (mandatory)

1. NEVER set `align-items: start` — default `stretch` fills cells.
2. Use `aspect-ratio` on horizontal layouts to lock container shape.
3. Rows: `1fr` for horizontal, `auto` for vertical.
4. Gap: `6px` (not 8px).
5. Every grid cell must be occupied — no empty cells.

## Card types

Hero (taglines, gradient top-border, spans 2 rows) · Stat (numbers + labels, color-coded
accent) · Category (grouped items, color label + pill tags) · Bar Chart (growth /
comparison, gradient bars) · Badge (icon pill + stat) · Quote (dark bg, white text) ·
Highlight (hero number, full-gradient bg).

## Layout templates

A: 4-col 1200px (12-16 cards, slides) · B: 3-col 1100px (8-10 cards, focused) ·
C: 2-col 600px vertical (8-14 cards, social).

## Visual review (mandatory)

After generating, view the output to catch: orphan lines (single pill wrapping alone),
empty space (sparse cards), text overflow, broken grid (row gaps, misaligned cards),
font fallback (system fonts instead of Sora/DM Sans), screenshot clipping. Fix before
presenting. Author, render, check, fix; a grid nobody looked at is not finished.

## Screenshot export

Playwright captures pixel-perfect PNGs at 2x. Viewport width MUST match grid CSS width
(1200/1100/600) — if wider, the grid centers and the clip cuts off the right edge. Clip
must use `box.x`/`box.y` from `boundingBox()`, not `x:0, y:0`. Always view the output PNG
to verify no edges are clipped.

## Determinism contract

The generated HTML is deterministic given content inputs. No `Math.random`, `Date.now`,
`new Date`, `fetch`, `setTimeout`, `setInterval` in the generated HTML. Google Fonts
`<link>` is view-time network, not generation-time. A screenshot is `RENDERED_DRAFT`;
production gates G13-G17 manual. Screenshot export does NOT grant `HUMAN_APPROVED`,
`READY`, or `PUBLISHED`.

## Preflight

1. Confirm exact toolchain pin (Playwright 1.61.1 for screenshot export).
2. Confirm the HTML is self-contained (inline CSS, Google Fonts link only external).
3. Confirm zero-gap grid rules (stretch, 6px gap, every cell occupied).
4. Stop on: non-deterministic APIs in generated HTML, empty grid cells, viewport/clip
   mismatch, production request without human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in
generated HTML, `align-items: start`, 8px gap, empty grid cells, viewport/clip mismatch,
unpinned remote assets, and production / publish requests. Apple bento grids stay
`RENDERED_DRAFT` until G13-G17 gates resolve.

## Verificación

```bash
node skills/content-os-bento-apple-grid/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `content-os-core`, VS-001, H-01, H-02, n8n y `Root.tsx` byte-idénticos.

## Referencias

- `skills/content-os-core/SKILL.md` — MetodologIA canonical HTML composition skill (authority sibling).
- `skills/vendor/bento/apple-bento-grid/SKILL.md` — vendor reference (read-only, MIT).
