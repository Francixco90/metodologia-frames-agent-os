---
name: design-motion-principles
description: This skill should be used when the user requests motion design foundations — timing durations, easing curves, enter/exit choreography, reduced-motion accessibility, and composite-only performance rules — for any animated UI across Web, SwiftUI, or Compose targets. It produces ready-to-apply motion specs (durations, easings, native equivalents, a11y guards, performance boundaries) evaluated locally with no network, CLI, or autonomous execution.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Motion Principles — Fundamentos de motion design (timing, easing, enter/exit, a11y, performance)

Derivada de motion-principles (AThevon/genjutsu, MIT). El homólogo MetodologIA
expone la misma capability — fundamentos de motion design — en voz MetodologIA:
prosa terse, imperativa, fail-closed. No copia prosa vendor; adapta el
principio. Es la fundación que toda skill creativa carga al definir animación:
timing, easing, enter/exit, accesibilidad no negociable y performance. El agente
aplica estos fundamentos dentro de deliverables de contenido (HTML/markdown/brand)
sin invocar tooling externo ni publicar.

## Receta — router

La receta completa (timing, easing, equivalentes nativos cross-platform,
accessibility reduced-motion con código CSS/SwiftUI/Compose, los 5 Do Not
universal con ejemplos BAD/GOOD, performance) lives en
`references/motion-principles-receta.md` (governed, hash-bound). Load la receta
antes de emitir motion specs.

| Sección                              | Where en receta                                              |
| ------------------------------------ | ----------------------------------------------------------- |
| Timing (duraciones por contexto)     | `references/motion-principles-receta.md` § Timing           |
| Easing (curvas por acción)           | `references/motion-principles-receta.md` § Easing            |
| Equivalentes nativos cross-platform  | `references/motion-principles-receta.md` § Equivalentes     |
| Accessibility (reduced motion)       | `references/motion-principles-receta.md` § Accessibility    |
| Do Not universal (5 reglas)          | `references/motion-principles-receta.md` § Do Not           |
| Performance                          | `references/motion-principles-receta.md` § Performance       |

Resumen ejecutivo: timing 100-500ms por contexto (frecuente = corto); easing
ease-out para entrar, ease-in para salir; salida más sutil que entrada; nunca
animar width/height/top/left (composite-only: transform + opacity); nunca
scale(0); nunca ease-in en entrada; nunca pasar 500ms en UI; nunca ignorar
prefers-reduced-motion (OBLIGATORIO).

## Fail-closed

- NO CLI externo: no `npx`, no `npm install`, no auto-ejecución de paquetes.
- NO red: la skill no hace fetch ni descarga assets; todo es código embebido en
  el deliverable.
- NO publicación: la skill produce specs y snippets; no publica ni activa
  conectores.
- NO auto-ejecución: ejecutar cualquier comando fuera del write-set requiere
  confirmación explícita del usuario.
- local-evaluation only: la skill evalúa y genera motion specs localmente; sin
  runtime autónomo, sin reloj autónomo. Si el entorno no permite un fallback
  nativo, marcar coverage_gap.

## Validación

```sh
node skills/design-motion-principles/scripts/check-skill.mjs
pnpm verify:skills
```