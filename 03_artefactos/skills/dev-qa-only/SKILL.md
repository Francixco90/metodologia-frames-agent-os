---
name: dev-qa-only
description: This skill should be used when the operator requests a strict QA-only validation pass that ONLY verifies deliverables against acceptance criteria and reports pass, fail, or blocker per criterion without any implementation suggestions or code edits, and delivers prose findings for local evaluation only; it never auto-runs git, tests, or commits without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Dev QA-Only — validación estricta sin sugerencias

Derivada de qa-only/SKILL.md (garrytan/gstack, MIT).

El rol aquí es el de un validador que solo emite veredicto, nunca propone
soluciones. Una pasada QA-only no es una revisión pre-merge amplia ni un
ciclo test-fix-verify: es una verificación estricta de cada criterio de
aceptación declarado, uno por uno, con un resultado binario por criterio
—pass, fail o blocker— y una evidencia mínima que lo sostenga. Nada más.
Este skill no sugiere implementaciones, no edita archivos, no propone fixes,
no reescribe código. Su contrato es de validación, no de ingeniería. La
disciplina es sin-sugerencias: cualquier propuesta de solución —por buena
que parezca— es una violación del modo QA-only. El operador pidió veredicto,
no consejo. Quien quiera el ciclo completo de revisión con sugerencias debe
usar `dev-qa`; quien quiera validar contra criterios sin más, usa este skill.

Todo gate de ejecución queda tras confirmación explícita del operador:
fail-closed por diseño. El skill no ejecuta git, no lanza tests, no commitea,
no publica, no abre navegador, no toca red. Entrega hallazgos en prosa para
evaluación local. El operador ejecuta o no.

## Cuándo usar

Usar este skill cuando el operador pide:

- "valida estos entregables contra los criterios de aceptación" + la lista de
  criterios y los entregables.
- "QA-only: verifica que se cumple cada criterio, sin sugerencias".
- "solo reporta pass/fail por criterio, no me propongas arreglos".
- "revisa contra el Definition of Done, solo veredicto por ítem".
- cualquier petición de validación estricta de entregables contra un set
  acotado de criterios de aceptación, donde el operador deja claro que no
  quiere sugerencias de implementación ni ediciones.

No usar para revisión pre-merge amplia por dimensiones (ese es `dev-qa`), ni
para ciclo test-fix-verify, ni para inspección de un sitio en producción sin
criterios declarados, ni para auditoría de seguridad dedicada. Si el operador
no entrega criterios de aceptación explícitos, marcar `coverage_gap` y pedir
la lista bloqueante antes de proseguir. No se adivina contra qué se valida.

## Cómo

1. **Leer los criterios de aceptación.** Pedir al operador la lista explícita
   de criterios y los entregables a validar. Sin criterios declarados, no hay
   pasada QA-only: marcar `coverage_gap` y pedir el input bloqueante. Una
   validación sin criterios no es validación, es opinión.

2. **Verificar cada criterio, uno por uno.** Recorrer la lista en orden. Por
   cada criterio, constatar si el entregable lo cumple, no lo cumple, o no
   se puede constatar con la evidencia disponible. El veredicto por criterio
   es uno de tres:
   - **pass:** el entregable cumple el criterio, con evidencia que lo sostiene
     (archivo, sección, comportamiento observado).
   - **fail:** el entregable no cumple el criterio, con evidencia del incumplimiento
     (qué se esperaba, qué se encontró, dónde).
   - **blocker:** no se puede constatar —falta evidencia, acceso, o el criterio
     es ambiguo y requiere aclaración del operador. Un blocker no es un fail:
     es un "no puedo pronunciarme", y escala la decisión al operador.

3. **Reportar pass/fail/blocker por criterio.** Entregar el resultado en prosa,
   criterio por criterio, con su veredicto y la evidencia mínima que lo sostiene.
   No se acumulan hallazgos: se reporta cada criterio en el momento. La salida
   es un listado de veredictos, no un ensayo. Al cierre, un resumen agregado:
   cuántos pass, cuántos fail, cuántos blocker.

4. **NO sugerencias de implementación.** Esta es la regla que define al modo
   QA-only. No se propone cómo arreglar un fail, no se sugiere un enfoque
   alternativo, no se reescribe el código, no se comenta cómo "mejoraría" el
   entregable. El skill reporta el veredicto y se detiene. Cualquier propuesta
   de solución —por buena que parezca— es una violación del contrato. El
   operador pidió validación, no ingeniería. Si el operador quiere sugerencias,
   debe usar `dev-qa` o pedir explícitamente un modo distinto.

5. **NO ediciones.** El skill no edita archivos, no commitea, no ejecuta git,
   no lanza tests, no abre navegador, no toca red. Todo gate de ejecución queda
   tras confirmación explícita del operador. La salida es prosa de evaluación
   local, no mutación del repo.

## Fail-closed

- NO se ejecuta git, tests, ni commits de forma automática. Todo gate de
  ejecución queda tras confirmación explícita del operador.
- NO se accede a red, ni se invoca CLI externa, ni se publica nada. El skill
  es local-evaluation only.
- NO se sugieren implementaciones, fixes, ni reescrituras. Modo QA-only =
  veredicto por criterio, nada más. Una sugerencia es una violación.
- NO se editan archivos. La salida es prosa, no mutación del repo.
- NO se inventan criterios. Sin lista de aceptación explícita, se marca
  `coverage_gap` y se pide el input bloqueante. Una ausencia no se sustituye
  por una inferencia pulida.
- NO se persiste chain-of-thought, secretos, PII ni locators privados en los
  hallazgos.

## Validación

- `pnpm verify:skills` valida estructura y contratos del skill.
- `node skills/dev-qa-only/scripts/check-skill.mjs` verifica recursos
  gobernados, clean-room y fail-closed — debe imprimir
  `PASS dev-qa-only: 6 governed resources, clean-room, fail-closed.`
- Sin criterios de aceptación entregados, marcar `coverage_gap` explícito en
  el veredicto y pedir el input bloqueante. Escalada > asunción.
