---
name: content-os-general-video
description: This skill should be used when the user asks to "author a custom video", "build a brand reel or sizzle reel", "make a montage", "build a multi-scene video when no specialized workflow fits", "remix existing footage", "build a static title card or loop", or "co-create a freeform video (companion flow)".
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition + seek-safe GSAP), content-os-animation (blueprints/rules), content-os-keyframes (pose/lint), content-os-creative (brand/story-spine/genre lenses), content-os-media (ASR candidate), content-os-transcript-intelligence (linguistic/semantic/narrative gate), content-os-registry (blocks), content-os-router (dispatch). Input = freeform brief. Output = MP4 (RENDERED_DRAFT). Companion or automation flow.
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

Usa `content-os-general-video` cuando el brief no encaje en ningún especializado:

| Si el brief pide... | Usa workflow especializado |
| --- | --- |
| Texto → faceless explainer | `content-os-faceless-explainer` |
| GitHub PR → code-change explainer | `content-os-pr-to-video` |
| Producto/website → launch video | `content-os-product-launch-video` |
| Short unnarrated motion-first unit | `content-os-motion-graphics` |
| Talking-head footage + captions | `content-os-embedded-captions` |
| Navigable deck (no MP4) | `content-os-slideshow` |
| Todo lo demás (multi-scene, brand reel, montage, title card, remix) | **`content-os-general-video`** |

Si duda, `content-os-router` despacha. Si despachó general-video, el brief es freeform.

## Flow — companion vs automation

| `flow` | Quién conduce | Comportamiento |
| --- | --- | --- |
| `automation` | Workflow elige + ejecuta | Choose route, state in one line, build, verify, hand off. |
| `companion` | Co-creas con el user | Arrive as director, not contractor. Ceiling treatment first; user trims down. |

Companion: la honesta response es la mejor version que puedes diseñar, no la más pequeña
que puedes defender. El primer plan es el ceiling treatment: story arc (genre lens), design
spec, each scene's motion treatment citado por nombre, transitions, audio identity
(music/sound marks o silence), material del user, open + close diseñados. El user recorta;
nunca arma approval por approval.

**El ceiling pertenece al concepto, no al toolbox.** Cada layer sirve el mensaje — un
treatment que viste cualquier video igual es decoración. Craft sube al ceiling; content
nunca crece más allá de lo pedido.

## Storyboard — review surface

| `storyboard` | Behavior |
| --- | --- |
| `yes` | Plan + sketch son review surface. Run review loop on plan. |
| `no` | Build sin board. Plan pausa solo si el user la pide. |

