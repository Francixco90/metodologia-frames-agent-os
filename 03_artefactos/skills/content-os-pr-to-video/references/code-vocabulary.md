# Code vocabulary — the `code-*` blocks

PR videos run on two kinds of moving picture: **code** (las líneas que
cambiaron) y **behavior** (qué hace el change at runtime). PR video que es _all_
code reads flat; **alternate the two** (story-design plans el rhythm; mechanism
beat = invented animated diagram o `flowchart`/`data-chart`).

Para code beats, `content-os-registry` ships purpose-built **code animation
blocks** que render un diff, typed-on snippet, morph, highlight, scroll, o
3D/particle/dissolve reveal. Reach for one first; fall back to hand-authored
composition solo si none fits.

## Step 4 (visual design)

Para cada `diff` / `before_after` / code beat, name el block en el frame's
`scene` (ej "el `request()` retry block, ~6 lines, `code-diff`"). Un judgment
call: which block. Pick por role:

- **`code-diff`** — diff hunk con +N/-M, antes/después lado a lado. Default para
  changed lines.
- **`code-typing`** — new code typed-on. Para additions puras, new file, new
  function.
- **`code-morph`** — before→after morph (refactor, rename, restructure). Muestra
  el transform.
- **`code-highlight`** — highlight de una línea/region específica. Para fix
  pinpoint.
- **`code-scroll`** — scroll through un file largo. Para context, file
  traversal.
- **`code-reveal-3d`** / **`code-dissolve`** — reveal dramatic. Para climax,
  big-reveal beat.

## Step 5 (frame worker)

Install el named block via `content-os-registry` (pre-install una vez antes de
dispatch, race-free). Mount en el frame como sub-composition clip:

```html
<div
  data-composition-id="code-diff"
  data-composition-src="compositions/code-diff.html"
  data-start="0"
  data-duration="6"
  data-track-index="1"
  data-width="1920"
  data-height="1080"
></div>
```

Self-contained sub-composition (inlined engine; paused GSAP timeline el engine
seeks per frame). Fill con el real diff/snippet del `### Source excerpt` (12
líneas max, seleccionado en Step 4 de `capture/diff.patch`).

## Behavior beats (non-code)

Mechanism beat: invented animated diagram (request-retry flow, data pipeline,
state machine) o `flowchart`/`data-chart` registry block. Muestra el behavior en
motion, no las líneas que cambiaron. Story-design decide cuándo un mechanism
beat beats un code beat.

## Delegación

- Block install/registry → `content-os-registry`
- Block motion internals → block's own timeline (seek-safe, hereda
  `content-os-animation`)
- Block pose/keyframe lint → `content-os-keyframes`

Este doc es el delta pr-to-video: `code-*` block vocabulary + pick por role. No
dupliques motion rules (→ `content-os-animation`), no dupliques story (→
`story-design.md`).
