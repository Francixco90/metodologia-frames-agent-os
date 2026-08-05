---
name: dev-unfreeze
description: This skill should be used when el operador pide restaurar o descongelar un checkpoint de trabajo previamente congelado — verificar que el checkpoint existe y está intacto, declarar la deriva desde el freeze, precisar el blanco de restauración, sacar a la luz conflictos y riesgos, secuenciar los pasos y obtener confirmación explícita antes de cualquier git checkout/restore/stash pop — sin auto-ejecutar git ni descartar trabajo no confirmado.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Unfreeze — restaurar un checkpoint previamente congelado

Derivada de unfreeze (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero principal que recibe un checkpoint de
trabajo previamente congelado y guía su restauración. Un freeze no es
irreversible: se congela para proteger un estado, se descongela para volver a
él. Este skill interroga la restauración dimensión por dimensión hasta que el
operador tiene un plan tight de descongelación — sin grasa, sin ambigüedad, sin
pasos que se ejecutan solos. El entregable es el plan de restauración en prosa,
listo para que el operador lo ejecute. No código. No commits. No ejecución
automática de git.

La premisa es simple: una restauración que no se interroga se ejecuta mal.
"volver al de antes" no sirve — se declara el commit, branch o stash exacto—;
"parece que nada cambió" no sirve — se declara la deriva real desde el freeze—;
"restaura y ya" no sirve — se confirma cada paso destructivo antes de ejecutar.
No se adivina: si no se sabe algo del checkpoint o del estado actual, se dice y
se pregunta, o se lee el contexto primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "descongela este checkpoint" / "unfreeze"
- "restaura el freeze" / "vuelve al estado congelado"
- "quita la restricción de edición" / "unlock edits"
- "recupera el WIP que congelamos"
- cualquier checkpoint de trabajo previamente congelado que el operador quiere
  restaurar sin que el agente ejecute git por él.

No usar cuando no hay checkpoint congelado (ahí no hay nada que restaurar — se
marca `coverage_gap`), ni cuando lo que se necesita es congelar un estado
actual (ahí toca el skill de freeze). Tampoco cuando el operador quiere
ejecutar la restauración el mismo a mano sin plan: ese es otro flujo.

## Las dimensiones de la restauración

El skill interroga la descongelación a lo largo de seis dimensiones. Cada
dimensión produce un artefacto visible que el operador revisa antes de avanzar.

1. **Verificar el checkpoint.** Confirmar que el freeze existe y está intacto.
   ¿Qué captura? ¿Branch, stash, archivos, estado del árbol, mensaje del
   freeze? ¿Dónde quedó registrado? Si el checkpoint no existe, no se puede
   descongelar nada — se emite `coverage_gap` y se detiene. Un freeze
   desaparecido no es una licencia para improvisar una restauración genérica.

2. **Declarar la deriva.** ¿Qué cambió desde el freeze? ¿El árbol de trabajo
   está limpio o tiene cambios no confirmados? ¿La rama sigue siendo la misma?
   ¿Hubo commits, merges, o cambios upstream desde el freeze? Para cada deriva,
   declarar: qué se movió, cuánto, y si es compatible con la restauración. Una
   deriva no declarada es un conflicto latente.

3. **Precisar el blanco de restauración.** ¿A qué estado exacto se vuelve?
   Commit, ref, stash, o path. Si el blanco es "el de antes", no es blanco — es
   deseo. Convertirlo en un identificador verificable: SHA, nombre de rama, ref
   del stash, o conjunto de archivos. Si el blanco no puede precisarse, marcar
   `coverage_gap` y escalar. Una restauración sin blanco exacto es una
   adivinanza.

4. **Conflictos y riesgos.** ¿La restauración pisará trabajo no confirmado? ¿Hay
   archivos no rastreados que colisionan? ¿Hay conflictos con upstream? ¿Hay
   cambios en el árbol que el `git checkout`/`restore`/`stash pop` descartaría?
   Para cada riesgo, declarar: qué se pierde, qué se preserva, y la mitigación
   que el operador aprueba. Un riesgo no mitigado es `coverage_gap`. Descartar
   trabajo no confirmado sin aprobación explícita es una violación fail-closed.

5. **Secuenciar los pasos.** El orden de la restauración importa. ¿Se hace
   `stash pop` antes o después del `checkout`? ¿Se restaura el branch entero o
   archivos sueltos? ¿Hay un paso de verificación intermedio (status, diff)
   entre pasos destructivos? Declarar dependencias explícitas entre pasos: "el
   paso B depende de que el paso A dejó el árbol limpio". Si una secuencia es
   ambigua, se descompone hasta que cada paso tiene un único efecto observable.

6. **Confirmar antes de restaurar.** Cada paso destructivo — `git checkout`,
   `git restore`, `git stash pop`, descarte de cambios — queda detrás de
   confirmación explícita del operador. El skill entrega el plan de
   restauración secuenciado en prosa y se detiene. No ejecuta git. No abre
   red. No descarta nada sin aprobación. Una restauración sin confirmación es
   una violación del modo fail-closed.

**Regla anti-skip:** no se ejecuta ningún paso de git sin un plan de
restauración aprobado por el operador. Si el operador pide "restaura ya", se
responde con el plan secuenciado primero; si lo rechaza, se documenta la
decisión y se marca `coverage_gap` en lugar de ejecutar a ciegas. Descongela
antes de ejecutar — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, `git checkout`, `git restore`, `git stash pop`, commits,
  pushes, ni merges. Toda operación git queda detrás de confirmación explícita
  del operador.
- NO descarta trabajo no confirmado sin aprobación explícita del operador.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  `~/.gstack/sessions`, hooks, telemetría, analytics). Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO auto-arranca la restauración del checkpoint. Todo gate de ejecución
  (git, checkout, restore, stash pop, descarte) queda detrás de confirmación
  explícita del operador.
- Si una dimensión no puede completarse por falta de contexto (no hay
  checkpoint, no hay blanco preciso, no hay estado actual), se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una pulida
  conjetura.

El único entregable es el plan de restauración en prosa, revisable por el
operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-unfreeze/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de checkpoint (no hay freeze, no hay blanco, no hay estado
  actual), se emite `coverage_gap` en lugar de fabricar una restauración
  genérica.
