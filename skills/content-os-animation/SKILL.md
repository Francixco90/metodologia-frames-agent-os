---
name: content-os-animation
description: This skill should be used when the user asks to "animate a Content OS composition", "pick GSAP motion rules for an HTML scene", "load a multi-phase scene blueprint", "author a scene transition between clips", or "audit a composition's animation map".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires GSAP 3.15.0, the content-os-core HTML composition contract, and an offline render profile. No network, no GPU runtime, no external assets.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Content OS Animation

Todo el conocimiento de motion para el runtime **HTML+GSAP** de Content OS: **rules**
(recetas atómicas), **blueprints** (plantillas multi-phase), **transitions** (transiciones
entre clips), y **técnicas** (patrones de motion design). Adaptado de `hyperframes-animation`
(vendor referencia) al arquitectura local fail-closed + offline-first. Coexiste con
`motion-library-adapters` (GSAP/Three/Lottie bajo frame clock Remotion); no duplica — este
es el análogo HTML+GSAP seekable.

Para el contrato de composición (`data-*`, sub-composiciones, determinism) ver
`content-os-core`. Esta skill añade motion-craft encima.

## Default: compone reglas atómicas

Pick 2-4 rules de `rules/rules-index.md`, pégalas en una sola `gsap.timeline({paused: true})`
registrada en `window.__timelines["<id>"]`, done. Más rápido y menos código que un blueprint.

## Carga un blueprint cuando

- La escena matchea un template multi-phase pre-diseñado (brand-reveal, kinetic-type, etc.) y
  reusar su pipeline de phases ahorra authoring real.
- Quieres ground-truth runnable para una coreografía 4-5 phases.

Blueprints en `blueprints/blueprints-index.md`. Cada entry apunta a
`blueprints/<id>.md` (recipe). No lo leas especulativamente; cárgalo cuando ya decidiste
que necesitas orquestación a nivel escena.

## Routing

| Quieres…                                       | Lee                              |
| ---------------------------------------------- | -------------------------------- |
| Pick un motion pattern atómico por trigger/tag | `rules/rules-index.md`           |
| Leer una rule full HTML/CSS/GSAP               | `rules/<name>.md`                |
| Pick un template multi-phase                   | `blueprints/blueprints-index.md` |
| Leer un blueprint full recipe                  | `blueprints/<id>.md`             |
| Autor una transición entre clips (CSS-driven)  | `transitions/overview.md`        |
| Auditar el animation map de una composición    | `scripts/animation-map.mjs`      |
| Ver una composition ground-truth               | `examples/brand-reveal.html`     |

## Adapters scope — offline-first

| runtime                             | estado           | nota                                                                                                                                                   |
| ----------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GSAP                                | default          | timeline orchestration, transforms, easing, stagger. 95% motion.                                                                                       |
| CSS keyframes                       | opcional         | `animation-delay`/`play-state`/`fill-mode`; seekable via framework. Solo motifs simples (shimmer, decor).                                              |
| WAAPI                               | opcional         | `element.animate()`, `currentTime` seek. Nativo, sin dep.                                                                                              |
| Three.js / Lottie / Anime / TypeGPU | **out-of-scope** | requieren assets externos, GPU runtime no determinístico offline, o licencia insuficiente. Si una composition los necesita, pausa y escalar a usuario. |

Múltiples runtimes pueden coexistir; cada uno registra instancias en su global para que el
adapter de `content-os-core` seek todos en un pass.

## Critical Constraints

Prerequisito: `content-os-core` → Non-Negotiable Rules (single paused timeline,
`data-duration` gobierna length, no `Math.random`/`Date.now`/`performance.now`, no
`repeat: -1`, no page-load `gsap.set` en later-scene clips, no `display`/`visibility`
tweens raw, no timeline construction dentro `async`/`setTimeout`/`Promise`).

Adiciones animation-craft encima del contrato core:

- **Constantes de layout pre-calculadas** — nunca derivar posiciones de
  `getBoundingClientRect()` en tween time. Las mediciones DOM en tween time desincronizan
  (renderer samplea en paralelo); computa coordenadas una vez al setup y reusar.
- **Spatial motion usa GSAP transform aliases solo** (`x`, `y`, `scale`, `rotation`). El
  allowlist core también permite `opacity`/`color`/`backgroundColor`/`borderRadius` para
  tweens non-spatial — pero nunca `width`/`height`/`top`/`left` para layout changes.
- **Stagger cap** — `items × stagger ≤ ~0.5s` para que un arrival lea como un beat.
- **Sin CSS `transition`** en elementos animados (interpolan independientes del seek,
  flicker). Hint compositors con `will-change: transform` donde muchos tweens corren.
- **Sin `+=`/`-=` tweens** (relativos). Estados absolutos, `fromTo` con from-states
  explícitos, `immediateRender: false` al re-own un target. Seek-safe bidireccional.
- **Sin mutable trackers** — estado legible como función pura de timeline time.

## Auditar choreography

```bash
node skills/content-os-animation/scripts/animation-map.mjs <composition-dir> --out <dir>/.cos/anim-map
```

Lee cada timeline en `window.__timelines`, enumera tweens, samples bboxes, computa flags,
output `animation-map.json`. Usa para auditar dead zones, stagger consistency, lifecycle
warnings tras authoring.

## Stop rules

Rechazar `Math.random`, `Date.now`, `performance.now`, `repeat: -1`, `getBoundingClientRect`
en tween time, `width`/`height`/`top`/`left` tweens, CSS `transition` en animados, `+=`/`-=`
tweens, Three/Lottie/Anime/TypeGPU (offline-first), network, assets externos, y solicitud de
producción. Animation es `local_evaluation`; producción requiere gates humanos G13-G17.

## Verificación

```bash
node skills/content-os-animation/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar VS-001, H-01, H-02, n8n, Remotion skills y `content-os-core` byte-idénticos.
