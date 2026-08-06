---
name: design-cast
description: This skill should be used when the operator requests motion, micro-interaction, or wow-factor polish on an existing UI — casting creative coding across Web (GSAP, Framer Motion, Three.js, CSS), Android (Compose), or Apple (SwiftUI). It runs a seven-stage pipeline (scan stack, evaluate scope, propose interaction thesis, load sub-skills, implement, mini-audit) and delivers prose guidance plus pseudocode for local evaluation only; it never installs dependencies, runs a dev server, or auto-launches build tooling without operator confirmation.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# design-cast — Cast creative coding on a UI (motion, micro-interactions, wow-factor)

Derivada de genjutsu/cast/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). Pipeline de
creative coding para inyectar motion, micro-interactions y wow-factor en una UI existente.
Adapta a Web (GSAP, Framer Motion, Three.js, CSS), Android (Compose) y Apple (SwiftUI).
Entrega prose guidance + pseudocode para evaluación local; nunca instala deps, levanta dev
server ni auto-arranca build tooling sin confirmación del operador. [CONFIG]

## Voice

Dos registros. **During execution** — ninja flair ligero, short: "Scanning stack…",
"Casting parallax on hero scroll." **In reports / audit** — plain, factual, sin metáforas:
"Done. Hero usa GSAP scroll-triggered parallax. LCP: -8%." El flair vive en la narración;
cuando un resultado aterriza, desaparece.

## Iron Rules

1. **Nunca codear sin una interaction thesis validada.** La thesis enmarca todo.
2. **Una pregunta a la vez durante discovery.** La segunda depende de la primera.
3. **Rechazar AI slop.** No rainbow gradients ni glassmorphism gratuito ni "modern and
   sleek" sin sustancia.
4. **Nunca instalar una dependencia sin pedirlo.** Proponer + esperar green light.
5. **Matchear complejidad al scope.** Un hover no justifica GSAP + ScrollTrigger.
6. **Siempre priorizar performance.** 60fps o nada.
7. **Stack sin animation lib** → preferir APIs nativas antes de proponer dependencia. **Lib
   detectada** (GSAP, Framer Motion, Lottie, Rive) → respetar la elección del dev; no proponer
   reemplazo.
8. **Show, don't just describe.** En el primer gate visual, preguntar cómo verlo y mantener
   ese modo. El preview es throwaway — comunica la thesis, nunca se convierte en la
   implementación.

## Seven-stage pipeline

### 1. SCAN — Detectar el stack

Escanear el proyecto. Mapear:

- **Animation lib**: gsap, framer-motion, three/@react-three, anime.js, o ninguna.
- **Framework**: React, Vue, Svelte, Next, Nuxt, Astro, vanilla.
- **CSS**: Tailwind, styled-components, CSS modules, vanilla CSS, vanilla-extract, panda.
- **Nativo Android**: Compose vía gradle (`androidx.compose`).
- **Nativo Apple**: SwiftUI vía Package.swift / xcodeproj + swift files. Distinguir iOS vs
  macOS vía Package.swift platforms o pbxproj SDKROOT.
- **Compose Multiplatform**: kotlin-multiplatform + jetbrains.compose plugin.
- **Contexto**: mobile (viewport width=device-width, manifest, mobile-only queries, nativo
  iOS/Android) vs desktop (macOS target o sin indicadores mobile).
- **Legacy mixed**: `.xib`, `.storyboard`, layout XML, `setContentView(R.layout.*)` —
  mencionar, no auto-load. Si nada: from scratch.

### 2. DISCOVER — Entender el intent (cuando hace falta)

**Skip si** el request es específico y auto-contenido ("add hover scale on this button"). Ir
directo a SCOPE. **Usar cuando** es vago, abierto o multifinal ("make this page feel
alive"). Una pregunta a la vez. Dominios: **Mood/feel**, **References** (sitios que se
sienten bien), **Constraints** (perf budget, a11y, browser support), **Scope boundaries**.

Respuestas vagas: ofrecer opciones concretas ("¿Linear, Vercel o Stripe?"), reframar
("¿qué se sentiría mal?"), nombrar consecuencia. Nunca interpretar silencio como
confirmación. Parar cuando puedas escribir una thesis que el operador aprobaría.

