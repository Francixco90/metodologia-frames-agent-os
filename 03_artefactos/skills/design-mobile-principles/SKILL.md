---
name: design-mobile-principles
description: This skill should be used when designing or reviewing mobile UX motion involving touch targets, haptic feedback, gesture choreography, platform conventions (iOS UIKit spring vs Android Compose spring), thumb zone layout, or one-handed reachability. It produces concrete motion specs, gesture choreography contracts, and platform-specific spring/timing recipes for native iOS and Android interactions.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Mobile Principles — UX motion móvil (touch targets, hápticos, gestos, convenciones iOS/Android, thumb zone)

Derivada de mobile-principles (AThevon/genjutsu, MIT). El homólogo adapta la doctrina táctil original al contexto MetodologIA: produce especificaciones de motion móvil verificables localmente —targets, hápticos, choreografía de gestos, convenciones de plataforma y thumb zone— sin ejecutar runtime externo ni publicar. El output es prosa técnica + snippets Kotlin/Swift declarativos, consumibles por un equipo de diseño o por skills downstream (compose-motion, swiftui-motion). [CONFIG]

## Cuándo usar

- Interacciones táctiles: tap, long-press, swipe, pinch, drag con feedback de motion. Toda superficie interactiva requiere hit area mínima y choreografía de respuesta.
- Feedback háptico: confirmación física de eventos discretos (no por frame). Disparo en commit, snap, umbral o cambio de estado, nunca en animación continua.
- Gestos con choreografía de motion: drag con tracking del dedo, fling con velocity, snap a origen o borde, release con spring. El elemento debe volver a un estado estable; no flotar.
- Convenciones de plataforma: iOS UIKit usa spring con dampingRatio/stiffness y sheet presentation detents; Android Compose usa `spring(dampingRatio, stiffness)` y `SharedTransitionScope`. Respetar el lenguaje nativo antes de inventar motion custom.
- Thumb zone / one-handed design: acciones principales en el tercio inferior; FAB bottom-right; Reachability como criterio de layout. Nunca poner CTA primario en esquina superior derecha en portrait.
- Transiciones nativas vs custom: preferir patrón nativo (push/pop horizontal iOS, drawer slide Android, bottom sheet slide) salvo necesidad justificada. Custom motion que duplica nativo sin razón genera confusión.

Tabla de decisión — gesto nativo vs motion custom:

| Señal                                                                       | Gesto nativo | Motion custom                |
| --------------------------------------------------------------------------- | ------------ | ---------------------------- |
| Coincide con patrón plataforma (swipe-back, pull-to-refresh, sheet dismiss) | Sí — reusar  | No                           |
| Necesidad de branding de motion diferenciado y medible                      | No           | Sí — justificar              |
| Accesibilidad reduced-motion sin fallback                                   | —            | No — bloquear                |
| Duplica transición nativa sin razón                                         | Sí — reusar  | No — coverage_gap si insiste |

## Cómo

Metodología clean-room. Sin tooling vendor. Sin runtime. Solo prosa + snippets declarativos.

**Touch targets**: mínimo 44x44pt iOS / 48x48dp Android. La hit area puede extenderse más allá del glyph visible (padding, `hitSlop`, spacer transparente). El spacing entre targets importa tanto como el tamaño: dos botones de 44pt pegados siguen siendo mistappeables. Recomendado 44pt + 8pt spacing iOS, 48dp + 8dp Android. Web mobile: 44px + 8px (WCAG 2.5.5). [DOC]

**Haptics**: eventos discretos, no por frame. iOS: `UIImpactFeedbackGenerator(style: .medium|.light|.heavy)`, `UISelectionFeedbackGenerator` para cambios discretos, `UINotificationFeedbackGenerator` para success/warning/error. Preparar (`prepare()`) antes del fire para latencia ≤50ms. Android: `HapticFeedbackConstants` (KEYBOARD_TAP, LONG_PRESS, CONTEXT_CLICK) vía `view.performHapticFeedback`, o `VibrationEffect.createPredefined(EFFECT_TICK|EFFECT_CLICK)` con `VibratorManager` (API 31+). Respetar `areHapticsEnabled()` / `Settings.System.HAPTIC_FEEDBACK_ENABLED`. Timing del pulso ≤50ms para sensación inmediata. Nunca háptico en cada frame: drena batería y satura sensorialmente. [DOC]

Ejemplo SwiftUI:

```swift
let generator = UIImpactFeedbackGenerator(style: .medium)
generator.prepare()
// en el commit del gesto, no en cada frame:
generator.impactOccurred()
```

Ejemplo Compose:

```kotlin
val haptic = LocalHapticFeedback.current
// en onCommit del gesto:
haptic.performHapticFeedback(HapticFeedbackType.LongPress)
```

