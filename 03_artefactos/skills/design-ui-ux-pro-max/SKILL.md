---
name: design-ui-ux-pro-max
description: This skill should be used when designing, reviewing or criticando UI/UX para web o móvil — páginas, componentes, color, tipografía, layout, accesibilidad, animación, navegación, formularios o visualización de datos. Produce una checklist de revisión de diseño en prosa ordenada por prioridad (accesibilidad primero), con recomendaciones conscientes del stack, sin invocar CLI externo ni base de datos.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design UI/UX Pro Max — Checklist de revisión de diseño

Derivada de ui-ux-pro-max (`nextlevelbuilder/ui-ux-pro-max`, MIT). El homólogo adapta el principio del vendor — reglas de diseño ordenadas por prioridad con recomendaciones conscientes del stack — en una checklist de revisión en prosa local-evaluation. Sin base de datos, sin Python, sin CLI externo: el razonamiento de diseño vive en el agente, no en un script.

## Cuándo usar

- Diseñar o refactorizar una página, componente, vista o pantalla de web/móvil.
- Elegir sistema de color, tipografía, espaciado, layout o patrón de navegación.
- Criticar UI existente por accesibilidad, consistencia, touch, rendimiento o calidad percibida.
- Implementar animación, transiciones, formularios o visualización de datos.
- Revisión pre-entrega de UI nativa/móvil (feedback de interacción, contraste, safe areas).

Saltar para lógica puramente backend, API/base de datos, infraestructura o scripts no visuales — a menos que la tarea cambie cómo algo se ve, se siente, se mueve o se interactúa.

## Cómo

Proceso de revisión en cinco pasos, todo local, sin red ni ejecución externa.

1. **Detectar el stack del proyecto.** Inspeccionar `package.json` (react/next/vue/svelte/nuxt/@angular), `pubspec.yaml` (Flutter), `*.xcodeproj`/`Package.swift` (SwiftUI), `composer.json` (Laravel), marcadores de React Native. Si nada es detectable, preguntar al usuario; nunca asumir un stack por defecto — un default silencioso desvía toda recomendación.

2. **Clasificar tipo de producto y audiencia.** SaaS, e-commerce, portafolio, dashboard, entretenimiento, herramienta, productividad o híbrido. Contexto de uso (commute, ocio, trabajo) y palabras clave de tono (minimal, vibrante, oscuro, content-first, inmersivo). Esto sesga las prioridades de la checklist.

3. **Aplicar la checklist por prioridad (1 → 10).** Recorrer las diez categorías en orden; la prioridad 1 es bloqueante, la 10 es nice-to-have. Para cada categoría, verificar los "debe tener" y marcar los anti-patrones. Documentar hallazgos con evidencia (`[CÓDIGO]` si hay archivo, `[DOC]` si es norma, `[INFERENCIA]` si es juicio del revisor).

4. **Emitir recomendaciones conscientes del stack.** Traducir cada hallazgo a la convención del stack detectado (tokens semánticos en Tailwind/shadcn, `@Composable` en Compose, `ViewModifier` en SwiftUI, directivas en Angular, etc.). Si una recomendación no aplica al stack, declararlo y omitirlo — no forzar.

5. **Declarar gaps explícitos.** Si una categoría no puede verificarse por falta de información (sin diseño, sin acceso al componente, stack ambiguo), marcar `coverage_gap` en vez de inventar. Escalar > asumir.

### Las diez prioridades (orden de bloqueo descendente)

1. **Accesibilidad — CRÍTICA.** Contraste 4.5:1 mínimo, texto alternativo, navegación por teclado, `aria-label`/`accessibilityLabel`. Anti-patrones: quitar focus rings, botones solo-icono sin etiqueta, color como único canal de significado.
2. **Touch e interacción — CRÍTICA.** Target mínimo 44×44px, 8px de espaciado entre targets, feedback de loading y estado. Anti-patrones: reliance en hover-only, cambios de estado instantáneos (0ms).
3. **Rendimiento — ALTA.** Imágenes WebP/AVIF, lazy loading, espacio reservado para evitar CLS < 0.1. Anti-patrones: layout thrashing, cumulative layout shift, bloqueo del hilo principal.
4. **Selección de estilo — ALTA.** Estilo coherente con el tipo de producto, iconos SVG (no emoji), consistencia visual. Anti-patrones: mezclar flat y skeuomorphico al azar, emoji como iconos.
5. **Layout y responsive — ALTA.** Mobile-first, breakpoints consistentes, viewport meta, sin scroll horizontal. Anti-patrones: scroll horizontal, anchos fijos en px, deshabilitar zoom.
6. **Tipografía y color — MEDIA.** Base 16px, line-height 1.5, tokens de color semánticos (no hex crudo en componentes). Anti-patrones: body text < 12px, gray-on-gray, hex raw en JSX/markup.
7. **Animación — MEDIA.** Duración 150–300ms, movimiento que comunica significado, continuidad espacial, respeta `prefers-reduced-motion`. Anti-patrones: animación puramente decorativa, animar width/height, sin fallback de reduced-motion.
8. **Formularios y feedback — MEDIA.** Etiquetas visibles, error cerca del campo, helper text, disclosure progresivo. Anti-patrones: label solo como placeholder, errores solo al inicio, abrumar desde el principio.
9. **Navegación — ALTA.** Back predecible, bottom nav ≤5 ítems, deep linking. Anti-patrones: nav sobrecargado, back roto, sin deep links.
10. **Charts y data — BAJA.** Leyendas, tooltips, colores accesibles. Anti-patrones: color como único canal de significado en gráficos.

### Pre-entrega (UI nativa/móvil)

Antes de entregar UI de app (iOS/Android/React Native/Flutter), recorrer disciplina de iconos/elementos visuales, feedback de interacción, contraste light/dark, safe-area layout y accesibilidad nativa. Si no se puede verificar, marcar `coverage_gap`.

## Fail-closed

- NO invocar `python search.py`, ningún CLI externo, ni `${CLAUDE_PLUGIN_ROOT}` ni paths de scripts vendor.
- NO red, NO publicación, NO auto-ejecución. Local-evaluation only.
- NO presentar un resultado vacío como si tuviera datos — declarar `coverage_gap` explícito.
- NO asumir stack por defecto; preguntar si no es detectable.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Validación

```
pnpm verify:skills
```
