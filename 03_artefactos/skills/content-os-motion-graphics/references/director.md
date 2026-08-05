# Director — Motion Graphics

Reference for Step 1 (plan) + Step 3 (design). The orchestrator dispatches a
director subagent with this reference. Autonomous: at most one clarifying
question, then build through verification.

## Part 1 — Plan (Step 1)

### First decision: does this need a search?

The fork that splits categories:

- **No search** → **form category**. User supplies content. `asset_needs: []`.
  Categories: `kinetic-type`, `stat`, `charts`, `logo-reveal`, `lower-thirds`,
  `maps`.
- **Search** → emit a **search plan** into `asset_needs[]` (news / web / tweet /
  image; two-pole queries). Category confirmed by content type returned in
  Step 2 (`webpage` / `news` / `tweet` / `asset-fusion`).

### The one clarifying question (at most)

If the intent is ambiguous between categories, ask ONE question to disambiguate
(e.g. "stat count-up, or kinetic-type line?"). If clear, ask nothing. Never
interview-shape a short motion graphic.

### Draft shot-plan.json

Envelope + chosen form category (or search intent) + `asset_needs` + a
one-paragraph shot brief. Schema: `references/shot-plan-ir` (local equivalent).

Validation: `shot-plan.json` exists + category chosen + `asset_needs` declared.

## Part 2 — Design (Step 3)

Design the shot **around the available assets** (asset-first):

1. Pick the catalog block(s) from `content-os-registry` (+ `catalog-map.md`
   equivalent).
2. Pick the `content-os-animation` rules/blueprints for the motion.
3. Layout: composition, positions, hierarchy.
4. Motion: beats, signature move, final hold. Seek-safe GSAP (`paused: true`).
5. For `asset-fusion`: `element_positions` + eyedropper palette (asset geometry
   becomes the chart — diegetic fusion).

Finalize `shot-plan.json`: `content.block` + `content.customize` + per-category
content fields.

## Category-specific design notes

- **kinetic-type**: motion-first text. `caption-*` blocks. Word-by-word or
  letter-by-letter reveal. One line, one idea.
- **stat**: single hero number + count-up + ring. `apple-money-count` /
  `stat-bars-and-fills` rules. Count-up must be deterministic (no Math.random).
- **charts**: bar / line / pie / race / %. `data-chart` block. Data drives the
  chart; animate growth, not the axis.
- **logo-reveal**: logo sting / brand lockup. `logo-outro` + `svg-path-draw`.
  User logo is the asset; draw it, don't replace it.
- **lower-thirds**: name/title bars, callouts, social overlays. `caption-*` +
  overlay blocks. Transient, readable, brand-aligned.
- **maps**: geographic motion. `us-map` / `world-map` family. Highlight
  regions, connect places, zoom to location. Vector lane or baked basemap.
- **webpage**: webpage/UI animation. Scroll, reveal, cursor, callouts. Real
  screenshot (searched) as asset.
- **news**: headline reveal + source card + key-fact callouts.
- **tweet**: animated tweet card.
- **asset-fusion**: asset geometry becomes the chart (diegetic fusion).
  `element_positions` + eyedropper palette from the real image.

## Proof times (Step 5)

Choose proof snapshot times that show: opening state, signature move, final
hold. 2-3 snapshots for a short piece. Inspect contact sheet before continuing.
