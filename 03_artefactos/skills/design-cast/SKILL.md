---
name: design-cast
description: This skill should be used when the operator requests motion, micro-interaction, or wow-factor polish on an existing UI — casting creative coding across Web (GSAP, Framer Motion, Three.js, CSS), Android (Compose), or Apple (SwiftUI). It runs a seven-stage pipeline (scan stack, evaluate scope, propose interaction thesis, load sub-skills, implement, mini-audit) and delivers prose guidance plus pseudocode for local evaluation only; it never installs dependencies, runs a dev server, or auto-launches build tooling without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# design-cast — Cast creative coding on a UI (motion, micro-interactions, wow-factor)

Derivada de genjutsu/cast/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). El homólogo MetodologIA expone la misma capability — un pipeline de creative coding para inyectar motion, micro-interactions y wow-factor en una UI existente — en voz MetodologIA: prosa terse, imperativa, fail-closed. No copia prosa vendor; adapta el principio. Adapta a Web (GSAP, Framer Motion, Three.js, CSS), Android (Compose) y Apple (SwiftUI). Entrega prose guidance más pseudocode para evaluación local; nunca instala dependencias, levanta dev server ni auto-arranca build tooling sin confirmación del operador.

## Voice

Dos registros. **During execution** — ninja flair ligero, short, immersivo: "Scanning stack...", "Casting parallax on hero scroll.", "Sealing the easing pattern." **In reports / final summaries / audit results** — plain, factual, dev-readable, sin metaphors: "Done. Hero usa GSAP scroll-triggered parallax. Files: Hero.tsx, hero.module.css. LCP: -8%." El flair vive en la intro y la narración de trabajo; cuando un resultado aterriza o una pregunta se hace, el flair desaparece. No "the illusion stabilizes"; solo qué cambió, archivos tocados, próximo paso.

## Iron Rules

1. **Nunca codear sin una interaction thesis validada.** La thesis enmarca todo.
2. **Una pregunta a la vez durante discovery.** Nunca agrupar. Ni "solo dos rápidas" — la segunda depende de la primera.
3. **Rechazar generic/AI slop.** No rainbow gradients, no glassmorphism gratuito, no "modern and sleek" sin sustancia.
4. **Nunca instalar una dependencia sin pedirlo.** Proponer, explicar por qué, esperar el green light del operador.
5. **Matchear complejidad al scope.** Un hover no justifica un pipeline GSAP + ScrollTrigger.
6. **Siempre priorizar performance.** 60fps o nada.
7. **Stack sin animation library detectada** → preferir APIs nativas del stack antes de proponer dependencia.
8. **Animation library detectada** (GSAP, Framer Motion, Lottie, Rive, etc.) → respetar la elección del dev. No proponer reemplazo.
9. **Show, don't just describe.** En el primer gate visual, preguntar cómo el operador quiere verlo, luego mantener ese modo para la sesión. El preview es throwaway — comunica la thesis, nunca se convierte en la implementación.

## Seven-stage pipeline

### 1. SCAN — Detectar el stack

Antes de todo, escanear el proyecto. Mapear:

- **Animation lib**: gsap, framer-motion, three/@react-three, anime.js, o ninguna.
- **Framework**: React, Vue, Svelte, Next.js, Nuxt, Astro, vanilla.
- **CSS**: Tailwind, styled-components, CSS modules, vanilla CSS, vanilla-extract, panda.
- **Nativo Android**: Compose detectado vía gradle dependencies (`androidx.compose`).
- **Nativo Apple**: SwiftUI detectado vía Package.swift / xcodeproj + swift files. Distinguir iOS vs macOS vía Package.swift platforms o pbxproj SDKROOT.
- **Compose Multiplatform**: kotlin-multiplatform plugin + jetbrains.compose plugin.
- **Contexto mobile**: viewport width=device-width, manifest, mobile-only media queries, o iOS/Android nativo.
- **Contexto desktop**: macOS target o sin indicadores mobile en web.
- **Legacy mixed**: presencia de `.xib`, `.storyboard`, layout XML, `setContentView(R.layout.*)`. Mencionar solo, no auto-load.
- **Si nada detectado**: from scratch, todo disponible.

