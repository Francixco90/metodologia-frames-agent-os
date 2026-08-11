---
name: content-os-general-video
description: This skill should be used when the user asks to "author a custom video", "build a brand reel or sizzle reel", "make a montage", "build a multi-scene video when no specialized workflow fits", "remix existing footage", "build a static title card or loop", or "co-create a freeform video (companion flow)".
version: 0.6.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition + seek-safe GSAP), content-os-animation (blueprints/rules), content-os-keyframes (pose/lint), content-os-creative (brand/story-spine/genre lenses), content-os-media (offline + remote-opt-in), content-os-registry (blocks), content-os-router (dispatch). Input = freeform brief. Output = MP4 (RENDERED_DRAFT). Companion or automation flow.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS General Video

Orquestador freeform: autor un video custom cuando ningún workflow especializado encaja —
brand reels, sizzle reels, montajes, multi-scene pieces, static loops, title cards, footage
remixes, freeform builds. Adaptado de `general-video` (vendor, Apache 2.0) a fail-closed +
hash-bound + offline-first. No `npx hyperframes` CLI. Capabilities delegadas (ver
frontmatter `compatibility`).

## When to use this vs a specialized workflow

El router deriva explicadores, PR, lanzamientos, motion graphics, talking-head con captions
y decks a sus workflows especializados. Usa `content-os-general-video` para el resto:
multi-scene, brand reel, montage, title card o remix freeform.

## Autoridad Spec First

Todo trabajo nuevo usa `general-video-v2` revisión 2 y la secuencia canónica
`Spec → Compile → Verify → Review → Promote`. La especificación aprobada es la
autoridad: scripts, EDL, captions, overlays, assets, planes y receipts deben declarar el
mismo `specId` y `specSha256`. Los trabajos v1 son legibles para migración, pero `render`
los bloquea. Nunca se corrige un output compilado como si fuera fuente.

Cada pieza usa `piece-scripts-v2`: `scriptMode`, `decision`, `sourceSpans`, `visualSpans`,
`captionTrackRef`, `correctionLedgerRef`, claims y dependencias hash-bound. Las decisiones
son `use`, `extend`, `reframe` o `discard`; sin evidencia suficiente no se fuerza una pieza.

La CLI local `scripts/video-cli.mjs` expone `ingest`, `index`, `script`, `plan`, `render`,
`verify` y `package`. Opera offline, sin shell, con rutas relativas al proyecto. `render`
solo ejecuta jobs FFmpeg declarados y validados por `plan`; `audio-remux` exige
`-c:v copy`. La caché separa cuerpo, captions, gráficos, cortinillas y audio para invalidar
únicamente capas y piezas dependientes. El render permite solo inputs de archivo relativos
al proyecto y limita FFmpeg al protocolo `file`; protocolos de red quedan bloqueados.

## Flow — companion vs automation

- `automation`: enruta, declara estado, construye, verifica y entrega.
- `companion`: co-crea como director; propone primero un ceiling treatment con arco,
  diseño, movimiento por escena, transiciones, identidad sonora, materiales y cierre.

El usuario recorta el tratamiento. Cada capa sirve al mensaje; el craft puede subir, pero
el contenido no excede el alcance.

## Storyboard — review surface

Con `storyboard: yes`, plan y sketch forman la review surface; con `no`, se construye sin
board. “Just build it” equivale a `flow: automation`, `storyboard: no`.

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden, pasa cada
gate. User-gated: 0, 6. Delega a capabilities; no dupliques rules. step-gated orchestrator
(setup→plan→resolve→build→assemble→verify→finalize); freeform when no specialized workflow
fits; hash-bound via sha256; deterministic seek-safe (window.__timelines, paused: true,
tl.seek(frame/fps)); offline-first render path; scope exact.

## Preflight (siempre)

1. Confirmar `route: content-os-general-video` y `capability_map[]` en el brief.
2. Cargar `content-os-media` para operaciones de medios; lo remoto es opt-in y auth-gated.
   Figma usa assets/tokens exportados, sin conectores.
3. Verificar contratos de composición y marca; usar fuentes locales.
4. Correr `scripts/workflow-audit.mjs`.

## Sub-agent dispatch (scale-dependent)

