---
name: design-compose-graphics
description: This skill should be used when se requiere dibujo vectorial custom, formas complejas, gradientes avanzados (linear/radial/sweep), shaders (RuntimeShader AGP 7.0+), efectos visuales via graphicsLayer/RenderEffect o gráficos procedurales en Compose. Produce código Canvas/DrawScope, Path, Brush, ShaderBrush y modificadores de capa de render declarativos, limpios y acelerados por hardware, sin ejecutar tooling externo.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Compose Graphics — Gráficos avanzados (Canvas, Path, Brush, gradientes, shaders, graphicsLayer, RenderEffect)

Produce código Compose declarativo para gráficos avanzados: dibujo vectorial, gradientes, shaders y efectos de capa de render acelerados por GPU. Voz MetodologIA, prosa terse, imperativa.

Derivada de compose-graphics (AThevon/genjutsu, MIT). El homólogo MetodologIA adapta los principios de DrawScope, Brush, graphicsLayer y RenderFilter a un marco local-evaluation: describe capacidades en prosa, no ejecuta tooling, no publica, falla cerrado ante runtime ausente.

## Cuándo usar

- Dibujo vectorial custom (formas, iconos, ilustraciones procedurales).
- Formas complejas con `Path` (curvas Bézier, cubicTo, quadTo, PathEffect dash).
- Gradientes avanzados: `linearGradient`, `radialGradient`, `sweepGradient`, `ShaderBrush`.
- Shaders AGSL (`RuntimeShader`, AGP 7.0+, Android 13+) con `RenderEffect.createRuntimeShaderEffect`.
- Efectos visuales con `graphicsLayer` (transform, clip, shadow, alpha) y `RenderEffect` (blur, offset, color filter).
- Gráficos procedurales (partículas, ondas, flow fields) dentro de `Canvas { }`.

| Necesidad                                          | API                                                            |
| -------------------------------------------------- | -------------------------------------------------------------- |
| Dibujo estático simple sobre un Modificador        | `Modifier.drawBehind { }` (DrawScope, sin layout pass extra)   |
| Dibujo que reacciona a tamaño/estado del contenido | `Modifier.drawWithContent { }` (ordena contenido + overlay)    |
| Dibujo aislado medible, sin hijos                  | `Canvas(modifier = ...)` (DrawScope puro, size fija o fillMax) |
| Gradiente reutilizable como pincel                 | `Brush.linearGradient(...)` / `ShaderBrush`                    |
| Efecto GPU por frame (blur, shader)                | `Modifier.graphicsLayer { renderEffect = ... }`                |

## Cómo

Principio: dibujar es declarativo. El `DrawScope` expone `size`, `drawCircle`, `drawRect`, `drawLine`, `drawPath`, `drawArc`, `drawIntoCanvas`. El estado vive fuera del scope; el scope solo lee.

### Canvas / DrawScope

```kotlin
@Composable
fun FormaBase() {
    Canvas(modifier = Modifier.size(120.dp)) {
        // this: DrawScope — size, color, drawCircle, drawPath
        drawCircle(
            color = Color.Blue,
            radius = size.minDimension / 2,
            center = Offset(size.width / 2, size.height / 2)
        )
        val path = remember { Path() }.apply {
            moveTo(0f, 0f)
            lineTo(size.width, size.height)
            cubicTo(size.width * 0.75f, 0f, size.width * 0.5f, size.height, 0f, 0f)
        }
        drawPath(path, color = Color.White, style = Stroke(width = 4.dp.toPx()))
    }
}
```

| Método               | Uso                                             |
| -------------------- | ----------------------------------------------- |
| `drawCircle`         | Círculo lleno o trazado                         |
| `drawRect`           | Rectángulo, admite `Brush` gradiente            |
| `drawPath`           | Path arbitrario, `Stroke` o `Fill`              |
| `drawArc`            | Porción ovalada (arcos de progreso)             |
| `drawLine`           | Segmento entre dos `Offset`                     |
| `drawIntoCanvas { }` | Escape hatch a `android.graphics.Canvas` nativo |

### Brush y gradientes

```kotlin
val brush = Brush.linearGradient(
    colors = listOf(Color.Magenta, Color.Cyan),
    start = Offset.Zero,
    end = Offset.Infinite
)
Box(modifier = Modifier.background(brush))

// Radial
Brush.radialGradient(colors = listOf(Color.Yellow, Color.Transparent), radius = 300f)
// Sweep (circular, útil para dial/gauge)
Brush.sweepGradient(colors = listOf(Color.Red, Color.Blue, Color.Red))
// ShaderBrush (AGSL RuntimeShader, API 26+)
val shaderBrush = remember { ShaderBrush(runtimeShader) }
Box(modifier = Modifier.background(shaderBrush))
```

