---
name: design-compose-motion
description: This skill should be used when the user needs Jetpack Compose / Compose Multiplatform UI animations — animate*AsState for single-value state-driven motion, AnimatedContent for layout swaps with ContentTransform, AnimatedVisibility for mount/unmount enter-exit, updateTransition for coordinated multi-property transitions, SharedTransitionLayout for hero/shared element transitions, and gesture-driven animation via draggable + animateTo. It produces production-ready Compose animation snippets, specs, and wiring evaluated locally with no network, no CLI, no publication.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Compose Motion — Animaciones (animate*AsState, AnimatedContent, AnimatedVisibility, updateTransition, shared element)

Derivada de compose-motion (AThevon/genjutsu, MIT). El homólogo MetodologIA expone la misma capability — animaciones declarativas en Jetpack Compose / Compose Multiplatform — en voz MetodologIA: prosa terse, imperativa, fail-closed. No copia prosa vendor; adapta el principio. La skill describe cómo aplicar animate*AsState, AnimatedContent, AnimatedVisibility, updateTransition y SharedTransitionLayout para que el agente los incorpore en deliverables de contenido (composables, snippets, specs) sin invocar tooling externo, sin abrir red, sin publicar. El entorno es fail-closed; si no hay runtime Compose disponible en el proyecto destino, marcar coverage_gap y describir la capability en prosa — no auto-ejecutar gradle, no auto-instalar dependencias.

## Cuándo usar

- State-driven value animation: un solo valor que cambia con el estado (alpha, color, dp, offset, scale).
- Content swap: intercambiar un composable por otro con transición (tabs, pasos de wizard, estados de carga→contenido).
- Enter/exit: montar/desmontar con animación (expandir panel, revelar sección, dismiss de snackbar).
- Multi-state coordinated: varias propiedades animadas en sincronía sobre el mismo estado (ancho + color + corner al expandir).
- Shared element: hero animation entre dos pantallas (imagen de lista → detalle, icono que se desplaza).
- Gesture-driven: drag con follow del dedo, fling, snap-back, anchoredDraggable con snap points.

| Situación                                               | Decisión                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| Un valor sobre el tiempo ligado a estado                | `animateFloatAsState` / `animateDpAsState` / `animateColorAsState` |
| Visibilidad / mount-unmount con enter-exit              | `AnimatedVisibility(visible)`                                      |
| Crossfade simple entre estados                          | `Crossfade(target)`                                                |
| Intercambio de contenido con transición                 | `AnimatedContent(targetState)` + `ContentTransform`                |
| Múltiples propiedades coordinadas sobre un mismo estado | `updateTransition(targetState).animate*`                           |
| Control manual / interrupción / lectura de velocidad    | `Animatable(initialValue)` + `animateTo` / `snapTo`                |
| Looping / infinite (spinners, loaders)                  | `rememberInfiniteTransition().animateFloat`                        |
| Hero animation entre pantallas                          | `SharedTransitionLayout` + `Modifier.sharedElement`                |
| Drag / swipe / snap points                              | `Modifier.draggable` / `Modifier.anchoredDraggable`                |

Cuándo Compose native vs Lottie/Rive: Compose native para UI interactiva ligada a estado (visibility, content swap, gestures, shared element). Lottie/Rive para animaciones de diseño vectorial complejas exportadas desde un tool de diseño (illustrator-grade, frame-by-frame, morphing de paths); Compose no reemplaza un runtime de animación de autoría gráfica. Si el asset viene de un .json de Lottie o un .riv, usar ese runtime; no re-implementar en `Canvas` Compose.

Regla: subir la escalera solo cuando hace falta. `animate*AsState` cubre el 70% de los casos. Recurrir a `Animatable` solo cuando se necesita interrumpir, encadenar, leer velocidad o hacer decay. Si el entorno no tiene runtime Compose, marcar coverage_gap y describir la capability — no auto-ejecutar gradle.

## Cómo

### animate*AsState — valor único sobre el tiempo

```kotlin
val targetAlpha = if (visible) 1f else 0f
val alpha by animateFloatAsState(
    targetValue = targetAlpha,
    animationSpec = spring(stiffness = Spring.StiffnessMedium),
    label = "alpha",
)
Box(modifier = Modifier.alpha(alpha))
```

`label` aparece en Layout Inspector / Animation Preview — siempre setearlo. Variantes: `animateDpAsState`, `animateColorAsState`, `animateOffsetAsState`, `animateIntOffsetAsState`, `animateSizeAsState`, `animateRectAsState`, `animateIntAsState`, y `animateValueAsState` genérico para tipos custom vía `TwoWayConverter`.

Specs:

