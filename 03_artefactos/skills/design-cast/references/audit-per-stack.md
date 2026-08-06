# Audit per stack — Stage 7

Correr los checks del stack detectado antes de entregar. Los all-stacks corren siempre; los
por-stack son adicionales.

## All stacks

- Reduced motion respetado (CSS `prefers-reduced-motion`, SwiftUI
  `accessibilityReduceMotion`, Compose `ANIMATOR_DURATION_SCALE`).
- Exit animations presentes (no abrupt vanishings).
- No layout-property animations (animar transform / opacity / graphicsLayer, no
  width/height/top/left).
- Focus visible en elementos interactivos.
- Estados relevantes en interactivos (default, hover/press, focus, active, disabled).
- Colors y spacing consistentes con los design tokens detectados.

## Web

- Conditional renders con AnimatePresence (o equivalente del framework).
- Contraste >= 4.5:1 para todo texto.
- No forced reflow; `will-change` escaso.
- 60fps target verificado vía Chrome DevTools Performance panel.
- No clickable divs sin role/button.
- `aria-hidden` en animaciones puramente decorativas.
- Responsive en 4 breakpoints: 375px / 768px / 1024px / 1440px.

## Compose

- Recomposition counts verificados (Layout Inspector / `Modifier.recomposeHighlighter`).
- No animar `width`/`height` (usar `Modifier.graphicsLayer { translationX/Y, scaleX/Y }`).
- `Modifier.semantics` en custom interactive components.
- Frame timing OK en mid-range device (Pixel 4a baseline) vía Macrobenchmark.

## SwiftUI

- No `body` recomputado en irrelevant state changes (`@StateObject`, `@ObservableObject`
  correctos).
- Hitches Instrument sin dropped frames durante animation.
- `.accessibilityLabel` / `.accessibilityHint` en todas las views interactivas.
- Testeado con Reduce Motion ON y Dynamic Type al 200%.

## macOS (además de SwiftUI)

- Hover states en todo elemento interactivo.
- Keyboard shortcuts (`Cmd+N`, `Cmd+W`, `Cmd+F`) bound a primary actions.
- Multi-window state shared coherently si aplica.
- Focus rings visibles en keyboard navigation (no `outline: none` sin alternativa).