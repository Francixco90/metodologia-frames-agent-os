---
name: dev-retro
description: This skill should be used when the operator requests a structured development retrospective for a sprint or iteration — it facilitates what-went-well, what-didn't, what-to-change, and action items with owners and due dates in a blameless format, and delivers prose findings for local evaluation only; it never auto-runs git, tests, or commits without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Dev Retro — retrospectiva estructurada

Derivada de retro/SKILL.md (garrytan/gstack, MIT).

Esta skill facilita una retrospectiva de desarrollo estructurada para un sprint o iteración cerrado. Produce prosa con hallazgos accionables — lo que funcionó, lo que no funcionó, lo que se debe cambiar y action items con responsables y fechas de vencimiento — bajo disciplina blameless. El operador aporta el contexto (notas de sprint, observaciones, métricas, conversaciones). La skill entrega la narrativa; no ejecuta ni asume acciones por su cuenta.

## Cuándo usar

- El operador pide explícitamente una retrospectiva de sprint o iteración.
- El operador quiere revisar un período de trabajo para extraer aprendizajes y compromisos.
- Hay un sprint recién cerrado y se necesita convertir la experiencia en action items concretos.

No usar para planificación hacia adelante (roadmap, backlog grooming), auditoría de código línea por línea, ni evaluación de desempeño individual.

## Cómo

1. **Recopilar el contexto del operador.** Pedir o leer las notas del sprint, las observaciones y cualquier métrica disponible. Si falta información material para una sección, marcar `coverage_gap` en lugar de inventar.

2. **Lo que funcionó.** Listar lo que salió bien durante el período, anclado en hechos observables: entregas completadas, bloqueos resueltos, patrones que aceleraron al equipo, mejoras medibles. Específico, no genérico. "Buen trabajo" no cuenta; "el módulo de auth se integró sin rework gracias a la revisión temprana del contrato de API" sí.

3. **Lo que no funcionó.** Listar lo que frenó, rompió o degradó el sprint, anclado en hechos. Causas sistémicas, no personas. Si algo falló, describir el fallo y su mecanismo; el responsable es el sistema o el proceso, no un individuo. Esto es disciplina blameless: el problema se examina, no se señala a nadie.

4. **Lo que se debe cambiar.** Para cada punto de fricción, proponer un cambio concreto y verificable. No "mejorar la comunicación" — "adicionar un daily de 15 minutos enfocado solo en bloqueos, lunes y jueves". El cambio debe ser accionable por el equipo en el próximo sprint.

5. **Action items con owners y fechas de vencimiento.** Convertir los cambios propuestos en compromisos explícitos. Cada action item lleva: una descripción accionable, un responsable nombrado y una fecha de vencimiento. Sin owner o sin fecha, no es un compromiso — es un deseo. El operador confirma los owners y las fechas antes de cerrar.

6. **Resumen prosa.** Entregar los hallazgos como prosa clara para evaluación local del operador. No escribir archivos, no commitear, no publicar. El operador decide qué hacer con el resultado.

## Fail-closed

Esta skill es fail-closed: no ejecuta git, no corre tests, no hace commits, no abre conexiones de red, no publica nada, no invoca CLIs externas. Toda acción de ejecución (commit, deploy, abrir issue, crear ticket) queda detrás de la confirmación explícita del operador. La skill produce prosa para evaluación local; el operador ejecuta lo que decida ejecutar, cuando lo decida. El alcance es `local-evaluation` — nada sale del entorno local sin el operador.

## Validación

- `pnpm verify:skills` desde la raíz del repo valida la estructura y los contratos de la skill.
- `node skills/dev-retro/scripts/check-skill.mjs` ejecuta el self-check local (recursos gobernados, clean-room, fail-closed, sin APIs prohibidas).
- Si falta evidencia material para una sección de la retrospectiva, marcar `coverage_gap` en lugar de inferir.
