---
name: design-high-end-visual
description: This skill should be used when the user wants que una interfaz frontend se sienta como un build de agencia de 150k+ USD, con profundidad haptica, ritmo espacial cinematografico, micro-interacciones obsesivas y motion fluido. Cubre variance mandate (nunca generar el mismo layout dos veces), directiva absolute zero (fuentes/iconos/bordes/sombras/layouts/motion banned), creative variance engine (arquetipos de vibe + layout), haptic micro-aesthetics (double-bezel, button-in-button, ritmo espacial), motion choreography (nav fluida island, hover magnetico, scroll interpolation), performance guardrails y pre-output checklist. No para MVP rapido, dashboards funcionales o UI donde el motion distrae del contenido.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design High End Visual — build de agencia high-end

Derivada de `soft-skill` high-end-visual-design (leonxlnx/taste-skill, MIT). Adaptacion clean-room al contexto MetodologIA: el homologo opera como un arquitecto UI/UX que entrega experiencias con profundidad haptica y motion cinematografico, no websites genericos. No invoca CLI vendor; no publica; no abre red. Solo evaluacion local y direccion de trabajo dentro del marco fail-closed del repositorio.

El output debe sentirse como un build de agencia, no un template con fuentes bonitas: POV claro, variance consciente, craft excepcional. Sin atajos, sin hedging.

## Cuándo usar

- El usuario pide una interfaz que se sienta "premium", "cara", "Awwwards-tier" o "de agencia high-end".
- El usuario quiere profundidad haptica, ritmo espacial cinematografico o micro-interacciones obsesivas.
- El usuario pide variance mandate (que dos outputs consecutivos no se vean iguales).
- Una interfaz existente se ve "barata" o "generica" y debe sentirse cara.
- El usuario quiere motion choreography (nav fluida, hover magnetico, scroll interpolation).

## Cómo

1. **Variance mandate antes de generar.** Nunca generar el mismo layout o estetica dos veces seguidas. Combinar dinamicamente arquetipos premium distintos en cada output, dentro del lenguaje elite Apple-esque/Linear-tier. [DOC]
2. **Directiva absolute zero.** Si el output incluye cualquiera de estos, falla instantaneamente: fuentes banned (Inter, Roboto, Arial, Open Sans, Helvetica como defaults; asumir Geist, Clash Display, PP Editorial New, Plus Jakarta Sans disponibles), iconos banned (Lucide thick-stroke, FontAwesome, Material Icons como defaults; usar lineas ultra-ligeras tipo Phosphor Light, Remix Line), bordes banned (1px solid gray generico), sombras banned (`shadow-md`, `rgba(0,0,0,0.3)` harsh), layouts banned (navbars edge-to-edge pegadas al top, grids simetricos 3-col Bootstrap sin whitespace masivo), motion banned (linear o ease-in-out standard, state changes instant sin interpolation). [DOC]
3. **Creative variance engine.** Antes de escribir codigo, seleccionar UN combinacion de arquetipos basada en el contexto del prompt para asegurar output unico pero siempre premium. Vibe archetypes (Ethereal Glass SaaS/AI, Editorial Luxury lifestyle/real-estate/agency, Soft Structuralism consumer/health/portfolio) y layout archetypes (Asymmetrical Bento, Z-Axis Cascade, Editorial Split). Mobile collapse: cualquier layout asimetrica arriba de md: colapsa a w-full, px-4, py-8 en viewports < 768px. Nunca h-screen; siempre min-h-[100dvh]. [DOC]
4. **Haptic micro-aesthetics.** Double-bezel (doppelrand): nunca colocar card/imagen/container plano sobre el fondo; anidar en shell exterior (background sutil, hairline border, padding p-1.5/p-2, radio grande rounded-[2rem]) + core interior (background propio, highlight inset, radio calc(2rem-0.375rem) para curvas concentricas). Button-in-button: icono trailing nunca desnudo, anidado en wrapper circular propio. Ritmo espacial: macro-whitespace py-24 a py-40, secciones respiran pesado. Eyebrow tags microscopicos pill-shaped antes de H1/H2. [DOC]
5. **Motion choreography.** Nav fluida island (pill flotante desprendida del top mt-6 mx-auto w-max rounded-full; hamburger morph rotate-rotate a X no desaparece; modal expansion backdrop-blur-3xl bg-black/80; staggered mask reveal translate-y-12 opacity-0 a translate-y-0 opacity-100 con delay escalonado). Magnetic button hover (group utility, scale-[0.98] en active, icono interior translate diagonal scale-105). Scroll interpolation (entrada translate-y-16 blur-md opacity-0 a translate-y-0 blur-0 opacity-100 sobre 800ms+; IntersectionObserver o whileInView, nunca window.addEventListener scroll). [DOC]
6. **Performance guardrails.** Animar solo transform y opacity (nunca top/left/width/height). will-change: transform escasamente, solo en elementos animando activamente. backdrop-blur solo en fixed/sticky (navbars, overlays), nunca en contenedores scrolling (repaints continuos matan mobile FPS). Grain/noise overlays solo en fixed pointer-events-none pseudo-elementos. Z-index disciplinado (no z-50 o z-[9999] arbitrarios; reservar para layers sistemticos: sticky nav, modals, overlays, tooltips). [DOC]
7. **Pre-output checklist.** Correr la matriz antes de entregar: cero fonts/icons/borders/shadows/layouts/motion banned de la directiva absolute zero; un Vibe + Layout archetype seleccionado conscientemente; cards usan double-bezel; CTAs usan button-in-button; padding minimo py-24; transitions usan cubic-bezier custom (no linear/ease-in-out); scroll entry animations presentes; layout colapsa < 768px a single-column; animaciones solo transform/opacity; backdrop-blur solo fixed/sticky; impresion overall lee "150k agency build" no "template con fuentes bonitas". [DOC]
8. **Marcar gaps.** Si falta el brief, los assets requeridos o la autoridad para decidir, marcar `coverage_gap` y escalar antes de editar. Una ausencia no se sustituye por una inferencia pulida. [CONFIG]

## Fail-closed

- NO invocar CLI externo vendor (nada de `npx soft-skill` ni rutas de scripts vendor).
- NO abrir red ni fetch remoto.
- NO publicar ni activar conectores; n8n permanece en dry-run.
- NO auto-ejecutar comandos del proyecto sin confirmacion del usuario.
- NO asumir que librerias premium estan instaladas; verificar package.json antes de importar.
- Solo evaluacion y direccion local dentro del marco del repositorio.

## Validación

```
pnpm verify:skills
```
