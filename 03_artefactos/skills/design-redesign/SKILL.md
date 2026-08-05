---
name: design-redesign
description: This skill should be used when the user wants auditar y elevar un proyecto frontend existente a calidad premium sin romper funcionalidad. Cubre secuencia scan-diagnose-fix (leer codebase, auditar patrones genericos, aplicar upgrades dirigidos sobre el stack existente), design audit estructural (tipografia, color y surfaces, layout, interactividad y estados, contenido, patrones de componentes, iconografia, calidad de codigo, omisiones estrategicas), tecnicas de upgrade de alto impacto (tipografia, layout, motion, surfaces) y orden de prioridad de fixes. Trabaja con cualquier framework CSS o vanilla CSS. No para greenfield builds ni migraciones de framework.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Redesign — elevar proyectos existentes a premium

Derivada de `redesign-skill` redesign-existing-projects (leonxlnx/taste-skill, MIT). Adaptacion clean-room al contexto MetodologIA: el homologo opera como un auditor que diagnostica patrones genericos y aplica upgrades dirigidos sobre el stack existente, no reescribe desde cero. No invoca CLI vendor; no publica; no abre red. Solo evaluacion local y direccion de trabajo dentro del marco fail-closed del repositorio.

El output debe elevar lo existente, no reemplazarlo: audit estructural, upgrades de alto impacto, cambios reviewables y enfocados. Sin reescribir frameworks, sin romper funcionalidad.

## Cuándo usar

- El usuario pide mejorar, pulir o elevar un sitio o app frontend existente a calidad premium.
- El usuario quiere auditar un proyecto existente contra patrones genericos de IA y corregirlos.
- El usuario pide upgrades dirigidos sin migrar framework ni reescribir desde cero.
- Un proyecto existente se ve "generico", "barato" o "salido de IA" y debe sentirse premium.
- El usuario quiere priorizar fixes de disenho por impacto visual maximo con riesgo minimo.

## Cómo

1. **Scan antes de tocar.** Leer el codebase. Identificar framework, metodo de styling (Tailwind, vanilla CSS, styled-components, etc.) y patrones de disenho actuales. No actuar sin inspeccionar la superficie y la autoridad visual del proyecto. [DOC]
2. **Diagnose con audit estructural.** Recorrer la auditoria y listar cada patron generico, punto debil y estado faltante encontrado. Categorias: tipografia (fuentes browser default o Inter en todo, headlines sin presencia, body muy ancho, solo Regular/Bold, numeros en proporcional, tracking missing, all-caps sobreusado, orphaned words), color y surfaces (pure #000000, accentos sobresaturados, mas de un acento, warm/cool grays mezclados, estetica purpura-IA gradiente, box-shadow generico, flat zero textura, gradientes perfectos, direccion de luz inconsistente, secciones oscuras random en pagina clara, secciones vacias flat), layout (todo centrado simetrico, tres columnas de card iguales, h-screen en vez de min-h-[100dvh], flexbox percentage math, sin max-width container, cards equal-height forzadas, radius uniforme, sin overlap/depth, padding simetrico optico, sidebar siempre izquierda, whitespace missing, botones no bottom-aligned en card groups, feature lists en Y distinto, ritmo vertical inconsistente, alineacion matematica optica incorrecta), interactividad y estados (sin hover, sin active/pressed, transitions zero duration, sin focus ring, sin loading states, sin empty states, sin error states, dead links, sin indicacion de pagina actual, scroll jumping, animaciones top/left/width/height), contenido (nombres genericos, numeros fake round, placeholder companies, cliches copy IA, signos de exclamacion en success, errores "Oops!", voz pasiva, fechas identicas, mismo avatar, Lorem Ipsum, Title Case en todo), patrones de componentes (card generico border+shadow+white, siempre un filled + un ghost, pills New/Beta, accordion FAQ, carousel 3-card con dots, pricing 3 towers, modales para todo, avatar circles exclusivos, toggle sol/luna, footer link farm 4 col), iconografia (Lucide/Feather exclusivos, rocketship Launch, shield Security, stroke widths inconsistentes, sin favicon, stock team diverse), calidad de codigo (div soup, inline styles, hardcoded pixel widths, alt text missing, z-index arbitrario, dead code comentado, import hallucinations, meta tags missing), omisiones estrategicas (sin legal links, sin back navigation, sin 404 custom, sin form validation, sin skip-to-content, sin cookie consent). [DOC]
3. **Fix con upgrades dirigidos sobre el stack existente.** No reescribir desde cero. Mejorar lo que hay. Trabajar con el tech stack existente; no migrar frameworks ni librerias de styling. No romper funcionalidad existente; testear despues de cada cambio. Antes de importar cualquier libreria nueva, verificar package.json primero; nunca asumir que existe. Si el proyecto usa Tailwind, verificar version (v3 vs v4) antes de modificar config. Si no tiene framework, usar vanilla CSS. Cambios reviewables y enfocados, mejoras pequenhas y dirigidas sobre reescrituras grandes. [DOC]
4. **Aplicar tecnicas de upgrade de alto impacto.** Tipografia: variable font animation (interpolar weight/width en scroll/hover), outlined-to-fill transitions, text mask reveals. Layout: broken grid/asymmetry, whitespace maximization agresiva, parallax card stacks, split-screen scroll. Motion: smooth scroll con inertia, staggered entry (cascade con delays, translate-y + opacity, nunca todo a la vez), spring physics (reemplazar linear easing), scroll-driven reveals (expanding masks, wipes, draw-on SVG paths). Surfaces: true glassmorphism (mas alla de backdrop-filter blur, anadir 1px inner border + inner shadow para edge refraction), spotlight borders (illuminate bajo cursor), grain/noise overlays (fixed pointer-events-none), colored tinted shadows (hue del background). [DOC]
5. **Orden de prioridad de fixes.** Aplicar en este orden para maximo impacto visual con minimo riesgo: 1) Font swap (mayor mejora instantanea, menor riesgo). 2) Color palette cleanup (remover clashing u oversaturados). 3) Hover y active states (hace la interfaz sentir viva). 4) Layout y spacing (grid propio, max-width, padding consistente). 5) Reemplazar componentes genericos (swap patrones cliché por alternativas modernas). 6) Anadir loading, empty y error states (hace sentir finished). 7) Pulir tipografia scale y spacing (el toque final premium). [DOC]
6. **Reglas no negociables.** Trabajar con el stack existente; no migrar frameworks ni librerias de styling. No romper funcionalidad existente; testear despues de cada cambio. Antes de importar libreria nueva, verificar el archivo de dependencias del proyecto primero. Si el proyecto usa Tailwind, verificar version antes de modificar config. Si no tiene framework, usar vanilla CSS. Cambios reviewables y enfocados, mejoras pequenhas y dirigidas sobre reescrituras grandes. [DOC]
7. **Marcar gaps.** Si falta el codebase accesible, el stack confirmado o la autoridad para decidir, marcar `coverage_gap` y escalar antes de editar. Una ausencia no se sustituye por una inferencia pulida. [CONFIG]

## Fail-closed

- NO invocar CLI externo vendor (nada de `npx redesign-skill` ni rutas de scripts vendor).
- NO abrir red ni fetch remoto.
- NO publicar ni activar conectores; n8n permanece en dry-run.
- NO auto-ejecutar comandos del proyecto ni tests sin confirmacion del usuario.
- NO migrar frameworks ni librerias de styling; trabajar con el stack existente.
- NO romper funcionalidad existente; testear despues de cada cambio.
- Solo evaluacion y direccion local dentro del marco del repositorio.

## Validación

```
pnpm verify:skills
```
