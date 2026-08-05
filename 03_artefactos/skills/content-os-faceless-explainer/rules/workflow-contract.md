# Workflow contract — faceless explainer

8 reglas que gobiernan el workflow. Source of truth para
`scripts/workflow-audit.mjs` y `scripts/check-skill.mjs`.

## Reglas

1. **Hash-bound.** Workflow state auditable (`workflow-audit.mjs` PASS). Sin
   gate pasado o step fuera de orden, no avanzas. Fails closed.
2. **Orchestrator, no rules.** Este workflow orquesta steps + gates. Design y
   motion rules viven en Fase 2 capabilities. No dupliques.
3. **Faceless = invented visuals.** No capture, no footage, no asset inventory.
   Step 1 es synthetic (`visible-text.txt` + `tokens.json`). Todo visual se
   inventa en Step 4-5. `capture=true` o `footage=true` en state = violación.
4. **Step-gated.** 8 steps en orden (setup → brief → design → storyboard → audio
   → visual-design → build-frames → finalize). Cada step tiene gate. Steps
   user-gated (setup, storyboard, finalize) pausan para approval.
5. **Delega capabilities on-demand.** Carga solo lo que el step activo necesita.
   Capabilities nunca son owners del deliverable; el workflow sí.
6. **Offline-first.** TTS/audio via `content-os-media` offline cascade default.
   Remoto (HeyGen/OpenAI) opt-in auth-gated, fail-closed sin creds. No network en
   render path.
7. **Deterministic.** Mismo brief + mismo design + mismo frame → mismo render.
   Sin `Date.now()`/`Math.random()`/`new Date()`/`performance.now()`/`fetch`/
   `setTimeout`/`setInterval` en compositions (hereda core). Seek-safe: GSAP
   `paused: true`, scrubbed, no `repeat: -1`/relative `+=`/CSS `transition:`.
8. **RENDERED_DRAFT.** `renders/video.mp4` es `RENDERED_DRAFT`. `finalize` gate
   passed sin render = `no-render` violación. `READY`/publicación requiere
   gates humanos G13-G17 (manuales por diseño).

## Example state entry

```json
{
  "schemaVersion": "faceless-explainer-v1",
  "projectId": "compound-interest-explained",
  "route": "content-os-faceless-explainer",
  "capability_map": [
    "content-os-core",
    "content-os-animation",
    "content-os-keyframes",
    "content-os-creative",
    "content-os-media"
  ],
  "source_type": "text",
  "duration_s": 75,
  "vo_mode": "restructured",
  "offline": true,
  "silent": false,
  "rendered": false,
  "steps": [
    {"step": "setup", "state": "gate-passed"},
    {"step": "brief", "state": "gate-passed"},
    {"step": "design", "state": "gate-passed"},
    {"step": "storyboard", "state": "user-approved"},
    {"step": "audio", "state": "gate-passed"},
    {"step": "visual-design", "state": "gate-passed"},
    {"step": "build-frames", "state": "gate-passed"},
    {"step": "finalize", "state": "pending"}
  ]
}
```

## Failure modes

| Code                  | Trigger                                   | Fix                                  |
| --------------------- | ----------------------------------------- | ------------------------------------ |
| `missing-gate`        | step sin gate pasado o route inválida     | Pasar gate antes de avanzar          |
| `step-out-of-order`   | step fuera de orden o desconocido         | Reordenar, correr steps en secuencia |
| `capture-in-faceless` | `capture=true` en faceless workflow       | Quitar capture, faceless = invented  |
| `footage-in-faceless` | `footage=true` en faceless workflow       | Quitar footage, faceless = invented  |
| `no-render`           | finalize gate passed sin `rendered: true` | Render MP4 antes de cerrar finalize  |
| `network-in-workflow` | URL https en state (offline-first)        | Quitar network, offline-first        |

## Stop rules

- Workflow auditable PASS, todos gates pasados, MP4 existe: STOP workflow.
- Step user-gated sin approval: STOP, pedir approval.
- TTS no disponible y no silent marker: STOP, `coverage_gap` o silent.
- Sin brief: STOP, rutcea via `content-os-router`.
