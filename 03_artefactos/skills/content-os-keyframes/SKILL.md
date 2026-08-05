---
name: content-os-keyframes
description: This skill should be used when the user asks to "define keyframe poses for a Frames ContentOS composition", "lint a pose contract", "verify seek-safe keyframes", "snapshot proof frames of an animation", or "audit pose identity and final state".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires GSAP 3.15.0, the content-os-core HTML composition contract, and the content-os-animation seek-safe rules. Offline render profile only. No network, no GPU runtime, no external assets.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Keyframes

Keyframes son un **pose contract**: sujetos animados nombrados, estados visibles
explicitos, estado final declarado, runtime seek-safe, pixeles verificados. Esta skill
extiende `content-os-core` (contrato de composicion) y `content-os-animation` (reglas
GSAP) con la capa de **verificacion de poses**: lint estatico, snapshot de frames de
prueba, y deteccion de fallos de identidad/endpoint-only/fake-3D. Adaptado de
`hyperframes-keyframes` (vendor referencia) al arquitectura local fail-closed +
offline-first. No duplica `content-os-animation` — este verifica lo que aquel autorea.

Para motion-craft (recetas, blueprints, transiciones) ver `content-os-animation`. Esta
skill anade el contrato de pose + diagnostico encima.

## Default: lint estatico de pose contract

Corre `scripts/pose-lint.mjs <composition.html> --out <dir>`. El linter extrae sujetos
animados (`data-keyframe-subject`), poses explicitas (`data-pose` con `data-at`),
estado final (`data-final-state`), timelines registradas, y detecta:

- **endpoint-only**: sujeto con solo 2 poses (inicio/fin) y ninguna pose media explicita.
- **identity-break**: sujeto crossfade que rompe continuidad (flag `data-crossfade` en
  sujeto no-replacement).
- **fake-3D**: escala sin perspectiva/z/rotacion (flag `data-fake-3d`).
- **unregistered timeline**: `gsap.timeline` no asignada a `window.__timelines`.
- **end-on-black / reset-to-rest**: pose final marcada como `data-reset` o `data-black`.
- **unseekable runtime**: `Math.random`, `Date.now`, `new Date`, `repeat: -1`, `+=`.

Emite `pose-lint.json` (schemaVersion `content-os-pose-lint-v1`). Falla closed si
cualquier violation detectada en modo `--strict`.

## Carga el reference cuando

- Decidiste el mecanismo (path travel, stroke draw, shared element, etc.) pero
  necesitas el skeleton runnable del runtime. Lee `references/pose-patterns.md` solo
  para elegir mecanismo de implementacion, no estilo visual.

No lo leas especulativamente; cargalo cuando ya identificaste sujeto + poses + runtime.

## Routing

| Prompt signal                                           | Carga                            |
| ------------------------------------------------------- | -------------------------------- |
| "definir keyframes / poses de un composition"           | rules/pose-contract.md           |
| "verificar poses seek-safe"                             | scripts/pose-lint.mjs            |
| "snapshot de frames de prueba"                          | rules/pose-contract.md §Snapshot |
| "elegir mecanismo (path/stroke/flip/morph)"             | references/pose-patterns.md      |
| "diagnosticar endpoint-only / identity break / fake 3D" | §Diagnostic Reading              |

## Pose Contract (ground truth)

1. **Nombra el sujeto animado.** Un sujeto = un selector + `data-keyframe-subject`.
2. **Nombra las poses necesarias** para probar el motion intencional, incluyendo el
   estado final. Marca cada pose con `data-pose="<name>" data-at="<seconds>"`.
3. **Keyframea canales visibles**, no estado helper oculto. Canales compositor (`x/y/z`,
   `scale`, `rotation`, `opacity`, `autoAlpha`, `clip-path`, SVG dash) sobre canales
   layout (`top/left`, `width/height`, `display`).
4. **Preserva identidad del objeto** cuando la continuidad importa. Un sujeto vive
   durante todo el tramo; no lo reemplaces con crossfade a menos que el motion
   intencional sea reemplazo/dissolve.
5. **Crossfade solo cuando** el motion intencional es reemplazo o dissolve. Marca
   `data-crossfade="replacement"` si lo es.
6. **Hold estados legibles** el tiempo suficiente para verlos. Pose de prueba > 200ms.
7. **El frame final es parte de la animacion**, no cleanup. No reset a rest, no end on
   black, salvo peticion explicita.
8. **Repeats finitos.** Stagger cap <= 0.5s (hereda `content-os-animation`).

## Channels

Prefiere canales compositor/visual: `x/y/z`, `xPercent/yPercent`, `scale`,
`rotationX/Y/Z`, `skew`, `transformOrigin`, `svgOrigin`, `opacity`, `autoAlpha`,
`clip-path`, masks, CSS vars, SVG path/dash values.