### graphicsLayer — transformaciones y efectos

```kotlin
Box(
    modifier = Modifier
        .graphicsLayer {
            translationX = 8f
            translationY = 12f
            scaleX = 1.1f
            scaleY = 1.1f
            rotationZ = 15f
            alpha = 0.9f
            shadowElevation = 6f
            shape = RoundedCornerShape(16.dp)
            clip = true
            transformOrigin = TransformOrigin.Center
        }
)
```

`graphicsLayer` difiere la composición al layer de render: mueve/escala/rota sin recomponer el hijo. Ideal para animaciones de transform — no causan layout pass.

### RenderEffect — efectos GPU

```kotlin
val blurEffect = Modifier.blur(radius = 16.dp, edgeTreatment = BlurredEdgeTreatment.Unbounded)
// O vía RenderEffect directo en graphicsLayer (API 31+, AGP 7.0+)
Modifier.graphicsLayer {
    renderEffect = RenderEffect.createBlurEffect(16f, 16f, Shader.TileMode.CLAMP)
        .asComposeRenderEffect()
}
// offsetEffect, colorFilter, createRuntimeShaderEffect (AGSL)
```

Gate de API: `RenderEffect` requiere Android 12 (API 31+). `RuntimeShader` requiere Android 13 (API 33+). Sin gate, crash en dispositivos viejos. Fallback: render plano o `Modifier.blur` con check de `Build.VERSION.SDK_INT`.

### Hardware acceleration

- `graphicsLayer { }` crea un hardware layer. Reúsa el layer para varias transformaciones (no un `graphicsLayer` por propiedad).
- `RenderEffect` corre en GPU. Un shader por frame es barato; cuatro shaders en cadena son cuatro pases.
- Canvas dibuja en software por defecto; `Modifier.graphicsLayer { }` lo promueve a hardware layer si hay transform/clip/shadow.
- Para contenido estático pesado: precomputar `Path` en `remember`, solo animar transform via `translate { drawPath(...) }`.

## Do Not

| Anti-patrón                                                    | Corrección                                                                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Animar `size` con `Modifier.size(animateDpAsState)`            | Causa layout pass por frame. Usar `graphicsLayer` con `translationY`/`scaleX`.                                    |
| `scaleX = 0f` para ocultar                                     | Degradado visual y jitter. Usar `0.95f` + `alpha = 0f`.                                                           |
| `Canvas` sin `contentDescription` para contenido significativo | Inaccesible. Sembrarlo con `Modifier.semantics { contentDescription = "..." }` o `Modifier.clearAndSetSemantics`. |
| `ShaderBrush` sin fallback API < 26                            | Crash. Gate con `Build.VERSION.SDK_INT`.                                                                          |
| `drawWithContent` sin `drawIntoCanvas` correcto                | El escape hatch pierde transformaciones. Llamar `drawContent()` primero, luego overlay sobre el mismo canvas.     |
| Allocar `Path()` dentro del DrawScope                          | GC stutter. `remember { Path() }` y `path.rewind()` por frame.                                                    |
| Chaining 4 `graphicsLayer` con `renderEffect`                  | 4 pases GPU. Un shader combinado en un pase.                                                                      |
| `RuntimeShader` sin gate `SDK_INT >= 33`                       | Crash Android 12-. Render plano o gradiente estático como fallback.                                               |

## Fail-closed

- NO CLI externo (no `./gradlew assembleDebug` auto-run, no `npx`, no auto-build).
- NO red (no fetch de shaders, no descarga de assets).
- NO publicación (no push, no release).
- NO auto-ejecución de tooling Compose. El skill describe la capacidad en prosa; el humano decide cuándo compilar.
- `local-evaluation` only. Si no hay runtime Compose disponible (emulador, dispositivo, preview IDE), marcar `coverage_gap` y documentar la validación pendiente.
- Toda afirmación de rendimiento GPU requiere benchmark; sin benchmark, marcar `[INFERENCIA]` o `coverage_gap`.

## Validación

```bash
pnpm verify:skills
```

Esperado: PASS sin regresión. El script `scripts/check-skill.mjs` valida contratos del skill (tokens requeridos, APIs prohibidas, fixture negativo completo).
