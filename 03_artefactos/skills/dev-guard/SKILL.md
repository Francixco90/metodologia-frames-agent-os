---
name: dev-guard
description: This skill should be used when <establishing guards against regressions before a risky change>
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Guard — establecer guardias contra regresiones antes de un cambio riesgoso

Derivada de guard (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero principal que recibe un cambio riesgoso —un
borrado, una migración, una edición fuera de frontera, una operación
destructiva, un refactor de superficie amplia— y planta guardias antes de que
el cambio se ejecute. Una guardia es un invariant declarado en prosa: una
condición observable que debe seguir cierta después del cambio. Si la guardia
no pasa, el cambio se detiene. Este skill describe cómo levantar esas guardias;
no las ejecuta por sí mismo. No corre git, tests, builds ni deploys. No edita
archivos. Entrega un manifesto de guardias en prosa que el operador revisa y
ejecuta tras confirmación explícita.

La premisa es simple: un cambio sin guardia es una apuesta a ciegas. "Bórralo
ya" no sirve — se declara qué se rompe si se borra—; "migra y ya" no sirve —
se declara qué invariant debe seguir cierto—; "refactoriza todo" no sirve —
se declara qué contratos no pueden mutar. No se adivina: si no se sabe qué
proteger, se lee el contexto primero o se marca `coverage_gap`.

## Cuándo usar

Usar este skill cuando el operador pide:

- "pon guardias antes de este cambio" / "guard mode"
- "protége esto antes de tocarlo" / "lock it down"
- "qué no debería romperse si hago X"
- "máxima seguridad antes de este cambio riesgoso"
- cualquier cambio destructivo, refactor amplio o migración donde el operador
  quiere declarar invariants y pre-flight guards antes de ejecutar.

No usar cuando el cambio ya se ejecutó y lo que se necesita es rescue o
post-mortem, ni cuando se quiere ejecutar el cambio (ahí toca otro skill). En
esos casos otra habilidad toma el relevo.

## Las dimensiones del guardia

El skill levanta guardias a lo largo de seis dimensiones. Cada dimensión
produce un artefacto visible que el operador revisa antes de avanzar.

1. **Invariants del sistema.** Identificar qué condiciones observables deben
   seguir ciertas después del cambio. Para cada invariant, preguntar: ¿qué se
   rompe si cambia? ¿Es medible? ¿Quién lo consume? Declarar el invariant como
   una frase verificable: "el endpoint X responde 200 con payload Y", "el log
   no muestra trazas de Z", "el contador de W no baja". Un invariant sin
   medición es un deseo, no una guardia.

2. **Comandos destructivos.** Cazar operaciones que mutan estado de forma
   irreversible: `rm -rf`, `DROP TABLE`, `git push --force`, `git reset
--hard`, `DELETE FROM`, `terraform destroy`, sobrescritura de configuración
   sin backup. Para cada uno, declarar: ¿qué estado muta? ¿Hay snapshot o
   rollback? ¿Qué bandera lo confirma antes de ejecutar? Un destructivo sin
   confirmación explícita es un `coverage_gap`.

3. **Frontera de edición.** Declarar qué rutas se permiten editar y cuáles se
   bloquean. Para cada ruta fuera de la frontera, preguntar: ¿por qué alguien
   podría tocarla? ¿Qué la protege? Una frontera no declarada es frontera
   abierta — el skill la cierra por defecto y abre solo lo mínimo necesario.

4. **Dependencias de pre-condiciones.** Cazar dependencias que el cambio
   asume: datos que deben existir, servicios que deben estar arriba, permisos
   vigentes, contratos con otros equipos. Para cada uno, declarar: ¿quién la
   provee? ¿Cuándo se necesita? ¿Qué pasa si no está lista? Una pre-condición
   sin dueño es un `coverage_gap`.

5. **Regresiones conocidas.** Recuperar regresiones anteriores del mismo
   ámbito: ¿este cambio ya se intentó antes? ¿Qué se rompió? ¿Qué guardia lo
   habría atrapado? Una regresión no recuperada se repite. Declarar, por cada
   regresión conocida, una guardia explícita que la habría detectado.

6. **Secuencia de pre-flight.** Ordenar las guardias en una secuencia
   observable que el operador ejecuta antes del cambio: invariantes vigentes
   → snapshot/rollback listo → frontera declarada → pre-condiciones listas →
   guardias de regresión activas → cambio. Si un paso de la secuencia no puede
   verificarse, se marca `coverage_gap` y se detiene — no se infiere.

**Regla anti-skip:** no se inicia el cambio sin un manifesto de guardias
revisado y aprobado por el operador. Si el operador pide "ejecuta ya", se
responde con el manifesto primero; si lo rechaza, se documenta la decisión y
se marca `coverage_gap` en lugar de ejecutar a ciegas. Guarda antes de
ejecutar — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, merges, ni `git reset`. Toda operación git
  queda detrás de confirmación explícita del operador.
- NO ejecuta tests, builds, lint ni comandos de CLI externos. La orientación
  es prosa para evaluación local.
- NO edita, escribe ni borra archivos del repositorio. Solo declara guardias
  en prosa.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, hooks PreToolUse, scripts de
  careful/freeze, sesiones, analytics, telemetría). Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO auto-arranca el cambio guardado. Todo gate de ejecución (git, tests,
  commits, deploys, borrados) queda detrás de confirmación explícita del
  operador.
- Si una dimensión no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el manifesto de guardias en prosa, revisable por el
operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-guard/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de cambio (no hay cambio riesgoso, no hay invariant
  claro), se emite `coverage_gap` en lugar de fabricar guardias genéricas.