**Gesture choreography**: drag con `offset`/`translationY` tracking el dedo 1:1; fling con velocity tracking (detectar `velocityTracker`); snap a origen o borde según umbral (típicamente 100-150pt arrastrados); release con spring. El elemento nunca flota: si suelta sin snap-back, es bug.

Patrón snap-back (SwiftUI):

```swift
@State private var dragOffset: CGFloat = 0

return SomeView()
  .offset(y: dragOffset)
  .gesture(
    DragGesture()
      .onChanged { dragOffset = $0.translation.height }
      .onEnded { value in
        if abs(value.translation.height) < 100 {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            dragOffset = 0
          }
        } else {
          // dismiss o acción confirmada
        }
      }
  )
```

Patrón snap-back (Compose):

```kotlin
val draggableState = rememberDraggableState { delta -> /* acumular offset */ }
val animatedOffset by animateFloatAsState(
  targetValue = targetOffset,
  animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow),
  label = "snapBack",
)
```

**Platform conventions**: iOS — sheet presentation detents (`.medium`, `.large`), navigation push/pop horizontal con `transition.move(.edgeLeading)`, spring con `response`/`dampingFraction`. Android — navigation drawer slide, bottom sheet slide con `ModalBottomSheet`, `SharedTransitionScope`/`SharedElement` para hero transitions, `spring(dampingRatio, stiffness)` con constantes `Spring.StiffnessMediumLow`/`DampingRatioMediumBouncy`. Usar `Animatable`/`withAnimation`/`produceState` para estados derivados; no mutar estado fuera de composición. [DOC]

**Thumb zone**: portrait, una mano o cradle. El pulgar pivota desde la esquina inferior. Tercio inferior = EASY (CTA primario, send, FAB, tab bar). Medio = OK (contenido, acciones secundarias). Superior = HARD (back, close, search — cosas que el usuario alcanza deliberadamente, no por reflejo). Regla: CTA primario en mitad inferior; acciones secundarias o destructivas arriba; nunca "Pay" en esquina superior derecha. Reachability: en dispositivos grandes, compensar con Reachability (iOS) o deslizar contenido hacia abajo. [DOC]

**Motion timing**: móvil es más corto que desktop. Taps: 150-250ms. Transiciones: 200-350ms. Scrolls atados al gesto (no animación autónoma). Spring sobre linear para organicidad. Duraciones >400ms se perciben lentas en móvil. Respetar `prefers-reduced-motion` / `accessibilityReduceMotion` / `areAnimatorsEnabled()`: fallback instantáneo (duración 0) o fade. [DOC]

Ejemplo reduced-motion SwiftUI:

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion
withAnimation(reduceMotion ? .none : .spring(response: 0.3, dampingFraction: 0.7)) {
  shown = true
}
```

Ejemplo reduced-motion Compose:

```kotlin
val reduceMotion = LocalAccessibilityManager.current.reduceMotion
val spec = if (reduceMotion) snap() else spring<Float>(dampingRatio = 0.7f)
```

## Do Not

| Anti-patrón                                       | Por qué falla                                          | Corrección                                                         |
| ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| Touch target <44pt / 48dp                         | WCAG 2.5.5 fail, mistappable, bug de usabilidad        | Hit area mínima vía padding/hitSlop; glyph visible puede ser menor |
| Háptico en cada frame                             | Drena batería, satura sensorialmente, latencia acumula | Háptico solo en eventos discretos (commit, snap, umbral)           |
| Gesto sin snap-back                               | El elemento flota tras soltar, estado inconsistente    | Spring release a origen o borde; nunca queda en offset arbitrario  |
| Animar width/height en móvil                      | Layout invalidation por frame = jank                   | Usar transform/offset/alpha; layout estable                        |
| Gesture-driven motion sin reduced-motion fallback | Inaccesible, vertiginoso para usuarios sensibles       | Detectar flag, fallback a snap instantáneo o fade                  |
| Custom motion que duplica patrón nativo sin razón | Confusión usuario, costo extra, inconsistencia         | Reusar patrón nativo; custom solo con justificación y medible      |

## Fail-closed

- No invoca CLI externo ni runtime de simulación. local-evaluation only.
- No red, no publicación, no auto-ejecución de código.
- Sin runtime móvil disponible (simulator/emulator/descomposición de gesture): marcar coverage_gap y declarar limitación. No inferir comportamiento.
- Producer, verifier y Guardian distintos. Valida otro agente, no el autor.
- Un claim de motion sin fuente (HIG, Material, WCAG) no puede marcarse [DOC]. Escalar a coverage_gap.

## Validación

```bash
pnpm verify:skills
```

Bloque G07 del DAG. Verifica estructura, frontmatter, LINEAGE y receipts. El script `scripts/check-skill.mjs` valida gobernanza local antes del gate global: tokens contractuales, APIs prohibidas, sin rutas absolutas de usuario, fixture negativo con `violation:`. Si `check-skill.mjs` falla, el skill no pasa G07. [CONFIG]
