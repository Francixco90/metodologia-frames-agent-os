---
name: design-dna
description: This skill should be used when the operator requests extracting, structuring, or applying visual design identity as machine-readable Design DNA across three dimensions — design system tokens (color, typography, spacing, layout, shape, elevation, motion), design style (mood, visual language, composition, brand voice), and visual effects (Canvas, WebGL, 3D, particles, shaders, scroll effects). It runs a three-phase workflow (structure schema, analyze references into JSON, generate from DNA) and delivers prose guidance plus pseudocode for local evaluation only; it never runs npx, fetches URLs automatically, or auto-launches build tooling without operator confirmation.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design DNA — identidad visual legible por maquina

Derivada de design-dna/SKILL.md (zanwei/design-dna, MIT, commit 9d9d795). Adaptacion clean-room al contexto MetodologIA: arquitecto de identidad visual que extrae, estructura y aplica Design DNA en tres dimensiones, en prosa y pseudocodigo para evaluacion local (fail-closed).

## Las tres dimensiones

Design DNA captura la identidad visual de un producto en tres ejes complementarios. Cada eje responde a una pregunta distinta y se modela con un nivel de precision distinto.

1. **design_system — lo medible.** Tokens exactos (hex/px/rem/ms): color, typography, spacing, layout, shape, elevation, motion, components. Valores, no impresiones.
2. **design_style — lo cualitativo.** Lo sentible no medible con un valor unico: mood, lenguaje visual, composicion, whitespace, ornamentacion, voz de marca, arquetipos de genero (SaaS, editorial, brutalist, luxury). Descripcion estructurada, no numero.
3. **visual_effects — lo que va mas alla de CSS plano.** Canvas, WebGL, 3D, particulas, shaders, scroll animations, cursor effects, SVG, glassmorphism, gradient animations, parallax. Categoria + intensidad + tier de performance; `enabled: false` si no aparece en la referencia.

## Cuatro eventos gobernanados (DDA)

| event_id            | Fase        | Disparador                                                                  |
| ------------------- | ----------- | --------------------------------------------------------------------------- |
| EVT-SKL-DDA-H03-001 | Structure   | El operador pide el esquema completo de las 3 dimensiones                   |
| EVT-SKL-DDA-H03-002 | Analyze     | El operador provee imagenes/screenshots/URL de referencia y pide extraccion |
| EVT-SKL-DDA-H03-003 | Generate    | El operador entrega DNA JSON + contenido y pide generacion                  |
| EVT-SKL-DDA-H03-004 | Combinacion | Cualquier combinacion de las fases anteriores                               |

## Phase 1 — Structure (output the schema)

Cuando el operador pide la estructura o el esquema completo (EVT-SKL-DDA-H03-001):

1. Presentar el esquema completo con descripciones de campo por dimension.
2. Explicar el rol de cada dimension (ver Las tres dimensiones).
3. Preguntar si el operador quiere customizar o extender alguna dimension antes de avanzar a Analyze.
4. No ejecutar nada: esta fase es puramente descriptiva y local.

## Phase 2 — Analyze (extract DNA from references into JSON)

Cuando el operador provee imagenes, screenshots o URLs representando un estilo objetivo (EVT-SKL-DDA-H03-002):

1. Recuperar el esquema de la Phase 1 como lista de campos a poblar.
2. Por cada referencia:
   - Imagen/screenshot: analizar propiedades visuales directamente (color, tipo, densidad, grid, radius, sombras).
   - URL: obtener/recuperar la pagina via herramienta del operador (el homologo NO abre red por si mismo; pide al operador que traiga el contenido o el screenshot). [CONFIG]
3. Por cada campo del esquema, extraer o inferir un valor desde las referencias.
4. Cuando multiples referencias entren en conflicto, anotar el patron dominante y mencionar variantes.
5. Entregar un Design DNA JSON completo — cada campo poblado, sin strings vacios.
6. Tras entregar, preguntar si el operador quiere ajustar valores antes de usar el DNA para generacion.

**Approach de analisis por dimension:**

### Dimension 1 — design_system