- `spring(dampingRatio, stiffness)`: físicas. Ignora `durationMillis`. `StiffnessMedium` 1500 (UI snap), `StiffnessMediumLow` 700 (modal/drawer), `StiffnessLow` 400 (bouncy reveal), `StiffnessHigh` 10000 (drag follow 1:1). `DampingRatioNoBouncy` 1.0 (sin overshoot), `DampingRatioLowBouncy` 0.75, `DampingRatioMediumBouncy` 0.5, `DampingRatioHighBouncy` 0.2.
- `tween(durationMillis, easing)`: duración determinista. Easings: `LinearOutSlowInEasing` (enter), `FastOutLinearInEasing` (exit), `FastOutSlowInEasing` (standard). El exit más corto y simple que el enter (150ms fade vs 300ms slide+fade).
- `snap()`: instantáneo — usar cuando reduced-motion está activo.
- `keyframes` / `repeatable` / `infiniteRepeatable` para casos específicos.

`finishMode`: en `Animatable.animateTo` controla comportamiento al interrumpir (`FinishModeJumpToEnd` vs `RepeatMode`). No aplica a `animate*AsState`.

### AnimatedContent — intercambio con ContentTransform

```kotlin
AnimatedContent(
    targetState = currentTab,
    transitionSpec = {
        (slideInHorizontally { it } + fadeIn()) togetherWith
            (slideOutHorizontally { -it } + fadeOut())
    },
    label = "tabs",
) { tab ->
    TabContent(tab)
}
```

`togetherWith` corre enter y exit en paralelo (ContentTransform). `slideIntoContainer` / `slideOutOfContainer` variantes que respetan dirección y tamaño del contenedor. Combinar con `+`: `fadeIn() + slideInHorizontally()`. Si `targetState` no cambia identidad, no dispara transición. `SizeTransform(clip = false)` controla cómo el contenedor redimensiona entre contenidos.

### AnimatedVisibility — mount/unmount con enter/exit

```kotlin
AnimatedVisibility(
    visible = expanded,
    enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
    exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(animationSpec = tween(150)),
) {
    Panel()
}
```

Enter: `fadeIn`, `slideIn` (Horizontally/Vertically), `scaleIn`, `expandIn` (Vertically/Horizontally), `slideIntoContainer`. Exit: `fadeOut`, `slideOut`, `scaleOut`, `shrinkOut` (Vertically/Horizontally), `slideOutOfContainer`. Combinar con `+`. El contenido solo corre mientras visible O animando — seguro montar hijos costosos dentro. El exit más sutil que el enter.

### updateTransition — multi-propiedad coordinada

```kotlin
val transition = updateTransition(targetState = expanded, label = "expand")
val width by transition.animateDp(label = "width") { if (it) 300.dp else 100.dp }
val color by transition.animateColor(label = "color") { if (it) Color.Blue else Color.Gray }
val corner by transition.animateDp(label = "corner") { if (it) 24.dp else 8.dp }

Box(Modifier.width(width).background(color, RoundedCornerShape(corner)))
```

Varias propiedades animadas sobre el mismo estado; todos los hijos comparten la misma timeline, terminan en sincronía. Cada `animate*` acepta su propio `transitionSpec` lambda para tuning por-propiedad. Definir `TransitionStates` como enum/sela class para branches claras. Sin branch de salida (AnimatedVisibility sin exit), la entrada no tiene contrapartida — declarar ambos.

### SharedTransitionLayout — hero animations (Compose 1.7+, experimental)

```kotlin
SharedTransitionLayout {
    AnimatedContent(targetState = currentScreen, label = "nav") { screen ->
        when (screen) {
            Screen.List -> ListScreen(
                sharedTransitionScope = this@SharedTransitionLayout,
                animatedVisibilityScope = this@AnimatedContent,
            )
            is Screen.Detail -> DetailScreen(
                item = screen.item,
                sharedTransitionScope = this@SharedTransitionLayout,
                animatedVisibilityScope = this@AnimatedContent,
            )
        }
    }
}

// Dentro de ListScreen, sobre la imagen del card:
with(sharedTransitionScope) {
    Image(
        painter = painter,
        contentDescription = null,
        modifier = Modifier.sharedElement(
            state = rememberSharedContentState(key = "hero-${item.id}"),
            animatedVisibilityScope = animatedVisibilityScope,
        ),
    )
}
```

Dos scopes se pasan abajo: `SharedTransitionScope` (donde vive la extensión `Modifier.sharedElement`) y `AnimatedVisibilityScope` (contexto de visibilidad que dispara la transición). Los `key` de `rememberSharedContentState` DEBEN coincidir entre pantallas o no dispara animación. La API es experimental — verificar `@OptIn(ExperimentalSharedTransitionApi::class)`.

### Spring y tween — specs opinadas

| Uso                                    | Spec                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| UI snap (modal, drawer, tab)           | `spring(stiffness = Spring.StiffnessMediumLow, dampingRatio = Spring.DampingRatioNoBouncy)` |
| Tactile (button press release, toggle) | `spring(stiffness = Spring.StiffnessMedium, dampingRatio = 0.85f)`                          |
| Bouncy reveal (toast, FAB, success)    | `spring(stiffness = Spring.StiffnessLow, dampingRatio = Spring.DampingRatioMediumBouncy)`   |
| Drag follow (1:1 finger tracking)      | `spring(stiffness = Spring.StiffnessHigh, dampingRatio = 1f)`                               |
| Deterministic duration                 | `tween(durationMillis, easing = FastOutSlowInEasing)`                                       |