### 2. DISCOVER — Entender el intent (cuando hace falta)

**Skip si** el request es específico y auto-contenido ("add hover scale on this button", "animate this list entry"). Ir directo a SCOPE.

**Usar cuando** el request es vago, abierto, o multifinal ("make this page feel alive", "redo the design of this section"). Una pregunta a la vez, nunca agrupar.

Common domains de pregunta:

- **Mood/feel** — qué emoción debe evocar (snappy, cinemático, lúdico, serio, raw).
- **References** — sitios/páginas/componentes que se sienten bien.
- **Constraints** — performance budget, accesibilidad, browser support.
- **Scope boundaries** — qué entra, qué explícitamente fuera.

Manejo de respuestas vagas ("something modern", "I'll know it when I see it"):

1. Ofrecer opciones concretas ("¿más como Linear, Vercel, o Stripe?").
2. Reframar ("¿qué se sentiría mal?").
3. Nombrar la consecuencia ("esta elección decide CSS-only vs GSAP; vale fijarla").

Nunca interpretar silenciosamente una respuesta vaga como confirmación. Si no estás seguro de lo que quisieron decir, dilo. Parar de preguntar cuando puedas escribir una thesis que el operador aprobaría. Si estarías adivinando la thesis, seguir preguntando.

**Si legacy mixed detectado**: preguntar exactamente una sola pregunta sobre si quedarse en puro Compose/SwiftUI o integrar en pantalla legacy. Si eligen legacy integration: escribir el bridge (`AndroidView` para Compose, `UIViewControllerRepresentable` para SwiftUI) para exponer código moderno dentro de la pantalla legacy. Nunca generar código legacy nuevo (no XML, no XIB, no `setContentView`).

### 3. SCOPE — Evaluar el request

| Scope  | Descripción                        | Sub-skills        | Variants     |
| ------ | ---------------------------------- | ----------------- | ------------ |
| Light  | Componente aislado (hover, toggle) | 1-2 max           | No           |
| Medium | Página o sección (hero, gallery)   | 2-3               | 2-3 variants |
| Full   | App completa o overhaul visual     | Pipeline completo | 2-3 variants |

Regla: nunca artillería pesada para un hover effect.

### 4. THESIS — Una frase antes de codear

Formular una frase que capture la interaction intent. Ejemplos rephraseados:

- "Este dropdown usará 150ms CSS micro-transitions con slide+fade para un feel snappy y moderno."
- "Este hero combinará parallax GSAP en scroll con staggered text reveals para impacto cinematográfico."
- "Esta gallery usará Framer Motion layout animations con shared element transitions para navegación fluida."
- "Este Compose hero usará SharedTransitionLayout con spring(stiffness=Medium, dampingRatio=0.85) para transición fluida card-to-detail."
- "Este SwiftUI tab transition usará matchedGeometryEffect con .smooth spring (response: 0.5, dampingFraction: 0.85) para feel táctil espacial."
- "Este macOS dashboard usará 100ms opacity hover states (sin scale en hover, desktop subtlety) y Cmd+1-9 shortcuts para navegar paneles."
- "Este Android header usará un AGSL shader bound a scrollOffset para un dynamic liquid-glass effect (Android 13+, con static fallback)."

**Este es el primer gate visual.** Ofrecer el preview menu (ver Preview gate abajo), presentar la thesis en el modo elegido, y ESPERAR validación antes de codear. Si rechazan, no reiniciar — preguntar qué se siente mal y ajustar.

### 5. LOAD — Cargar sub-skills relevantes

Cargar siempre la fundación: **motion-principles**. Cargar sub-skills por contexto y por stack detectado:

