---
name: design-audit-genjutsu
description: This skill should be used when a motion-heavy UI (Web, SwiftUI or Compose) is about to ship or has shipped and needs a final checkpoint for motion gaps, accessibility, color consistency, responsive behavior and animation performance. It produces a severity-ranked audit (Critical / Important / Nice-to-have) covering missing exit animations, reduced-motion handlers, focus-visible, semantic HTML, layout-property animations, duration/easing drift and bundle cost, with explicit fail-closed boundaries (local-evaluation only, no auto-run linters, no network).
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Audit — Checkpoint final de motion, a11y, consistencia, performance

Derivada de design-audit (AThevon/genjutsu, MIT). El homólogo MetodologIA adapta el principio de auditoría final de UI animada al contexto local-evaluation: produce un informe de hallazgos por severidad sin ejecutar linters externos, sin red, sin publicación. Lee el código fuente del proyecto y razona sobre patrones detectados. La ejecución de cualquier CLI externo (pa11y, lighthouse, source-map-explorer) requiere confirmación explícita del operador; por defecto se describe la capability y se marca `coverage_gap` si no hay linter local disponible.

## Cuándo usar

- Antes de ship: checkpoint final tras una implementación con animación.
- Revisar gaps de motion: entradas sin salida, hover sin transición, listas sin stagger.
- Auditar a11y: reduced motion handler, contraste 4.5:1, focus visible, HTML semántico, aria-hidden en decorativas.
- Verificar consistencia de duraciones y easings (3-5 valores máximos por token).
- Detectar performance issues: animar layout props, will-change excesivo, bundle cost de librerías, bucle con `setTimeout` como timer de animación.

## Cómo

### Motion Gap Analysis

- **Conditional renders sin exit animation**: todo montaje/desmontaje condicional (`{show && <Component/>}` o ternarias) debe estar envuelto en un wrapper de presencia (Web: `AnimatePresence`; Compose: `AnimatedVisibility`; SwiftUI: `transition` + `if`). Un render condicional sin soporte de salida produce un pop instantáneo.
- **Hover sin transition**: toda regla `:hover` (o estado equivalente nativo) debe tener una transición declarada en el selector base. Un flip instantáneo de estado se percibe como roto.
- **Listas sin stagger**: listas renderizadas por `.map()` / `ForEach` / `LazyVStack` deben escalar la entrada (stagger por índice, delay escalonado o variantes encadenadas). Un pop simultáneo de toda la lista luce barato.
- **Style changes sin transition**: cambios de estilo inline (background dinámico, color, opacidad) requieren transición CSS o wrapper de motion. Excepción: `transform` y `opacity` ya son performantes.
- **Entries sin exits**: toda declaración `initial` + `animate` dentro de un wrapper de presencia debe declarar `exit`. Entrada sin salida es un gap de motion.

### Accessibility Audit

- **Reduced motion — OBLIGATORIO por stack**: un proyecto con animación debe tener al menos un handler global de `prefers-reduced-motion` (Web), `accessibilityReduceMotion` / `isReduceMotionEnabled` (SwiftUI/UIKit), o `LocalAccessibilityManager` / `isReduceTransitions` / `ANIMATOR_DURATION_SCALE` (Compose). Cero handlers en un proyecto animado = violación Critical. Referenciar el contrato de motion del stack.
- **Contraste 4.5:1**: verificar texto animado en mid-transition (texto que fadea debe permanecer legible en toda opacidad > 0.4). Usar DevTools del navegador (Inspect > color swatch > contrast ratio) o un linter local confirmado.
- **Focus visible en todos los interactivos**: toda regla `outline: none` / `outline: 0` debe estar acompañada de un `:focus-visible` custom. Quitar el focus ring sin reemplazo es un fallo WCAG.
- **HTML semántico — no clickable divs**: todo `<div onClick>` o `<span onClick>` debe ser `<button>`, `<a>`, o tener `role="button"` + `tabIndex` + `onKeyDown`. Un div clickable sin semántica rompe teclado y screen reader.
- **aria-hidden en decorativas**: animaciones puramente decorativas (partículas de fondo, motion ambiental, Lottie ilustrativo, Canvas decorativo) deben llevar `aria-hidden="true"` para no contaminar el árbol de accesibilidad.

### Performance Audit

