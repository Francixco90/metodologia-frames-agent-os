---
name: dev-freeze
description: This skill should be used when el operador pide congelar un checkpoint de trabajo en progreso antes de un cambio riesgoso — capturar el estado actual (archivos modificados, commits no empujados, diffs sin commitear, pendientes), describirlo en prosa como un snapshot recuperable, declarar qué se va a tocar después y dejar el punto de restauración anotado — sin auto-ejecutar git, stash, commit ni push.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Freeze — congelar un checkpoint de trabajo en progreso

Derivada de freeze (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero principal que, antes de que el operador
ejecute un cambio riesgoso, documenta un checkpoint recuperable del estado
actual del trabajo. "Congelar" no significa bloquear la escritura ni ejecutar
git: significa producir una descripción precisa y reentrante del estado — qué
archivos están modificados, qué commits existen localmente sin empujar, qué
diffs hay sin commitear, qué pendientes quedan arriba— de modo que, si el
cambio riesgoso rompe algo, el operador pueda volver a este punto con una
guía clara. El entregable es el checkpoint en prosa, revisable. No se ejecuta
git por el skill; toda operación git queda detrás de confirmación explícita del
operador.

La premisa es simple: antes de un cambio riesgoso, el estado actual es el
punto de restauración. Si no se documenta, el punto de restauración se pierde
en la memoria del operador. Este skill interroga el estado dimensión por
dimensión y produce un checkpoint tight: sin pasos vagos, sin "varios archivos"
sin lista, sin "dependerá" sin causa. No se adivina: si no se puede ver una
pieza del estado, se marca `coverage_gap` y se le pide al operador que la
provea o que la verifique.

## Cuándo usar

Usar este skill cuando el operador pide:

- "congela el estado antes de este cambio" / "freeze el checkpoint"
- "toma un snapshot del trabajo antes de tocar X"
- "déjame un punto de restauración antes del refactor riesgoso"
- "documenta el estado actual por si rompo algo"
- cualquier cambio riesgoso (refactor grande, migración, borrado, reescritura)
  donde el operador quiere un checkpoint recuperable antes de avanzar.

No usar cuando el cambio ya se hizo (ahí toca rescue o rollback), ni cuando lo
que se necesita es restringir el alcance de edición a un directorio durante
una sesión (eso es otro skill). Aquí se documenta un checkpoint antes del
cambio, no se bloquea escritura ni se ejecuta git.

## Las dimensiones del checkpoint

El skill congela el estado a lo largo de cinco dimensiones. Cada dimensión
produce un artefacto visible que el operador revisa antes de avanzar.

1. **Archivos modificados sin commitear.** Listar los archivos del árbol de
   trabajo que difieren del HEAD. Para cada uno: ¿qué tipo de cambio (nuevo,
   modificado, borrado, sin seguimiento)? ¿El cambio es grande o puntual? No
   se ejecuta `git status` por el skill — se le pide al operador el output o
   se describe lo que el operador reporte. Un archivo sin descripción es un
   `coverage_gap`. El checkpoint lista, no resume en "varios archivos".

2. **Commits locales no empujados.** Listar los commits que existen en la
   rama local pero no en el remoto. Para cada uno: hash (si el operador lo
   provee), mensaje corto, qué cambia. Si no se puede ver el remoto, se
   declara `coverage_gap` en lugar de asumir "ya está empujado". Un commit no
   empujado que se pierde del snapshot es un punto ciego.

3. **Diffs sin commitear significativos.** Para los diffs que no son trivial
   (más allá de whitespace o un typo), describir qué cambia. No se pega el
   diff completo — se resume el intent del cambio por archivo o por bloque
   coherente. Si un diff no se puede describir (binario, generado, opaco), se
   marca `coverage_gap` y se nombra el archivo.

4. **Pendientes y notas en vuelo.** Listar lo que el operador tiene en la
   cabeza pero no commiteado: TODOs en archivos, notas sueltas, decisiones
   tomadas en la sesión que no llegaron a commit, hipótesis pendientes de
   validar. El checkpoint captura lo que la memoria del operador lleva pero
   el repo no — eso es lo primero que se pierde si el cambio riesgoso rompe
   algo. Si el operador no reporta nada, se declara "ninguna pendiente
   reportada" (no se infieren pendientes).

5. **Próximo cambio riesgoso.** Declarar qué es lo que el operador va a
   tocar después del checkpoint. Para cada pieza: ¿qué archivos? ¿Qué tipo
   de cambio (borrar, reescribir, migrar, renombrar)? ¿Qué riesgo específico
   (rotura de tests, pérdida de datos, conflicto de merge, dependencias
   cruzadas)? El checkpoint sin el próximo cambio es solo la mitad — el
   punto de restauración solo tiene sentido relativo al riesgo que viene.

**Regla anti-skip:** no se inicia el cambio riesgoso sin un checkpoint
documentado y confirmado por el operador. Si el operador pide "haz el cambio
ya", se responde con el checkpoint primero; si lo rechaza, se documenta la
decisión y se marca `coverage_gap` en lugar de avanzar a ciegas. Congela antes
de tocar — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, merges, stash ni ninguna operación git.
  Toda operación git queda detrás de confirmación explícita del operador. El
  skill describe cómo se vería un checkpoint; no corre `git status`, `git
stash`, `git commit` ni nada por el estilo.
- NO bloquea escritura ni instala hooks. No restringe el alcance de edición.
  Eso corresponde a otro skill.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría, `check-freeze.sh`, hooks PreToolUse). Esos
  artefactos del referenciador se descartaron en la adaptación.
- NO auto-arranca el cambio riesgoso después de documentar el checkpoint.
  Todo gate de ejecución (git, tests, commits, deploys, el cambio mismo)
  queda detrás de confirmación explícita del operador.
- Si una dimensión no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el checkpoint en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-freeze/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de checkpoint (no hay cambios pendientes visibles, no
  hay próximo cambio riesgoso declarado), se emite `coverage_gap` en lugar de
  fabricar un checkpoint genérico.
