---
name: design-minimalist-ui
description: This skill should be used when the user wants interfaces frontend estilo editorial minimalista, tipo workspace premium, con paleta monochrome calida, contraste tipografico fuerte, bento grids flat y acentos pastel muteados. Cubre protocolo utilitario minimalista (rechazo de defaults genericos SaaS), constraints absolutos negativos (fuentes/iconos/sombras/colores/gradientes/rounded-full/emojis/nombres genericos/cliches de copy banned), arquitectura tipografica, paleta warm monochrome + spot pastels, especificaciones de componentes (bento grids, botones, tags, accordions, keystrokes, window chrome), iconografia e imagenes, motion sutil y execution protocol. No para interfaces densas cockpit, dashboards de datos o UI donde el color saturado comunica jerarquia.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Minimalist UI — minimalismo utilitario premium editorial

Derivada de `minimalist-skill` minimalist-ui (leonxlnx/taste-skill, MIT). Adaptacion clean-room al contexto MetodologIA: el homologo opera como un arquitecto UI que genera interfaces document-style ultra-refinadas, no SaaS generico. No invoca CLI vendor; no publica; no abre red. Solo evaluacion local y direccion de trabajo dentro del marco fail-closed del repositorio.

El output debe sentirse como un documento premium, no una landing ruidosa: contraste tipografico obsesivo, whitespace macro estructural, flat deliberado, color como recurso escaso. Sin atajos, sin hedging.

## Cuándo usar

- El usuario pide interfaces "minimalistas", "editoriales", "tipo workspace premium" o "document-style".
- El usuario quiere paleta warm monochrome con acentos pastel muteados (no gradientes, no shadows pesadas).
- El usuario pide bento grids flat con bordes 1px crisp.
- Una interfaz existente se ve saturada/ruidosa y debe destilarse a minimalismo utilitario.
- El usuario quiere contraste tipografico fuerte (sans geometric + serif editorial + mono).

## Cómo

