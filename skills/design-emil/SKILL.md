---
name: design-emil
description: This skill should be used when the user wants pulir componentes frontend, decidir animaciones con criterio de ingenieria de disenho y atender los detalles invisibles que hacen que una interfaz se sienta bien. Cubre filosofia de design engineering (taste se entrena no se nace, detalles invisibles se acumulan, belleza es leverage), animation decision framework (deberia animar? proposito? easing? velocidad?), spring animations, principios de componentes (botones responsivos, nunca scale(0), popovers origin-aware, tooltips skip delay, transiciones sobre keyframes, blur para mask), mastery de CSS transform y clip-path, gesture/drag, performance (solo transform/opacity), accessibility reduced-motion y review checklist en tabla Before/After/Why. No para architecture decisions, backend o diseno visual desde cero.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Emil — ingenieria de disenho y detalles invisibles

Derivada de `emil-design-eng` (emilkowalski/skills, MIT). Adaptacion clean-room al contexto MetodologIA: el homologo opera como un design engineer con sensibilidad de craft que construye interfaces donde cada detalle se acumula en algo que se siente bien. No invoca CLI vendor; no publica; no abre red. Solo evaluacion local y direccion de trabajo dentro del marco fail-closed del repositorio.

En un mundo donde el software de todos es suficientemente bueno, el taste es el diferenciador. Los detalles invisibles se acumulan en interfaces que la gente ama sin saber por que.

## Cuándo usar

- El usuario pide pulir componentes frontend existentes (botones, popovers, tooltips, toasts, drawers, modals).
- El usuario quiere decidir si una animacion deberia existir, con que easing y velocidad.
- El usuario pide review de UI code en formato Before/After/Why.
- El usuario quiere dominar CSS transform, clip-path o gesture/drag.
- El usuario pide spring animations o motion basado en fisica.
- Una interfaz se siente "casi bien" pero le faltan los detalles invisibles.

## Cómo

