---
name: design-genjutsu-uiux
description: This skill should be used when the operator requests UI/UX design-system intelligence — styles, color palettes, font pairings, UX guidelines, or chart-type recommendations across technology stacks. It delivers prose guidance and curated category priorities (accessibility CRITICAL, touch CRITICAL, performance HIGH, layout HIGH, typography/color MEDIUM, animation MEDIUM, style MEDIUM, charts LOW) for local evaluation only; it never executes a CLI, queries a database, or auto-launches build tooling.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Genjutsu UI/UX — Design-system intelligence por prioridad

Derivada de genjutsu/_jutsu/ui-ux-pro-max/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). El homólogo MetodologIA adapta el principio del vendor — una base de diseño consultable con prioridades por categoría — al contexto local-evaluation: el razonamiento de diseño vive en el agente como prosa curada, no en un dataset binario ni un CLI Python. Sin `python search.py`, sin `--design-system`, sin `--persist`, sin red. La skill describe la capability; el operador decide si ejecuta algo externo.

## Cuándo usar (When to Apply)

- Elegir un sistema de color, paleta o token-set para un producto nuevo.
- Seleccionar un font pairing (heading + body) coherente con el tono del producto.
- Revisar UI existente por accesibilidad, touch, rendimiento, layout, animación o consistencia visual.
- Diseñar páginas, componentes, vistas o pantallas de web/móvil.
- Recomendar un chart type para un dato concreto (tendencia, comparación, funnel, proporción).
- Recibir un prompt de diseño (build, create, implement, review, fix, improve) sobre UI/UX.

Saltar para lógica puramente backend, API/base de datos, infraestructura o scripts no visuales — a menos que la tarea cambie cómo algo se ve, se siente, se mueve o se interactúa.

## Rule Categories by Priority

El núcleo del vendor: ocho categorías de reglas de diseño ordenadas por prioridad de impacto. La prioridad 1 es bloqueante; la 8 es nice-to-have. Recorrer en orden; la prioridad más alta no cubierta es el techo de calidad del deliverable.

| Priority | Category            | Impact   | Domain            |
| -------- | ------------------- | -------- | ----------------- |
| 1        | Accessibility       | CRITICAL | ux                |
| 2        | Touch & Interaction | CRITICAL | ux                |
| 3        | Performance         | HIGH     | ux                |
| 4        | Layout & Responsive | HIGH     | ux                |
| 5        | Typography & Color  | MEDIUM   | typography, color |
| 6        | Animation           | MEDIUM   | ux                |
| 7        | Style Selection     | MEDIUM   | style, product    |
| 8        | Charts & Data       | LOW      | chart             |

## Quick Reference por categoría

### 1. Accessibility — CRITICAL

- **color-contrast** — razón mínima 4.5:1 para texto normal (3:1 para texto grande). Verificar texto en mid-transition (fade debe permanecer legible). Anti-patrón: gray-on-gray, texto < 12px, color como único canal de significado.
- **focus-states** — todo elemento interactivo debe tener un focus ring visible. `outline: none` sin `:focus-visible` de reemplazo es un fallo WCAG. Anti-patrón: quitar el focus ring sin reemplazo.
- **alt-text** — texto alternativo descriptivo para imágenes con significado; `aria-hidden` para decorativas. Anti-patrón: `alt=""` en imágenes informativas.
- **aria-labels** — todo botón solo-icono necesita `aria-label` / `accessibilityLabel`. Anti-patrón: icono sin etiqueta legible por screen reader.
- **keyboard-nav** — el orden de tabulado debe coincidir con el orden visual. Anti-patrón: `tabIndex` positivo forzando un orden no visual.
- **form-labels** — todo input debe tener un `<label for>` visible o `aria-label`. Anti-patrón: label solo como placeholder.

### 2. Touch & Interaction — CRITICAL

- **touch-target-size** — target mínimo 44×44px (iOS HIG, WCAG 2.5.5). Espaciado de 8px entre targets adyacentes. Anti-patrón: botones de 24px en móvil.
- **hover-vs-tap** — usar click/tap para la interacción primaria; hover sólo para feedback secundario. Anti-patrón: reliance en hover-only en touch.
- **loading-buttons** — deshabilitar el botón durante operaciones async; mostrar spinner o estado de loading. Anti-patrón: doble submit habilitado.
- **error-feedback** — mensaje de error claro cerca del problema, no en una toast lejana. Anti-patrón: error genérico "Algo salió mal" sin contexto.
- **cursor-pointer** — añadir `cursor-pointer` a elementos clickeables; feedback visual en hover. Anti-patrón: cursor default en cards interactivas.

### 3. Performance — HIGH

- **image-optimization** — WebP/AVIF, `srcset` responsive, lazy loading para below-the-fold. Anti-patrón: PNG sin optimizar de 2MB.
- **reduced-motion** — respetar `prefers-reduced-motion` (Web) / `accessibilityReduceMotion` (SwiftUI) / `isReduceTransitions` (Compose). Anti-patrón: animación decorativa sin fallback.
- **content-jumping** — reservar espacio para async content (aspect-ratio, skeleton). CLS < 0.1. Anti-patrón: layout shift por imagen o font sin dimensión reservada.

### 4. Layout & Responsive — HIGH

