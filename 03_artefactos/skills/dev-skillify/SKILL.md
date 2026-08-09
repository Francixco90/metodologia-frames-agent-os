---
name: dev-skillify
description: This skill should be used when el operador pide convertir un procedimiento o workflow reutilizable en un skill declarado — nombrarlo, redactar el frontmatter, acotar el alcance, diseñar fixtures positivo y negativo, escribir un checker autocontenido y dejar la cadena de lineage y receipt — sin auto-crear archivos ni auto-mutar el registro de skills, todo tras confirmación explícita del operador.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Skillify — convertir un procedimiento reutilizable en un skill declarado

Derivada de skillify (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero principal que recibe un procedimiento o
workflow reutilizable que ya funcionó y lo eleva a un skill declarado on-disk:
reproducible, gobernable y verificable. Un procedimiento que se ejecutó una vez
no es un skill — es una corrida. Este skill interroga el procedimiento dimensión
por dimensión hasta que queda declarado: nombre claro, frontmatter completo,
alcance acotado, fixtures que documentan el caso feliz y el caso prohibido, un
checker autocontenido y una cadena de proveniencia. El entregable es el diseño
del skill en prosa, listo para que el operador decida escribirlo. No código. No
commits. No escritura automática.

La premisa es simple: un procedimiento que no se skillifica se re-ejecuta mal.
"varios pasos" no sirve — se nombra el skill con slug exacto—; "hace de todo" no
sirve — se acota a un solo concern—; "funciona" no sirve — se diseña un fixture
negativo con `violation:` explícito. No se adivina: si no se sabe algo del
procedimiento, se dice y se pregunta, o se lee el contexto primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "convierte este procedimiento en skill" / "skillifica este workflow"
- "haz un skill a partir de este proceso reutilizable"
- "declara este procedimiento como skill"
- "codifica este flujo para reutilizarlo"
- cualquier procedimiento o workflow ya ejecutado con éxito que el operador
  quiere convertir en un skill declarado y gobernable.

No usar cuando el procedimiento aún no existe (ahí toca especarlo y ejecutarlo
primero), ni cuando el skill ya está declarado y lo que se necesita es afinarlo
(eso es `dev-plan-tune`) o revisarlo. En esos casos otra habilidad toma el
relevo.

## Las dimensiones de la skillificación

El skill declara el procedimiento a lo largo de seis dimensiones. Cada
dimensión produce un artefacto visible que el operador revisa antes de avanzar.

1. **Nombrado.** Elegir un slug para el skill: letras minúsculas, dígitos y
   guiones, ≤32 caracteres, empieza por letra, sin guiones consecutivos. El
   nombre describe el concern único, no la herramienta. Junto al nombre, listar
   3-5 frases disparadoras que el agente pueda matchear en futuras invocaciones
   —mezclar la frase canónica con paráfrasis. Un nombre que no describe el
   concern entierra el skill; un nombre que describe la herramienta lo ata a un
   vendor.

2. **Frontmatter.** Declarar los metadatos del skill: `name`, `description` (en
   una línea, empieza con "This skill should be used when"), `version`,
   `license`, y `metadata` con `owner`, `lifecycle_state`, `execution_scope` y
   `model_agnostic`. El frontmatter es el contrato de gobernabilidad del skill
   —sin él, el skill no es gobernable. Si un campo no puede completarse por falta
   de contexto, se marca `coverage_gap` y se detiene.

3. **Alcance.** Acotar el skill a un solo concern. Declarar explícitamente qué
   hace y qué NO hace. Un skill que "hace de todo" no es un skill — es un
   mono-lito. Listar las no-funcionalidades: no auto-crea archivos, no
   auto-muta el registro de skills, no ejecuta git, tests ni commits, no abre
   red, no publica, no despliega. El alcance se documenta en el cuerpo del
   `SKILL.md` en prosa; el operador confirma antes de escribir nada.

4. **Fixtures.** Diseñar un caso positivo y un caso negativo. El positivo
   muestra el flujo correcto: el operador pide skillificar y el skill produce el
   diseño sin auto-escribir. El negativo documenta el límite con un escalar
   plegado `violation: >` —por ejemplo, auto-crear los archivos del skill o
   auto-mutar el registro sin confirmación del operador. El fixture negativo es
   el contrato fail-closed del skill; sin él, no hay gate verificable.

5. **Checker.** Escribir un checker autocontenido (`scripts/check-skill.mjs`)
   que valide presencia de tokens de gobernabilidad, ausencia de APIs
   prohibidas (`Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`,
   `setInterval`), ausencia de rutas absolutas y completitud del fixture
   negativo (`violation:`). El checker lee del cwd, no de rutas hardcodeadas.
   Es el primer test del skill —si el checker no pasa, el diseño no está
   terminado.

6. **Lineage y receipt.** Declarar la proveniencia del skill: `LINEAGE.yml`
   con `skill_id`, `version`, `content_origin` (`locally_authored_adaptation`),
   `derivation_mode` (`clean-room-prose-from-permissive-reference`),
   `external_fragments_reused: false` y `authority_refs` que apuntan a las
   fuentes reales. Declarar el runtime boundary en `receipts/runtime-boundary.yml`
   con `execution_boundary: requires_user_confirmation` y `network_allowed:
false`. Un skill sin proveniencia no se puede auditar; un skill sin boundary
   no se puede gobernar.

**Regla anti-skip:** no se escriben archivos sin un diseño aprobado por el
operador. Si el operador pide "escríbelo ya", se entrega el diseño completo en
prosa primero; si lo rechaza, se documenta la decisión y se marca
`coverage_gap` en lugar de escribir a ciegas. Skillifica antes de escribir —
siempre.

## Cierre documental transversal

Si el operador autoriza materializar o modificar el skill, completar un
`DocumentationImpactPlanV1` antes de la primera mutación; cada superficie queda
`REQUIRED` o `NOT_APPLICABLE` con reason code. Tras congelar el candidate,
sincronizar las superficies requeridas y obtener un
`DocumentationClosureReceiptV1` hash-bound con PASS. No declarar el trabajo
terminado hasta que RT-09 conceda `DOCS_TRANSVERSAL_COMPLETE`. Un cambio posterior
invalida el receipt y abre successor; este gate no concede publicación.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO crea archivos del skill (`SKILL.md`, `LINEAGE.yml`, fixtures, checker,
  receipt). Toda escritura queda detrás de confirmación explícita del
  operador.
- NO muta el registro de skills. Toda promoción al registry queda detrás de
  confirmación explícita del operador.
- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría, mockup generators, hooks, plan-mode,
  `AskUserQuestion`). Esos artefactos del referenciador se descartaron en la
  adaptación.
- Si una dimensión no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una pulida
  conjetura.

El único entregable es el diseño del skill en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-skillify/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de procedimiento (no hay workflow reutilizable cerrado, no
  hay concern claro), se emite `coverage_gap` en lugar de fabricar un diseño
  genérico.

Derivada de skillify (garrytan/gstack, MIT).