Stiffness: `VeryLow` 200, `Low` 400, `MediumLow` 700, `Medium` 1500, `High` 10000. Mayor = más rápido el settle. Damping: `HighBouncy` 0.2, `MediumBouncy` 0.5, `LowBouncy` 0.75, `NoBouncy` 1.0. Bajo 1.0 = overshoot. Si se necesita duración determinista, usar `tween` (spring ignora `durationMillis`).

### Gestures — drag con animación

```kotlin
val offsetX = remember { Animatable(0f) }
Box(
    Modifier
        .draggable(
            orientation = Orientation.Horizontal,
            state = rememberDraggableState { delta -> },
            onDragStopped = { velocity ->
                scope.launch { offsetX.animateTo(0f, spring(dampingRatio = Spring.DampingRatioMediumBouncy)) }
            },
        )
        .offset { IntOffset(offsetX.value.roundToInt(), 0) }
)
```

Para snap points: `Modifier.anchoredDraggable(state)` (Compose 1.6+, reemplaza `swipeable`). Para fling: `Animatable.animateDecay`. Para pinch/pan/rotate: `Modifier.transformable(state)`. El drag 1:1 usa `StiffnessHigh` + damping 1.0 (sin overshoot, sigue el dedo).

### Sin tooling vendor

No `gradle`, no `./gradlew`, no `${CLAUDE_PLUGIN_ROOT}`, no scripts externos. La skill describe la capability en prosa; el agente genera código dentro del deliverable solicitado. Ejecutar cualquier comando externo requiere confirmación explícita del usuario (fail-closed). Si no hay runtime Compose disponible en el proyecto destino, marcar coverage_gap y describir la capability — no auto-ejecutar gradle, no auto-agregar dependencias al `build.gradle.kts`.

## Do Not

| Malo                                                                    | Bueno                                                                                  | Por qué                                                                                  |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `animateContentSize` con `tween(800.ms)`                                | `spring(stiffness = Spring.StiffnessMediumLow)`                                        | 800ms tween se siente lento y rígido; spring MediumLow da respuesta táctil natural       |
| `scaleEffect` a 0 al contraer                                           | `scaleEffect(0.95f)` + `alpha(0f)`                                                     | scale 0 hace desaparecer el elemento; los gestos amplían/contraen leve, no a cero        |
| `AnimatedContent` sin `transitionSpec` (sin `ContentTransform`)         | `(fadeIn() + slideInHorizontally()) togetherWith (fadeOut() + slideOutHorizontally())` | sin `togetherWith` el swap salta sin transición; causa jump visual                       |
| Animar `Modifier.size`/`width`/`height` con `animateDpAsState`          | `graphicsLayer { translationY = ...; scaleX = ... }`                                   | size/width/height fuerzan layout pass por frame; graphicsLayer corre en compositor (GPU) |
| `updateTransition` sin branch de salida (`AnimatedVisibility` sin exit) | declarar enter + exit para cada branch                                                 | entrada sin salida deja contenido colgando sin animación al revertir el estado           |
| `LaunchedEffect(true)` con `animateTo` capturando estado variable       | `LaunchedEffect(triggerKey)` con key explícito                                         | `true` corre una vez pero captura stale; key explícito re-dispara al cambiar el trigger  |
| `LazyColumn` sin `key` + `Modifier.animateItem()`                       | `items(list, key = { it.id })` + `Modifier.animateItem()`                              | sin key estable el reorder anima a slots equivocados                                     |
| `AnimatedContent` anidado dentro de filas de `LazyColumn`               | levantar estado, animar solo la prop cambiante en la fila                              | cada fila corre su propio transition graph; scroll = jank                                |

## Fail-closed

- NO CLI externo: no `gradle`, no `./gradlew`, no auto-ejecución de builds. No auto-agregar dependencias al `build.gradle.kts`.
- NO red: la skill no hace fetch ni descarga paquetes; todo es código embebido en el deliverable.
- NO publicación: la skill produce snippets para el deliverable; no publica ni activa conectores.
- NO auto-ejecución: ejecutar cualquier comando fuera del write-set requiere confirmación explícita del usuario.
- local-evaluation only: la skill evalúa y genera contenido localmente; sin runtime autónomo, sin reloj autónomo.
- Marcar coverage_gap si no hay runtime Compose disponible en el proyecto destino: describir la capability en prose, no auto-ejecutar gradle, no auto-instalar `androidx.compose.animation:*`.

## Validación

```sh
node skills/design-compose-motion/scripts/check-skill.mjs
pnpm verify:skills
```