Evita canales layout/lifecycle: `top/left/right/bottom`, `width/height`,
`margin/padding`, `display`, `visibility`, late DOM creation, helper overlays haciendo
motion del sujeto.

Para cambios de visibilidad usa `autoAlpha` en la timeline seekable registrada, o un
`tl.set()` de duracion cero en un boundary explicito. Target un elemento non-clip o un
wrapper dentro del clip; nunca el `.clip` mismo. Nunca tween `visibility` con duracion;
nunca tween `display`.

## Mechanism Choice (offline-first)

Elige el mecanismo mas pequeño que pruebe el prompt:

| Need                              | Mechanism                      | Runtime (offline)                                  |
| --------------------------------- | ------------------------------ | -------------------------------------------------- |
| Same subject cambia box/jerarquia | shared element / FLIP          | GSAP manual FLIP                                   |
| Subject recorre ruta visible      | path travel                    | GSAP x/y/z sampleado (no MotionPathPlugin externo) |
| Stroke crece o traza              | stroke draw                    | SVG `stroke-dasharray`/`stroke-dashoffset`         |
| Shape a otro shape                | shape interpolation            | path tween (no MorphSVGPlugin externo)             |
| Boundary de reveal visible        | clip / mask / shader           | CSS `clip-path`, SVG mask                          |
| Muchos items con orden            | stagger / indexed delay        | GSAP stagger                                       |
| Texto mismo se mueve              | line/word/char/band            | authored spans (no SplitText paywall)              |
| Surface estira/cropea             | parent/child counter-transform | GSAP + CSS vars                                    |
| UI con estados                    | explicit state machine         | GSAP labels                                        |
| Escena con profundidad            | DOM 3D                         | CSS perspective + `transform-style: preserve-3d`   |

Three.js/WebGL/Lottie/Anime out-of-scope offline-first (ver `content-os-animation`
adapters scope). Mecanismos pueden combinarse, pero cada uno debe clarificar la idea.
Decoracion no es prueba.

## Snapshot

Snapshot captura frames en tiempos de prueba via el render adapter de `content-os-core`
(HTML→PNG→FFmpeg). Tiempos a snapshot:

- **First frame** (t=0): estado inicial legible.
- **Proof poses** (`data-at` de cada pose): peak proof del mecanismo.
- **Final-minus-hold**: justo antes del hold final.
- **Exact final**: estado final lockup.

Compara snapshots contra el pose contract declarado. Trust painted pixels over logs.

## Diagnostic Reading

- `endpoint-only`: sujeto con solo inicio/fin, sin middle poses. Fix: anadir middle
  poses, hold peak proof, re-lint.
- `identity-break`: sujeto reemplazado por crossfade. Fix: mantener un elemento vivo,
  shared source/final boxes, remover crossfade sustituto.
- `fake-3D`: escala sin perspectiva/z. Fix: anadir z/camera travel, occlusion, angled
  proof.
- `wrong-final`: no hay final hold. Fix: anadir final hold, snapshot final-minus-hold y
  exact final.
- `unseekable`: autoplay/timer/random. Fix: pausar autoplay, registrar instancia,
  remover timers, construir sincrono.
- `unreadable-text`: line boxes rotos. Fix: preservar line boxes, reducir displacement,
  anadir final hold, snapshot text frames.

## Critical Constraints

- Pre-calcula layout constants (no `getBoundingClientRect` en tween time).
- Transform aliases solo (`will-change: transform`).
- Stagger cap <= 0.5s (hereda `content-os-animation`).
- No CSS `transition:` en elementos animados (usa GSAP).
- No `+=` relative tweens (poses absolutas).
- No `repeat: -1` (repeats finitos).
- No mutable trackers (`Math.random`, `Date.now`, `new Date`, `performance.now`).
- No network (hereda `content-os-core` render adapter: hook `page.on('request')` rechaza
  no-`file:`/`data:`).

## Stop rules

- Poses nombradas, estado final declarado, runtime seekable: STOP.
- Lint detecta endpoint-only/identity-break/fake-3D/unseekable: FIX antes de render.
- Snapshot first/proof/final-minus-hold/exact-final: VERIFY antes de marcar done.
- Sin pose contract declarado, no marks `RENDERED_DRAFT`.

## Done

Pose contract declarado (sujeto + poses + final), `pose-lint.mjs` PASS en modo strict,
snapshots en first/proof/final-minus-hold/exact-final, motion owned por el sujeto, sin
debug overlays. `RENDERED_DRAFT` != `HUMAN_APPROVED` != `READY` != `PUBLISHED`.
