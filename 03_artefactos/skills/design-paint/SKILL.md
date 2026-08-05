---
name: design-paint
description: This skill should be used when the operator requests a complete visual universe built from scratch — art-direction brainstorm, design system generation, implementation, and full audit across Web (Tailwind/CSS), Android (Compose Theme.kt), Apple (SwiftUI Color+App.swift), or Compose Multiplatform (commonMain). It runs a five-phase pipeline (brainstorm, define visual + interaction thesis, generate design system, implement, full audit) and delivers prose guidance plus pseudocode for local evaluation only; it never installs dependencies, runs a dev server, or auto-launches build tooling without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# design-paint — Pintar un universo visual completo desde cero

Derivada de genjutsu/paint/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). El homólogo adapta la doctrina del maestro pintor al contexto MetodologIA: construye un universo visual completo —brainstorm de dirección de arte, sistema de diseño, implementación y auditoría— como prosa técnica + pseudocódigo declarativo para evaluación local. No ejecuta runtime externo, no instala dependencias, no lanza dev server, no publica. El output es consumible por un equipo de diseño o por skills downstream (compose-motion, swiftui-motion, css-native, framer-motion, gsap). [CONFIG]

## Cuándo usar

- El operador pide construir una identidad visual completa desde cero (nuevo producto, rediseño total, nuevo sistema de diseño).
- Se necesita dirección de arte: brainstorm + tesis visual + tesis de interacción + sistema de diseño + implementación + auditoría.
- El alcance es un proyecto entero o una página completa, no un solo componente aislado (eso es `design-cast`).

`design-paint` vs `design-cast`:

|                   | `design-cast`                    | `design-paint`                                  |
| ----------------- | -------------------------------- | ----------------------------------------------- |
| Filosofía         | Hacer hermosa una cosa existente | Construir un universo visual desde cero         |
| Entrada           | Adapta al código existente       | Brainstorm obligatorio, reemplaza diseño previo |
| Descubrimiento    | Ligero, solo si hay ambigüedad   | Brainstorm completo, nunca se omite             |
| Sistema de diseño | Opcional, implícito              | Requerido, genera `MASTER.md`                   |
| Auditoría         | Chequeo rápido antes de entregar | Auditoría completa al final                     |
| Alcance           | Un componente/página/efecto      | Identidad visual del proyecto entero            |

## Voz — dos registros

**Durante la ejecución** — tono breve, inmersivo, firma. Corto.

- "Pintando la paleta…"
- "Asentando los tokens de espaciado."
- "Aplicando la tesis de interacción al hero."

**En reportes / resúmenes finales / resultados de auditoría** — plano, factual, legible por dev. Sin metáforas.

- "Listo. Sistema de diseño generado. Archivos: `MASTER.md`, `theme.config.ts`, `Color+App.swift`. 3 páginas pintadas."
- Sin prosa mística. Solo qué cambió, archivos tocados, próximo paso.

El tono vive en la introducción y durante la narración del trabajo. En cuanto aterriza un resultado o se hace una pregunta, desaparece.

## Iron Rules

