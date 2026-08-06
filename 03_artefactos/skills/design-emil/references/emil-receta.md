# Design Emil — receta (filosofía, animation framework, springs, componentes, transform, clip-path, gesture, performance, a11y, review)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

## 1. Filosofía rectora

Taste se entrena, no se nace: habilidad de ver mas allá de lo obvio y reconocer
lo que eleva, desarrollada rodeándote de buen trabajo y pensando profundamente
por qué algo se siente bien. Los detalles invisibles se acumulan: la mayoría los
usuarios no los nota conscientemente, ese es el punto; la agregación de corrección
invisible crea interfaces que la gente ama sin saber por qué. Belleza es leverage:
la gente selecciona tools por la experiencia overall, no solo funcionalidad; buenos
defaults y buenas animaciones son diferenciadores reales. [DOC]

## 2. Animation decision framework (en orden)

Antes de escribir cualquier código de animación, responder:

(a) **Debería animar?** Frecuencia 100+/día (atajos keyboard, command palette
toggle) = sin animación nunca; decenas/día (hover, list nav) = remover o reducir
drástica; ocasional (modals, drawers, toasts) = animación standard; raro/primera
vez (onboarding, celebrations) = puede añadir delight. Nunca animar acciones
iniciadas por keyboard.

(b) **Cual es el propósito?** Cada animación debe responder "por qué anima?":
consistencia espacial, indicación de estado, explicación, feedback, prevenir
cambios jarring. Si el propósito es "se ve cool" y el usuario lo verá seguido, no
animar.

(c) **Que easing?** Elemento entra/sale = ease-out (empieza rápido, se siente
responsive); moviendo/morfeando en pantalla = ease-in-out; hover/color change =
ease; constant motion = linear; default = ease-out. Usar curvas custom
(`cubic-bezier(0.23,1,0.32,1)` ease-out fuerte, `cubic-bezier(0.77,0,0.175,1)`
ease-in-out fuerte, `cubic-bezier(0.32,0.72,0,1)` drawer iOS). Nunca ease-in para
UI (empieza lento, se siente sluggish).

(d) **Que velocidad?** Button press 100-160ms, tooltips/popovers pequeños
125-200ms, dropdowns 150-250ms, modals/drawers 200-500ms. Regla: UI animations
bajo 300ms; 180ms se siente mas responsive que 400ms. La percepción de velocidad
importa tanto como la velocidad real: ease-out a 200ms se siente mas rápido que
ease-in a 200ms. [DOC]

## 3. Spring animations

Los springs se sienten mas naturales que animaciones basadas en duración porque
simulan física real, sin duración fija, se asientan por parámetros físicos. Usar
cuando: drag interactions con momentum, elementos que deben sentirse "vivos"
(Dynamic Island), gestos interrumpibles mid-animation, mouse-tracking decorativo.
Configuración Apple (recomendada, mas fácil de razonar): `{type: "spring",
duration: 0.5, bounce: 0.2}`. Tradicional (mas control): `{type: "spring", mass: 1,
stiffness: 100, damping: 10}`. Bounce sutil 0.1-0.3, evitar bounce en la mayoría
de contextos UI. Ventaja interruptibilidad: springs mantienen velocity al
interrumpirse, CSS animations/keyframes restart desde cero. [DOC]

## 4. Principios de componentes

- **Botones** deben sentirse responsive: `transform scale(0.97)` en `:active` con
  `transition transform 160ms ease-out`, scale sutil 0.95-0.98. Nunca animar desde
  `scale(0)`: nada en el mundo real desaparece y reaparece completo; empezar desde
  `scale(0.9)` o mas alto combinado con opacity, como un globo que tiene forma
  visible aún desinflado.
- **Popovers origin-aware**: escalar desde su trigger no desde centro,
  `transform-origin: var(--transform-origin)`; excepción modals (mantienen centro,
  no anclados a trigger).
- **Tooltips**: delay antes de aparecer para prevenir activación accidental, pero
  una vez uno abierto, hover en adyacentes abre instantáneo sin animación (skip
  delay + skip animation).
- **Transiciones sobre keyframes** para UI dinámica: CSS transitions son
  interrumpibles y retargetables mid-animation, keyframes restart desde cero; para
  interacciones rápidas (añadir toasts, toggle states) transitions producen
  resultados mas suaves.
- **Blur para mask transiciones imperfectas**: cuando un crossfade se siente off,
  añadir `filter blur(2px)` durante la transición para bridgear el gap visual;
  combinar con scale-on-press.
