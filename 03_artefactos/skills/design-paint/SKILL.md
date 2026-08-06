---
name: design-paint
description: This skill should be used when the operator requests a complete visual universe built from scratch — art-direction brainstorm, design system generation, implementation, and full audit across Web (Tailwind/CSS), Android (Compose Theme.kt), Apple (SwiftUI Color+App.swift), or Compose Multiplatform (commonMain). It runs a five-phase pipeline (brainstorm, define visual + interaction thesis, generate design system, implement, full audit) and delivers prose guidance plus pseudocode for local evaluation only; it never installs dependencies, runs a dev server, or auto-launches build tooling without operator confirmation.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# design-paint — Pintar un universo visual completo desde cero

Derivada de genjutsu/paint/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). Construye un
universo visual completo —brainstorm, sistema de diseño, implementación, auditoría— como
prosa + pseudocódigo declarativo para evaluación local. No ejecuta runtime, no instala
deps, no lanza dev server, no publica. Output consumible por equipo de diseño o skills
downstream (compose-motion, swiftui-motion, css-native, framer-motion, gsap). [CONFIG]

`design-cast` = hacer hermosa una cosa existente; `design-paint` = construir un universo
desde cero (brainstorm obligatorio, `MASTER.md` requerido, auditoría completa). Alcance:
proyecto entero o página completa, no un componente aislado (eso es `design-cast`).

## Voz

Durante la ejecución: tono breve, inmersivo, firma ("Pintando la paleta…"). En
reportes/auditoría: plano, factual, sin metáforas. Al aterrizar un resultado, desaparece.

## Iron Rules

1. **Nunca omitir el brainstorm.** Aunque el operador diga "solo hazlo ver bien". Sin
   brainstorm no hay tesis válida; sin tesis todo lo downstream es invento. Marcar
   `coverage_gap` si insiste en saltarlo. [CONFIG]
2. **Una pregunta a la vez durante el brainstorm.** La segunda depende de la primera.
3. **Nunca proceder sin ambas tesis validadas.** Visual + interacción, aprobadas
   explícitamente. Una tesis no validada es suposición; una suposición no es contrato.
4. **Cada token viene de `MASTER.md` y cada animación respeta la tesis de interacción.** Sin
   números mágicos ni hex rogue (si no hay `MASTER.md`, leer tokens existentes primero).
   Timing, easing, patrones prohibidos —sin excepciones. Si la tesis dice "no bounce", no
   bounce.
5. **Nunca instalar una dependencia sin preguntar.** El operador confirma antes de
   cualquier `pnpm add` / `npm install` / gradle dependency.
6. **Página por página, validar página por página.** La auditoría no es opcional (Phase 5
   siempre corre). Rechazar AI slop: sin gradientes genéricos, sombras arbitrarias,
   `border-radius: 8px` por defecto, paletas sin justificación. 60fps piso (transform/opacity/
   graphicsLayer, nunca width/height/layout). Complejidad proporcional al alcance.

## Pipeline de cinco fases

### Phase 1 — BRAINSTORM (obligatorio, nunca omitir)

La base. Apresurarla hace todo lo downstream incorrecto. Objetivo: entender la visión lo
suficiente para escribir dos tesis que el operador aprobaría sin dudar.

**Stack scan (antes del brainstorm):** detectar framework (React/Vue/Svelte/Next/Astro/
vanilla), CSS (Tailwind/styled-components/CSS modules/vanilla), animación
(gsap/framer-motion/three/anime.js/none), nativo (Compose vía gradle, SwiftUI vía
Package.swift/xcodeproj, CMP vía kotlin-multiplatform). Si nada: desde cero. [DOC]

**Cinco dominios:** Producto (¿qué es?), Audiencia (¿quién lo usa?), Mood (3-5 adjetivos),
Referencias (sitios, screenshots, mood boards), Tech stack (¿qué hay?). Preguntar una a la
vez, empezando por el dominio menos obvio (si el stack scan detectó tech stack, empezar
por mood/audiencia). Cada respuesta reshapea la siguiente.

**Respuestas vagas** ("modern", "clean", "hazlo bonito"): validar, ofrecer opciones
concretas (clean como whitespace de Stripe, denso-organizado de Linear, minimalismo de
Apple), reframear ("¿qué se sentiría mal? ¿qué sitios te dan cringe?"). Nunca interpretar
"sí, algo así" como confirmación — escarbar qué parte resuena.

**Operador empuja para saltar:** no capitular. "Cubierto [áreas]. Falta [áreas], impactan
[consecuencia]. ¿Pregunto una más, o asumo y corriges?" Si elige suposiciones, nombrarlas en
la tesis. Marcar `coverage_gap` si la información sigue insuficiente. [CONFIG]

**Cuándo parar:** cuando se pueden escribir ambas tesis y se apostaría a que el operador
diría "perfecto". Si se adivina en algún aspecto, seguir preguntando.

