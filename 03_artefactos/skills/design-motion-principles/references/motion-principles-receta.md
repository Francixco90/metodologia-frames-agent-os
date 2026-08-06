# Motion Principles — receta (timing, easing, native equivalents, a11y, Do Not, performance)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

## Timing

Duración por contexto. Regla: la duración comunica intención; pasado de 500ms en
interacción de UI, el usuario percibe espera.

| Contexto                                  | Duración                   | Por qué                                       |
| ----------------------------------------- | -------------------------- | --------------------------------------------- |
| Micro-interacción (toggle, hover, focus)  | 100-150ms                  | Feedback instantáneo, sin retardo percibido   |
| Transición UI (modal, drawer, tab switch) | 200-300ms                  | Fluida, jamás lenta                           |
| Página / ruta                             | 300-500ms                  | Establece narrativa espacial                  |
| Scroll-driven / 3D                        | Libre (basado en progreso) | Ligada a input del usuario, sin duración fija |

**Regla de frecuencia:** cuanto más se repite una animación, más corta y sutil
debe ser. Un hover de botón (1000x/día) = 100ms de opacity. Un reveal de
onboarding (1x en la vida) = 600ms+ con coreografía completa. Lo frecuente no
molesta; lo excepcional puede celebrarse.

## Easing

Easing por acción. Curva incorrecta = movimiento que se siente roto sin saber
por qué.

| Acción                          | Easing                       | Por qué                                    |
| ------------------------------- | ---------------------------- | ------------------------------------------ |
| Elemento entra                  | `ease-out` / spring          | Decelera hacia el reposo (llegada natural) |
| Elemento sale                   | `ease-in`                    | Acelera al salir (se quita del camino)     |
| Elemento se mueve entre estados | `ease-in-out`                | Arranque y parada suaves                   |
| Scroll-synced                   | `linear` / `none`            | Match 1:1 con input, sin percepción de lag |
| Bouncy / lúdico                 | spring (underdamped)         | Overshoot da vida                          |
| Snappy UI                       | `cubic-bezier(0.2, 0, 0, 1)` | Arranque rápido, aterrizaje suave          |

**Regla:** la salida siempre es más sutil que la entrada. Enter: 300ms ease-out,
coreografía completa (translateY + opacity + scale leve). Exit: 200ms ease-in,
opacity only o opacity + scale leve. El usuario ya decidió irse; no hay que
celebrar la salida.

### Equivalentes nativos (cross-platform)

Misma intención, distintas APIs. Usa el equivalente de la plataforma del
deliverable.

| Web (CSS / JS)               | SwiftUI                                                     | Compose                                                                                   |
| ---------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `cubic-bezier(0.2, 0, 0, 1)` | `.spring(response: 0.4, dampingFraction: 0.85)` o `.snappy` | `spring(stiffness = Spring.StiffnessMedium, dampingRatio = 0.85f)`                        |
| `ease-out`                   | `.easeOut(duration: 0.3)`                                   | `tween(durationMillis = 300, easing = LinearOutSlowInEasing)`                             |
| `ease-in`                    | `.easeIn(duration: 0.2)`                                    | `tween(durationMillis = 200, easing = FastOutLinearInEasing)`                             |
| spring (bouncy)              | `.bouncy` (iOS 17+)                                         | `spring(stiffness = Spring.StiffnessLow, dampingRatio = Spring.DampingRatioMediumBouncy)` |
| spring (smooth)              | `.smooth` (iOS 17+)                                         | `spring(stiffness = Spring.StiffnessMedium, dampingRatio = Spring.DampingRatioNoBouncy)`  |

## Accessibility (no negociable)

### Reduced motion — OBLIGATORIO

Todo componente animado debe respetar la preferencia de movimiento reducido del
usuario. Sin excepciones, sin importar plataforma. Es requisito no negociable, no
opcional.

| Plataforma | API                                                                                   |
| ---------- | ------------------------------------------------------------------------------------- |
| Web CSS    | `@media (prefers-reduced-motion: reduce)`                                             |
| Web JS     | `window.matchMedia('(prefers-reduced-motion: reduce)')`                               |
| SwiftUI    | `@Environment(\.accessibilityReduceMotion) var reduceMotion`                          |
| UIKit      | `UIAccessibility.isReduceMotionEnabled` (+ `reduceMotionStatusDidChangeNotification`) |
| Compose    | Helper con `Settings.Global.ANIMATOR_DURATION_SCALE`                                  |

**CSS:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**SwiftUI:**

```swift
struct AnimatedView: View {
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @State var visible = false

    var body: some View {
        Text("Hello")
            .opacity(visible ? 1 : 0)
            .animation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.85), value: visible)
    }
}
```

**Compose:**

```kotlin
@Composable
fun rememberReduceMotion(): Boolean {
    val context = LocalContext.current
    return remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
}

@Composable
fun AnimatedComponent(visible: Boolean) {
    val reduce = rememberReduceMotion()
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = if (reduce) snap() else spring(stiffness = Spring.StiffnessMedium)
    )
}
```

