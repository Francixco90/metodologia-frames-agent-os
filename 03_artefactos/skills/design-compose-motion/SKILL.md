---
name: design-compose-motion
description: This skill should be used when the user needs Jetpack Compose / Compose Multiplatform UI animations — animate*AsState for single-value state-driven motion, AnimatedContent for layout swaps with ContentTransform, AnimatedVisibility for mount/unmount enter-exit, updateTransition for coordinated multi-property transitions, SharedTransitionLayout for hero/shared element transitions, and gesture-driven animation via draggable + animateTo. It produces production-ready Compose animation snippets, specs, and wiring evaluated locally with no network, no CLI, no publication.
version: 0.2.0
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

## Receta — router

Full Kotlin snippets + specs para cada API lives in `references/compose-motion-receta.md` (governed, hash-bound). Load the receta antes de generar código.

| API                          | Where en receta                                            | Notas                                                                              |
| ---------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `animate*AsState`            | `references/compose-motion-receta.md` § animate*AsState   | Valor único sobre el tiempo. Variantes + specs (spring/tween/snap/keyframes)       |
| `AnimatedContent`            | `references/compose-motion-receta.md` § AnimatedContent   | Intercambio con `ContentTransform` (`togetherWith`), `slideIntoContainer`         |
| `AnimatedVisibility`         | `references/compose-motion-receta.md` § AnimatedVisibility | mount/unmount enter-exit. Enter + exit combinados con `+`                          |
| `updateTransition`           | `references/compose-motion-receta.md` § updateTransition  | Multi-propiedad coordinada sobre un mismo estado; misma timeline                   |
| `SharedTransitionLayout`     | `references/compose-motion-receta.md` § SharedTransition | Hero animation (Compose 1.7+, experimental). Keys deben coincidir entre pantallas   |
| Spring/tween specs opinados  | `references/compose-motion-receta.md` § Spring y tween   | Tabla UI snap/tactile/bouncy/drag/deterministic + stiffness/damping values          |
| Gestures (drag)              | `references/compose-motion-receta.md` § Gestures         | `draggable` + `Animatable.animateTo`, `anchoredDraggable`, `animateDecay`, `transformable` |

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