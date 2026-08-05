---
name: design-swiftui-motion
description: This skill should be used when the operator requests SwiftUI animation or transition guidance — implicit/explicit animations, transitions, matchedGeometryEffect hero flows, phaseAnimator/keyframeAnimator (iOS 17+), TimelineView schedules, spring tuning, or reduced-motion accessibility. It delivers prose guidance and pseudocode snippets for local evaluation only; it never executes Xcode, runs a simulator, or auto-launches build tooling.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design SwiftUI Motion — Animaciones y transiciones nativas Apple

Derivada de genjutsu/_jutsu/swiftui-motion/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). El homólogo MetodologIA adapta la guía de animación SwiftUI al contexto local-evaluation: entrega prosa y pseudocódigo para que el operador razone sobre patrones de animación nativa, sin ejecutar Xcode, sin lanzar simulador, sin red. Cualquier invocación de tooling externo (xcodebuild, simulator, Instruments) requiere confirmación explícita del operador; por defecto se describe la capability y se marca `coverage_gap` cuando falta información o herramienta local. fail-closed: la skill no promueve, no publica, no automatiza ejecución.

## Cuándo usar

- El operador pide guiar animaciones o transiciones en SwiftUI (iOS, macOS, visionOS, multi-target Apple).
- Sintonizar springs (response / dampingFraction / bounce) o elegir un preset nombrado.
- Diseñar transiciones hero entre vistas (matchedGeometryEffect).
- Secuencias ordenadas de estados (phaseAnimator) o tracks paralelos time-based (keyframeAnimator), iOS 17+.
- Programar actualizaciones basadas en tiempo con TimelineView (sin generar timestamps autónomos; usar `timeline.date`).
- Auditar accesibilidad de motion: `accessibilityReduceMotion` y degradación respetuosa.

## Implicit vs Explicit Animation

SwiftUI ofrece dos caminos para animar. La distinción rige todo el resto.

- **Implícita** — se ata a un valor mediante el modificador `.animation(_, value:)`. Cualquier cambio de ese valor dispara la animación, sin importar el origen. Útil cuando _cualquier_ mutación del estado debe animarse (barra de progreso que se actualiza desde múltiples sitios).
- **Explícita** — envuelve la mutación de estado en `withAnimation { }`. El bloque define el contexto de animación para los cambios que ocurran dentro. Útil para respuestas a acciones del usuario (tap, gesture, onChange).

Regla: preferir explícita (`withAnimation`) para cambios gatillados por acción del usuario; reservar implícita para valores que siempre deben animarse sin importar la fuente. Nunca combinar ambas sobre la misma propiedad: el `withAnimation` exterior gina, pero el modificador `.animation` sigue corriendo y se apila de forma confusa.

Forma deprecada a evitar: `.animation(.easeInOut)` sin `value:` (implicit-everywhere, deprecado desde iOS 15+). Siempre ligar a un valor concreto.

Pseudocódigo (rhyming, no ejecutable):

```swift
// Implícita — ata animación al valor
Circle().scaleEffect(s)
    .animation(.spring(.snappy), value: s)

// Explícita — bloque dispara el cambio
Button("Grow") { withAnimation(.smooth) { s = 1.5 } }
```

Anti-patrón: invocar `withAnimation` dentro de `body` (se re-fire en cada render). Disparar siempre desde `onTapGesture`, `onChange`, o un evento explícito.

## Transitions

Las transiciones rigen la inserción y remoción de vistas dentro de un `if`, `switch`, o `ForEach`. Corren cuando el contexto de animación del padre dispara, así que las mutaciones de estado que las gatillan deben envolverse en `withAnimation`.

Combinadores disponibles: `.move(edge:)`, `.opacity`, `.scale`, `.slide`, `.push`, `.asymmetric(insertion:removal:)`, `.combined(with:)`. Para el 90% del trabajo los combinadores nativos bastan; el protocolo `Transition` (iOS 17+) permite transiciones custom cuando se necesita timing compartido entre muchas vistas.

Anti-patrones clave:

- **Escalar a 0**: `.transition(.scale)` escala a cero y el elemento se desvanece en un agujero negro; se percibe roto. Usar `.scale(scale: 0.95).combined(with: .opacity)` — mínimo de escala + cross-fade.
- **Asimetría sin salida**: toda transición con inserción rica debe tener remoción definida. Entrada con `.move(.bottom).combined(.opacity)` y salida con `.opacity.animation(.easeIn(duration: 0.15))` es válido; salida ausente es un gap.

