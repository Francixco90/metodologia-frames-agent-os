---
name: design-emil
description: This skill should be used when the user wants pulir componentes frontend, decidir animaciones con criterio de ingenieria de disenho y atender los detalles invisibles que hacen que una interfaz se sienta bien. Cubre filosofia de design engineering (taste se entrena no se nace, detalles invisibles se acumulan, belleza es leverage), animation decision framework (deberia animar? proposito? easing? velocidad?), spring animations, principios de componentes (botones responsivos, nunca scale(0), popovers origin-aware, tooltips skip delay, transiciones sobre keyframes, blur para mask), mastery de CSS transform y clip-path, gesture/drag, performance (solo transform/opacity), accessibility reduced-motion y review checklist en tabla Before/After/Why. No para architecture decisions, backend o diseno visual desde cero.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Emil — ingenieria de disenho y detalles invisibles

Derivada de `emil-design-eng` (emilkowalski/skills, MIT). Adaptacion clean-room al
contexto MetodologIA: el homologo opera como un design engineer con sensibilidad
de craft que construye interfaces donde cada detalle se acumula en algo que se
siente bien. No invoca CLI vendor; no publica; no abre red. Solo evaluacion local
y direccion de trabajo dentro del marco fail-closed del repositorio.

En un mundo donde el software de todos es suficientemente bueno, el taste es el
diferenciador. Los detalles invisibles se acumulan en interfaces que la gente ama
sin saber por que.

## Cuándo usar

- El usuario pide pulir componentes frontend existentes (botones, popovers,
  tooltips, toasts, drawers, modals).
- El usuario quiere decidir si una animacion deberia existir, con que easing y
  velocidad.
- El usuario pide review de UI code en formato Before/After/Why.
- El usuario quiere dominar CSS transform, clip-path o gesture/drag.
- El usuario pide spring animations o motion basado en fisica.
- Una interfaz se siente "casi bien" pero le faltan los detalles invisibles.

## Receta — router

La receta completa (filosofía rectora, animation decision framework, springs,
principios de componentes, CSS transform mastery, clip-path, gesture/drag,
performance, accessibility, review Before/After/Why) lives en
`references/emil-receta.md` (governed, hash-bound). Load la receta antes de
dirigir trabajo.

| Sección                          | Where en receta                                        |
| -------------------------------- | ------------------------------------------------------ |
| Filosofía rectora                | `references/emil-receta.md` § 1                        |
| Animation decision framework     | `references/emil-receta.md` § 2                        |
| Spring animations                | `references/emil-receta.md` § 3                        |
| Principios de componentes        | `references/emil-receta.md` § 4                        |
| CSS transform mastery            | `references/emil-receta.md` § 5                        |
| clip-path para animación         | `references/emil-receta.md` § 6                        |
| Gesture y drag                   | `references/emil-receta.md` § 7                        |
| Performance                      | `references/emil-receta.md` § 8                        |
| Accessibility                    | `references/emil-receta.md` § 9                        |
| Review Before/After/Why          | `references/emil-receta.md` § 10                       |

## Marcar gaps

Si falta el codebase accesible, los componentes a pulir o la autoridad para
decidir, marcar `coverage_gap` y escalar antes de editar. Una ausencia no se
sustituye por una inferencia pulida. [CONFIG]

## Fail-closed

- NO invocar CLI externo vendor (nada de `npx emil-design-eng` ni rutas de
  scripts vendor).
- NO abrir red ni fetch remoto.
- NO publicar ni activar conectores; n8n permanece en dry-run.
- NO auto-ejecutar comandos del proyecto sin confirmacion del usuario.
- NO asumir librerias (Framer Motion, etc.) sin verificar package.json primero.
- Solo evaluacion y direccion local dentro del marco del repositorio.

## Validación

```
pnpm verify:skills
```