El dispatch solo compensa a escala: hasta seis escenas cortas se construyen inline; por
encima, asigna 2–3 escenas por worker. Ver `references/dispatch.md`.

## Genre lenses (companion)

En `companion`, diseña el treatment desde story-spine, house-style, genre lens y
capability-menu de `content-os-creative`; reutiliza forma y criterio, nunca scripts privados.

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Orquesta steps + gates. Design/motion rules viven en
   capabilities.
2. **Scope exact.** Build lo que el user pidió. Un title card no es title card + scenes +
   music + captions. Offer additions antes de añadir. `scope_expanded: true` = `scope-creep`.
3. **Render-path offline-first.** Compositions + frames + composite offline. Media:
   offline default, remote opt-in auth-gated.
4. **Deterministic.** Mismo brief + plan + frames → mismo render. Sin
   `Date.now()`/`Math.random()`/`new Date()` en compositions.
5. **Seek-safe.** GSAP `paused: true`, scrubbed to frame `t` (hereda
   `content-os-animation`). No `repeat: -1`/`+=`/`transition:` animated elements.
6. **Design before HTML.** Resolve design source: `frame.md` → `design.md` → `DESIGN.md`
   (first found = brand truth). Sin spec, completa 4 items (identity, concept angle, fonts,
   focal/edge/supporting/bg) antes de HTML.
7. **Draft automático, promoción humana.** Un `RENDERED_DRAFT` puede compilarse tras gates
   deterministas. `HUMAN_APPROVED`, `READY` y `PUBLISHED` requieren revisión y gates
   manuales; la skill nunca los concede.
8. **Step-gated.** Cada step tiene gate. Sin gate, no avanzas. User-gated (0, 6) pausan.
9. **Delegate on-demand.** Carga solo lo que el step activo necesita.
10. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/final.mp4` = `RENDERED_DRAFT`. `finalize`
    sin render = `no-render`. `READY`/publicación requiere gates G13-G17.

## Steps (router — detail en `references/steps-receta.md`)

| Step | Acción | Gate |
| --- | --- | --- |
| 0 Setup/Ingest | Router brief, fuente congelada y hashes. | intent + source pack |
| 1 Spec | Especificación canónica aprobada y hash-bound. | `SPEC_APPROVED` |
| 2 Script/Plan | Script semántico, spans, captions, EDL, capas y caché. | contracts + evidence |
| 3 Resolve/Build | Resolver assets y compilar escenas/capas deterministas. | deps + build manifest |
| 4 Assemble | FFmpeg ensambla; correcciones solo de audio usan remux. | assembled + receipts |
| 5 Verify | Editorial, visual, privacidad, A/B, audio y técnica. | deterministic pass |
| 6 Review | Revisión humana separada; no altera compilados. | human receipt o STOP |
| 7 Promote | Solo con gates externos G13-G17. | fuera de autoridad de la skill |

## Stop rules

- `workflow-audit.mjs` PASS + gates + final.mp4 verified: STOP.
- Step user-gated sin approval: STOP, pedir approval.
- Intent no confirmado (router no despachó general-video): STOP, re-route.
- Sin brief: STOP, rutcea via `content-os-router`.
- Brief encaja en especializado: STOP, hand off al correcto.

## Done

`renders/final.mp4` (RENDERED_DRAFT) + verified + handoff (preview/artifact + duration +
snapshot sheet). Gates pasados, capabilities delegadas, render-path offline-first +
deterministic + seek-safe heredados. Para `flow: companion`: treatment delivered — every
scene's cited rules realized, audio identity (o silence + said), open + close designed.
`READY`/publicación bloquea gates G13-G17. El lifecycle de esta versión permanece
`local-evaluation`.

## A/B y miniclips

Un grupo A/B usa `ab-test-v1` con `variantAxis: visual`. Duración, frame count, copy, CTA,
cortinillas, timing y PCM son invariantes recalculados desde outputs y referencias
hash-bound. La pista visual debe ser distinta. Si cualquier invariante difiere,
el par queda bloqueado. El gate de miniclips además exige Poppins en captions, Montserrat en
títulos/disclosures, máximo dos niveles de texto simultáneos, safe zones, audio a
−16 LUFS ±0,3 con máximo −1,5 dBTP, y cero logos/copy prohibidos.