- **viewport-meta** — `width=device-width, initial-scale=1`. Anti-patrón: deshabilitar zoom (`user-scalable=no`).
- **readable-font-size** — mínimo 16px de body text en móvil. Anti-patrón: body text < 12px.
- **horizontal-scroll** — contenido cabe en el viewport; sin scroll horizontal. Anti-patrón: width fijo de 1200px en móvil.
- **z-index-management** — escala declarada de z-index (10, 20, 30, 50, 100). Anti-patrón: `z-index: 9999` mágico.

### 5. Typography & Color — MEDIUM

- **line-height** — 1.5–1.75 para body text; 1.1–1.3 para headings. Anti-patrón: line-height de 1.0 en párrafos.
- **line-length** — 65–75 caracteres por línea para legibilidad. Anti-patrón: líneas de 120 caracteres a ancho completo.
- **font-pairing** — emparejar heading/body por personalidad (serif heading + sans body, geometric sans + humanist sans). Anti-patrón: dos display fonts compitiendo.
- **color-tokens** — tokens semánticos (`bg-primary`, `text-muted`), no hex crudo en componentes. Anti-patrón: `#475569` literal en JSX/markup.

### 6. Animation — MEDIUM

- **duration-timing** — 150–300ms para micro-interacciones; 300–500ms para transiciones de vista. Anti-patrón: instantáneo (0ms) o demasiado lento (>500ms para un fade).
- **transform-performance** — animar `transform` y `opacity` (composited), no `width`/`height`/`top`/`left` (layout). Anti-patrón: animar layout properties dispara reflow por frame.
- **loading-states** — skeleton screens o spinners; nunca un estado en blanco. Anti-patrón: pantalla vacía durante fetch.

### 7. Style Selection — MEDIUM

- **style-match** — el estilo debe calzar con el tipo de producto (glassmorphism para fintech, flat para SaaS B2B, skeuomorphic para luxury). Anti-patrón: estilo genérico aplicado sin contexto.
- **consistency** — mismo estilo en todas las páginas; tokens de motion, color y spacing compartidos. Anti-patrón: mezclar flat y skeuomorphico al azar.
- **no-emoji-icons** — usar SVG icons (Heroicons, Lucide, Simple Icons), no emojis como iconos de UI. Anti-patrón: 🎌 🚀 ⚙️ como iconos funcionales.

### 8. Charts & Data — LOW

- **chart-type** — calzar el chart al tipo de dato: línea para tendencia, barra para comparación, donut para proporción, funnel para conversión. Anti-patrón: pie chart de 12 segmentos.
- **color-guidance** — paleta accesible (no sólo rojo/verde); máximo 5–7 series distinguibles. Anti-patrón: color como único canal de significado.
- **data-table** — proveer alternativa tabular para accesibilidad. Anti-patrón: chart sin tabla ni descripción textual.

## Cómo entregar

1. **Clasificar el producto y audiencia** — SaaS, e-commerce, portafolio, dashboard, entretenimiento, herramienta, productividad. Contexto de uso (commute, ocio, trabajo) y palabras clave de tono (minimal, vibrante, oscuro, content-first, inmersivo).
2. **Recorrer las 8 categorías en orden de prioridad** — la prioridad 1 (Accesibilidad) es bloqueante; sin 4.5:1 no hay deliverable. La prioridad 8 (Charts) es nice-to-have. Documentar hallazgos con evidencia (`[CÓDIGO]` si hay archivo, `[DOC]` si es norma, `[INFERENCIA]` si es juicio del revisor).
3. **Adaptar al stack del proyecto** — tokens semánticos en Tailwind/shadcn, `@Composable` en Compose, `ViewModifier` en SwiftUI, directivas en Angular, `@media` en CSS. Si una recomendación no aplica al stack, declararlo y omitirlo — no forzar.
4. **Declarar gaps explícitos** — si una categoría no puede verificarse (sin diseño, sin acceso al componente, stack ambiguo), marcar `coverage_gap` en vez de inventar. Escalar > asumir.

## Fail-closed

- **No CLI externo**: no invocar `python search.py`, ningún script vendor, ni `${CLAUDE_PLUGIN_ROOT}` ni paths de dataset binario. La skill describe la capability; ejecución externa requiere confirmación explícita del operador.
- **No red**: la recomendación es local-evaluation sobre el código fuente del proyecto. No fetch de URLs externas.
- **No publicación**: la salida es guidance en prosa, no un publish.
- **No auto-ejecución**: no auto-instalar ni auto-correr build tooling. Si no hay tooling local, marcar `coverage_gap`.
- **local-evaluation only**: scope declarado en frontmatter. Cualquier acción fuera de este scope requiere escalada.
- **No presentar un resultado vacío como si tuviera datos** — declarar `coverage_gap` explícito.
- **No asumir stack por defecto** — preguntar si no es detectable; un default silencioso desvía toda recomendación.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Validación

```bash
pnpm verify:skills
```

Salida esperada: PASS sin regresión. La skill debe declarar `execution_scope: local-evaluation`, `license: LicenseRef-MetodologIA-Internal` y `lifecycle_state: active`. Cualquier hallazgo sin fuente o sin límite declarado se marca `coverage_gap`.