| Detectado                                        | Cargar                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| Mobile context (web mobile o nativo iOS/Android) | mobile-principles                                                      |
| Desktop context (macOS o web desktop sin mobile) | desktop-principles                                                     |
| Audit explícito o scope=full                     | design-audit                                                           |
| Preguntas UI/UX avanzadas                        | ui-ux-pro-max                                                          |
| gsap                                             | gsap                                                                   |
| framer-motion                                    | framer-motion                                                          |
| Pure CSS / Tailwind / sin lib                    | css-native                                                             |
| three / @react-three                             | threejs-r3f                                                            |
| Canvas / generative                              | canvas-generative                                                      |
| Android Compose                                  | compose-motion (siempre) + compose-graphics (si advanced)              |
| Compose Multiplatform                            | compose-motion + compose-multiplatform + swiftui-motion si iOS interop |
| SwiftUI iOS o macOS                              | swiftui-motion (siempre) + swiftui-graphics (si advanced)              |

**"Advanced thesis" trigger** para compose-graphics / swiftui-graphics: la thesis es advanced si contiene `shader`, `Metal`, `AGSL`, `RuntimeShader`, `MSL`, `liquid-glass`, `glassEffect`, `morphing transition`, `M3 Expressive`, `MotionScheme`, `expressive motion`, `colorEffect`, `distortionEffect`, `layerEffect`, `Canvas` (con contexto generative/particle/flow field), `holographic`, `CRT`, `displacement`, `ripple`. Sino, quedarse en el base motion sub-skill.

### 6. IMPLEMENT — Codear respetando los principios cargados

- **Light scope**: implementación directa, sin variants.
- **Medium/full scope**: proponer 2-3 variants antes de codear.

Formato de variants (inline):

> **Variant A — [Name]** (subtle) — una frase: el feel + la técnica.
>
> **Variant B — [Name]** (balanced) — una frase: el feel + la técnica.
>
> **Variant C — [Name]** (impressive) — una frase: el feel + la técnica.

Si el modo de sesión es artifact o live preview, renderizar las tres variants allí, side by side, con un global trigger que las dispare simultáneamente para que sean comparables, y dejar el texto de arriba como captions. Anunciar el modo en una línea; no reabrir el menú.

Esperar que el operador elija antes de implementar. Siempre respetar la thesis validada. No scope creep — stick a la thesis. No añadir "extra animations while I'm at it".

### 7. AUDIT — Verificación antes de entregar

Antes de entregar, correr los checks del stack detectado.

**All stacks:**

- Reduced motion respetado (CSS `prefers-reduced-motion`, SwiftUI `accessibilityReduceMotion`, o Compose helper con `ANIMATOR_DURATION_SCALE`).
- Exit animations presentes (no abrupt vanishings).
- No layout-property animations (animar transform / opacity / graphicsLayer, no width/height/top/left).
- Focus visible en elementos interactivos.
- Estados relevantes en interactivos (default, hover/press, focus, active, disabled).
- Colors y spacing consistentes con los design tokens detectados.

**Web:**

- Conditional renders con AnimatePresence (o equivalente del framework).
- Contraste >= 4.5:1 para todo texto.
- No forced reflow; `will-change` escaso.
- 60fps target verificado vía Chrome DevTools Performance panel.
- No clickable divs sin role/button.
- `aria-hidden` en animaciones puramente decorativas.
- Responsive en 4 breakpoints: 375px / 768px / 1024px / 1440px.

**Compose:**

- Recomposition counts verificados (Layout Inspector / `Modifier.recomposeHighlighter`).
- No animar `width`/`height` (usar `Modifier.graphicsLayer { translationX/Y, scaleX/Y }`).
- `Modifier.semantics` en custom interactive components.
- Frame timing OK en mid-range device (Pixel 4a baseline) vía Macrobenchmark.

**SwiftUI:**

- No `body` recomputed en irrelevant state changes (`@StateObject`, `@ObservableObject` correctos).
- Hitches Instrument sin dropped frames durante animation.
- `.accessibilityLabel` / `.accessibilityHint` en todas las views interactivas.
- Testeado con Reduce Motion ON y Dynamic Type al 200%.

**macOS (además de SwiftUI):**

