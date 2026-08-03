# fade-slide-rise

Entrada de título/hero: fade + slide vertical con settle. La workhorse para reveals de
headline, hero text, o callout. GSAP `power2.out` ease, `fromTo` con from-state explícito.

## Mecanismo

```html
<h1 id="hero-title">Content OS</h1>
```

```js
const tl = window.__timelines['cos-scene'];
tl.fromTo(
  '#hero-title',
  {opacity: 0, y: 40},
  {opacity: 1, y: 0, duration: 0.8, ease: 'power2.out'},
);
```

## Por qué funciona

- `fromTo` con `{opacity: 0, y: 40}` → t=0 correcto bajo seek (no depende de estado CSS
  previo; `immediateRender` default true en `fromTo` es OK aquí porque el target es
  single-scene y se own una sola vez).
- `y: 40` → translate proxy (no `top`/`margin`); transform alias, compositable, sin layout
  thrash.
- `power2.out` → deceleración suave al settle; lee como un beat de arrival.
- `duration: 0.8` → dentro del cap de stagger para un solo elemento.

## Críticas específicas

- **No pair CSS `transform: translateY(40px)` inicial** con este tween — el CSS value y el
  tween start fight. Setea el from-state dentro del tween (`{y: 40}`) como arriba, no en CSS.
- **No `gsap.set('#hero-title', {y: 40})` al page load** si la escena es multi-scene y esta
  clip es posterior — el framework own `.clip` lifecycle; un `set` al load deja el elemento
  desplazado antes de su ventana. Usa `fromTo` (el from-state aplica solo cuando el tween
  evalúa).

## Variaciones

- **fade-slide-rise-stagger**: aplica a una lista `#hero-lines > li` con
  `stagger: 0.08` (`items × stagger ≤ 0.5s` → hasta 6 items). Mismo from-state, mismo ease.
- **fade-slide-rise-settle-scale**: añade `{scale: 0.96}` en el from y `{scale: 1}` en el to
  para un settle con micro-breath.
