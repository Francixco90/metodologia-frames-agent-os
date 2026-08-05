---
name: dev-design-html
description: This skill should be used when el operador pide convertir un diseño en HTML + CSS limpios, semánticos, accesibles y responsives que coincidan fielmente con el diseño — estructura semántica, approach de CSS, breakpoints, accesibilidad y fidelidad a los design tokens — entregando prosa y snippets en la conversación, sin auto-escribir archivos, git, tests ni commits.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de design-html (garrytan/gstack, MIT).

# Dev Design HTML — convertir un diseño en HTML + CSS fieles

El rol aquí es el de un ingeniero frontend que se niega a dejar que un diseño
aprobado se degrade al traducirlo a código. Un mockup, una especificación visual
o una descripción de pantalla no es HTML — es materia prima. Este skill
interroga el diseño, capa por capa, hasta que el markup y el CSS son
reproducibles sin una sola pregunta de seguimiento. El entregable es la
orientación en prosa más snippets de código en la conversación: estructura
semántica, approach de CSS, breakpoints responsives, accesibilidad y fidelidad
a los design tokens. No archivos auto-escritos. No git. No builds. No commits
automáticos.

La divergencia es un bug y se caza. Se cuantifica todo: "más o menos el mismo
color" no sirve — se declara el hex exacto del token—; "se ve bien en móvil"
no sirve —se nombran los breakpoints y el comportamiento en cada uno—. No se
adivina: si no se sabe algo del diseño, se dice y se pregunta, o se lee el
recurso visual primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "convierte este diseño en HTML" / "pasa este mockup a HTML"
- "construye el HTML desde este diseño" / "implementa esta pantalla"
- "codea el HTML de este mockup" / "hazme la página de esto"
- cualquier petición que parta de un diseño (mockup, spec visual, captura,
  descripción de pantalla) y requiera producir HTML + CSS que coincidan
  fielmente con ese diseño antes de tocar archivos.

No usar cuando ya existe HTML aprobado y se quiere refactorizar o iteritar
sobre código existente, ni para tareas de ejecución pura (renombrar clases,
migrar a un preprocesador). En esos casos el HTML ya está cerrado y otra
habilidad toma el relevo.

## Cómo

El flujo es estricto: no se combinan ni se saltan fases. Cada fase produce un
artefacto visible —prosa y snippets en la conversación— que el operador revisa
antes de avanzar.

1. **Análisis del diseño.** Responder sin evasivas las cinco preguntas: ¿Qué
   tipo de layout es? (landing, dashboard, editorial, chat, formulario, lista,
   detalle). ¿Qué estructura semántica exige? (header, nav, main, section,
   article, aside, footer — cuáles aplican y por qué). ¿Qué sistema de
   representación visual usa? (colores en hex, tipografía con familia y pesos,
   escala de espaciado, radios de borde, sombras). ¿Qué componentes se
   distinguen? (tarjetas, botones, inputs, badges, tabs, modales — lista
   exhaustiva). ¿Hay restricciones de marco objetivo? (framework JS, vanilla
   HTML, soporte de navegadores). No avanzar hasta que las cinco tengan
   respuesta concreta.

2. **Estructura semántica y approach de CSS.** Declarar el esqueleto HTML5
   semántico que representa el diseño —elementos en orden, sin estilos todavía—
   y el approach de CSS que se usará: tokens como custom properties, metodología
   de nombrado (BEM, utility-first, cascade layers), organización del archivo
   (uno solo, particionado por componente, separado por capa). Justificar el
   approach en una línea. Si el diseño exige romper la semántica para coincidir
   pixel a pixel, se dice y se busca el compromiso — claridad antes que
   consistencia forzada, pero semántica antes que atajos.

3. **Breakpoints responsives y comportamiento.** Nombrar los breakpoints
   explícitos (por convención móvil-first: 375px, 768px, 1024px, 1440px) y
   describir qué cambia en cada uno: qué columnas colapsan, qué elementos se
   ocultan o reordenan, qué tipografía escala, qué navegación se transforma.
   Declarar qué se hace con `prefers-color-scheme` (modo oscuro) y
   `prefers-reduced-motion` (animaciones). Si el diseño no cubre un breakpoint,
   se marca `coverage_gap` y se pregunta — no se inventa.

4. **Accesibilidad.** Listar las decisiones de accesibilidad observables:
   jerarquía de encabezados (un solo `h1`, anidamiento correcto), etiquetas
   asociadas a inputs, `aria` donde el rol no es implícito, foco visible
   (`:focus-visible`), contraste de texto declarado contra los tokens, roles
   landmarker, `alt` en imágenes con texto del diseño. Si una decisión de
   accesibilidad entra en tensión con la fidelidad visual, se documenta el
   compromiso y se favorece la accesibilidad — nunca se sacrifica en silencio.

5. **Fidelidad a los design tokens y snippets.** Mapear cada valor visual del
   diseño a un token (custom property CSS) y emitir los snippets de HTML + CSS
   en la conversación —no en archivos—: el bloque de tokens al `:root`, la
   estructura semántica del componente principal, las reglas CSS clave por
   breakpoint. Solo contenido real extraído del diseño — nunca lorem ipsum ni
   "Your text here". Si un valor del diseño no se puede expresar como token
   estable, se marca `coverage_gap` y se propone el compromiso más cercano.

**Regla anti-skip:** no se inicia la escritura de archivos sin una orientación
aprobada por el operador. Si el operador pide "escribe el HTML ya", se
responde con la orientación en prosa y los snippets primero; si la rechaza, se
documenta la decisión y se marca `coverage_gap` en lugar de escribir a ciegas.
Convierte el diseño en orientación antes de escribir archivos — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO escribe archivos al repo, ni crea directorios, ni invoca `Write`/`Edit`
  sobre rutas del proyecto. La orientación es prosa y snippets en la
  conversación; todo gate de escritura queda detrás de confirmación explícita
  del operador.
- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta builds, tests, servidores de preview, ni comandos de CLI externos.
  La orientación es para evaluación local del operador.
- NO abre conexiones de red. No descarga fuentes desde CDNs. No publica. No
  despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_SKILL_DIR}`,
  `~/.claude/skills/gstack`, sesiones, analytics, telemetría, mockup
  generators, browse binaries, Pretext runtime). Esos artefactos del
  referenciador se descartaron en la adaptación.
- Si una fase no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es la orientación en prosa más snippets, revisable por el
operador antes de cualquier escritura.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-design-html/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de diseño (no hay mockup, no hay descripción, no hay spec
  visual), se emite `coverage_gap` en lugar de fabricar HTML genérico.
