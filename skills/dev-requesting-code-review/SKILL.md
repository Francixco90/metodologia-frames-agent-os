---
name: dev-requesting-code-review
description: This skill should be used when el operador necesita solicitar una revision de codigo metódica — preparar el contexto de la solicitud, declarar alcance y SHAs, formular preguntas especificas al revisor y decidir cuándo conviene abrir la revision — sin auto-despachar, auto-publicar ni mezclar la sesion del coordinador con la del revisor.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Requesting Code Review — solicitar una revisión, método

El rol aquí es el de un ingeniero principal que termina una tarea, una feature o
un fix y necesita una revision de codigo antes de avanzar al merge. Solicitar
revision no es escribir "revisa esto": es entregarle al revisor un contexto
preciso — qué se construyó, contra qué requisitos, desde qué commit hasta qué
commit, qué preguntas concretas se quieren responder — para que la revision
vaya al work product y no a la sesion del coordinador. Este skill prepara esa
solicitud en prosa, revisable por el operador. No despacha subagentes. No
publica. No mezcla contextos.

La premisa es simple: una revision sin contexto preciso es ruido. "Revisa mi
diff" no sirve — se entregan SHAs base y cabeza y un resumen del cambio—; "ahi
lo ves" no sirve — se declara el plan o los requisitos contra los que se debe
evaluar—; "¿qué te parece?" no sirve — se formulan preguntas especificas
(seguridad, performance, edge cases, contratos). No se adivina: si no se sabe
qué se quiere que revisen, se dice y se pregunta, o se lee el contexto primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "pide una revision de este cambio" / "solicita code review"
- "antes de mergear, revisa esto" / "quiero una segunda mirada"
- "despacha un revisor para esta feature"
- "prepara el contexto para code review"
- cualquier cambio terminado que el operador quiere someter a revision
  metódica antes de avanzar.

No usar cuando se necesita investigar un bug concreto (ahí toca
`dev-investigate`), ni cuando se quiere aprender un codebase nuevo (ahí toca
`dev-learn`). En esos casos otra habilidad toma el relevo.

## Las fases de la solicitud

El skill prepara la solicitud en cinco fases. Cada fase produce un artefacto
visible que el operador revisa antes de avanzar.

1. **Declarar el alcance.** Antes de pedir nada, acotar qué se revisa: qué
   tarea, feature o fix se terminó, qué archivos o módulos toca, qué commit es
   la base y qué commit es la cabeza. Sin SHAs, la revision flota. Para cada
   cambio, preguntar: ¿qué problema ataca? ¿Qué frontera mueve? ¿Qué contrato
   nuevo o modificado introduce? Sin alcance, el revisor adivina. Declarar
   explícitamente qué entra y qué queda fuera de la revision — el operador
   confirma antes de despachar.

2. **Construir el contexto.** Entregarle al revisor contexto precisamente
   craftado, no el historial de la sesion del coordinador. Eso significa: un
   resumen breve de qué se construyó, el plan o los requisitos que debe
   cumplir, los SHAs base y cabeza, y los archivos clave. El revisor vive en su
   propia ventana de contexto — si se le pasa la sesion entera, se pierde en el
   proceso de pensamiento del coordinador en lugar de evaluar el work product.
   Contexto craftado, no volcado de sesion.

3. **Formular preguntas especificas.** Una solicitud sin preguntas es una
   invitacion abierta al ruido. Plantear preguntas concretas: ¿hay edge cases
   sin cubrir? ¿El contrato nuevo responde a los requisitos? ¿Hay fugas de
   recursos en el camino de error? ¿La prueba nueva realmente falsifica el
   happy path? Cada pregunta lleva su intención (qué se quiere saber) y su
   limite (qué respuesta cierra la duda). Una pregunta vaga es una conjetura
   disfrazada.

4. **Decidir cuándo abrir.** La revision no es opcional, pero tampoco es
   indiscriminada. Es obligatoria despues de cada tarea en desarrollo dirigido
   por subagentes, al completar una feature mayor y antes de mergear a main.
   Es valiosa cuando se está atascado (perspectiva fresca), antes de refactorizar
   (baseline) y despues de un bug complejo. No se salta "porque es simple". No
   se ignora un Critical. No se avanza con Importantes sin arreglar.

5. **Procesar el feedback.** Cuando el revisor responde, clasificar los
   hallazgos: Critical se arregla ya; Important se arregla antes de avanzar;
   Minor se anota para despues. Si el revisor se equivoca, se responde con
   razonamiento tecnico y se muestra codigo o pruebas que lo prueban — no se
   discute con feedback valido. La revision no termina cuando el revisor
   responde, termina cuando los hallazgos se clasifican y se actúa.

**Regla anti-skip:** no se despacha la solicitud sin el contexto de las fases
1-3 listo y revisado por el operador. Si el operador pide "solo despacha",
se responde con la solicitud parcial y se documentan los gaps; no se despacha a
ciegas. Solicitar en orden — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO despacha, auto-arranca ni publica la solicitud de revision. Todo despacho
  del revisor queda detras de confirmacion explicita del operador.
- NO ejecuta git, commits, pushes, ni merges. Los SHAs se declaran en prosa,
  no se obtienen con comandos auto-ejecutados.
- NO pasa el historial de la sesion del coordinador al revisor. El contexto es
  craftado, no un volcado.
- NO invoca tooling de vendor (subagentes generic-purpose, hooks, analytics,
  telemetria, dispatch frameworks). Esos artefactos del referenciador se
  descartaron en la adaptacion.
- NO auto-arranca comandos con side effects. Todo gate de ejecucion (despacho,
  git, merge, publish) queda detras de confirmacion explicita del operador.
- Si una fase no puede completarse por falta de contexto o de acceso al cambio,
  se marca `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El unico entregable es la solicitud de revision en prosa, revisable por el
operador.

## Validacion

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-requesting-code-review/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de revision (no hay cambio declarado, no hay SHAs, no hay
  alcance), se emite `coverage_gap` en lugar de fabricar una solicitud generica.

Derivada de superpowers/requesting-code-review (obra/superpowers, MIT).
