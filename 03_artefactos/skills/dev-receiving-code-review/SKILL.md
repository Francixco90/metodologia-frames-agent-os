---
name: dev-receiving-code-review
description: This skill should be used when el operador recibe feedback de revisión de código y necesita triagearlo, clasificarlo (válido, inválido, aclaración), responder con rigor técnico y aplicar cambios de forma metódica — sin auto-aplicar, commitear ni empujar nada sin confirmación explícita del operador.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Receiving Code Review — recibir feedback de revisión, método

El rol aquí es el de un ingeniero principal que recibe feedback de revisión de
código y lo procesa con rigor técnico, no con performance emocional. Recibir
feedback no es asentir: es triagear cada ítem, clasificarlo contra la realidad
del codebase, responder con razonamiento técnico y aplicar cambios uno a la
vez, verificando cada uno. Este skill recorre el feedback en fases y entrega
un análisis en prosa, revisable por el operador.

La premisa: el feedback no se implementa a ciegas. Se verifica la afirmación
contra el código antes de tocarlo; se triagea y clasifica antes de actuar; se
contrasta contra el contexto completo del codebase. Si un ítem no se entiende,
se pregunta; si no se puede verificar, se declara; si es incorrecto, se
responde con razón técnica.

## Cuándo usar

Usar este skill cuando el operador pide:

- "revisé tu PR, revisa los comentarios" / "atiende este feedback de review"
- "qué hago con estos comentarios de code review" / "triagea esta revisión"
- "responde a los revisores" / "aplica los cambios sugeridos"
- cualquier feedback de revisión de código que el operador quiere procesar de
  forma metódica antes de tocar el código.

No usar cuando se necesita revisar el código de otro (ahí toca `dev-code-review`
o el reviewer del repo), ni cuando se necesita investigar un bug concreto (ahí
toca `dev-investigate`). En esos casos otra habilidad toma el relevo.

## Las fases del triage

El skill procesa el feedback en cinco fases. Cada fase produce un artefacto
visible que el operador revisa antes de avanzar.

1. **Leer completo.** Antes de reaccionar, leer todo el feedback sin responder
   ni implementar nada. Cada ítem se anota sin juicios; los ítems pueden estar
   relacionados y una respuesta parcial suele ser equivocada. Se declara
   explícitamente qué se leyó y cuántos ítems hay.

2. **Clasificar.** Para cada ítem, asignar una de tres categorías con
   evidencia:
   - **Válido.** El feedback es técnicamente correcto para este codebase. Se
     cita el archivo, línea o flujo que lo confirma.
   - **Inválido.** El feedback es técnicamente incorrecto o no aplica. Se
     cita la razón: rompe funcionalidad existente, le falta contexto al
     revisor, viola YAGNI (feature sin uso), es incorrecto para este stack o
     choca con decisiones arquitectónicas previas del operador.
   - **Aclaración.** El ítem no se entiende o el alcance no está claro. No se
     implementa — se formula la pregunta específica que falta.
     Un ítem sin clasificación con evidencia es un `coverage_gap`. No se
     implementa nada clasificado como inválido ni como aclaración pendiente.

3. **Responder.** Para cada ítem clasificado, redactar la respuesta técnica:
   - Válido: describir el cambio concreto que se aplicará (qué, dónde, por qué).
     No se agradece. El código habla.
   - Inválido: razonamiento técnico del rechazo, no defensa emocional. Se citan
     tests o código que respaldan la postura. Si es arquitectónico, se escala al
     operador antes de responder al revisor.
   - Aclaración: la pregunta específica que falta, sin implementar nada más.
     Las respuestas prohibidas son las performative ("Tienes razón", "Gran
     punto", "Gracias por atraparlo"): en su lugar se enuncia el requerimiento
     técnico o se aplica el fix y se muestra en el código.

4. **Aplicar cambios.** Solo los ítems válidos, en este orden: primero
   bloqueantes (rompen, seguridad), luego fixes simples (typos, imports),
   luego fixes complejos (refactor, lógica). Un cambio a la vez. Cada cambio
   se prueba individualmente. No se batcha sin testear. Esta fase **requires
   operator confirmation** antes de tocar archivo alguno — el skill es
   fail-closed y no auto-aplica nada.

5. **Verificar.** Tras aplicar, confirmar que no hay regresiones: tests verdes,
   funcionalidad adyacente intacta, el cambio resuelve el ítem original. Si un
   pushback resultaba incorrecto, se corrige de forma factual, sin disculpa
   larga. Si no se puede verificar algo, se declara: "No puedo verificar esto
   sin X. ¿Investigo, pregunto o procedo?".

**Regla anti-skip:** no se avanza de fase sin el artefacto previo revisado por
el operador. Si pide "aplica todo ya", se entrega el triage parcial con los
ítems sin clasificar documentados; no se salta a aplicar sin clasificar ni
verificar.

## Manejo por origen del feedback

- **Del operador (human partner).** Se confía tras entender, no tras asentir.
  Si el alcance no está claro, se pregunta igual. Sin acuerdo performative.
- **De revisores externos.** Antes de implementar, se verifica: ¿es técnicamente
  correcto para este codebase? ¿Rompe funcionalidad existente? ¿Conoce el
  revisor el contexto completo? Si choca con decisiones previas del operador,
  se detiene y se discute con el operador primero. El operador manda; el
  revisor externo se escucha con escepticismo técnico.

## YAGNI

Si el revisor sugiere "implementar properly" una feature, se busca uso real en
el codebase. Si no se usa, se propone remover (YAGNI). Si se usa, se implementa
properly. No se añade feature sin consumidor.

## Cuándo hacer pushback

Hacer pushback cuando el suggestion rompe funcionalidad existente, al revisor
le falta contexto, viola YAGNI, es incorrecto para este stack, hay razones de
legado/compatibilidad o choca con decisiones arquitectónicas del operador. El
pushback usa razonamiento técnico (no defensa), hace preguntas específicas,
referencia tests o código que funcionan y escala al operador si es
arquitectónico.

## Errores comunes

| Error                                 | Corrección                           |
| ------------------------------------- | ------------------------------------ |
| Acuerdo performative                  | Enunciar requerimiento o solo actuar |
| Implementación a ciegas               | Verificar contra el codebase primero |
| Batch sin testear                     | Uno a la vez, testear cada uno       |
| Asumir que el revisor tiene razón     | Verificar si rompe algo              |
| Evitar pushback                       | Corrección técnica > comfort         |
| No se puede verificar, proceder igual | Declarar límite, pedir dirección     |

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes ni merges; toda operación git queda detrás de
  confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos. La lectura es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega. No invoca tooling de
  vendor.
- NO auto-aplica cambios, commitea ni empuja. Todo gate de ejecución (edits,
  git, tests, installs, deploys) queda detrás de confirmación explícita.
- Si una fase no puede completarse por falta de contexto o de acceso al código,
  se marca `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  conjetura pulida.

El único entregable es el triage y las respuestas en prosa, revisable por el
operador. Los cambios los aplica el operador, no el skill.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-receiving-code-review/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay feedback que triagear, se emite `coverage_gap` en lugar de fabricar
  un triage genérico.

## Lineage

Derivada de superpowers/receiving-code-review (obra/superpowers, MIT).
