---
name: design-framer-motion
description: This skill should be used when the user needs declarative React UI animations and interactions — AnimatePresence exit animations, shared layout animations with layoutId, gesture handlers (whileHover, whileTap, drag with constraints), and motion values for scroll-driven or reactive animation without re-renders. It produces production-ready Framer Motion / Motion for React component snippets, variant definitions, and AnimatePresence wiring, evaluated locally with no network, no CLI, no publication.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Framer Motion — Animaciones React declarativas (AnimatePresence, layout, gestures, motion values)

Derivada de framer-motion (AThevon/genjutsu, MIT). Homólogo MetodologIA: animaciones declarativas en React via Framer Motion / Motion — AnimatePresence, layout animations, gestures, motion values — en voz terse, imperativa, fail-closed. No copia prosa vendor; adapta el principio. Vease §Fail-closed para la política de no-instalación y coverage_gap.

## Cuándo usar

- Exit animations: desmontar un modal, toast o card con animación de salida al desaparecer del DOM.
- Layout animations: un elemento que se reubica o cambia tamaño al mutar la lista (reorder, expand/collapse, shared layout entre vistas).
- Gestures: hover, tap, focus, drag con constraints y elastic, swipe-to-action.
- Scroll-driven: parallax, barra de progreso, reveal ligado al scroll de un contenedor.
- Orquestación: stagger sobre hijos, delayChildren, propagación automática de variantes padre→hijo.
- Motion values: animación reactiva que actualiza el DOM directo sin disparar re-render de React.

| Situación                                                        | Decisión                                 |
| ---------------------------------------------------------------- | ---------------------------------------- |
| Exit animation (modal, toast, drawer)                            | Framer Motion — AnimatePresence          |
| Shared layout entre dos posiciones (tab indicator, card→detalle) | Framer Motion — layoutId                 |
| Reorder de lista con animación de posición                       | Framer Motion — layout + Reorder.Group   |
| Hover/tap/drag con constraints                                   | Framer Motion — whileHover/whileTap/drag |
| Scroll-driven con parallax y progreso                            | Framer Motion — useScroll + useTransform |
| Stagger sobre hijos con propagación                              | Framer Motion — Variants                 |
| Timeline cinemático multi-paso (5+ tweens coordinados)           | GSAP — timeline                          |
| Morph entre formas SVG                                           | GSAP — MorphSVG                          |
| < 3 animaciones simples en la página                             | CSS nativo — @keyframes                  |
| Entrar desde display:none sin JS                                 | CSS nativo — @starting-style             |

Regla: Framer Motion para UI interactions React (modals, toasts, reorder, shared layout, gestures). GSAP para timelines cinemáticos y SVG morphing. CSS nativo para animaciones simples sin React.

## Cómo

### AnimatePresence — exit animations

Envuelve el render condicional; el hijo necesita `key` único y estable. Sin key, el exit no dispara.

```tsx
<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div key="modal" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} />
  )}
</AnimatePresence>
```

Modos: `wait` (espera exit antes de enter — page transitions), `sync` (exit y enter simultáneos), `popLayout` (saca del flujo inmediato — útil para listas que reordenan). `onExitComplete` callback al terminar todos los exit. El exit debe ser más sutil que el enter: 200ms ease-in opacity vs 300ms ease-out full choreography. Un exit largo molesta; el usuario ya decidió irse.

### Layout animations

`layoutId` compartido entre dos elementos: el indicador se desliza entre posiciones cuando cambia el tab activo.

```tsx
<motion.div layoutId="highlight" className={activeTab === id ? 'active' : ''} />
```

`layout` auto: anima posición y tamaño cuando el layout cambia (expand/collapse, reorder).

```tsx
<motion.div layout>{isExpanded && <motion.p layout>Contenido adicional</motion.p>}</motion.div>
```

`layout="position"` anima solo posición (no tamaño). `layout="size"` anima solo tamaño. `layout="preserve-aspect"` preserva la relación durante la transición. El key debe ser estable entre renders; un key dinámico aleatorio rompe el tracking porque Framer Motion no puede seguir el elemento entre estados.

### Variants — propagación y orquestación

