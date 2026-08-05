---
name: dev-using-superpowers
description: This skill should be used when se inicia cualquier conversación o tarea — establece cómo descubrir e invocar skills relevantes antes de responder, incluyendo preguntas aclaratorias, exploración del codebase o verificación de archivos
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de using-superpowers (obra/superpowers, MIT).

# Dev Using Superpowers — invocar skills relevantes antes de responder

Este skill describe una disciplina, no un autómata. Ante cualquier
conversación o tarea —incluso una pregunta aclaratoria, una exploración del
codebase o una verificación de archivos— lo primero es preguntarse si existe
un skill relevante que ya defina cómo abordarla. La regla es simple: revisar el
catálogo de skills aplicables **antes** de responder o actuar, no después. Si
un skill aplica, se invoca y se sigue; si resulta no aplicar, no se usa y se
documenta por qué. No se inventa el flujo cuando ya existe uno probado.

Esto no es auto-invocación ciega: el homólogo describe la disciplina de
**verificar** si hay skills aplicables antes de actuar. No despacha subagentes,
no abre conexiones, no ejecuta comandos con side effects. La decisión de
invocar un skill queda en el operador; este skill solo exige que la
verificación ocurra primero, no que la invocación sea automática.

## La regla

**Revisar e invocar los skills relevantes antes de cualquier respuesta o
acción** — incluidas las preguntas aclaratorias, la exploración del codebase o
la verificación de archivos. Si resulta que el skill no aplica a la situación,
no hay obligación de usarlo; basta con declarar que se revisó y por qué no
aplica.

Antes de entrar en plan mode: si no se ha hecho ya, revisar primero el skill de
brainstorming (o su equivalente en el catálogo vigente) antes de planificar.

Al invocar un skill, anunciar "Usando [skill] para [propósito]" y seguir el
skill exactamente. Si el skill trae un checklist, crear un todo por cada ítem.

## Prioridad de skills

Cuando varios skills aplican a la vez, los skills de **proceso** van primero:
establecen el enfoque, y luego los skills de **implementación** lo ejecutan. La
regla vale para cualquier par proceso/implementación del catálogo.

- "Vamos a construir X" → primero el skill de proceso (brainstorming o
  equivalente), después los skills de implementación.
- "Arregla este bug" → primero el skill de proceso (debugging sistemático o
  equivalente), después los skills de dominio.

Los skills de proceso no son opcionales cuando aplican: son el gate que
separa "reacciono" de "abordó".

## Señales de alarma

Estos pensamientos significan **ALTO** — se está racionalizando para saltar la
revisión de skills:

| Pensamiento                            | Realidad                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------- |
| "Es solo una pregunta simple"          | Las preguntas son tareas. Revisar skills primero.                           |
| "Necesito más contexto primero"        | La revisión de skills va **antes** de las preguntas aclaratorias.           |
| "Déjame explorar el codebase primero"  | Los skills dicen **cómo** explorar. Revisar primero.                        |
| "Voy a revisar git/archivos rápido"    | Los archivos no tienen contexto de la conversación. Revisar skills primero. |
| "Déjame recoger información primero"   | Los skills dicen **cómo** recoger información. Revisar primero.             |
| "Esto no necesita un skill formal"     | Si existe un skill aplicable, se revisa.                                    |
| "Ya me acuerdo de este skill"          | Los skills evolucionan. Leer la versión vigente.                            |
| "Esto no cuenta como tarea"            | Acción = tarea. Revisar skills primero.                                     |
| "El skill es exagerado"                | Lo simple se vuelve complejo. Revisarlo de todas formas.                    |
| "Voy a hacer solo esta cosita primero" | Revisar **antes** de hacer cualquier cosa.                                  |
| "Esto se siente productivo"            | La acción indisciplinada desperdicia tiempo. Los skills lo previenen.       |
| "Ya sé lo que significa"               | Conocer el concepto ≠ usar el skill. Revisarlo.                             |

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO auto-invoca skills en nombre del operador. La decisión de invocar queda en
  el operador; este skill solo exige que la **revisión** ocurra primero.
- NO ejecuta git, commits, pushes ni merges. Toda operación git queda detrás de
  confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos.
- NO abre conexiones de red. No publica. No despliega.
- NO despacha subagentes. Las directivas de parada de subagentes del
  referenciador se descartaron en la adaptación.
- Si no hay catálogo de skills accesible o no se puede determinar cuál aplica,
  se emite `coverage_gap` en lugar de adivinar el skill correcto.

## Instrucciones del operador

Las instrucciones del operador (CLAUDE.md, AGENTS.md, peticiones directas)
tienen precedencia sobre los skills, que a su vez overridean el comportamiento
por defecto. Solo se omite un workflow de skill cuando el operador lo indica
explícitamente.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-using-superpowers/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay contexto para determinar si un skill aplica, se emite `coverage_gap`
  en lugar de fabricar una invocación.
