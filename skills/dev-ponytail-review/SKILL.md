---
name: dev-ponytail-review
description: This skill should be used when se hace revisión de código enfocada exclusivamente en over-engineering — encuentra qué eliminar (stdlib reinventado, dependencias innecesarias, abstracciones especulativas, flexibilidad muerta), una línea por hallazgo con ubicación, qué cortar y qué lo reemplaza
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Ponytail Review — revisión de over-engineering, una línea por hallazgo

El rol aquí es el de un revisor que solo caza complejidad innecesaria. No
corrige bugs, no audita seguridad, no mide performance — esos son otros
reviews. Este review solo hunts lo que se puede eliminar: stdlib reinventado,
dependencias que duplican la plataforma, abstracciones con una sola
implementación, flexibilidad que nadie usa, lógica que cabe en menos líneas.
El mejor resultado de un diff es que se vuelva más corto.

La premisa es simple: el código que no existe no se rompe, no se mantiene, no
se documenta, no se prueba. Antes de añadir, preguntar si ya existe en la
plataforma. Antes de abstraer, preguntar si hay un segundo caso. Antes de
configurar, preguntar si alguien setea ese flag. Lo que sobra se corta, no se
explica. La revisión es local: se lee el diff o el archivo, se enumeran los
cortes en una línea cada uno, se entrega la lista. No se aplica, no se
auto-ejecuta, no se publica. El operador confirma antes de tocar código.

Derivada de ponytail-review (DietrichGebert/ponytail, MIT).

## Cuándo usar

Usar este skill cuando el operador pide:

- "revisa over-engineering" / "qué podemos eliminar"
- "está sobre-ingeniado este código" / "simplify review"
- "revisa este diff por complejidad"
- "reduce este módulo"
- cualquier revisión cuyo objetivo exclusivo sea encontrar qué cortar.

No usar cuando la revisión es de correctness, seguridad o performance — esos
reviews tienen otro scope. Tampoco cuando se necesita un plan de refactor
cerrado (ahí toca `dev-plan-tune`). Un smoke test o `assert` de autochequeo es
el mínimo ponytail, no bloat — nunca marcarlo para eliminar.

## Formato de hallazgo

Un hallazgo por línea. El formato:

`L<line>: <tag> <qué cortar>. <reemplazo>.`

Para diffs multi-archivo: `<archivo>:L<line>: ...`

Tags:

- `delete:` código muerto, flexibilidad sin uso, feature especulativo. Reemplazo: nada.
- `stdlib:` cosa hecha a mano que ya viene en la librería estándar. Nombrar la función.
- `native:` dependencia o código que duplica lo que la plataforma ya hace. Nombrar el feature.
- `yagni:` abstracción con una sola implementación, config que nadie setea, capa con un solo caller.
- `shrink:` misma lógica, menos líneas. Mostrar la forma corta.

## Ejemplos

❌ "Esta clase EmailValidator quizá es más compleja de lo necesario, ¿has
considerado si todas estas reglas de validación son necesarias en esta etapa?"

✅ `L12-38: stdlib: 27-line validator class. "@" in email, 1 línea, la validación real es el mail de confirmación.`

✅ `L4: native: moment.js importado para una sola llamada de formato. Intl.DateTimeFormat, 0 deps.`

✅ `repo.py:L88: yagni: AbstractRepository con una sola implementación. Inline hasta que exista una segunda.`

✅ `L52-71: delete: retry wrapper alrededor de una llamada local idempotente. Nada lo reemplaza.`

✅ `L30-44: shrink: loop manual construye un dict. dict(zip(keys, values)), 1 línea.`

## Scoring

Cerrar con la única métrica que importa: `net: -<N> líneas posibles.`

Si no hay nada que cortar, decir `Lean already. Ship.` y detenerse.

## Errores comunes

| Error                                                            | Por qué está mal                               | Qué hacer                                   |
| ---------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| Prosa explicativa en vez de una línea                            | diluye el hallazgo, el operador no ve el corte | una línea: ubicación, qué cortar, reemplazo |
| Marcar un smoke test o `assert` para eliminar                    | el mínimo ponytail no es bloat                 | dejarlo, no es candidato                    |
| Mezclar correctness/security/performance en el review            | rompe el scope, esos son otros reviews         | enrutar a review normal, no a este skill    |
| Aplicar el corte sin confirmación del operador                   | rompe fail-closed, muta código sin gate        | proponer el corte, el operador confirma     |
| Abstraer para "futuras implementaciones" sin un segundo caso hoy | YAGNI especulativo, código que no se usa       | inline hasta que exista el segundo caso     |
| Reinventar stdlib sin nombrar la función                         | el reemplazo queda ambiguo                     | nombrar la función stdlib que reemplaza     |

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO elimina, edita ni reescribe código automáticamente. Solo propone cortes;
  el operador confirma antes de aplicar.
- NO ejecuta git, commits, pushes, tests, builds ni installs. Toda operación
  queda detrás de confirmación explícita del operador.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor ni hooks automáticos. Esos artefactos del
  referenciador se descartaron en la adaptación.
- Si un tramo del diff no es visible o falta contexto para evaluar un corte,
  se marca `coverage_gap` y se detiene — no se infiere ni se sustituye con
  una conjetura pulida.

El único entregable es la lista de hallazgos, una línea cada uno, revisable
por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-ponytail-review/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs
  prohibidas, ausencia de paths absolutos de usuario y completitud del
  fixture negativo.
- Si no hay código accesible para revisar, se emite `coverage_gap` en lugar
  de fabricar hallazgos genéricos.