1. **Nunca omitir el brainstorm.** Ni siquiera si el operador dice "solo hazlo ver bien". Especialmente entonces. Sin brainstorm no hay tesis válida; sin tesis válida todo lo downstream es invento. Marcar `coverage_gap` si el operador insiste en saltarlo. [CONFIG]
2. **Una pregunta a la vez durante el brainstorm.** Nunca agrupar. La segunda pregunta depende de la primera respuesta.
3. **Nunca proceder sin ambas tesis validadas.** Visual + interacción, ambas aprobadas explícitamente. Una tesis no validada es una suposición; una suposición no es contrato.
4. **Cada token de diseño viene de `MASTER.md`.** Sin números mágicos, sin hex values rogue. Si no hay `MASTER.md` aún, leer los tokens existentes del proyecto primero, no inventar.
5. **Cada animación respeta la tesis de interacción.** Timing, easing, patrones prohibidos — sin excepciones. Si la tesis dice "no bounce", no bounce.
6. **Nunca instalar una dependencia sin preguntar.** El operador confirma antes de cualquier `pnpm add` / `npm install` / gradle dependency.
7. **Página por página, validar página por página.** Nunca intentar todo a la vez.
8. **La auditoría no es opcional.** Phase 5 siempre corre, aunque el operador parezca satisfecho.
9. **Rechazar AI slop.** Sin gradientes genéricos "modernos", sin sombras arbitrarias, sin `border-radius: 8px` por defecto, sin paletas de Tailwind sin justificación. Cada decisión visual debe rastrearse a la tesis.
10. **60fps como piso.** Animar transform / opacity / graphicsLayer, nunca width/height/layout. `will-change` con parsimonia. Sin reflow forzado.
11. **Complejidad al alcance.** Si el alcance es un landing de una página, el sistema de diseño es proporcional — no generar 14 tokens de sombra para un sitio de tres secciones. Si el alcance es un dashboard multi-página, el sistema de diseño es completo.

## Pipeline de cinco fases

### Phase 1 — BRAINSTORM (obligatorio, nunca omitir)

Es la base. Apresurarla hace que todo lo downstream sea incorrecto. El objetivo: entender la visión del operador lo suficiente para escribir dos tesis que aprobaría sin dudar.

**Stack scan (ejecutar antes del brainstorm):** escanear el proyecto para detectar lo que ya existe — framework (React/Vue/Svelte/Next/Astro/vanilla), CSS (Tailwind/styled-components/CSS modules/vanilla), librería de animación (gsap/framer-motion/three/anime.js/none), nativo (Compose vía gradle, SwiftUI vía Package.swift/xcodeproj, CMP vía kotlin-multiplatform). Si nada se detecta: desde cero, todo disponible. [DOC]

**Los cinco dominios a cubrir:**

1. **Producto** — ¿qué es? (app, landing, portfolio, SaaS, e-commerce, blog, dashboard…)
2. **Audiencia** — ¿quién lo usa? (devs, diseñadores, público general, enterprise, kids, lujo…)
3. **Mood** — 3 a 5 adjetivos que definen el sentir visual
4. **Referencias** — sitios, screenshots, mood boards, cualquier cosa visual
5. **Tech stack** — ¿qué hay en su lugar? ¿o desde cero?

**Cómo preguntar:** una pregunta a la vez, empezando por el dominio menos obvio. Si el stack scan ya detectó el tech stack, no preguntar — empezar por mood o audiencia. Cada respuesta reshapea cómo se hace la siguiente pregunta.

**Cómo manejar respuestas vagas** ("modern", "clean", "no sé, hazlo bonito"):

1. Validar — "Es un punto de partida. Hagámoslo preciso."
2. Ofrecer opciones concretas — "¿Clean como el whitespace editorial de Stripe, clean como lo denso-pero-organizado de Linear, o clean como el minimalismo dramático de Apple?"
3. Reframear — "¿Qué se sentiría _mal_? ¿Qué sitios te dan cringe? Eso es igual de útil."
4. Nombrar la consecuencia — "Esta elección guía toda la paleta y la tipografía. Vale un minuto."

**Nunca** interpretar una respuesta vaga como confirmación. "Sí, algo así" significa escarbar más — preguntar qué parte de "eso" resuena.

**Cuando el operador empuja para saltar o apresurar el brainstorm:** no capitular. Decir: "Hemos cubierto [áreas cubiertas]. Aún falta [áreas faltantes], que impactarán directamente [consecuencia concreta]. ¿Quieres que pregunte una más, o prefieres que asuma y luego corriges?" Esto da una elección informada. Si elige suposiciones, nombrar cada suposición explícitamente en la tesis. Nunca negociar el número de preguntas restantes ("solo dos más, lo prometo") — no se sabe cuántas hacen falta hasta escuchar las respuestas. Marcar `coverage_gap` si la información sigue insuficiente. [CONFIG]