Pseudocódigo:

```swift
if visible {
    Card().transition(.asymmetric(
        insertion: .move(edge: .bottom).combined(with: .opacity),
        removal: .opacity.animation(.easeIn(duration: 0.15))
    ))
}
```

## matchedGeometryEffect (hero animations)

Etiqueta dos vistas con el mismo `id` dentro del mismo `Namespace`. SwiftUI interpola frame y posición cuando la vista origen se reemplaza por la destino. Ideal para transiciones hero entre una lista y un detalle, o entre estados expandido/colapsado.

Pre-requisitos y trampas:

- `@Namespace` declarado en el padre común de ambas ramas.
- `id` estable y único dentro del namespace — no usar índices de array como id (identidad inestable).
- Ambas ramas deben coexistir bajo el mismo padre (envolver en `ZStack` o `if/else` simétrico); animar fuera de un `if` donde la destino no existe aún rompe la interpolación.
- `isSource: true` (default en la vista fuente-de-verdad) indica de qué frame interpolar.

Pseudocódigo (rhyming):

```swift
struct Gallery: View {
    @Namespace private var ns
    @State private var expanded = false
    var body: some View {
        ZStack {
            if expanded {
                LargeCard().matchedGeometryEffect(id: "card", in: ns)
                    .onTapGesture { withAnimation(.spring(.smooth)) { expanded = false } }
            } else {
                SmallCard().matchedGeometryEffect(id: "card", in: ns)
                    .onTapGesture { withAnimation(.spring(.smooth)) { expanded = true } }
            }
        }
    }
}
```

## phaseAnimator / keyframeAnimator (iOS 17+)

### phaseAnimator

Para coreografía de estados ordenados. Se define un `CaseIterable + Hashable` enum; SwiftUI recorre las fases secuencialmente y se asienta en la última. `trigger:` es opcional — omitirlo avanza automáticamente al aparecer; usarlo cuando se necesita señal externa (tap, model update). Las fases corren en secuencia, nunca en paralelo; para paralelismo usar `KeyframeAnimator`.

Pseudocódigo:

```swift
enum SuccessPhase: CaseIterable { case start, scaleUp, rotate, settle }
Image(systemName: "checkmark.circle.fill")
    .phaseAnimator(SuccessPhase.allCases, trigger: t) { view, phase in
        view.scaleEffect(phase == .start ? 0 : phase == .settle ? 1 : 1.2)
            .rotationEffect(.degrees(phase == .rotate ? 360 : 0))
            .opacity(phase == .start ? 0 : 1)
    } animation: { phase in
        switch phase {
        case .start: .smooth(duration: 0.05)
        case .scaleUp: .spring(.bouncy, blendDuration: 0.25)
        case .rotate: .spring(response: 0.4, dampingFraction: 0.8)
        case .settle: .smooth(duration: 0.2)
        }
    }
```

### keyframeAnimator

Para animaciones continuas time-based con tracks paralelos. Cada `KeyframeTrack` anima un keypath independientemente; SwiftUI los corre todos juntos. Tipos de keyframe: `LinearKeyframe` (velocidad constante), `SpringKeyframe` (settle con spring), `CubicKeyframe` (cubic bezier), `MoveKeyframe` (jump cut, sin interpolación). Dispara con un cambio de valor para re-run.

Pseudocódigo:

```swift
struct AnimValues {
    var scale: Double = 1
    var rotation: Angle = .zero
    var opacity: Double = 1
}
Image(systemName: "heart.fill")
    .keyframeAnimator(initialValue: AnimValues(), trigger: counter) { content, v in
        content.scaleEffect(v.scale).rotationEffect(v.rotation).opacity(v.opacity)
    } keyframes: { _ in
        KeyframeTrack(\.scale) {
            SpringKeyframe(1.3, duration: 0.15)
            SpringKeyframe(1.0, duration: 0.3, spring: .bouncy)
        }
        KeyframeTrack(\.rotation) {
            CubicKeyframe(.degrees(15), duration: 0.1)
            CubicKeyframe(.degrees(-15), duration: 0.2)
            CubicKeyframe(.degrees(0), duration: 0.15)
        }
    }
```

