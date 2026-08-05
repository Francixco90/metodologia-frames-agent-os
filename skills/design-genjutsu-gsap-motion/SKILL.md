---
name: design-genjutsu-gsap-motion
description: This skill should be used when the operator requests GSAP animation guidance — timeline sequencing, ScrollTrigger scroll-driven motion, SplitText or MorphSVG plugins, stagger distribution, or useGSAP React integration with scope and auto-cleanup. It delivers prose guidance and pseudocode snippets for local evaluation only; it never installs gsap, runs a dev server, or auto-launches build tooling.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Genjutsu GSAP Motion — guia de animacion GSAP (evaluacion local)

Derivada de genjutsu/_jutsu/gsap/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f). Adaptacion clean-room al contexto MetodologIA: el homologo describe la capability de animacion GSAP y entrega guia en prosa + snippets de pseudocodigo para evaluacion local. No auto-instala gsap, no corre dev server, no auto-lanza build tooling. No publica; n8n dry-run. Solo evaluacion local y direccion de trabajo dentro del marco fail-closed del repositorio.

Esta skill es una herramienta fail-closed: describe QUE hace GSAP, COMO secuenciar timeline/scroll/stagger, y entrega pseudocodigo rhyming para que el operador lo evalue localmente. Una ausencia de confirmacion no se sustituye por una auto-ejecucion pulida.

## Cuando usar GSAP

| Criterio              | CSS Transitions | Framer Motion | GSAP          |
| --------------------- | --------------- | ------------- | ------------- |
| Hover / toggle simple | Si              | Si            | Excesivo      |
| Timeline secuenciado  | No              | Limitado      | Si            |
| Scroll-driven         | scroll-timeline | Limitado      | ScrollTrigger |
| Stagger complejo      | No              | Basico        | Distribution  |
| Perf movil (60fps)    | Bueno           | Promedio      | Excelente     |
| Split de texto        | No              | No            | SplitText     |
| Morph / draw SVG      | No              | No            | MorphSVG      |

Regla: si la animacion necesita timeline, scroll-link o stagger distribuido, usar GSAP. En caso contrario, CSS primero. [DOC]

## Setup (registerPlugin)

Registrar plugins GSAP al nivel superior del modulo, una sola vez. El pseudocodigo rhyming:

```js
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {SplitText} from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);
```

En React, preferir `useGSAP()` del paquete `@gsap/react` en lugar de `useEffect` con cleanup manual: provee scope y auto-cleanup (revert automatico). [DOC]

## Core — to / from / fromTo y timeline defaults{}

- `gsap.to(target, vars)`: anima desde el estado actual hacia `vars`.
- `gsap.from(target, vars)`: anima desde `vars` hacia el estado actual (cuidado con `immediateRender`).
- `gsap.fromTo(target, fromVars, toVars)`: control total de origen y destino.
- `gsap.timeline({defaults: {...}})`: setea defaults (duration, ease) para toda la cadena, evita repeticion.

```js
const tl = gsap.timeline({
  defaults: {duration: 0.8, ease: 'power2.out'},
});
tl.to('.a', {y: -20}).to('.b', {y: -20}, '<0.1').to('.c', {y: -20}, '<0.1');
```

Para control completo del origen, usar `fromTo`:

```js
gsap.fromTo('.card', {y: 40, opacity: 0}, {y: 0, opacity: 1, stagger: 0.15});
```

### Stagger con distribution

Stagger admite configuracion avanzada: `each`, `from` (start | end | center | edges | index), `grid` (auto-detect), `axis` (x | y | null).

```js
gsap.to('.grid-item', {
  scale: 0,
  stagger: {each: 0.05, from: 'center', grid: 'auto', axis: 'x'},
});
```

## ScrollTrigger — scroll-driven motion

ScrollTrigger vincula animaciones GSAP al scroll del documento. Patrones clave:

- **Pin + scrub**: fija un contenedor y mapea el progreso de scroll al progreso de la animacion. Usar `ease: 'none'` en el tween padre cuando se combina con `containerAnimation`; un ease en el padre rompe el mapeo de scroll. [DOC]
- **Batch**: revela masivamente elementos que entran al viewport con `ScrollTrigger.batch`.
- **containerAnimation**: vincula un ScrollTrigger de un elemento interior al scroll tween horizontal del contenedor padre. Un solo ScrollTrigger por timeline, o tweens standalone; no anidar ScrollTrigger en child tweens de un timeline que ya tiene su propio ScrollTrigger (se ignora). [DOC]

```js
// Pin + scrub
gsap.to('.panel', {
  x: '-300%',
  ease: 'none',
  scrollTrigger: {trigger: '.container', pin: true, scrub: 1},
});
```

### Errores criticos a evitar

1. **Ease en containerAnimation**: siempre `ease: 'none'` en el tween padre del scroll horizontal; un ease rompe el mapeo. [DOC]
2. **ScrollTrigger en child tween de un timeline con ScrollTrigger**: se ignora. Usar un ScrollTrigger por timeline, o tweens standalone. [DOC]
3. **setState en onUpdate**: mutar un ref o DOM directamente en lugar de setState 60x/s (re-render hell); preferir `gsap.quickSetter`. [DOC]
4. **immediateRender en from() dentro de timeline**: `from()` tiene `immediateRender: true` por defecto; si sigue a otro tween, deshabilitar `immediateRender: false` para no saltar al inicio. [DOC]
5. **Animar propiedades no-transform**: width/height/top/left disparan layout reflow; preferir transforms (scaleX, scaleY) GPU-composited; si se necesita tamano real, usar el plugin Flip para transicion de layout. [DOC]

## Plugins — SplitText y MorphSVG

- **SplitText**: divide texto en lineas, palabras y caracteres para animarlos individualmente con stagger.
- **MorphSVG**: interpola paths SVG entre formas (morph / draw).
- Otros plugins del ecosistema: Flip (transicion de layout), DrawSVG, MotionPath, Observer.

## React — useGSAP con scope y auto-cleanup

`useGSAP()` del paquete `@gsap/react` reemplaza `useEffect` + cleanup manual. Provee `scope` (limita selectores a un contenedor ref) y auto-cleanup (revert automatico de tweens/ScrollTriggers al desmontar). [DOC]

```jsx
import {useGSAP} from '@gsap/react';

useGSAP(
  () => {
    gsap.to('.box', {x: 200});
  },
  {scope: containerRef},
); // auto-cleanup, auto-revert
```

## Fail-closed

- NO auto-instalar gsap ni `@gsap/react` (nada de `npm install gsap`) sin confirmacion explicita del usuario.
- NO correr dev server, build tooling ni auto-lanzar tooling del proyecto sin confirmacion.
- NO abrir red ni fetch remoto automaticamente.
- NO publicar ni activar conectores; n8n permanece en dry-run.
- NO ejecutar snippets: el pseudocodigo es para evaluacion local del operador, no para auto-ejecucion.
- NO claim que la animacion es definitiva sin review humano: `RENDERED_DRAFT != FINAL != HUMAN_APPROVED`.
- Solo guia en prosa y pseudocodigo rhyming para evaluacion local tras confirmacion dentro del marco del repositorio.

## Marcar gaps

Si falta el runtime GSAP local disponible, el plugin requerido, el scope de React o la confirmacion del usuario para ejecutar, marcar `coverage_gap` y escalar antes de ejecutar. Una ausencia no se sustituye por una auto-ejecucion pulida. [CONFIG]

## Validacion

```
pnpm verify:skills
```