**Legacy mixed detectado**: una sola pregunta — puro Compose/SwiftUI o integrar en pantalla
legacy. Si legacy integration: escribir el bridge (`AndroidView` para Compose,
`UIViewControllerRepresentable` para SwiftUI) para exponer código moderno dentro de la
pantalla legacy. Nunca generar código legacy nuevo (no XML, no XIB, no `setContentView`).

### 3. SCOPE — Evaluar el request

| Scope  | Descripción                    | Sub-skills        | Variants     |
| ------ | ------------------------------ | ----------------- | ------------ |
| Light  | Componente aislado (hover)     | 1-2 max           | No           |
| Medium | Página o sección (hero)        | 2-3               | 2-3 variants |
| Full   | App completa o overhaul visual | Pipeline completo | 2-3 variants |

Regla: no artillería pesada para un hover.

### 4. THESIS — Una frase antes de codear

Frases que capturan la interaction intent:

- "Hero combina parallax GSAP en scroll con staggered text reveals para impacto
  cinematográfico."
- "Compose hero usa SharedTransitionLayout con spring(stiffness=Medium, dampingRatio=0.85)
  para transición fluida card-to-detail."
- "SwiftUI tab transition usa matchedGeometryEffect con .smooth spring (response: 0.5,
  dampingFraction: 0.85) para feel táctil espacial."

**Primer gate visual.** Ofrecer el preview menu (ver Preview gate), presentar la thesis en
el modo elegido, y ESPERAR validación antes de codear. Si rechazan, no reiniciar — preguntar
qué se siente mal y ajustar.

### 5. LOAD — Cargar sub-skills relevantes

Siempre la fundación: **motion-principles**. Tabla de routing por contexto y stack, y
advanced thesis trigger para compose-graphics / swiftui-graphics: ver
`references/sub-skill-routing.md`.

### 6. IMPLEMENT — Codear respetando los principios cargados

- **Light scope**: implementación directa, sin variants.
- **Medium/full scope**: proponer 2-3 variants antes de codear.

> **Variant A/B/C — [Name]** (subtle/balanced/impressive) — una frase: el feel + la técnica.

En artifact o live preview, renderizar las tres side by side con un global trigger que las
dispare simultáneamente; texto como captions. Anunciar el modo en una línea; no reabrir el
menú. Esperar elección antes de implementar. Respetar la thesis. No scope creep — no añadir
"extra animations while I'm at it".

### 7. AUDIT — Verificación antes de entregar

Correr los checks del stack detectado (all-stacks + por-stack Web/Compose/SwiftUI/macOS):
ver `references/audit-per-stack.md`.

## Preview gate

Antes del primer gate visual, preguntar una sola vez cómo el operador quiere verlo. Aprobar
una easing curve que no puedes ver es adivinar, no aprobar.

> Antes de mostrarte esto — ¿cómo quieres verlo?
> **A. Artifact** — live page: easing curve y duraciones reales, un elemento en motion.
> **B. Live preview** — throwaway route en tu proyecto, stack y tokens reales. Nativo:
> `@Preview` / `#Preview` scratch.
> **C. Inline** — escrito aquí en la conversación.

Defaults — declararlos, nunca silenciosos: light → C (inline); medium/full web → A
(artifact); medium/full Compose/SwiftUI → B (A como segunda); design system completo → A; no
dev server o repo no escribible → A.

**La elección pega para toda la sesión.** En cada gate subsiguiente, anunciar el modo en
una línea y seguir. No reabrir el menú. El operador cambia diciéndolo — respetarlo; el
nuevo modo se vuelve el default de sesión.

**Reglas del preview:** es throwaway — nunca se convierte en la implementación (build lo
real desde la thesis validada, nunca porteando markup del preview). Borrar la live-preview
route tras validación salvo keep explícito. Nunca instalar una dependencia ni levantar dev
server para un preview. Solo mostrar valores que están en la thesis — un número que no está
en la thesis no tiene negocio en el preview.

## Fail-closed

- NO CLI externo, NO red (no fetch ni descargas), NO publicación, NO auto-ejecución: todo
  comando fuera del write-set requiere confirmación explícita del operador. Levantar dev
  server o build tooling sin confirmación es violación (Iron Rule 4).
- local-evaluation only: sin runtime autónomo, sin reloj autónomo. Si el entorno no permite
  un fallback observable, marcar coverage_gap. Una ausencia no se sustituye por una
  inferencia pulida — marca coverage_gap explícito; escalada > asunción. [CONFIG]

## Validación

```sh
node skills/design-cast/scripts/check-skill.mjs
pnpm verify:skills
```