- **Layout thrashing — animar layout properties**: animar `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding` dispara reflow cada frame. Reemplazar por `transform: translate/scale` y `opacity`.
- **will-change excesivo**: `will-change` debe ser raro y scoped. Más de ~5 elementos con uso permanente implica coste de memoria GPU superior al beneficio. Aplicarlo dinámicamente (add on hover/focus, remove on animation end).
- **Bundle cost de librerías**: si el proyecto sólo usa fade + slide, una lib de 30KB es overkill. Referencias gzipped: framer-motion ~30KB, GSAP ~25KB, popmotion ~5KB, CSS-only 0KB. En nativo, Lottie/Rive suman 500KB-2MB; justificar sólo para animaciones pre-diseñadas complejas (onboarding ilustrado). APIs nativas (Compose `animate*AsState`, SwiftUI `withAnimation`) bastan para fades/slides/springs.
- **requestAnimationFrame vs `setTimeout`**: loops de animación deben usar `requestAnimationFrame`. `setTimeout` como timer de animación (o `setInterval`) genera frame drops y no pausa en tabs en background. Detectar el anti-patrón "bucle con `setTimeout`" en código de animación/scroll/transform.

### Consistency Audit

- **Duraciones — 3-5 valores máximo**: un proyecto bien diseñado usa 3-5 duraciones distintas (ej. 0.15, 0.25, 0.35, 0.5). Si aparecen 15 valores distintos, extraerlos a un archivo de motion tokens.
- **Easings — 3-5 máximos**: mismo principio en todos los stacks (CSS cubic-bezier, SwiftUI spring, Compose easing). Valores dispersos = inconsistencia visual. Centralizar en tokens nombrados.
- **Enter/exit simétrico**: duración de entrada >= duración de salida (nunca al revés); entrada usa `ease-out`, salida usa `ease-in`; entrada tiene coreografía completa (translate + opacity + scale), salida es más simple (opacity only o opacity + scale ligero). Asimetría inversa es incorrecta.

### Stack-specific

- **Web**: `AnimatePresence`, `prefers-reduced-motion`, `:focus-visible`, HTML semántico, `requestAnimationFrame` para loops.
- **SwiftUI**: `transition` + `if`, `accessibilityReduceMotion`, `withAnimation`, `.spring`/`.snappy`/`.bouncy` como easings nombrados.
- **Compose**: `AnimatedVisibility`, `LocalAccessibilityManager` / `ANIMATOR_DURATION_SCALE`, `animate*AsState` + `spring`, `tween`/`FastOutSlowInEasing`.

### Límites

La skill describe el workflow de auditoría en prosa. No ejecuta linters externos automáticamente. No referencia tooling vendor de CLI. Fail-closed: audit local-evaluation, sin auto-run. Si no hay linter local disponible, marcar `coverage_gap` y describir qué buscar manualmente.

## Severidad

### Critical

- Reduced motion handler missing (proyecto animado sin handler global por stack).
- Clickable divs (`<div onClick>` sin `role`/`tabIndex`/`onKeyDown`).
- `outline: none` sin `:focus-visible` de reemplazo.
- Animar layout properties (`width`/`height`/`top`/`left`/`margin`/`padding`).

### Important

- `AnimatePresence` missing en conditional render con exit esperado.
- `:hover` sin `transition` declarada.
- `aria-hidden` missing en animaciones decorativas.
- Bucle con `setTimeout` como timer de animación (o `setInterval` en loops).
- Duraciones > 8 valores distintos sin tokenizar.

### Nice-to-have

- Listas sin stagger (pop simultáneo).
- Inline styles sin transición (excepto `transform`/`opacity`).
- `will-change` excesivo (>5 elementos con uso permanente).
- Enter/exit asimétrico (entrada más rápida que salida, o easing invertido).
- Librería de animación oversized para el scope real (30KB para fade-only).

## Fail-closed

- **No CLI externo**: no auto-ejecutar `npx pa11y`, `npx lighthouse`, `source-map-explorer` ni similar. La skill describe la capability (qué buscar) y gatilla la ejecución sólo tras confirmación explícita del operador.
- **No red**: la auditoría es local-evaluation sobre el código fuente del proyecto. No fetch de URLs externas.
- **No publicación**: la salida es un informe de hallazgos, no un publish.
- **No auto-ejecución**: no auto-instalar ni auto-correr linters. Si no hay linter local disponible, marcar `coverage_gap` en lugar de inferir resultado.
- **local-evaluation only**: scope declarado en frontmatter. Cualquier acción fuera de este scope requiere escalada.

## Validación

```bash
pnpm verify:skills
```

Salida esperada: PASS sin regresión. La skill debe declarar `execution_scope: local-evaluation`, `license: LicenseRef-MetodologIA-Internal` y `lifecycle_state: active`. Cualquier hallazgo sin fuente o sin límite declarado se marca `coverage_gap`.