**Cuándo parar:** cuando se pueden escribir ambas tesis (visual + interacción) y se apostaría dinero a que el operador diría "perfecto". Si se estaría adivinando en un solo aspecto, seguir preguntando.

### Phase 2 — THESIS (definir dirección, validar)

Desde el brainstorm, producir dos tesis.

**Tesis visual** — una sola oración que captura toda la identidad visual. Debe dirigir explícitamente los cuatro:

- **Color** — dark/light, familia de paleta, accent
- **Tipografía** — serif/sans/mono, uso de peso, contraste de tamaño
- **Espaciado** — denso/airy, sensación de unidad base
- **Componentes** — rounded/sharp, bordered/filled, elevated/flat

Ejemplo: "Interfaz neo-brutalista oscura con monospace bold, acentos chartreuse fluorescentes, whitespace generoso, componentes de bordes crudos con sombras offset."

**Self-check:** leer la tesis. Si falta o es vaga cualquiera de las cuatro áreas, reescribirla antes de presentar.

**Tesis de interacción** — una sola oración que captura el lenguaje de motion e interacción. Debe dirigir explícitamente los cuatro:

- **Timing** — fast (100-200ms), medium (200-400ms), slow (400ms+)
- **Hover behavior** — qué pasa en hover
- **Scroll behavior** — reveals, parallax, o nada
- **Patrones prohibidos** — lo que este proyecto NO hará

Ejemplo: "Transiciones rápidas y secas (100-200ms), hover con scale sutil (1.02), scroll reveals con stagger, no bounce ni elastic — todo ease-out afilado."

**Cross-platform:** la tesis se traduce al lenguaje nativo detectado. Compose: `SharedTransitionLayout` con `spring(stiffness=Spring.StiffnessMedium, dampingRatio=0.85)`. SwiftUI: `matchedGeometryEffect` con `.smooth spring (response: 0.5, dampingFraction: 0.85)`. macOS: 100ms opacity hover, `Cmd+1-9` shortcuts, no scale en hover (sutileza desktop). Android header: AGSL shader bound a scrollOffset con fallback estático abajo de API 33.

**Self-check:** leer la tesis. Si no se pueden derivar inmediatamente las propiedades CSS/JS/Kotlin/Swift de ella, es demasiado vaga. Reescribirla.

**Esperar validación explícita del operador de AMBAS tesis antes de avanzar.** Si el operador objeta, no empezar de cero — preguntar qué se siente mal y ajustar. Marcar `coverage_gap` si la validación no llega. [CONFIG]

### Phase 3 — DESIGN SYSTEM (generar `MASTER.md`)

Generar el sistema de diseño completo basado en ambas tesis. Stack-aware:

- **Web (Tailwind/CSS):** `tailwind.config.js` extendido o `:root { --token: ... }` CSS. Tokens en hex, `cubic-bezier(...)` easings, `rem` spacing.
- **Android Compose:** `Theme.kt`, `Color.kt`, `Type.kt`, `Shapes.kt`, `Motion.kt`. Color en `Color(0xFF...)`, tipografía en `TextStyle`, shapes en `RoundedCornerShape`, motion en `MotionScheme` (M3 Expressive cuando el alcance lo justifique). Spacing en `dp`.
- **SwiftUI (iOS/macOS/multi-target):** `Color+App.swift`, `Font+App.swift`, `Animation+App.swift`, `Shape+App.swift`. Color vía `Color("AssetName")` o `Color(red:green:blue:)`, tipografía vía `Font.system(...)` o `.custom(...)`, animaciones vía `.spring(...)` / `.snappy` / `.bouncy`. Spacing en `CGFloat`.
- **Compose Multiplatform:** tokens en `commonMain` con `expect/actual` para fonts y colores platform-specific. Misma estructura que Compose + sección en `MASTER.md` con desviaciones por plataforma.
- **Multi-stack** (web admin + app nativa): `MASTER.md` con secciones delimitadas por stack, código por stack.

