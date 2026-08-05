---
name: design-web-design-guidelines
description: This skill should be used when the user asks to review UI code, audit a frontend against interface guidelines, check accessibility, evaluate interaction quality, or verify that HTML/CSS/JSX conforms to web interface best practices. Produces a findings list with file:line references and severity tags.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Revisión de pautas de interfaz web

Revisa código de interfaz (HTML, CSS, JSX, TSX) contra un checklist local de pautas de interfaz web: accesibilidad, interacción, rendimiento, layout, tipografía, animación, formularios, navegación y visualización de datos. Emite hallazgos en formato `file:line` con severidad.

Derivada de `web-design-guidelines` (`vercel-labs/agent-skills`, MIT). El skill vendor recupera las pautas desde una URL remota en cada revisión; este homólogo invierte esa dependencia: transporta el checklist inline como prosa local y evalúa sin red. Principio adaptado en limpio, no copia prosa del vendor. [DOC]

## Cuándo usar

- El usuario pide "revisar mi UI", "auditar accesibilidad", "revisar UX", "chequear contra buenas prácticas".
- Hay archivos de frontend (HTML/CSS/JSX/TSX/Vue/Svelte) y se necesita un chequeo estructurado contra pautas de interfaz.
- Se requiere una lista de hallazgos accionable con referencias `file:line` antes de un guard de calidad o de una entrega.
- El alcance es evaluación local: el skill lee archivos, no ejecuta la app ni consulta servicios externos. [CONFIG]

## Cómo

1. **Identificar el alcance.** Solicitar al usuario los archivos o el patrón a revisar. Si no se especifica, pedir el dato bloqueante (R0: no adivinar). Marcar `coverage_gap` si falta la fuente requerida. [CONFIG]
2. **Leer los archivos** del write-set declarado. No ejecutar la aplicación. No invocar servidores de desarrollo.
3. **Aplicar el checklist local** (abajo) por dominio. Cada regla se evalúa contra el código leído. El checklist vive en este archivo — no se descarga, no se cachea desde una URL, no se sincroniza con un repositorio remoto. [CONFIG]
4. **Emitir hallazgos** en formato `file:line: <severidad>: <problema>. <sugerencia>.` Severidades: `BLOCKER`, `MAJOR`, `MINOR`, `NIT`. Sin severidad → no listar.
5. **Cerrar con resumen.** Conteo por severidad, bloqueantes primero, próximos pasos recomendados. Sin pasos de auto-ejecución ni publicación.

### Checklist local de pautas de interfaz web

**Accesibilidad**

- Contraste de color cumple WCAG AA (texto normal ≥ 4.5:1; texto grande ≥ 3:1).
- Todo control interactivo y multimedia es alcanzable por teclado (tab order lógico, focus visible).
- Imágenes con `alt` significativo; imágenes decorativas con `alt=""`.
- Roles ARIA solo donde el HTML semántico no basta; no duplicar semántica nativa.
- `lang` en el documento; jerarquía de encabezados sin saltos (h1 → h2, no h1 → h3).
- Etiquetas asociadas a inputs (`for`/`id` o anidamiento).
- Mensajes de error anunciados a lectores de pantalla (`aria-live`, `role="alert"`).

**Interacción**

- Estados de hover/focus/active definidos y visibles.
- Acciones destructivas requieren confirmación; no se disparan por hover accidental.
- Inputs muestran el tipo correcto (`type="email"`, `type="tel"`, `inputmode`).
- Botones son `<button>`, no `<div onclick>`. Enlaces son `<a href>`.
- Feedback inmediato al accionar (loading/disabled state), sin UI congelada.

**Rendimiento**

- Imágenes con `width`/`height` o `aspect-ratio` para evitar layout shift.
- Imágenes responsive con `srcset`/`sizes` o `<picture>`.
- Sin scripts bloqueantes en el `<head>` sin `defer`/`async`.
- Fuentes con `font-display: swap` o fallbacks; preconnect a orígenes de fuente.
- Evitar transmisión de payloads JS/CSS no usados en la ruta crítica.

**Layout**

- Layout responsive con flujos flex/grid; sin desbordamiento horizontal en viewport mínimo.
- Unidades relativas (`rem`, `clamp`, `%`, `fr`) para escalabilidad; px solo para bordes finos.
- Contenido no se solapa a viewport pequeño; breakpoints coherentes con el sistema de diseño.
- Espaciado consistente con una escala (4/8px o tokens del design system).

**Tipografía**

- Tamaños de texto legibles (base ≥ 16px; móvil ≥ 14px).
- line-height entre 1.4 y 1.6 para texto de párrafo.
- Longitud de línea entre 45 y 75 caracteres para lectura cómoda.
- Sin más de 2 familias tipográficas; pesos limitados y deliberados.

**Animación**

- Animaciones respetan `prefers-reduced-motion` (media query que las desactiva o reduce).
- Duraciones cortas (150–300ms) para microinteracciones; sin animaciones que bloqueen la interacción.
- Transform/opacity como propiedades animadas (no width/top/left que disparan reflow).

**Formularios**

- `autocomplete` apropiado por campo (`name`, `email`, `new-password`).
- Validación client-side con mensajes claros junto al campo.
- `required` solo donde aplica; patrones `pattern` con feedback explicativo.
- Agrupación lógica con `<fieldset>`/`<legend>` cuando proceda.

**Navegación**

- Navegación principal consistente entre rutas; ruta activa identificable.
- Breadcrumbs o jerarquía visible en secciones profundas.
- Enlaces deshabilitados con `aria-disabled` y explicación, no solo `pointer-events:none`.
- Skip-link al contenido principal como primer elemento enfocable.

**Visualización de datos**

- Gráficos con etiquetas de eje, unidades y leyenda legibles.
- Paleta accesible (no solo color para codificar; usar forma/textura/patrón).
- Tooltip o etiqueta de valor accesible por teclado.
- Sin gráficos que ocultan datos clave tras interacción obligatoria no accesible.

## Fail-closed

- NO se invoca ningún CLI externo (ni `npx`, ni binarios del vendor, ni scripts del plugin vendor).
- NO se descargan pautas desde URL. El checklist vive en este archivo. Cualquier `fetch`/`WebFetch`/CLI de red es violación. [CONFIG]
- NO se publica, NO se despliega, NO se abre un navegador, NO se ejecuta la app.
- NO se auto-ejecuta el review sin archivos declarados por el usuario o write-set claro.
- Solo local-evaluation: leer archivos, aplicar checklist, emitir hallazgos. Sin reloj autónomo, sin red, sin efectos secundarios. [CONFIG]

## Validación

```
pnpm verify:skills
```
