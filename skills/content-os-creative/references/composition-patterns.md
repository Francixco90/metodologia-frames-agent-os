# Composition Patterns (offline-first)

Use after the creative contract when choosing a concrete composition pattern. Each
pattern is a recipe, not a style guide. Offline-first: system fonts or pinned local
brand bundle; no external assets; no network.

## Patterns

| Pattern                  | Use                           | Layers                      | Density |
| ------------------------ | ----------------------------- | --------------------------- | ------- |
| Title card               | Hook single-shot, logo lockup | 1 hero + 1 supporting       | medium  |
| PiP (picture-in-picture) | Speaker + slide simultaneo    | 2 layers, foreground detail | high    |
| Text-behind-subject      | Tipografia como ambiente      | 1 subject + 1 type layer    | medium  |
| Stats / data-in-motion   | Numero clave + contexto       | 1 stat + 1 annotation       | medium  |
| Slideshow                | Navegable deck (no MP4)       | 1 card por slide            | low     |
| Lower-third              | Caption/credit overlay        | 1 bar + 1 lockup            | low     |

## Title card

- Hero element fills 60-80% del frame.
- Lockup (logo + tagline) en safe zone del ChannelProfile.
- Un concepto, no un catalogo. Hook < 3s.

```html
<div data-composition-id="title-card" data-keyframe-subject="#lockup" data-final-state="locked">
  <div
    id="lockup"
    data-pose="enter"
    data-at="0"
    data-pose="settle"
    data-at="1.5"
    data-final-state="locked"
  >
    <!-- brand tokens via reference, not literals -->
  </div>
</div>
```

## PiP

- Foreground: speaker o demo con detail (no recorte flojo).
- Background: slide o contexto, dimmed 30-50%.
- Sincronia: foreground y background comparten timeline seekable.

## Stats / data-in-motion

- Stat hero: numero grande (display font del brand bundle).
- Annotation: contexto (que significa el numero).
- Count-up via seek-safe tween (no Date.now, no Math.random). Deriva valores desde
  `content-os-keyframes` pose contract.

## Slideshow

- Navegable (no MP4): cada slide es un card.
- Transicion CSS-driven (autoAlpha), hereda `content-os-animation/transitions`.

## Lower-third

- Barra con caption o credit.
- Lockup al final con brand mark.
- autoAlpha en timeline seekable; no CSS transition.

## Anti-patterns (web-page)

- Empty hero con un texto centrado y nada mas.
- Blanco puro sin brand token override.
- Sombras suaves genericas sin jerarquia.
- Copy generico ("descubre", "conoce mas") sin voz resuelta.
- 3 cards iguales con la misma photo.

Estos son lazy defaults web. Ver `house-style.md` para evitarlos.