Regla de selección: `withAnimation` primero; `phaseAnimator` cuando hay 3+ estados ordenados; `keyframeAnimator` cuando se necesitan tracks paralelos time-based.

## TimelineView

`TimelineView` re-renderiza su contenido según un schedule declarado. El closure recibe un `context` con `context.date` (la fecha del schedule, provista por el framework). **Usar `timeline.date` / `context.date` — nunca generar timestamps autónomos con `Date()`**: la skill no introduce reloj autónomo; respeta `autonomous_clock_allowed: false` del receipt. Schedules disponibles: `.animation` (sincronizada con refresh de pantalla), `.periodic(from:by:)` (cada N segundos), `.explicit` (control fino).

Pseudocódigo:

```swift
TimelineView(.periodic(from: .now, by: 1)) { context in
    Text("Frame at \(context.date.formatted())")
        .opacity(0.6)
}
```

Casos: relojes visuales, marcadores de progreso basados en tiempo, fondos ambientales que respiran. Para loops de animación perpetuos sin clock, preferir `.animation(.linear.repeatForever(autoreverses: true), value: ...)` o `.phaseAnimator`. Si se necesita un valor temporal para un cálculo, derivar de `timeline.date` (el schedule) — no instanciarlo.

## Spring tuning

SwiftUI trae 4 presets nombrados (iOS 17+). Usarlos; sintonizar `response` / `dampingFraction` solo cuando un preset no calza.

| Preset                 | Equivalente                                      | Mood                   |
| ---------------------- | ------------------------------------------------ | ---------------------- |
| `.snappy`              | `.spring(response: 0.5, dampingFraction: 0.85)`  | UI rápido              |
| `.bouncy`              | `.spring(response: 0.5, dampingFraction: 0.7)`   | playful                |
| `.smooth`              | `.spring(response: 0.5, dampingFraction: 1.0)`   | calma, sin overshoot   |
| `.interactiveSpring()` | `.spring(response: 0.15, dampingFraction: 0.86)` | seguimiento de gesture |

Parámetros:

- `response` — tiempo que el spring tarda en asentarse (menor = más rápido, mayor = más suave). Para UI quedarse en `0.2...0.5`.
- `dampingFraction` — intensidad de overshoot en `0...1` (1 = sin overshoot, 0 = oscilación perpetua; nunca usar 0). Para UI quedarse en `0.7...1.0`.
- iOS 17+ expone `.spring(duration:bounce:)` con `bounce` en `0...1` (0 = críticamente amortiguado, 1 = rebote completo). Misma spring, forma más designer-friendly.

Anti-patrón de performance: animar `.frame()` directamente dispara layout pass cada frame y cae fps bajo carga. Animar transform-equivalentes (`scaleEffect`, `offset`, `opacity`) que el compositor maneja. Para layout transitions reales usar `matchedGeometryEffect`.

## Reduced Motion — OBLIGATORIO

Accesibilidad de motion no es opcional. SwiftUI expone el setting "Reduce Motion" del sistema vía entorno. Toda vista con animación debe respetarlo: cross-fades y opacidad quedan permitidos; translaciones grandes, scale-from-zero, parallax y loops perpetuos deben neutralizarse.

Pseudocódigo:

```swift
struct Hero: View {
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @State private var shown = false
    var body: some View {
        Text("Welcome")
            .opacity(shown ? 1 : 0)
            .offset(y: shown ? 0 : (reduceMotion ? 0 : 20))
            .animation(reduceMotion ? .none : .spring(.smooth), value: shown)
            .onAppear { shown = true }
    }
}
```

Regla: un proyecto SwiftUI con animación y cero referencias a `accessibilityReduceMotion` (o handler equivalente) es una violación Critical. Referenciar siempre el contrato de motion del stack.

## Límites (fail-closed)

- execution_scope: local-evaluation — la skill describe, no ejecuta.
- No auto-ejecutar `xcodebuild`, `swift build`, simulador, Instruments, ni ningún CLI externo. Requiere confirmación explícita del operador.
- No generar timestamps autónomos (`Date()`); usar `timeline.date` / `context.date` provistos por TimelineView.
- No red, no publicación, no auto-promoción de fuentes.
- Claim sin fuente no se marca `[DOC]`; claim sin limite no está completo. Marcar `coverage_gap` explícito cuando falte información o herramienta local.
