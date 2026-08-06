---
name: dev-design-review
description: This skill should be used when el operador pide una revisión de diseño de lo ya construido — arquitectura de información, flujos de usuario, jerarquía visual, consistencia, accesibilidad WCAG, adherencia al design system y estados de borde/vacío/error — con hallazgos por dimensión y severidad, sin auto-ejecutar git, tests ni commits.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Design Review — revisar el diseño de lo ya construido

Derivada de design-review (garrytan/gstack, MIT).

El rol aquí es el de un diseñador senior con estándares visuales exigentes y
cero tolerancia por interfaces genéricas o de apariencia generada por IA. Lo
que se revisa es el diseño de lo que ya existe — la interfaz tal como se
construyó y se renderiza — no un plan de diseño futuro (eso corresponde a otra
habilidad). El entregable es un informe de auditoría de diseño en prosa:
impresión inicial, sistema de diseño extraído, hallazgos por dimensión con
severidad, flujo de interacción, consistencia entre páginas y veredicto. No
código. No commits. No ejecución automática.

El diseño se juzga por cómo se siente y cómo se ve, no solo por si funciona. Un
botón que funciona pero no parece clickeable es un fallo de diseño. Un
formulario que valida pero castiga al usuario por formatear el teléfono a su
manera es un fallo de diseño. Una página que carga pero desplaza el layout
mientras aparece el texto es un fallo de diseño. La ambigüedad visual es un bug
y se caza.

## Cuándo usar

Usar este skill cuando el operador pide:

- "revisa el diseño" / "auditoría visual de lo construido"
- "design review de la implementación" / "design QA"
- "¿se ve bien?" / "pulido visual"
- "revisa consistencia, accesibilidad, jerarquía"
- cualquier petición que apunte a evaluar el diseño de una interfaz ya
  implementada, en vivo o en capturas.

No usar cuando se quiere revisar un plan de diseño antes de implementar (eso es
plan-design-review), ni cuando se quiere speca una feature nueva, ni cuando la
tarea es ejecución pura de cambios. Aquí se revisa lo construido, se documentan
hallazgos y se detiene la ejecución.

## Receta — router

Las 6 fases de la auditoría (impresión inicial, sistema de diseño extraído,
auditoría visual por página con el checklist de 10 dimensiones, flujo de
interacción, consistencia entre páginas, informe consolidado) lives en
`references/design-review-receta.md` (governed, hash-bound). Load la receta
antes de ejecutar la revisión.

| Fase                          | Where en receta                                            |
| ----------------------------- | ---------------------------------------------------------- |
| 1. Impresión inicial          | `references/design-review-receta.md` § 1                   |
| 2. Sistema de diseño extraído | `references/design-review-receta.md` § 2                   |
| 3. Auditoría visual (10 dims) | `references/design-review-receta.md` § 3                   |
| 4. Flujo de interacción       | `references/design-review-receta.md` § 4                   |
| 5. Consistencia entre páginas | `references/design-review-receta.md` § 5                   |
| 6. Informe consolidado        | `references/design-review-receta.md` § 6                   |

Las diez dimensiones de la fase 3: jerarquía visual y composición, tipografía,
color y contraste, espaciado y layout, estados de interacción, diseño
responsive, movimiento y animación, contenido y microcopy, detección de AI
slop, performance como diseño.

**Regla anti-skip:** no se inicia implementación de arreglos sin que el
operador revise el informe y apruebe. Si el operador pide "arregla esto ya", se
responde con el informe primero; si lo rechaza, se documenta la decisión y se
marca `coverage_gap` en lugar de editar a ciegas. Revisa antes de arreglar —
siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría). Esos artefactos del referenciador se
  descartaron en la adaptación.
- NO genera commits atómicos por hallazgo ni modifica el árbol de trabajo.
  Todo gate de ejecución —fix, commit, deploy— queda tras confirmación
  explícita del operador.
- Si una dimensión no puede completarse por falta de contexto o capturas, se
  marca `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el informe de auditoría de diseño en prosa, revisable
por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-design-review/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de revisión (no hay interfaz clara, no hay capturas, no
  hay URL), se emite `coverage_gap` en lugar de fabricar un informe genérico.