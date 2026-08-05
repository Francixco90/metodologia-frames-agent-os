---
name: design-css-native
description: This skill should be used when the user requests zero-dependency CSS animations or visual techniques — scroll-driven reveals, View Transitions, @starting-style enter from display:none, anchor positioning, container queries, clip-path transitions, glass/mesh/conic gradients — and the deliverable must stay inside CSS without pulling external libraries. It produces production-ready CSS snippets plus an @supports fallback strategy, evaluated locally with no network or CLI.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# CSS Native — Animaciones y técnicas visuales sin dependencias

Derivada de css-native (AThevon/genjutsu, MIT). El homólogo MetodologIA expone la misma capability — animaciones y visuales sin dependencias — en voz MetodologIA: prosa terse, imperativa, fail-closed. No copia prosa vendor; adapta el principio. La skill describe técnicas CSS modernas para que el agente las aplique en deliverables de contenido (HTML/markdown/brand) sin invocar tooling externo ni publicar.

## Cuándo usar

- Scroll-driven: barra de progreso de scroll, reveals al entrar viewport, parallax ligero.
- View Transitions: paso entre estados en el mismo documento (SPA) y entre documentos (MPA).
- `@starting-style`: entrar animado desde `display: none` (diálogos, popovers, toasts) sin JS de timing.
- Anchor positioning: tooltips y popovers fijos relativos a un trigger, sin librería de floating UI.
- Container queries: animaciones que responden al contenedor, no al viewport.
- `clip-path` / `backdrop-filter` / `mix-blend-mode` / mesh gradients / conic-gradient: visuales sin assets.
- El deliverable debe quedar en CSS plano; el entorno es fail-closed (sin red, sin CLI).

| Situación                                          | Decisión                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| < 3 animaciones en la página                       | CSS nativo                                                             |
| Reveal/parallax ligado a scroll                    | CSS nativo (`animation-timeline`)                                      |
| Entrar/salir desde `display: none`                 | CSS nativo (`@starting-style` + `transition-behavior: allow-discrete`) |
| Tooltip/popover posicionado                        | CSS nativo (anchor positioning)                                        |
| Transición de página MPA o SPA                     | CSS nativo (View Transitions API)                                      |
| Timeline multi-paso (5+ tweens coordinados)        | GSAP                                                                   |
| Stagger sobre lista dinámica de conteo desconocido | GSAP o Framer Motion                                                   |
| Spring físico con interrupción                     | Framer Motion                                                          |
| Morph entre formas SVG                             | GSAP MorphSVG                                                          |

Regla: si cabe en `@keyframes` + un `animation-timeline`, queda en CSS. En cuanto hace falta control imperativo, coordinación de secuencia o valores en runtime, escala a librería — pero la librería se ejecuta fuera de esta skill (coverage_gap si el entorno no la permite).

## Cómo

### Scroll-driven

Barra de progreso que sigue el scroll del documento:

```css
.progress-bar {
  animation: grow-width linear both;
  animation-timeline: scroll(root block);
}
@keyframes grow-width {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
```

Reveal al entrar al viewport:

```css
.reveal {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

`scroll(<scroller> <axis>)`: scroller `nearest|root|self`, axis `block|inline|x|y`. Rangos nombrados: `cover|contain|entry|exit|entry-crossing|exit-crossing`. Siempre envolver en `@supports (animation-timeline: scroll())` y dar fallback estático (estado final visible) para navegadores sin soporte.

### View Transitions

Mismo documento (SPA):

```js
document.startViewTransition(() => {
  updateContent();
});
```

```css
::view-transition-old(root) {
  animation: fade-out 200ms ease-out;
}
::view-transition-new(root) {
  animation: fade-in 300ms ease-in;
}
.hero-image {
  view-transition-name: hero;
}
```

Cross-document (MPA):

```css
@view-transition {
  navigation: auto;
}
.card {
  view-transition-name: card-detail;
} /* página salida */
.detail-hero {
  view-transition-name: card-detail;
} /* página entrada */
```

Agrupar con `view-transition-class` para compartir duración/curva entre varios elementos.

### @starting-style

Entrar animado desde `display: none` sin hacks de JS:

```css
.dialog {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 300ms ease,
    transform 300ms ease,
    display 300ms allow-discrete;
  @starting-style {
    opacity: 0;
    transform: translateY(-1rem);
  }
}
.dialog[hidden] {
  opacity: 0;
  transform: translateY(-1rem);
  display: none;
}
```

`transition-behavior: allow-discrete` (o `allow-discrete` en el shorthand) habilita la transición de `display` y `overlay`. Sin él, la transición desde `none` se salta. Combinar con `<dialog>` y `[popover]` para modales nativos sin JS de animación.

### Anchor positioning

Tooltip fijado a un trigger, sin librería de floating UI:

```css
.trigger {
  anchor-name: --my-trigger;
}
.tooltip {
  position: fixed;
  position-anchor: --my-trigger;
  position-area: top center;
  margin-bottom: 0.5rem;
  position-try-fallbacks: --bottom;
}
@position-try --bottom {
  position-area: bottom center;
  margin-top: 0.5rem;
}
```

Siempre definir `position-try-fallbacks`: sin fallback el elemento se corta del viewport cuando la posición primaria no cabe.

### Container queries + unidades relativas

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}
@container card (min-width: 400px) {
  .card-content {
    animation: slide-in-right 400ms var(--ease-out-expo);
  }
}
@keyframes slide-in-right {
  from {
    transform: translateX(10cqw);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

`cqw` = 1% del ancho inline del contenedor más cercano. Animar en función del contenedor, no del viewport.

### Visuales sin assets

`clip-path` (inset/polygon/circle/ellipse — mismo tipo y conteo de puntos para morph):

```css
.reveal {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 600ms cubic-bezier(0.77, 0, 0.175, 1);
}
.reveal.visible {
  clip-path: inset(0 0 0 0);
}
```

`backdrop-filter` (glass), `mix-blend-mode: difference` (texto que invierte sobre cualquier fondo), mesh gradients (varios `radial-gradient` apilados) y `conic-gradient` con `mask` para spinners. Todo CSS, sin imágenes.

### Sin tooling vendor

No `npx`, no `${CLAUDE_PLUGIN_ROOT}`, no scripts externos. La skill describe la capability en prosa; el agente genera CSS dentro del deliverable solicitado. Ejecución de cualquier comando externo requiere confirmación explícita del usuario (fail-closed). Si no hay fallback nativo disponible en el entorno, marcar `coverage_gap`.

## Do Not

| Malo                                             | Bueno                                                | Por qué                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `transition: all 300ms`                          | `transition: opacity 300ms, transform 300ms`         | `all` dispara transiciones en cualquier cambio de propiedad y bloquea optimizaciones del navegador |
| Animar `width`, `height`, `top`, `left`          | Animar `transform`, `opacity`, `clip-path`, `filter` | Las propiedades de layout fuerzan reflow por frame; las composit-only corren en GPU                |
| Scroll-driven sin fallback                       | `@supports (animation-timeline: scroll()) { ... }`   | Firefox solo agregó soporte en v128+; Safari antiguo no lo tiene                                   |
| `@starting-style` sin `transition-behavior`      | Siempre emparejar con `allow-discrete`               | Sin él, `display: none` salta la transición completa                                               |
| Anchor sin `position-try-fallbacks`              | Siempre definir fallbacks                            | El elemento se corta del viewport si la posición primaria no cabe                                  |
| `animation-fill-mode: forwards` en scroll-driven | Usar `both` en scroll-driven                         | `forwards` puede dejar el elemento en estado final incluso al hacer scroll inverso                 |

## Fail-closed

- NO CLI externo: no `npx`, no `npm install`, no auto-ejecución de paquetes.
- NO red: la skill no hace fetch ni descarga assets; todo es CSS embebido.
- NO publicación: la skill produce CSS para el deliverable; no publica ni activa conectores.
- NO auto-ejecución: ejecutar cualquier comando fuera del write-set requiere confirmación explícita del usuario.
- local-evaluation only: la skill evalúa y genera contenido localmente; sin runtime autónomo, sin reloj autónomo.

## Validación

```sh
node skills/design-css-native/scripts/check-skill.mjs
pnpm verify:skills
```