1. **Constraints absolutos negativos.** El output falla si incluye: fuentes Inter/Roboto/Open Sans como defaults; iconos thin-line genericos (Lucide, Feather, Heroicons standard) como defaults; Tailwind shadow-md/lg/xl como defaults (sombras practicamente inexistentes o ultra-difusas opacidad < 0.05); backgrounds primarios coloreados para elementos grandes/secciones (no bright blue/green/red heroes); gradientes, neon, 3D glassmorphism (mas alla de subtle navbar blurs); rounded-full para containers/cards/botones grandes; emojis en codigo/markup/texto/headings/alt; nombres genericos (John Doe, Acme Corp, Lorem Ipsum); cliches de copy IA ("Elevate", "Seamless", "Unleash", "Next-Gen", "Game-changer", "Delve"). Lenguaje plano y especifico. [DOC]
2. **Arquitectura tipografica.** Extreme contraste tipografico y seleccion premium para sentir editorial. Sans-serif primario (body, UI, botones): SF Pro Display, Geist Sans, Helvetica Neue, Switzer, clean geometric/system-native con caracter. Serif editorial (hero headings, quotes): Lyon Text, Newsreader, Playfair Display, Instrument Serif, tracking tight (-0.02em a -0.04em), line-height 1.1. Monospace (code, keystrokes, meta): Geist Mono, SF Mono, JetBrains Mono. Texto body nunca absolute black #000000; off-black/charcoal #111111 o #2F3437 con line-height 1.6. Secundario muted gray #787774. [DOC]
3. **Paleta warm monochrome + spot pastels.** Color es recurso escaso, solo para significado semantico o acentos sutiles. Canvas: pure white #FFFFFF o warm bone/off-white #F7F6F3 / #FBFBFA. Surface primario (cards): #FFFFFF o #F9F9F8. Borders/dividers: ultra-light gray #EAEAEA o rgba(0,0,0,0.06). Acentos: solo pastels altamente desaturados, washed-out, para tags/code backgrounds/icon backgrounds sutiles (pale red #FDEBEC text #9F2F2D, pale blue #E1F3FE text #1F6C9F, pale green #EDF3EC text #346538, pale yellow #FBF3DB text #956400). [DOC]
4. **Especificaciones de componentes.** Bento box feature grids: CSS Grid asimetrica, cards border 1px solid #EAEAEA, radius crisp 8px o 12px max, padding generoso 24px-40px. CTAs primarios: background #111111 text #FFFFFF, radius ligero 4px-6px, sin box-shadow, hover shift a #333333 o micro-scale(0.98). Tags/status badges: pill border-radius 9999px, text-xs uppercase tracking 0.05em, background muted pastel. Accordions FAQ: strip container boxes, separar items solo con border-bottom 1px solid #EAEAEA, icon toggle + y - clean. Keystroke micro-UIs: <kbd> border 1px solid #EAEAEA, radius 4px, background #F7F6F3, monospace. Faux-OS window chrome: container minimalista top bar blanco con 3 circulos gris claro. [DOC]
5. **Iconografia e imagenes.** System icons: Phosphor Bold/Fill o Radix UI Icons, stroke width estandarizado. Illustrations: monochromatic rough continuous-line ink sketches white background, shape geometrico offset con pastel muteado. Photography: desaturated warm tone, overlay opacity 0.04 warm grain, placeholders picsum.photos/seed/{context}/1200/800 si no hay assets reales. Hero/section backgrounds: no vacios planos; background imagery low opacity, radial light spots warm opacity 0.03, o geometric line patterns minimos para depth sin romper el clean aesthetic. [DOC]
6. **Motion sutil.** Invisible, presente pero nunca distractante, sofisticacion quieta no espectaculo. Scroll entry: fade translate-y(12px)+opacity 0 a opacity 1 sobre 600ms cubic-bezier(0.16,1,0.3,1); IntersectionObserver, nunca window.addEventListener scroll. Hover states: cards lift ultra-subtil box-shadow 0 0 0 a 0 2px 8px rgba(0,0,0,0.04) sobre 200ms; botones scale(0.98) en :active. Staggered reveals: cascade delay calc(var(--index)*80ms), nunca todo a la vez. Background ambient motion: opcional un radial gradient blob duracion 20s+ opacidad 0.02-0.04 drifting detras heroes, fixed pointer-events-none layer, nunca en scrolling containers. Performance: solo transform/opacity, nunca top/left/width/height; will-change escaso. [DOC]
7. **Execution protocol.** 1) Establecer macro-whitespace primero (py-24 o py-32 entre secciones). 2) Constrain typography content width max-w-4xl o max-w-5xl. 3) Aplicar jerarquia tipografica y variables monochromaticas inmediatamente. 4) Asegurar que cada card/divider/border adhiere a 1px solid #EAEAEA. 5) Anadir scroll-entry animations a content blocks mayores. 6) Asegurar depth visual via imagery/ambient gradients/textures sutiles, no backgrounds vacios planos. 7) Entregar codigo que refleje el aesthetic editorial nativamente sin ajustes manuales. [DOC]
8. **Marcar gaps.** Si falta el brief, los assets visuales requeridos o la autoridad para decidir, marcar `coverage_gap` y escalar antes de editar. Una ausencia no se sustituye por una inferencia pulida. [CONFIG]

## Fail-closed

- NO invocar CLI externo vendor (nada de `npx minimalist-skill` ni rutas de scripts vendor).
- NO abrir red ni fetch remoto. Picsum-seed solo si el usuario provee assets o aprueba placeholders.
- NO publicar ni activar conectores; n8n permanece en dry-run.
- NO auto-ejecutar comandos del proyecto sin confirmacion del usuario.
- NO usar fuentes/iconos premium sin verificar package.json; declarar fallback si no disponibles.
- Solo evaluacion y direccion local dentro del marco del repositorio.

## Validación

```
pnpm verify:skills
```