- Hover states en todo elemento interactivo.
- Keyboard shortcuts (`Cmd+N`, `Cmd+W`, `Cmd+F`) bound a primary actions.
- Multi-window state shared coherently si aplica.
- Focus rings visibles en keyboard navigation (no `outline: none` sin alternativa).

## Stack detection

La detección de stack corre antes de LOAD. Reglas:

- **Animation lib ya presente** → respetar (Iron Rule 8). No proponer reemplazo.
- **Ausencia de animation lib** → preferir APIs nativas del stack antes de proponer dependencia (Iron Rule 7).
- **Mobile vs desktop web** → distinguir vía viewport, manifest, mobile-only media queries.
- **iOS vs macOS** → distinguir vía Package.swift platforms o pbxproj SDKROOT.
- **Compose Multiplatform** → kotlin-multiplatform plugin + jetbrains.compose plugin.
- **Legacy mixed** → mencionar, no auto-load. Si el operador elige legacy integration, escribir el bridge; nunca generar código legacy nuevo.

## Preview gate

Antes del primer gate visual (la thesis), preguntar una sola vez cómo el operador quiere verlo. Motion y color no sobreviven ser descritos en una frase — aprobar una easing curve que no puedes ver es adivinar, no aprobar.

**El menú** — presentarlo una sola vez, en el primer gate visual, con el default recomendado marcado:

> Antes de mostrarte esto — ¿cómo quieres verlo?
>
> **A. Artifact** — una live page: la easing curve real, las duraciones reales, un elemento haciendo el motion.
> **B. Live preview** — throwaway route en tu proyecto, stack real, tokens reales. Nativo: `@Preview` / `#Preview` scratch.
> **C. Inline** — escrito aquí en la conversación.

**Defaults recomendados** — declararlos en el menú, nunca aplicarlos silenciosamente:

| Situación                                | Default                          |
| ---------------------------------------- | -------------------------------- |
| Scope light (hover, una transición)      | C — inline                       |
| Scope medium/full, web stack             | A — artifact                     |
| Scope medium/full, Compose / SwiftUI     | B — live preview, A como segunda |
| Visual identity o design system completo | A — artifact                     |
| No dev server, o repo no escribible      | A — artifact                     |

**La elección pega para toda la sesión.** En cada gate subsiguiente, anunciar el modo en una línea ("Variants en artifact.") y seguir. No reabrir el menú. El operador cambia diciéndolo — "muéstramelo como texto", "ponlo en artifact", "solo dímelo" — respetarlo inmediatamente; el nuevo modo se vuelve el default de sesión desde entonces.

**Reglas del preview:**

- **Es throwaway.** Nunca se convierte en la implementación. Build lo real desde la thesis validada y los sub-skills cargados, nunca porteando markup del preview. En Compose / SwiftUI, el HTML approxima timing y curve solo, no rendering — decirlo en la página.
- Borrar la live-preview route después de validación, salvo que el operador pida keep.
- Nunca instalar una dependencia para construir un preview.
- Nunca levantar dev server sin pedirlo.
- Solo mostrar valores que están en la thesis. Un número que no está en la thesis no tiene negocio en el preview — sino el preview se vuelve una segunda thesis que nadie validó.

## Fail-closed

- NO CLI externo: no `npx`, no `npm install`, no auto-ejecución de paquetes. Iron Rule 4 — instalar dependencia requiere green light explícito del operador.
- NO red: la skill no hace fetch ni descarga assets; todo es guidance + pseudocode embebido en el deliverable.
- NO publicación: la skill produce specs y pseudocode; no publica ni activa conectores.
- NO auto-ejecución: ejecutar cualquier comando fuera del write-set requiere confirmación explícita del operador. Levantar dev server o build tooling sin confirmación es violación.
- local-evaluation only: la skill evalúa y entrega guidance localmente; sin runtime autónomo, sin reloj autónomo. Si el entorno no permite un fallback observable, marcar coverage_gap. Una ausencia no se sustituye por una inferencia pulida — marca coverage_gap explícito; escalada > asunción.

## Validación

```sh
node skills/design-cast/scripts/check-skill.mjs
pnpm verify:skills
```
