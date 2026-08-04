---
name: content-os-bento-slides
description: This skill should be used when the user asks to "make a Bento deck", "bento slides", "bento presentation", ".bento.html deck", "bento-doc JSON", "bento morph transitions", or "bento slide charts". Author Bento presentations — single-file .bento.html decks whose document is plain JSON in a #bento-doc script block. Map content to features (charts, morph transitions, state slides, ken-burns, motion paths) instead of static text slides. Sits beside `content-os-core` (MetodologIA canonical HTML composition). Clean-room prose from the Bento vendor reference (nyblnet/bento, MIT). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-core.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pin (Playwright 1.61.1 for screenshot export). Sits beside `content-os-core`. A Bento deck is a self-contained .bento.html file; document JSON is deterministic given content. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Bento Slides — author .bento.html decks

Derivada de `bento-slides` (`nyblnet/bento`, MIT). Locally-authored clean-room
prose adaptation for the Frames ContentOS toolchain. Vendor reference:
`skills/vendor/bento/bento-slides/SKILL.md` (read-only). Sits beside `content-os-core`
(MetodologIA canonical HTML composition).

This skill authors **single-file `.bento.html` decks**. The document is plain JSON in a
single `#bento-doc` script block. Edit that block only, in place. It does not author
non-Bento HTML (`content-os-core`) or Apple-style screenshot grids
(`content-os-bento-apple-grid`).

## Document model

A Bento deck is one self-contained `.bento.html` file. The document is JSON in:
`<script type="application/bento+json" id="bento-doc"> { ... } </script>`. Edit **that
block only**. Escape every `<` in the JSON as `<` so it can never contain a literal
`</script>`. Leave the rest of the file (the compressed runtime) untouched.

## Starting from nothing

When there is no `.bento.html` to edit, fetch the latest signed release and author into
it (authoring-time network). Verify the download contains `id="bento-doc"`, then write
the document into that block. The block is empty in the downloaded file. Fetch the
agent schema before authoring and start from its minimal-valid-document skeleton. `size`
and `theme` (including `theme.fontFamily`) are required — the app will not boot without
them. Fully specify element fields; omit `docId` and `collab` for fresh decks.

## Map material → feature (not static text)

This is the step that makes it a Bento deck rather than a slideshow of paragraphs:

- numbers to compare → a **chart** element
- comparison / spec / pricing grid → a **table** element
- consecutive slides about the same thing changing → **morph** (shared `id` +
  `transition:"morph"` on the later slide)
- a point to drill into → a **state slide** (`stateOf` + element `link`)
- hero / full-slide image → full-bleed image + scrim rect + text, with **ken-burns**
- sequence / flow / timeline → line/path with `dash-march` loop, or morph a highlight
- headline number → big text + `fx:{countUp:true}`
- every cover / divider → at least one ambient motion
- repeated chrome / logo → keep its `id` stable across slides so it morphs in place
- demo clip / soundbite → a **media** element (`kind: video|audio`)

## Critical gotchas

- Charts: bar/line series `data` must be plain numbers; colour by series, not per bar;
  `option` is pure JSON, template formatters only, never functions.
- Morph needs deterministic, stable `id`s shared across slides that animate together.
- Images/fonts must be embedded as data URIs in `doc.assets` and referenced by
  `"asset:<key>"` — the file stays self-contained.
- Media: short clips as data URI in `src`; URL for big files. `autoplay` runs only in
  present mode and needs `muted:true` for video. Don't embed large videos.
- Never regenerate `docId` when editing an existing deck; it is the document's identity.

## Self-audit

Before finishing: numbers as text that should be a chart? consecutive slides sharing
ids + morph? at least one motion moment (ken-burns / loop / count-up), esp. cover?
a drill-down better as a state slide? one accent colour, ≤2 typefaces, 96px margins?
speaker notes on every slide? Open the deck and **look at every slide before reporting
done** — overflow and dropped keys are invisible in JSON and obvious on screen.

## Determinism contract

The document JSON is deterministic given the content inputs. No `Math.random`,
`Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in the document JSON.
Fetching the bento app release and the agent schema is **authoring-time** network, not
part of the document. The deck renders deterministically given the JSON. A deck is
`RENDERED_DRAFT`; production gates G13-G17 manual.

## Preflight

1. Confirm exact toolchain pin (Playwright 1.61.1 for screenshot export).
2. Confirm the document JSON is self-contained (assets as data URIs).
3. Confirm element ids are stable and deterministic for morph.
4. Stop on: temporal/network APIs in the document, non-deterministic ids, production
   request without human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in
the document JSON, non-deterministic morph ids, large external media (not self-contained),
unpinned remote assets, and production / publish requests. Bento decks stay
`RENDERED_DRAFT` until G13-G17 gates resolve.

## Verificación

```bash
node skills/content-os-bento-slides/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `content-os-core`, VS-001, H-01, H-02, n8n y `Root.tsx` byte-idénticos.

## Referencias

- `skills/content-os-core/SKILL.md` — MetodologIA canonical HTML composition skill (authority sibling).
- `skills/vendor/bento/bento-slides/SKILL.md` — vendor reference (read-only, MIT).
