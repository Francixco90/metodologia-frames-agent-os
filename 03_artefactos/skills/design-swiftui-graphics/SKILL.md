---
name: design-swiftui-graphics
description: This skill should be used when the user requests advanced SwiftUI graphics — custom vector drawing with Canvas and Path, complex shapes, linear/radial/angular gradients, filter effects (shadow, blur, colorInvert, compositingGroup), frame-by-frame animations via TimelineView, or Metal shaders (.colorEffect, .layerEffect, .distortionEffect) — for any iOS/macOS deliverable. It produces ready-to-apply SwiftUI code snippets, decision tables (Canvas vs Path vs Shape vs overlay), and fail-closed performance rules evaluated locally with no network, CLI, or autonomous execution.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# SwiftUI Graphics — Gráficos avanzados (Canvas, Path, shapes, gradientes, filtros, TimelineView)

Derivada de swiftui-graphics (AThevon/genjutsu, MIT). El homólogo MetodologIA
expone la misma capability — gráficos avanzados SwiftUI — en voz MetodologIA:
prosa terse, imperativa, fail-closed. No copia prosa vendor; adapta el
principio. Cubre dibujo vectorial nativo (Canvas, Path, Shape), gradientes,
filtros, animación frame-by-frame con TimelineView y shaders Metal acoplados a
SwiftUI. El agente aplica estos patrones dentro de deliverables de contenido
(HTML/markdown/brand que citan código SwiftUI) sin invocar tooling externo,
compilar, ni publicar. Sin runtime SwiftUI disponible, marca coverage_gap.

## Cuándo usar

- Dibujo vectorial custom que excede shapes primitivas (polígonos, ondas, glyphs
  procedurales).
- Formas complejas: arcs, curves Bézier, dash patterns, stroke styles multilinea.
- Gradientes avanzados: linear con stops, radial con focal point, angular para
  ruedas/gauges.
- Efectos de filtro: shadow, blur, colorInvert, saturation, blend modes,
  compositingGroup.
- Animaciones frame-by-frame conducidas por tiempo (TimelineView) — partículas,
  ondas, scanlines.
- Gráficos procedurales: osciloscopios, sparklines, campos vectoriales,
  hologramas.
- Shaders Metal acoplados a SwiftUI (iOS 17+): colorEffect, distortionEffect,
  layerEffect.

### Tabla de decisión — Canvas vs Path vs Shape vs overlay

| Necesidad                        | API                                                         | Por qué                                                           |
| -------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Dibujo imperativo frame-by-frame | `Canvas { context, size in }`                               | Re-ejecuta por frame con TimelineView; sin reflow de SwiftUI.     |
| Path reutilizable standalone     | `Path { p in }` o `Path(closure:)`                          | Geometría pura, componible, cacheable.                            |
| Forma parametrizada reutilizable | `struct X: Shape { path(in:) }`                             | Integrable con `.fill`, `.stroke`, animable con `AnimatableData`. |
| Forma primitiva del sistema      | `RoundedRectangle`, `Capsule`, `Ellipse`, `Circle`          | Suficiente para 80% de casos; no reinventar.                      |
| Dibujo sobre contenido existente | `Canvas` en `.overlay` o `ZStack`                           | Separa capa gráfica del contenido semántico.                      |
| Modificación visual sin dibujo   | `.visualEffect { content, proxy in }` (iOS 17+)             | Lee geometry sin GeometryReader; sólo transform visual.           |
| Efecto por-pixel                 | Metal `.colorEffect` / `.distortionEffect` / `.layerEffect` | GPU, resolución nativa; iOS 17+ únicamente.                       |

Orden de escalación por defecto: modifiers nativos → `.visualEffect` →
`Canvas` → shader Metal. Llega a shaders solo cuando el efecto es por-pixel y
animado.

## Receta — router

Full code templates (Canvas, Path, Shapes, Gradientes, Filtros, TimelineView,
visualEffect, Metal shaders) + Do Not anti-pattern table lives en
`references/swiftui-graphics-receta.md` (governed, hash-bound). Load la receta
antes de emitir guidance.

| Sección                | Where en receta                                                 |
| ---------------------- | -------------------------------------------------------------- |
| Canvas                 | `references/swiftui-graphics-receta.md` § Canvas               |
| Path custom            | `references/swiftui-graphics-receta.md` § Path custom          |
| Shapes                 | `references/swiftui-graphics-receta.md` § Shapes               |
| Gradientes             | `references/swiftui-graphics-receta.md` § Gradientes          |
| Filtros y compositing  | `references/swiftui-graphics-receta.md` § Filtros             |
| TimelineView           | `references/swiftui-graphics-receta.md` § TimelineView        |
| `.visualEffect`        | `references/swiftui-graphics-receta.md` § visualEffect         |
| Metal shaders (iOS 17+) | `references/swiftui-graphics-receta.md` § Metal shaders       |
| Do Not (anti-patrones) | `references/swiftui-graphics-receta.md` § Do Not              |

## Fail-closed

- NO CLI externo: no `xcodebuild` auto-run, no `swift build`, no `npx`, no
  auto-compilación. Compilar requiere confirmación explícita del usuario.
- NO red: la skill no hace fetch ni descarga assets; todo código va embebido en
  el deliverable.
- NO publicación: la skill produce snippets y specs; no publica ni activa
  conectores.
- NO auto-ejecución: ejecutar cualquier comando fuera del write-set requiere
  confirmación explícita.
- NO reloj autónomo: nunca llames a reloj del sistema dentro de closures de
  dibujo; usa `timeline.date` de `TimelineView`.
- local-evaluation only: la skill evalúa y genera specs localmente; sin runtime
  autónomo. Si el entorno no ofrece runtime SwiftUI verificable, marca
  coverage_gap.
- Los estados `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`
  no se conceden por un build exitoso.

## Validación

```sh
node skills/design-swiftui-graphics/scripts/check-skill.mjs
pnpm verify:skills
```