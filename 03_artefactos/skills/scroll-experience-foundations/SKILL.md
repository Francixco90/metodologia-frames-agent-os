---
name: scroll-experience-foundations
description: This skill should be used when the user asks for "scroll experience fundamentals", "scroll accessibility patterns", "scroll performance rules", "prefers-reduced-motion for scroll", "progressive enhancement scroll", "mobile-safe parallax", or "SEO for scroll experiences". Establishes narrative structure, accessibility, performance, responsive design, and degradation before any complex effects are designed.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Scroll Experience Foundations

Establece los fundamentos no negociables de una experiencia web guiada por scroll:
narrativa, accesibilidad, rendimiento, responsive, SEO y degradacion progresiva.
Esta skill se ejecuta ANTES de disennar efectos cinematograficos complejos.

Derivada de `scroll-experience` (sickn33/agentic-awesome-skills, MIT + Apache 2.0).

## Orden de ejecucion

```
scroll-experience-foundations  (esta skill)
        down
cinematic-scroll-quality
        down
scroll-world-agnostic
```

## Proposito

Garantizar que toda experiencia de scroll cumpla invariantes de accesibilidad,
rendimiento y contenido antes de annadir capas visuales. El contenido esencial
debe permanecer disponible sin JavaScript y con movimiento reducido.

## Activacion

Activar cuando el usuario pide fundamentos de scroll, patrones de accesibilidad
para scroll, reglas de rendimiento, degradacion progresiva, parallax mobile-safe,
o SEO para experiencias inmersivas.

## No activacion

No activar para CRUD, formularios, dashboards, integraciones CMS o cualquier
tarea que no involucre scroll-driven web.

## Invariantes

1. El contenido esencial debe ser legible sin JavaScript.
2. `prefers-reduced-motion: reduce` debe neutralizar TODO movimiento.
3. Solo animar `transform` y `opacity` (propiedades GPU-friendly).
4. Scroll events deben usar `requestAnimationFrame` o `ScrollTrigger`.
5. El contenido critico no debe ocultarse tras animaciones (bounce rate + SEO).
6. Mobile: reducir intensidad de parallax o deshabilitar en low-end.

## Procedimiento

### 1. Narrativa primero

Definir story beats antes de efectos visuales:
Hook (viewport completo) -> Context -> Journey -> Climax -> Resolution.

### 2. Capas de progressive enhancement

Nivel 1: Contenido legible sin JS (HTML semantico).
Nivel 2: Estilos y layout basicos (CSS).
Nivel 3: Animaciones de scroll como enhancement (JS opcional).

### 3. Accesibilidad

- Annadir `@media (prefers-reduced-motion: reduce)` que neutralice toda animacion.
- Guard JS: `matchMedia('(prefers-reduced-motion: reduce)').matches` antes de init.
- Keyboard nav: `tabindex="0"` en scroll sections.
- Skip links. No ocultar texto tras animaciones.

### 4. Rendimiento

- Solo animar `transform` y `opacity`. Evitar width/height/top/left/margin.
- `will-change: transform` solo en elementos que se animan frecuentemente.
- `transform: translateZ(0)` para forzar capa GPU donde sea necesario.
- Lazy init/destroy de animaciones pesadas (`onEnter`/`onLeave`).
- Probar en mobile real con CPU throttle.

### 5. Mobile-safe

- Deteccion dual: `navigator.userAgent` + `window.innerWidth < 768`.
- Reducir parallax en mobile (`y: -50` vs `y: -200`).
- `-webkit-overflow-scrolling: touch` + `translate3d(0,0,0)`.
- `@supports (animation-timeline: scroll())` como alternativa nativa.

### 6. SEO

- Texto en el DOM, no solo en canvas.
- Jerarquia de headings correcta.
- Contenido no oculto por defecto.
- Carga inicial rapida.

## Tabla de library options (referencia, no instala)

| Library             | Best For                 | Learning Curve |
| ------------------- | ------------------------ | -------------- |
| GSAP ScrollTrigger  | Animaciones complejas    | Media          |
| Framer Motion       | Proyectos React          | Baja           |
| Locomotive Scroll   | Smooth scroll + parallax | Media          |
| Lenis               | Smooth scroll solo       | Baja           |
| CSS scroll-timeline | Simple, nativo           | Baja           |

Esta skill no instala ni exige ninguna libreria. La seleccion es responsabilidad
del proyecto consumidor.

## Validation checks (checklist de revision)

1. No Reduced Motion Support (HIGH): verificar `prefers-reduced-motion`.
2. Unthrottled Scroll Events (MEDIUM): usar rAF o ScrollTrigger.
3. Animating Layout-Triggering Properties (MEDIUM): cambiar a transform/opacity.
4. Missing will-change (LOW): annadir en elementos frecuentemente animados.
5. Scroll Hijacking (MEDIUM): preferir scrub sobre hijacking.

## Limites

- No garantiza compatibilidad con todos los navegadores antiguos.
- No sustituye validacion especifica del entorno del proyecto.
- Detenerse y pedir aclaracion si faltan inputs, permisos o criterios de exito.

## Criterio de cierre

- Confirmar que el contenido esencial es accesible sin JS.
- Confirmar `prefers-reduced-motion` neutraliza todo movimiento.
- Confirmar que solo se animan propiedades GPU-friendly.
- Confirmar mobile-safe (parallax reducido o deshabilitado).
- Reportar invariantes, gaps y siguiente accion.

## Atribuciones

Derivada de `scroll-experience` por vibeforge1111/vibeship-spawner-skills (Apache 2.0),
agregada por sickn33/agentic-awesome-skills (MIT). Adaptacion local.