### Phase 2 — THESIS (definir dirección, validar)

**Tesis visual** — una oración que captura toda la identidad visual. Dirige los cuatro:
Color (dark/light, familia, accent), Tipografía (serif/sans/mono, peso, contraste),
Espaciado (denso/airy, unidad base), Componentes (rounded/sharp, bordered/filled,
elevated/flat). Self-check: si falta o es vaga cualquiera, reescribirla.

**Tesis de interacción** — una oración que captura el lenguaje de motion. Dirige los
cuatro: Timing (fast 100-200ms / medium 200-400ms / slow 400ms+), Hover behavior, Scroll
behavior (reveals/parallax/nada), Patrones prohibidos. Self-check: si no se pueden derivar
inmediatamente las propiedades CSS/JS/Kotlin/Swift, es demasiado vaga. Reescribirla.

**Cross-platform:** la tesis se traduce al nativo detectado. Compose:
`SharedTransitionLayout` con `spring(stiffness=Medium, dampingRatio=0.85)`. SwiftUI:
`matchedGeometryEffect` con `.smooth` (response 0.5, dampingFraction 0.85). macOS: 100ms
opacity hover, `Cmd+1-9` shortcuts, no scale en hover. Android: AGSL shader bound a
scrollOffset con fallback estático abajo de API 33.

Esperar validación explícita de AMBAS tesis antes de avanzar. Si objeta, preguntar qué se
siente mal y ajustar (no empezar de cero). Marcar `coverage_gap` si no llega. [CONFIG]

### Phase 3 — DESIGN SYSTEM (generar `MASTER.md`)

Generar el sistema completo basado en ambas tesis. Stack-aware (archivos y tokens por
stack: Web/Compose/SwiftUI/CMP/multi-stack): ver `references/stack-specifics.md` § Design
system files per stack.

`MASTER.md` es el único archivo fuente de verdad; los archivos de código son sus hijos.
Contenido: paleta (primario, secundario, accent, neutros, semánticos, light + dark),
tipografía (font stack, escala, peso, line-height), espaciado (unidad base, escala),
radii, sombras (0-4), componentes base (button, input, card, badge, link), motion tokens
(duración fast/normal/slow, easing, stagger).

Presentar el sistema en el modo de preview acordado antes de implementar. Una paleta y
escala listadas como hex y px son precisas e irrevisibles; este es el lugar más barato de
atrapar un token erróneo. Anunciar el modo en una línea. [CONFIG]

### Phase 4 — IMPLEMENT

Cargar sub-skills según stack y tesis (descripción de capacidad, no ejecución — se entrega
pseudocódigo declarativo, no se cargan archivos vendor en runtime). [DOC] Página por
página o componente por componente. Cada color/font/spacing/shadow/radius viene de
`MASTER.md`. Cada animación respeta la tesis de interacción. Aplicar 5 estados para
interactivos: default, hover, focus, active, disabled. Validar después de cada página/sección
mayor. Sin dev server ni deps sin confirmación explícita. fail-closed. [CONFIG]

### Phase 5 — AUDIT (nunca omitir)

Auditoría completa matching el stack detectado. **Todos los stacks:** reduced motion
respetado (CSS `prefers-reduced-motion`, SwiftUI `accessibilityReduceMotion`, Compose
`areAnimatorsEnabled()`); exit animations presentes; no animar layout
(transform/opacity/graphicsLayer); focus visible; 5 estados completos; colores/spacing
consistentes con `MASTER.md` (sin hex rogue). Checklist por stack (Web/Compose/SwiftUI/
macOS/native hitches): ver `references/stack-specifics.md` § Audit per stack.

Presentar hallazgos por severidad: Critical > Important > Nice-to-have. Marcar
`coverage_gap` en áreas sin verificación posible. La auditoría es fail-closed: un gap
bloquea el cierre, no se infiere que está bien. [CONFIG]

## Protocolo proyecto existente

Sobre un proyecto con diseño/styling previo: (1) correr BRAINSTORM completo; (2) la tesis
sobreescribe el diseño existente; (3) en Phase 4 reemplazar tokens/estilos con el nuevo
sistema; (4) preservar funcionalidad/estructura de layout — solo reemplazar capa visual.
Intencional: `design-paint` reconstruye el universo. Para mejorar lo existente, usar
`design-cast`.

## Límites de ejecución

`execution_scope: local-evaluation`: produce prosa + pseudocódigo. No ejecuta build, no
lanza dev server, no instala deps, no publica. Sin `Math.random`/`Date.now`/`new Date`/
`fetch`/`setTimeout`/`setInterval` en el pseudocódigo (motion declarativo: spring, easing,
duration — no timers). Sin paths absolutos en el output (portátil). `coverage_gap` marca
información insuficiente para una tesis válida — no se sustituye por inferencia pulida.
`fail-closed`: validación que no llega bloquea el avance; auditoría que no corre bloquea
el cierre. No se infiere éxito en silencio. [CONFIG]