`MASTER.md` es el único archivo fuente de verdad. Los archivos de código (`Theme.kt`, `Color+App.swift`, etc.) son hijos de `MASTER.md` y lo referencian.

**Contenido del sistema de diseño:**

- **Paleta** — primario, secundario, accent, neutros, semánticos (success/warning/error/info). Light + dark si aplica.
- **Tipografía** — font stack, escala de tamaño (fluid o fixed), uso de peso, reglas de line-height.
- **Espaciado** — unidad base, escala (4/8/12/16/24/32/48/64…).
- **Radii** — escala (none/sm/md/lg/full).
- **Sombras** — niveles de elevación (0-4), consistentes con la tesis visual.
- **Componentes base** — button, input, card, badge, link — estilados según las tesis.
- **Motion tokens** — escala de duración (fast/normal/slow), nombres de easing, stagger delay.

**Presentar el sistema de diseño en el modo de preview acordado antes de implementar.** Una paleta y una escala tipográfica listadas como hex y px en un transcript son precisas y completamente irrevisibles. Cada token en `MASTER.md` se aplicará en todas partes, así que este es el lugar más barato de atrapar uno erróneo. Anunciar el modo en una línea, no reabrir el menú. [CONFIG]

### Phase 4 — IMPLEMENT

Cargar sub-skills según stack y tesis de interacción (esto es descripción de capacidad, no ejecución — el homólogo entrega pseudocódigo declarativo, no carga archivos vendor en runtime). [DOC]

Reglas de implementación:

- Página por página o componente por componente — nunca todo a la vez.
- Cada color, font, spacing, shadow, radius viene de `MASTER.md`. Sin números mágicos.
- Cada animación respeta la tesis de interacción (timing, easing, patrones prohibidos).
- Aplicar la regla de 5 estados para elementos interactivos: **default, hover, focus, active, disabled**.
- Pedir validación del operador después de cada página/sección mayor antes de la siguiente.
- Sin ejecutar dev server ni instalar dependencias sin confirmación explícita del operador. fail-closed. [CONFIG]

### Phase 5 — AUDIT (nunca omitir)

Auditoría completa, matching el stack detectado.

**Todos los stacks:**

- [ ] Reduced motion respetado (CSS `prefers-reduced-motion`, SwiftUI `accessibilityReduceMotion`, Compose `areAnimatorsEnabled()` / `Settings.Global.ANIMATOR_DURATION_SCALE`).
- [ ] Exit animations presentes (sin vanish abruptos).
- [ ] No animar layout properties (animar transform / opacity / graphicsLayer).
- [ ] Focus visible en elementos interactivos.
- [ ] Estados interactivos completos (default, hover/press, focus, active, disabled).
- [ ] Colores y spacing consistentes con tokens de `MASTER.md` — sin hex rogue.

**Web:**

- [ ] Conditional renders con `AnimatePresence` (o equivalente del framework).
- [ ] Contraste ≥ 4.5:1 para todo texto.
- [ ] Sin reflow forzado, `will-change` con parsimonia.
- [ ] 60fps verificado (DevTools Performance).
- [ ] Sin divs clickeables sin role/button.
- [ ] `aria-hidden` en animaciones puramente decorativas.
- [ ] Responsive en 4 breakpoints: 375px / 768px / 1024px / 1440px.

**Compose:**

- [ ] Recomposition counts verificados (Layout Inspector / `Modifier.recomposeHighlighter`).
- [ ] Sin animaciones en `width`/`height` (usar `Modifier.graphicsLayer`).
- [ ] `Modifier.semantics` en componentes custom interactivos.
- [ ] Frame timing OK en dispositivo mid-range (baseline Pixel 4a).

**SwiftUI:**

