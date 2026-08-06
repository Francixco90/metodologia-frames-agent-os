---
name: design-genjutsu-uiux
description: This skill should be used when the operator requests UI/UX design-system intelligence — styles, color palettes, font pairings, UX guidelines, or chart-type recommendations across technology stacks. It delivers prose guidance and curated category priorities (accessibility CRITICAL, touch CRITICAL, performance HIGH, layout HIGH, typography/color MEDIUM, animation MEDIUM, style MEDIUM, charts LOW) for local evaluation only; it never executes a CLI, queries a database, or auto-launches build tooling.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Genjutsu UI/UX — Design-system intelligence por prioridad

Derivada de genjutsu/_jutsu/ui-ux-pro-max/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). El homólogo MetodologIA adapta el principio del vendor — una base de diseño consultable con prioridades por categoría — al contexto local-evaluation: el razonamiento de diseño vive en el agente como prosa curada, no en un dataset binario ni un CLI Python. Sin `python search.py`, sin `--design-system`, sin `--persist`, sin red. La skill describe la capability; el operador decide si ejecuta algo externo.

## Cuándo usar (When to Apply)

Usar para cualquier decisión de UI/UX (color, tipografía, layout, accesibilidad, touch, charts, animación). Saltar para lógica puramente backend, API/base de datos, infraestructura o scripts no visuales — a menos que la tarea cambie cómo algo se ve, se siente, se mueve o se interactúa.

## Rule Categories by Priority

Ocho categorías de reglas de diseño por prioridad de impacto (1 bloqueante → 8 nice-to-have). Recorrer en orden; la prioridad más alta no cubierta es el techo de calidad.

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

- **color-contrast** — razón mínima 4.5:1 normal (3:1 grande); fade debe permanecer legible. Anti-patrón: gray-on-gray, < 12px, color como único canal.
- **focus-states** — todo elemento interactivo necesita focus ring visible. `outline: none` sin `:focus-visible` de reemplazo es fallo WCAG.
- **alt-text** — alt descriptivo para imágenes con significado; `aria-hidden` para decorativas. Anti-patrón: `alt=""` en imágenes informativas.
- **aria-labels** — todo botón solo-icono necesita `aria-label`/`accessibilityLabel`.
- **keyboard-nav** — el tabulado debe coincidir con el orden visual. Anti-patrón: `tabIndex` positivo forzando orden no visual.
- **form-labels** — todo input necesita `<label for>` visible o `aria-label`. Anti-patrón: label solo como placeholder.

### 2. Touch & Interaction — CRITICAL

- **touch-target-size** — mínimo 44×44px (iOS HIG, WCAG 2.5.5); 8px entre targets adyacentes. Anti-patrón: botones de 24px en móvil.
- **hover-vs-tap** — click/tap para interacción primaria; hover sólo para feedback secundario.
- **loading-buttons** — deshabilitar botón durante async; mostrar spinner. Anti-patrón: doble submit habilitado.
- **error-feedback** — error claro cerca del problema, no toast lejana. Anti-patrón: error genérico sin contexto.
- **cursor-pointer** — `cursor-pointer` en clickeables; feedback en hover.

### 3. Performance — HIGH

- **image-optimization** — WebP/AVIF, `srcset` responsive, lazy loading below-the-fold. Anti-patrón: PNG de 2MB sin optimizar.
- **reduced-motion** — respetar `prefers-reduced-motion` (Web) / `accessibilityReduceMotion` (SwiftUI) / `isReduceTransitions` (Compose).
- **content-jumping** — reservar espacio para async (aspect-ratio, skeleton). CLS < 0.1.

### 4. Layout & Responsive — HIGH

- **viewport-meta** — `width=device-width, initial-scale=1`. Anti-patrón: deshabilitar zoom (`user-scalable=no`).
- **readable-font-size** — mínimo 16px de body en móvil.
- **horizontal-scroll** — contenido cabe en viewport; sin scroll horizontal. Anti-patrón: width fijo 1200px en móvil.
- **z-index-management** — escala declarada (10, 20, 30, 50, 100). Anti-patrón: `z-index: 9999` mágico.

### 5. Typography & Color — MEDIUM

- **line-height** — 1.5–1.75 body; 1.1–1.3 headings.
- **line-length** — 65–75 caracteres por línea.
- **font-pairing** — heading/body por personalidad (serif+sans, geometric+humanist). Anti-patrón: dos display fonts compitiendo.
- **color-tokens** — tokens semánticos (`bg-primary`, `text-muted`), no hex crudo. Anti-patrón: `#475569` literal en markup.

### 6. Animation — MEDIUM

- **duration-timing** — 150–300ms micro-interacciones; 300–500ms transiciones de vista.
- **transform-performance** — animar `transform`/`opacity` (composited), no `width`/`height`/`top`/`left` (layout, reflow por frame).
- **loading-states** — skeleton o spinner; nunca estado en blanco.

### 7. Style Selection — MEDIUM

- **style-match** — calzar estilo al tipo de producto (glassmorphism fintech, flat SaaS B2B, skeuomorphic luxury).
- **consistency** — mismo estilo en todas las páginas; tokens de motion/color/spacing compartidos. Anti-patrón: mezclar flat y skeuomorphico al azar.
- **no-emoji-icons** — SVG icons (Heroicons, Lucide), no emojis como iconos funcionales.

### 8. Charts & Data — LOW

- **chart-type** — línea tendencia, barra comparación, donut proporción, funnel conversión. Anti-patrón: pie chart de 12 segmentos.
- **color-guidance** — paleta accesible (no sólo rojo/verde); 5–7 series distinguibles.
- **data-table** — alternativa tabular para accesibilidad.

## Cómo entregar

1. **Clasificar producto, audiencia y tono** (minimal, vibrante, oscuro, content-first, inmersivo).
2. **Recorrer las 8 categorías en orden de prioridad** — Documentar hallazgos con evidencia (`[CÓDIGO]` si hay archivo, `[DOC]` si es norma, `[INFERENCIA]` si es juicio del revisor).
3. **Adaptar al stack del proyecto** — tokens semánticos en Tailwind/shadcn, `@Composable` en Compose, `ViewModifier` en SwiftUI, directivas en Angular, `@media` en CSS. Si una recomendación no aplica al stack, declararlo y omitirlo — no forzar.
4. **Declarar gaps explícitos** — si una categoría no puede verificarse (sin diseño, sin acceso al componente, stack ambiguo), marcar `coverage_gap` en vez de inventar. Escalar > asumir.

## Fail-closed

- **No CLI externo**: no invocar `python search.py`, ningún script vendor, ni `${CLAUDE_PLUGIN_ROOT}` ni paths de dataset binario. La skill describe la capability; ejecución externa requiere confirmación explícita del operador.
- **No red**: la recomendación es local-evaluation sobre el código fuente del proyecto. No fetch de URLs externas.
- **No publicación**: la salida es guidance en prosa, no un publish.
- **No auto-ejecución**: no auto-instalar ni auto-correr build tooling. Si no hay tooling local, marcar `coverage_gap`.
- **No presentar un resultado vacío como si tuviera datos** — declarar `coverage_gap` explícito.
- **No asumir stack por defecto** — preguntar si no es detectable; un default silencioso desvía toda recomendación.

## Validación

```bash
pnpm verify:skills
```

Salida esperada: PASS sin regresión. La skill debe declarar `execution_scope: local-evaluation`, `license: LicenseRef-MetodologIA-Internal` y `lifecycle_state: active`. Cualquier hallazgo sin fuente o sin límite declarado se marca `coverage_gap`.
