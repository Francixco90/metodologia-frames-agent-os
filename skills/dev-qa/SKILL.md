---
name: dev-qa
description: This skill should be used when the operator requests a rigorous pre-merge QA review of a feature or pull request — it walks a checklist across correctness, edge cases, error handling, test coverage, regressions, naming, and security surface, and delivers prose findings plus a verdict for local evaluation only; it never auto-runs git, tests, or commits without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Dev QA — revisión pre-merge

Derivada de qa/SKILL.md (garrytan/gstack, MIT).

El rol aquí es el de un revisor que se niega a estampar un sello. Una revisión
de QA no es un trámite; es la última barrera entre un diff y la rama principal.
Este skill recorre un checklist por dimensión sobre el diff o la feature
entregada, documenta cada hallazgo en el momento en que aparece —sin
acumularlos— y emite un veredicto en prosa para evaluación local. No ejecuta
git, no lanza tests, no commitea, no publica. Todo gate de ejecución queda
tras confirmación explícita del operador: fail-closed por diseño.

La disciplina es no-rubber-stamp: si no hay nada que objetar tras una pasada
honesta, se dice "sin hallazgos" —pero solo tras haber recorrido las siete
dimensiones. Un "todo bien" sin evidencia es un hallazgo en sí mismo. Y
fail-fast: ante un blocker (corrupción de datos, rotura de un flujo core,
regresión confirmada), se detiene la revisión y se escala el bloqueante antes
de seguir documentando cosméticos.

## Cuándo usar

Usar este skill cuando el operador pide:

- "review este PR" / "QA este diff antes de merge"
- "revisa esta feature antes de integrar"
- "encuentra qué puede romper" + un diff o una rama
- "está listo para merge?" + cambios entregados
- cualquier petición de verificación rigurosa de un cambio antes de integrarlo
  a la rama principal.

No usar para inspección de un sitio en producción sin diff (ese es QA de
navegación, no pre-merge), ni para auditoría de seguridad dedicada, ni para
ejecutar la suite de tests —ese es trabajo del operador con confirmación.

Si no se entrega un diff, una rama, ni una lista de archivos cambiados, marcar
`coverage_gap` y pedir el input bloqueante antes de proseguir. No se adivina
sobre qué se hace la revisión.

## Cómo

1. **Identificar el alcance del cambio.** Pedir el diff (rama vs main, PR, o
   lista de archivos). Sin alcance, `coverage_gap`. Cruzar mensajes de commit
   y descripción del PR con el diff real: ¿el cambio hace lo que dice hacer?

2. **Recorrer el checklist por dimensión.** Siete dimensiones, en orden. No
   se salta una dimensión "porque parece estar bien" —se recorre y se
   constata, o se declara no-evaluable con `coverage_gap`.

   - **Corrección:** ¿la lógica nueva hace lo que el intent declara? ¿Los
     tipos encajan, los nulls se manejan, los paths cubren las ramas que el
     diff dice cubrir? Si el cambio toca un flujo core, verificar el flujo
     completo, no solo la línea editada.
   - **Casos límite:** entradas vacías, nulas, fuera de rango, longitudes
     extremas, caracteres especiales, colecciones de tamaño cero o uno.
     Preguntar: ¿qué otros inputs pegan el mismo codepath?
   - **Manejo de errores:** ¿los fallos son observables, no silenciados? ¿Un
     catch no traga una excepción crítica? ¿Los fallbacks no enmascaran un
     bug? Un error silenciado es un hallazgo.
   - **Cobertura de tests:** ¿existen tests para el comportamiento nuevo? Si
     se arregló un bug, ¿hay un test de regresión que se rompa sin el fix? No
     se exige cobertura total, pero el cambio nuevo sin test asociado es un
     hallazgo documentado.
   - **Regresiones:** ¿el diff puede romper páginas, endpoints o flujos
     adyacentes? Si un fix empeora el estado general, es blocker: detener y
     escalar. Revertir es decisión del operador, no del skill.
   - **Naming y convenciones:** nombres claros, consistentes con el repo, sin
     abreviaciones opacas. Un nombre que miente sobre lo que hace la función
     es un bug latente.
   - **Superficie de seguridad:** ¿se introducen secretos, PII, rutas
     autenticadas nuevas, SQL dinámico, deserialización, o cambios de
     permisos? No se audita la app entera —solo lo que el diff toca.

3. **Severidad y triage.** Clasificar cada hallazgo:
   - **crítico:** bloquea un flujo core, causa pérdida de datos, o rompe la
     app → blocker, detener la revisión y escalar.
   - **alto:** feature mayor rota sin workaround.
   - **medio:** feature funciona con problemas notorios, existe workaround.
   - **bajo:** cosmético o pulido.

4. **Fail-fast en blockers.** Ante un hallazgo crítico, se detiene la
   revisión en curso, se documenta el bloqueante con evidencia (archivo,
   línea, repro), y se escala al operador. No se sigue documentando
   cosméticos mientras hay un blocker vivo.

5. **No-rubber-stamp.** Si tras las siete dimensiones no hay hallazgos, se
   emite "sin hallazgos tras pasada completa" —nunca un "todo bien" vacío.
   Un veredicto afirmativo sin evidencia de la pasada es un defecto de
   revisión.

6. **Veredicto.** Cerrar con un veredicto en prosa: **listo para merge**,
   **listo con hallazgos no-bloqueantes**, o **bloqueado** (lista de
   blockers). El veredicto es orientación para el operador, no una acción:
   el merge es decisión humana tras confirmación.

## Fail-closed

- NO se ejecuta git, tests, ni commits de forma automática. Todo gate de
  ejecución queda tras confirmación explícita del operador.
- NO se accede a red, ni se invoca CLI externa, ni se publica nada. El skill
  es local-evaluation only.
- NO se auto-decide el merge. Un veredicto "listo" no es un merge; es
  orientación. El operador ejecuta o no.
- NO se inventa el alcance. Sin diff, rama o lista de archivos, se marca
  `coverage_gap` y se pide el input bloqueante. Una ausencia no se sustituye
  por una inferencia pulida.
- NO se persiste chain-of-thought, secretos, PII ni locators privados en los
  hallazgos.

## Validación

- `pnpm verify:skills` valida estructura y contratos del skill.
- `node skills/dev-qa/scripts/check-skill.mjs` verifica recursos gobernados,
  clean-room y fail-closed — debe imprimir
  `PASS dev-qa: 6 governed resources, clean-room, fail-closed.`
- Sin diff entregado, marcar `coverage_gap` explícito en el veredicto y pedir
  el input bloqueante. Escalada > asunción.
