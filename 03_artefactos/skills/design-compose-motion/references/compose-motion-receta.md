# Compose Motion — receta (cómo: snippets Kotlin + specs)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

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