- [ ] Sin `body` recomputado en cambios de estado irrelevantes (`@StateObject`, `@ObservableObject` correctos).
- [ ] Hitches Instrument sin frames dropeados durante animación.
- [ ] `.accessibilityLabel` / `.accessibilityHint` en todas las views interactivas.
- [ ] Testeado con Reduce Motion ON y Dynamic Type a 200%.

**macOS (adicionales a SwiftUI):**

- [ ] Hover states en cada elemento interactivo.
- [ ] Keyboard shortcuts (`Cmd+N`, `Cmd+W`, `Cmd+F`…) en acciones primarias.
- [ ] Multi-window state compartido coherentemente.
- [ ] Focus rings visibles en navegación por teclado.

**Native hitches:**

- [ ] Sin jank en scroll (Compose: sin recomposition excesiva; SwiftUI: sin body recomputado).
- [ ] Sin lag en transiciones (frame timing < 16ms).
- [ ] Sin main-thread blocking (trabajo pesado off-thread).

Presentar hallazgos agrupados por severidad: **Critical > Important > Nice-to-have**. Marcar `coverage_gap` en cualquier área sin verificación posible. La auditoría es fail-closed: un gap bloquea el cierre del paquete, no se infiere que está bien. [CONFIG]

## Protocolo proyecto existente

Cuando se invoca sobre un proyecto que ya tiene diseño/styling:

1. Aún correr el BRAINSTORM completo (Phase 1).
2. Reconocer el diseño existente, pero la tesis lo sobreescribe.
3. En Phase 4, **reemplazar** los tokens/estilos existentes con el nuevo sistema de diseño.
4. Preservar funcionalidad y estructura de layout — solo reemplazar la capa visual.

Esto es intencional: `design-paint` reconstruye el universo visual. Para mejorar lo existente, usar `design-cast`.

## Red flags — estás por violar este skill

| Pensamiento                                                            | Realidad                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| "El operador ya dijo 'minimal dark' — tengo suficiente para una tesis" | Dos palabras no son cinco dominios. Seguir preguntando.                   |
| "Voy a preguntar las cinco a la vez"                                   | Una a la vez. La respuesta de 'audiencia' cambia cómo se pregunta 'mood'. |
| "El operador parece impaciente, vamos a codear"                        | Usar el protocolo de presión. Una tesis mala cuesta días, no minutos.     |
| "Voy a escoger colores que se sientan bien"                            | Cada token viene de `MASTER.md`. Sin freelancing.                         |
| "Voy a hacer todo el sitio de una vez"                                 | Página por página. Validar página por página.                             |
| "Esta animación sería genial aunque la tesis dice no bounce"           | La tesis es ley. ¿Cambiarla? Re-validar con el operador primero.          |
| "La auditoría puede esperar, el operador parece feliz"                 | La auditoría no es opcional. Phase 5 siempre corre.                       |
| "Voy a interpretar 'sí algo así' como un yes"                          | Eso no es confirmación. Preguntar qué parte resuena.                      |
| "Voy a instalar esta lib que me ayudaría"                              | Sin confirmación explícita del operador, no. fail-closed.                 |

## Límites de ejecución

- `execution_scope: local-evaluation`. El homólogo produce prosa + pseudocódigo. No ejecuta build, no lanza dev server, no instala dependencias, no publica. Toda ejecución real es posterior y requiere confirmación del operador. [CONFIG]
- Sin `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` en el pseudocódigo de ejemplo. El motion es declarativo (spring, easing curve, duration), no imperativo con timers. [DOC]
- Sin paths absolutos del filesystem local en el output. El sistema de diseño es portátil. [CONFIG]
- `coverage_gap` marca cualquier área donde la información del operador es insuficiente para producir una tesis válida. No se sustituye por inferencia pulida. [CONFIG]
- `fail-closed`: una validación que no llega bloquea el avance. Una auditoría que no corre bloquea el cierre. No se infiere éxito en silencio. [CONFIG]