```tsx
const container = {
  hidden: {opacity: 0},
  show: {opacity: 1, transition: {staggerChildren: 0.08, delayChildren: 0.2, staggerDirection: 1}},
};
const item = {hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}};

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map((i) => (
    <motion.li key={i.id} variants={item} />
  ))}
</motion.ul>;
```

Las variantes se propagan automáticamente a los hijos motion — no hace falta `initial`/`animate` en cada hijo. `staggerChildren` encadena; `delayChildren` espera antes de iniciar; `staggerDirection` 1 normal, -1 reverso. Usar nombres de variantes (string) en lugar de objetos inline para que la propagación funcione.

### Gestures

```tsx
<motion.div
  whileHover={{scale: 1.05}}
  whileTap={{scale: 0.95}}
  whileFocus={{borderColor: '#3b82f6'}}
  drag
  dragConstraints={{left: -100, right: 100, top: -50, bottom: 50}}
  dragElastic={0.2}
  dragSnapToOrigin
  onDragEnd={(e, info) => {
    if (info.offset.x > 100) handleSwipe('right');
  }}
/>
```

`drag` true = x+y, `"x"` horizontal, `"y"` vertical. `dragConstraints` limita el rango. `dragElastic` 0 rígido, 1 libre (default 0.35). `dragSnapToOrigin` regresa al origen al soltar. `whileFocus` para feedback de foco accesible.

### Motion values — reactivo sin re-render

```tsx
const x = useMotionValue(0);
const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
const smoothX = useSpring(x, {stiffness: 300, damping: 30});
const {scrollY, scrollYProgress} = useScroll();
const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -300]);
```

Motion values actualizan el DOM directo via `style` — NO disparan re-render de React. Usar `useMotionValueEvent(x, "change", cb)` para reaccionar a cambios sin causar render en cascada. `useScroll` sin target trackea el scroll del documento; con `target` (ref) y `offset` trackea el scroll dentro de un contenedor.

### Sin tooling vendor

No `npx`, no `${CLAUDE_PLUGIN_ROOT}`, no scripts externos. La skill describe la capability en prosa; el agente genera código dentro del deliverable solicitado. Ejecutar cualquier comando externo requiere confirmación explícita del usuario (fail-closed). Si no hay runtime Framer Motion instalado en el proyecto destino, marcar coverage_gap y describir la capability — no auto-instalar `motion` ni `framer-motion`.

## Do Not

| Malo                                                                | Bueno                                                | Por qué                                                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `onUpdate` con setState sin guard                                   | `useMotionValueEvent(x, "change", cb)` con guard     | setState en cada frame dispara re-render infinito si animate depende del estado              |
| Layout animation con key dinámico aleatorio                         | key estable derivado de data (item.id)               | key cambia cada render, Framer Motion no puede trackear posición/tamaño entre estados        |
| AnimatePresence sin key único en hijo condicional                   | `key="modal"` en cada hijo condicional               | sin key único el exit no dispara; el componente se desmonta sin animación                    |
| `motion.div` dentro de `motion.div` animando el mismo eje transform | separar ejes (padre x, hijo opacity) o usar variants | double animation sobre el mismo transform causa conflicto; cada eje debe tener un solo dueño |
| Animar `width`/`height`/`top`/`left`                                | animar `transform`/`opacity`/`clip-path`/`filter`    | propiedades de layout fuerzan reflow por frame; las composit-only corren en GPU              |
| whileHover con scale(0)                                             | whileHover con scale(1.05)                           | scale(0) hace desaparecer el elemento al hover; los gestos amplían, no contraen a cero       |

## Fail-closed

- NO CLI externo: no `npx`, no `npm install`, no auto-ejecución de paquetes. No auto-instalar `motion` ni `framer-motion`.
- NO red: la skill no hace fetch ni descarga paquetes; todo es código embebido en el deliverable.
- NO publicación: la skill produce snippets para el deliverable; no publica ni activa conectores.
- NO auto-ejecución: ejecutar cualquier comando fuera del write-set requiere confirmación explícita del usuario.
- local-evaluation only: la skill evalúa y genera contenido localmente; sin runtime autónomo, sin reloj autónomo.
- Marcar coverage_gap si no hay runtime Framer Motion instalado en el proyecto destino: describir la capability en prose, no auto-instalar.

## Validación

```sh
node skills/design-framer-motion/scripts/check-skill.mjs
pnpm verify:skills
```