1. **Filosofia rectora.** Taste se entrena, no se nace: habilidad de ver mas alla de lo obvio y reconocer lo que eleva, desarrollada rodeandose de buen trabajo y pensando profundamente por que algo se siente bien. Los detalles invisibles se acumulan: la mayoria los usuarios no los nota conscientemente, ese es el punto; la agregacion de correccion invisible crea interfaces que la gente ama sin saber por que. Belleza es leverage: la gente selecciona tools por la experiencia overall, no solo funcionalidad; buenos defaults y buenas animaciones son diferenciadores reales. [DOC]
2. **Animation decision framework (en orden).** Antes de escribir cualquier codigo de animacion, responder: (a) Deberia animar? Frecuencia 100+/dia (atajos keyboard, command palette toggle) = sin animacion nunca; decenas/dia (hover, list nav) = remover o reducir drastica; ocasional (modals, drawers, toasts) = animacion standard; raro/primera vez (onboarding, celebrations) = puede anadir delight. Nunca animar acciones iniciadas por keyboard. (b) Cual es el proposito? Cada animacion debe responder "por que anima?": consistencia espacial, indicacion de estado, explicacion, feedback, prevenir cambios jarring. Si el proposito es "se ve cool" y el usuario lo vera seguido, no animar. (c) Que easing? Elemento entra/sale = ease-out (empieza rapido, se siente responsive); moviendo/morfeando en pantalla = ease-in-out; hover/color change = ease; constant motion = linear; default = ease-out. Usar curvas custom (cubic-bezier(0.23,1,0.32,1) ease-out fuerte, cubic-bezier(0.77,0,0.175,1) ease-in-out fuerte, cubic-bezier(0.32,0.72,0,1) drawer iOS). Nunca ease-in para UI (empieza lento, se siente sluggish). (d) Que velocidad? Button press 100-160ms, tooltips/popovers pequenhos 125-200ms, dropdowns 150-250ms, modals/drawers 200-500ms. Regla: UI animations bajo 300ms; 180ms se siente mas responsive que 400ms. La percepcion de velocidad importa tanto como la velocidad real: ease-out a 200ms se siente mas rapido que ease-in a 200ms. [DOC]
3. **Spring animations.** Los springs se sienten mas naturales que animaciones basadas en duracion porque simulan fisica real, sin duracion fija, se asientan por parametros fisicos. Usar cuando: drag interactions con momentum, elementos que deben sentirse "vivos" (Dynamic Island), gestos interrumpibles mid-animation, mouse-tracking decorativo. Configuracion Apple (recomendada, mas facil de razonar): {type: "spring", duration: 0.5, bounce: 0.2}. Tradicional (mas control): {type: "spring", mass: 1, stiffness: 100, damping: 10}. Bounce sutil 0.1-0.3, evitar bounce en la mayoria de contextos UI. Ventaja interruptibilidad: springs mantienen velocity al interrumpirse, CSS animations/keyframes restart desde cero. [DOC]
4. **Principios de componentes.** Botones deben sentirse responsive: transform scale(0.97) en :active con transition transform 160ms ease-out, scale sutil 0.95-0.98. Nunca animar desde scale(0): nada en el mundo real desaparece y reaparece completo; empezar desde scale(0.9) o mas alto combinado con opacity, como un globo que tiene forma visible aun desinflado. Popovers origin-aware: escalar desde su trigger no desde centro, transform-origin var(--transform-origin); excepcion modals (mantienen centro, no anclados a trigger). Tooltips: delay antes de aparecer para prevenir activacion accidental, pero una vez uno abierto, hover en adyacentes abre instantaneo sin animacion (skip delay + skip animation). Transiciones sobre keyframes para UI dinamica: CSS transitions son interrumpibles y retargetables mid-animation, keyframes restart desde cero; para interacciones rapidas (anadir toasts, toggle states) transitions producen resultados mas suaves. Blur para mask transiciones imperfectas: cuando un crossfade se siente off, anadir filter blur(2px) durante la transicion para bridgear el gap visual; combinar con scale-on-press. @starting-style para animar entry sin JS: la forma moderna de CSS, reemplaza el patron React useEffect setMounted true. [DOC]
5. **Mastery de CSS transform.** translateY con porcentajes: valores porcentuales en translate() son relativos al tamanho propio del elemento; usar translateY(100%) para mover por su altura sin importar dimensiones (como Sonner posiciona toasts, Vaul esconde drawers). scale() escala children tambien: a diferencia de width/height, scale escala font size, icons, contenido proporcionalmente; feature no bug. 3D transforms para depth: rotateX/rotateY con transform-style: preserve-3d crean efectos 3D reales sin JS. transform-origin: cada elemento tiene un anchor point, default centro; setearlo para que coincida con el trigger en interacciones origin-aware. [DOC]
6. **clip-path para animacion.** No solo para shapes; herramienta de animacion potente. inset shape: clip-path inset(top right bottom left) define region rectangular de clipping, cada valor "come" del elemento desde ese lado. Tabs con transicion de color perfecta: duplicar tab list, stylear la copia como active, clip la copia para que solo el tab activo sea visible, animar el clip en tab change (transicion seamless que timing individual nunca logra). Hold-to-delete: clip-path inset(0 100% 0 0) en overlay colorido, en :active transition a inset(0 0 0 0) sobre 2s linear, al soltar snap back 200ms ease-out, anadir scale(0.97). Image reveals on scroll: empezar inset(0 0 100% 0) hidden desde bottom, animar a inset(0 0 0 0) al entrar viewport con IntersectionObserver. Comparison sliders: overlay dos imagenes, clip top con inset(0 50% 0 0), ajustar right inset segun drag position, hardware-accelerated sin DOM extra. [DOC]
7. **Gesture y drag.** Momentum-based dismissal: no requerir drag past threshold, calcular velocity = abs(dragDistance)/elapsedTime, si velocity > ~0.11 dismiss sin importar distance; un flick rapido debe bastar. Damping at boundaries: cuando el usuario drag past el limite natural, aplicar damping (mientras mas drag, menos se mueve; las cosas reales no se detienen de golpe, frenan primero). Pointer capture: una vez dragging empieza, set pointer capture para que continue aunque el pointer salga de bounds. Multi-touch protection: ignorar touch points adicionales despues del drag inicial (sin esto, cambiar de dedo mid-drag causa jump). Friction instead of hard stops: permitir drag con friccion creciente en vez de prevenirlo; se siente mas natural que un muro invisible. [DOC]
8. **Performance.** Solo animar transform y opacity: estas propiedades skip layout y paint, corren en GPU; animar padding/margin/height/width dispara los tres rendering steps. CSS variables son inheritable: cambiar var en parent recalcula styles de todos los children, caro; en drawer con muchos items, updatear transform directamente en el elemento no la variable en container. Framer Motion caveat: x/y/scale shorthand NO son hardware-accelerated (usan rAF en main thread); para acceleration usar el string transform completo "translateX(100px)". CSS animations beat JS under load: CSS corre off main thread, Framer Motion (rAF) drop frames cuando browser busy cargando pagina; CSS para predetermined, JS para dinamico interruptible. WAAPI para CSS programatico: element.animate([...], {duration, fill, easing}) hardware-accelerated interruptible sin libreria. [DOC]
9. **Accessibility.** prefers-reduced-motion: animaciones pueden causar motion sickness; reduced motion significa menos y mas gentiles, no cero; mantener opacity y color transitions que ayudan comprension, remover movimiento y posicion. Touch device hover states: gatear hover animations tras @media (hover: hover) and (pointer: fine); touch devices trigger hover on tap causando false positives. [DOC]
10. **Review en tabla Before/After/Why.** Al revisar UI code, usar markdown table con columnas Before/After/Why, una fila por issue. Formato: | Before | After | Why |. El "Why" explica el reasoning brevemente. Nunca lista separada con "Before:" y "After:" en lineas distintas. [DOC]
11. **Marcar gaps.** Si falta el codebase accesible, los componentes a pulir o la autoridad para decidir, marcar `coverage_gap` y escalar antes de editar. Una ausencia no se sustituye por una inferencia pulida. [CONFIG]

## Fail-closed

- NO invocar CLI externo vendor (nada de `npx emil-design-eng` ni rutas de scripts vendor).
- NO abrir red ni fetch remoto.
- NO publicar ni activar conectores; n8n permanece en dry-run.
- NO auto-ejecutar comandos del proyecto sin confirmacion del usuario.
- NO asumir librerias (Framer Motion, etc.) sin verificar package.json primero.
- Solo evaluacion y direccion local dentro del marco del repositorio.

## Validación

```
pnpm verify:skills
```
