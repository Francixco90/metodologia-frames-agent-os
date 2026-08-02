---
name: cinematic-scroll-quality
description: This skill should be used when the user asks for "cinematic scroll quality", "design tokens for scroll", "taste guardrails", "scroll choreography", "quality scoring for scroll pages", or "cinematic direction for web". Provides visual direction, design tokens, storyboard, chapters, composition, rhythm, continuity, and quality verification for scroll-driven experiences.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Cinematic Scroll Quality

Direccion visual cinematografica para experiencias guiadas por scroll.
Proporciona tokens de disennn, taste guardrails, storyboard por capítulos,
composicion, ritmo, continuidad y verificacion de calidad.

Derivada de `cinematic-scroll` (MustBeSimo/cinematic-scroll-skill, MIT).

## Orden de ejecucion

```
scroll-experience-foundations
        down
cinematic-scroll-quality  (esta skill)
        down
scroll-world-agnostic
```

## Proposito

Codificar calidad cinematografica como reglas verificables: tokens, guardrails,
choreography y un quality gate agnostico. No reemplaza a la skill principal ni
asume control total del pipeline.

## Activacion

Activar cuando el usuario pide calidad cinematografica para scroll, design tokens,
taste guardrails, choreography, quality scoring o direccion visual.

## No activacion

No activar para tareas sin cinematic motion: CRUD, formularios, dashboards.

## Invariantes

1. Los tokens deben seguir formato W3C DTCG ($value/$type).
2. Los patrones prohibidos (taste guardrails) deben verificarse antes de cerrar.
3. El ritmo (pacing) debe respetar limites: pin 150-400vh, breathing 80vh min.
4. Maximo 3 tipos de motion por 50vh de scroll.
5. La composicion debe centrar el elemento focal.
6. Las transiciones deben tener breathing room entre capítulos.

## Design tokens (W3C DTCG)

### Token layers

1. **Core tokens**: primitivos neutrales (color, espacio 8px, type sizes rem).
2. **Motion tokens**: 4 curvas cubicBezier (reveal, exit, playful, cut), duraciones,
   stagger, pacing constants.
3. **Semantic tokens**: roles cross-system (6 roles de color, 3 roles de font,
   4 ease roles, duration roles).

### Theme system

Cada theme es un overlay JSON sobre semantic tokens:
`color.bg`, `color.surface`, `color.fg`, `color.fg-dim`, `color.accent`,
`color.line`, `font.display`, `font.body`, `font.ui`.

## Taste guardrails (patrones prohibidos)

13 patrones que degradan la calidad cinematografica:

1. Default easing sin intencion (linear/anticipate sin proposito).
2. Exceso de capas de profundidad (>7 capas activas).
3. 3D en dispositivos touch sin fallback.
4. Animacion de propiedades de layout (width/height).
5. setState durante scroll handler (jank).
6. Filtros CSS animados (coste GPU alto).
7. Scroll hijacking sin opcion de salida.
8. Pin excesivo (>400vh sin split).
9. Sin breathing room entre capítulos (<80vh).
10. Literal hex colors en HTML (usar tokens).
11. Mas de 3 tipos de motion por 50vh.
12. DPR sin cap (>2x en mobile).
13. WebGL sin dispose al desmontar.

## Pacing rules

- Pin duration: minimo 150vh, maximo 400vh.
- Breathing room: minimo 80vh entre capítulos pinned.
- Densidad: maximo 1 momento de motion por ~100vh.
- Ritmo base: ~1.2s de motion por 100vh de scroll.

## Scroll choreography (schema declarativo)

Formato declarativo agnostico para mapear scroll a movimientos de camara:

```
chapters: [Chapter]
layers: [Layer]
keyframes: [Keyframe]
transitions: [Transition]
```

Cada capítulo define un pinned section con capas parallax y keyframes.
Las transiciones definen el movimiento entre capítulos. El schema es
compilable a GSAP, CSS scroll-timeline, o cualquier motor de animacion.

## Quality gate (cinematic-doctor adaptado)

Scoring 0-100 en 7 categorias:

- taste (30 pts): guardrails violados.
- performance (25 pts): will-change, layout props, setState.
- a11y (20 pts): reduced-motion, focus, ARIA.
- mobile (15 pts): breakpoints, touch gates.
- tokens (12 pts): uso de tokens vs literals.
- threed (10 pts): DPR cap, dispose, fallback.
- hygiene (advisory): codigo muerto.

Umbral minimo: configurable por proyecto. Default: 70/100.

## Procedimiento

### 1. Storyboard

1. Definir capítulos basados en story beats de scroll-experience-foundations.
2. Asignar tema (theme overlay) y tokens a cada capítulo.
3. Definir capas parallax (maximo 7 activas).

### 2. Composicion

1. Centrar el elemento focal en cada capítulo.
2. Mantener preamble de estilo consistente entre capítulos.
3. Definir movimientos de camara (dolly, crane, lateral, push-in).

### 3. Ritmo y continuidad

1. Verificar pacing rules (pin 150-400vh, breathing 80vh).
2. Maximo 3 tipos de motion por 50vh.
3. Breathing room entre capítulos.

### 4. Verificacion

1. Ejecutar quality gate (scoring 0-100).
2. Verificar taste guardrails.
3. Verificar accesibilidad (reduced-motion, keyboard, ARIA).
4. Verificar mobile (breakpoints, touch gates).

## Limites

- No garantiza compatibilidad con todos los browsers antiguos.
- No sustituye validacion runtime especifica del proyecto.
- El quality gate es analisis estatico; la verificacion runtime es opcional.

## Criterio de cierre

- Confirmar tokens aplicados (no literals).
- Confirmar taste guardrails verificados.
- Confirmar pacing rules respetadas.
- Confirmar quality gate >= umbral.
- Reportar score, violaciones, gaps y siguiente accion.

## Atribuciones

Derivada de `cinematic-scroll` por Simone Leonelli (MIT, commit 089cd3ae).
Adaptacion local con tokens DTCG, taste guardrails, choreography schema y
quality gate agnostico.