Nunca inventes sinónimos. Un "just build it" signal = `flow: automation`, `storyboard: no`
(lo resuelve el router).

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden, pasa cada
gate. User-gated: 0, 6. Delega a capabilities; no dupliques rules. step-gated orchestrator
(setup→plan→resolve→build→assemble→verify→finalize); freeform when no specialized workflow
fits; hash-bound via sha256; deterministic seek-safe (window.__timelines, paused: true,
tl.seek(frame/fps)); offline-first render path; scope exact.

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route: content-os-general-video` +
   `capability_map[]` en `intent-brief.jsonl`. Sin brief, rutcea.
2. **Cross-cutting adapters**:
   - **Media**: para audio/image/voice/grade/LUT/caption/media-operation, load
     `content-os-media`. Named styles via treatments ref. Antes del primer provider
     autenticado, relay auth; si signed out, gate (collaborative waits / autonomous
     offline). Local-only no requiere auth.
   - **Speech intelligence**: si `vo_mode: transcribed`, ejecutar
     `content-os-transcript-intelligence` con audio. Consumir exclusivamente
     `caption-track.json`, `semantic-index.json`, `narrative-map.json` y una
     verificación `deterministic-passed`.
   - **Figma**: si input es `figma.com` URL, build from exported assets/tokens (no connector
     calls).
3. Verificar `content-os-core` HTML composition contract.
4. Verificar `content-os-creative` brand tokens (system fonts, no Google Fonts CDN).
5. Correr `scripts/workflow-audit.mjs` antes de avanzar.

## Sub-agent dispatch (scale-dependent)

**Dispatch pays for itself only at scale.** ≤6 short scenes builds FASTER inline (5 short
scenes ≈ 9 min inline vs ≈ 21 min packetized). Fan out cuando el plan excede eso — da cada
worker 2-3 scenes, spawn all en una wave. Con channel: dispatch. Sin channel: serially.
Detalle en `references/dispatch.md`.

## Genre lenses (companion)

Para `flow: companion`, antes del primer plan, lee `content-os-creative` story-spine +
house-style + nearest genre lens + capability-menu. El ceiling treatment se diseña desde
estos. Borrowed workflows: borrow genre references como examples (story shape + taste, no
scripts privados). Detalle en `references/genre-lenses.md`.

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Orquesta steps + gates. Design/motion rules viven en
   capabilities.
2. **Scope exact.** Build lo que el user pidió. Un title card no es title card + scenes +
   music + captions. Offer additions antes de añadir. `scope_expanded: true` = `scope-creep`.
3. **Compuerta lingüística.** Voz transcrita requiere `scriptMode: transcript_derived`,
   `captionPolicyRef`, `transcriptIntelligenceRef` y `narrativeMapRef`. Nombres,
   cifras, productos o claims materiales ambiguos bloquean captions y render.
4. **Render-path offline-first.** Compositions + frames + composite offline. Media:
   offline default, remote opt-in auth-gated.
5. **Deterministic.** Mismo brief + plan + frames → mismo render. Sin
   `Date.now()`/`Math.random()`/`new Date()` en compositions.
6. **Seek-safe.** GSAP `paused: true`, scrubbed to frame `t` (hereda
   `content-os-animation`). No `repeat: -1`/`+=`/`transition:` animated elements.
7. **Design before HTML.** Resolve design source: `frame.md` → `design.md` → `DESIGN.md`
   (first found = brand truth). Sin spec, completa 4 items (identity, concept angle, fonts,
   focal/edge/supporting/bg) antes de HTML.
8. **Render only after approval.** `rendered_before_approval: true` = `unapproved-render`
   violación. Preview tras checks pass. Render tras approval (Step 6).
9. **Step-gated.** Cada step tiene gate. Sin gate, no avanzas. User-gated (0, 6) pausan.
10. **Delegate on-demand.** Carga solo lo que el step activo necesita.
11. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/final.mp4` = `RENDERED_DRAFT`. `finalize`
    sin render = `no-render`. `READY`/publicación requiere gates G13-G17.

## Steps (router — detail en `references/steps-receta.md`)

| Step | Acción | Gate |
| --- | --- | --- |
| 0 Setup | Router brief (freeform). Escribir `workflow-state.yml`. | intent + state file |
| 1 Plan | Para voz, pasar compuerta lingüística y consumir narrative map; luego viewer arc/structure/rhythm, story-spine y scene blocks. | linguistic PASS + plan + spec + blocks |
| 2 Resolve | Install blocks (`content-os-registry`). Stage assets, adopt media. Audio early si drive duration. | deps + media + blocks |
| 3 Build | Single-scene: scene at peak, then motion from cited rules. Multi-scene: inline si ≤6, fan out si más (2-3/worker). `window.__timelines`, `paused: true`. | scenes + motion + contract |
| 4 Assemble | Mount scenes/media/transitions/audio (`content-os-core`). Real voice duration. Merge sidecars. | assembled + audio + transitions |
| 5 Verify | Lint (`content-os-keyframes`)+check. Snapshots. Animation map. Contrast. Repair. | lint + check + snapshots + contrast |
| 6 Final approval | User-gated. "preview or render?" Render tras answer (`unapproved-render` si sin). | checks + approval |
| 7 Finalize | Render `renders/final.mp4` (FFmpeg, offline). Verify + duration. Handoff: artifact + snapshot sheet. | render + handoff |

## Stop rules

- `workflow-audit.mjs` PASS + gates + final.mp4 verified: STOP.
- Step user-gated sin approval: STOP, pedir approval.
- Intent no confirmado (router no despachó general-video): STOP, re-route.
- Sin brief: STOP, rutcea via `content-os-router`.
- Voz sin audio o sin verificación lingüística `deterministic-passed`: STOP.
- Brief encaja en especializado: STOP, hand off al correcto.

## Done

`renders/final.mp4` (RENDERED_DRAFT) + verified + handoff (preview/artifact + duration +
snapshot sheet). Gates pasados, capabilities delegadas, render-path offline-first +
deterministic + seek-safe heredados. Para `flow: companion`: treatment delivered — every
scene's cited rules realized, audio identity (o silence + said), open + close designed.
`READY`/publicación bloquea gates G13-G17.