### Otros requisitos a11y

- Focus visible: los indicadores de foco nunca deben ser ocultados por
  animaciones.
- Contraste WCAG: el contenido animado debe cumplir ratios de contraste en cada
  frame (sin texto que se desvanece a invisible a mitad de transición).
- Loops: toda animación en bucle debe tener mecanismo de pausa. Un loop sin pausa
  es una barrera.

## Do Not universal

Cinco reglas con ejemplos BAD/GOOD cross-platform. Romper una es un bug de
motion, no un estilo.

### 1. Nunca animar width/height/top/left

Dispara recálculo de layout cada frame = jank. Layout properties bloquean el
main thread; transform y opacity corren en GPU (composite-only).

```css
/* BAD */
.drawer {
  transition: height 0.3s ease;
}
.drawer.open {
  height: 400px;
}

/* GOOD */
.drawer {
  transition: transform 0.3s ease-out;
  transform: translateY(100%);
}
.drawer.open {
  transform: translateY(0);
}
```

**SwiftUI:**

```swift
// BAD — anima frame (causa layout pass)
.frame(height: open ? 400 : 0)
.animation(.easeInOut, value: open)

// GOOD — anima transform vía offset
.offset(y: open ? 0 : 400)
.animation(.spring(), value: open)
```

**Compose:**

```kotlin
// BAD — anima size (layout pass completo)
val height by animateDpAsState(if (open) 400.dp else 0.dp)

// GOOD — anima Y vía graphicsLayer
val translation by animateFloatAsState(if (open) 0f else 400f)
Box(modifier = Modifier.graphicsLayer { translationY = translation })
```

### 2. Nunca scale to 0

`scale(0)` hace que el elemento desaparezca en un agujero negro. Mantén un mínimo
(0.95) y baja opacity.

```css
/* BAD */
.modal-exit {
  transform: scale(0);
}

/* GOOD */
.modal-exit {
  transform: scale(0.95);
  opacity: 0;
}
```

**SwiftUI:**

```swift
// BAD
.scaleEffect(visible ? 1.0 : 0.0)

// GOOD
.scaleEffect(visible ? 1.0 : 0.95)
.opacity(visible ? 1.0 : 0.0)
```

**Compose:**

```kotlin
// BAD
Modifier.graphicsLayer { scaleX = if (visible) 1f else 0f; scaleY = if (visible) 1f else 0f }

// GOOD
Modifier.graphicsLayer {
    scaleX = if (visible) 1f else 0.95f
    scaleY = if (visible) 1f else 0.95f
    alpha = if (visible) 1f else 0f
}
```

### 3. Nunca ease-in en una entrada

`ease-in` = arranque lento. Un elemento que entra y duda se siente roto.

```css
/* BAD */
.card-enter {
  animation: fadeIn 0.3s ease-in;
}

/* GOOD */
.card-enter {
  animation: fadeIn 0.3s ease-out;
}
/* O spring vía JS para feel natural */
```

### 4. Nunca pasar de 500ms en interacción de UI

Modales, dropdowns, tooltips, tabs — el usuario está esperando. Respeta su
tiempo.

```js
// BAD
gsap.to(modal, {opacity: 1, y: 0, duration: 0.8});

// GOOD
gsap.to(modal, {opacity: 1, y: 0, duration: 0.25, ease: 'power2.out'});
```

**SwiftUI:**

```swift
// BAD
.animation(.easeInOut(duration: 0.8), value: state)

// GOOD
.animation(.spring(response: 0.25, dampingFraction: 0.85), value: state)
```

**Compose:**

```kotlin
// BAD
animateContentSize(animationSpec = tween(800))

// GOOD
animateContentSize(animationSpec = spring(stiffness = Spring.StiffnessMediumLow))
```

### 5. Nunca ignorar prefers-reduced-motion

Es requisito de accesibilidad, no nice-to-have.

```js
// BAD
gsap.from('.hero-title', {opacity: 0, y: 40, duration: 0.6});

// GOOD
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) {
  gsap.from('.hero-title', {opacity: 0, y: 40, duration: 0.6});
}
```

Para equivalentes SwiftUI / Compose, ver la sección Reduced Motion de esta receta.

## Performance

- Solo animar `transform` y `opacity` (composite-only, GPU). Cualquier otra
  propiedad fuerza layout o paint.
- `will-change` escaso: declararlo solo en el elemento que va a animarse y
  removerlo al terminar la animación. Dejarlo puesto consume memoria.
- `requestAnimationFrame` sobre setTimeout como timer para loops de animación en
  JS. Un bucle con setTimeout se desincroniza del refresh rate del navegador; rAF
  va al frame.
- Scroll-driven: CSS `animation-timeline` > `IntersectionObserver` > scroll
  listeners. Los scroll listeners son los más costosos; úsalos solo si no hay
  alternativa.
- Probar en dispositivo low-end (throttle CPU 4x en DevTools). Lo que se siente
  bien en un MBP no garantiza 60fps en un Chromebook.