- **@starting-style** para animar entry sin JS: la forma moderna de CSS, reemplaza
  el patrón React useEffect setMounted true. [DOC]

## 5. Mastery de CSS transform

- **translateY con porcentajes**: valores porcentuales en `translate()` son
  relativos al tamaño propio del elemento; usar `translateY(100%)` para mover por
  su altura sin importar dimensiones (como Sonner posiciona toasts, Vaul esconde
  drawers).
- **scale() escala children tambien**: a diferencia de width/height, scale escala
  font size, icons, contenido proporcionalmente; feature no bug.
- **3D transforms para depth**: `rotateX`/`rotateY` con
  `transform-style: preserve-3d` crean efectos 3D reales sin JS.
- **transform-origin**: cada elemento tiene un anchor point, default centro;
  setearlo para que coincida con el trigger en interacciones origin-aware. [DOC]

## 6. clip-path para animación

No solo para shapes; herramienta de animación potente.

- **inset shape**: `clip-path inset(top right bottom left)` define región
  rectangular de clipping, cada valor "come" del elemento desde ese lado.
- **Tabs con transición de color perfecta**: duplicar tab list, stylear la copia
  como active, clip la copia para que solo el tab activo sea visible, animar el
  clip en tab change (transición seamless que timing individual nunca logra).
- **Hold-to-delete**: `clip-path inset(0 100% 0 0)` en overlay colorido, en
  `:active` transition a `inset(0 0 0 0)` sobre 2s linear, al soltar snap back
  200ms ease-out, añadir `scale(0.97)`.
- **Image reveals on scroll**: empezar `inset(0 0 100% 0)` hidden desde bottom,
  animar a `inset(0 0 0 0)` al entrar viewport con IntersectionObserver.
- **Comparison sliders**: overlay dos imágenes, clip top con `inset(0 50% 0 0)`,
  ajustar right inset según drag position, hardware-accelerated sin DOM extra. [DOC]

## 7. Gesture y drag

- **Momentum-based dismissal**: no requerir drag past threshold, calcular
  `velocity = abs(dragDistance)/elapsedTime`, si `velocity > ~0.11` dismiss sin
  importar distance; un flick rápido debe bastar.
- **Damping at boundaries**: cuando el usuario drag past el limite natural, aplicar
  damping (mientras mas drag, menos se mueve; las cosas reales no se detienen de
  golpe, frenan primero).
- **Pointer capture**: una vez dragging empieza, set pointer capture para que
  continue aunque el pointer salga de bounds.
- **Multi-touch protection**: ignorar touch points adicionales después del drag
  inicial (sin esto, cambiar de dedo mid-drag causa jump).
- **Friction instead of hard stops**: permitir drag con fricción creciente en vez
  de prevenirlo; se siente mas natural que un muro invisible. [DOC]

## 8. Performance

- **Solo animar transform y opacity**: estas propiedades skip layout y paint,
  corren en GPU; animar padding/margin/height/width dispara los tres rendering
  steps.
- **CSS variables son inheritable**: cambiar var en parent recalcula styles de
  todos los children, caro; en drawer con muchos items, updatear transform
  directamente en el elemento no la variable en container.
- **Framer Motion caveat**: x/y/scale shorthand NO son hardware-accelerated (usan
  rAF en main thread); para acceleration usar el string transform completo
  `"translateX(100px)"`.
- **CSS animations beat JS under load**: CSS corre off main thread, Framer Motion
  (rAF) drop frames cuando browser busy cargando pagina; CSS para predetermined,
  JS para dinámico interruptible.
- **WAAPI para CSS programático**: `element.animate([...], {duration, fill,
  easing})` hardware-accelerated interruptible sin librería. [DOC]

## 9. Accessibility

- **prefers-reduced-motion**: animaciones pueden causar motion sickness; reduced
  motion significa menos y mas gentiles, no cero; mantener opacity y color
  transitions que ayudan comprensión, remover movimiento y posición.
- **Touch device hover states**: gatear hover animations tras
  `@media (hover: hover) and (pointer: fine)`; touch devices trigger hover on tap
  causando false positives. [DOC]

## 10. Review en tabla Before/After/Why

Al revisar UI code, usar markdown table con columnas Before/After/Why, una fila
por issue. Formato: `| Before | After | Why |`. El "Why" explica el reasoning
brevemente. Nunca lista separada con "Before:" y "After:" en líneas distintas. [DOC]