---
name: design-swiftui-motion
description: This skill should be used when the operator requests SwiftUI animation or transition guidance — implicit/explicit animations, transitions, matchedGeometryEffect hero flows, phaseAnimator/keyframeAnimator (iOS 17+), TimelineView schedules, spring tuning, or reduced-motion accessibility. It delivers prose guidance and pseudocode snippets for local evaluation only; it never executes Xcode, runs a simulator, or auto-launches build tooling.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design SwiftUI Motion — Animaciones y transiciones nativas Apple

Derivada de genjutsu/_jutsu/swiftui-motion/SKILL.md (AThevon/genjutsu, MIT,
commit 08a792f). El homólogo MetodologIA adapta la guía de animación SwiftUI al
contexto local-evaluation: entrega prosa y pseudocódigo para que el operador
razone sobre patrones de animación nativa, sin ejecutar Xcode, sin lanzar
simulador, sin red. Cualquier invocación de tooling externo (xcodebuild,
simulator, Instruments) requiere confirmación explícita del operador; por
defecto se describe la capability y se marca `coverage_gap` cuando falta
información o herramienta local. fail-closed: la skill no promueve, no publica,
no automatiza ejecución.

## Cuándo usar

- El operador pide guiar animaciones o transiciones en SwiftUI (iOS, macOS,
  visionOS, multi-target Apple).
- Sintonizar springs (response / dampingFraction / bounce) o elegir un preset
  nombrado.
- Diseñar transiciones hero entre vistas (matchedGeometryEffect).
- Secuencias ordenadas de estados (phaseAnimator) o tracks paralelos time-based
  (keyframeAnimator), iOS 17+.
- Programar actualizaciones basadas en tiempo con TimelineView (sin generar
  timestamps autónomos; usar `timeline.date`).
- Auditar accesibilidad de motion: `accessibilityReduceMotion` y degradación
  respetuosa.

## Receta — router

Full code templates (implicit/explicit, transitions, matchedGeometryEffect,
phaseAnimator, keyframeAnimator, TimelineView, reduced motion) + spring tuning
preset table + anti-patterns lives en `references/swiftui-motion-receta.md`
(governed, hash-bound). Load la receta antes de emitir guidance.

| Sección                              | Where en receta                                                  |
| ------------------------------------ | --------------------------------------------------------------- |
| Implicit vs Explicit Animation       | `references/swiftui-motion-receta.md` § Implicit vs Explicit    |
| Transitions                          | `references/swiftui-motion-receta.md` § Transitions             |
| matchedGeometryEffect (hero)         | `references/swiftui-motion-receta.md` § matchedGeometryEffect   |
| phaseAnimator / keyframeAnimator     | `references/swiftui-motion-receta.md` § phaseAnimator            |
| TimelineView                         | `references/swiftui-motion-receta.md` § TimelineView            |
| Spring tuning (presets)              | `references/swiftui-motion-receta.md` § Spring tuning            |
| Reduced Motion (OBLIGATORIO)         | `references/swiftui-motion-receta.md` § Reduced Motion          |

Regla de selección: `withAnimation` primero; `phaseAnimator` cuando hay 3+
estados ordenados; `keyframeAnimator` cuando se necesitan tracks paralelos
time-based.

## Fail-closed

- execution_scope: local-evaluation — la skill describe, no ejecuta.
- No auto-ejecutar `xcodebuild`, `swift build`, simulador, Instruments, ni
  ningún CLI externo. Requiere confirmación explícita del operador.
- No generar timestamps autónomos (`Date()`); usar `timeline.date` /
  `context.date` provistos por TimelineView.
- No red, no publicación, no auto-promoción de fuentes.
- Claim sin fuente no se marca `[DOC]`; claim sin limite no está completo.
  Marcar `coverage_gap` explícito cuando falte información o herramienta local.