- **color**: Extraer paleta dominante por muestreo visual. Primario por dominancia de area, secundario por rol de soporte, acento por uso en CTAs. Mapear escala neutra del background mas claro al texto mas oscuro.
- **typography**: Identificar familias por caracteristicas visuales (geometrica, humanista, serif, mono). Estimar ratios de escala desde la relacion heading/body.
- **spacing**: Evaluar densidad por proximidad de elementos. Medir ritmo por consistencia de gaps entre secciones.
- **layout**: Identificar grid por patrones de alineacion de contenido. Anotar max-width, conteo de columnas, asimetria.
- **shape**: Medir border-radius comparando contra la altura del elemento. Anotar presencia de bordes y divisores.
- **elevation**: Clasificar suavidad de sombra, spread y enfoque de capas.
- **motion**: Si es observable (video/demo interactivo), anotar curvas de easing y sensacion de duracion.

### Dimension 2 — design_style

- Sintetizar impresiones holisticas: mood, personalidad, estrategia de composicion.
- Comparar contra arquetipos de genero (SaaS, editorial, brutalist, luxury, etc.).
- Anotar nivel de ornamentacion y filosofia de whitespace.

### Dimension 3 — visual_effects

- **Desde codigo**: escanear presencia de `<canvas>`, contextos WebGL, imports de Three.js/Pixi.js, GSAP/Lottie, shaders custom, IntersectionObserver para scroll triggers, `<animate>` en SVG.
- **Desde screenshots**: describir efectos visibles que van mas alla de CSS estandar — particulas brillantes, renders 3D, texturas de ruido, gradientes animados, parallax, cursor trails, distorsiones de texto, superficies glassmorficas. Anotar en `composite_notes` cuando la implementacion exacta no pueda determinarse.
- **Desde video/demos**: anotar comportamientos de scroll, distorsiones en hover, coreografia de transiciones, secuencias de loading.
- Marcar `enabled: false` para cualquier categoria de efecto no presente en la referencia.
- Calificar `overview.effect_intensity` y `overview.performance_tier` segun lo observado.

## Phase 3 — Generate (apply DNA to content)

Cuando el operador entrega DNA JSON + contenido a disenar (EVT-SKL-DDA-H03-003):

1. Parsear el DNA JSON y extraer todos los tokens de las tres dimensiones.
2. Construir CSS custom properties desde los valores de `design_system`.
3. Aplicar los campos cualitativos de `design_style` para guiar decisiones subjetivas de diseno.
4. Cuando el diseno necesite assets o materiales fuente, recuperarlos desde la fuente original via herramienta del operador (el homologo NO abre red por si mismo). Si el operador provee una URL, pedir que traiga el asset real en lugar de recrearlo o aproximarlo.
5. Implementar `visual_effects` con la tecnologia apropiada (pseudocodigo, no ejecucion):
   - Efectos ligeros → animaciones CSS, SVG, JS vanilla.
   - Efectos medios → Canvas 2D, GSAP, Lottie.
   - Efectos pesados → Three.js, shaders GLSL custom, Pixi.js.
6. Entregar el output de diseno (por defecto: HTML self-contained con CSS/JS inline como pseudocodigo para evaluacion local).
7. Ejecutar quality checks de la guia de generacion.

Si el operador provee solo contenido sin DNA JSON, preguntar si:

- Analizar una referencia primero (volver a Phase 2).
- Usar un estilo descrito (extraer DNA desde la descripcion, luego generar).

## Fail-closed

- NO invocar CLI externo vendor (nada de `npx skills add` ni rutas de scripts vendor).
- NO abrir red ni recuperar URLs remotas por si mismo; pedir al operador que traiga el contenido.
- NO auto-ejecutar Node, build tooling ni pipelines sin confirmacion del operador.
- NO publicar ni activar conectores; n8n permanece en dry-run.
- NO generar assets sinteticos como sustitutos de assets reales sin permiso.
- Solo evaluacion y direccion local dentro del marco del repositorio.

## coverage_gap y escalada

- Si falta la referencia requerida, la imagen, la URL aportada por el operador o la autoridad para decidir, marcar `coverage_gap` y escalar antes de editar.
- Una ausencia no se sustituye por una inferencia pulida. Escalada > asuncion. [CONFIG]
- Si el runtime de analisis de imagenes no esta disponible en el entorno local, marcar `coverage_gap` explicito y entregar solo el esquema + guia en prosa, sin pretender extraccion que no puede validarse.

## Validacion

```
node skills/design-dna/scripts/check-skill.mjs
```
