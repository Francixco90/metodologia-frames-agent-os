---
name: context-teammates
description: This skill should be used when the user wants to model, query, or coordinate a team of agents (teammates) — their roles, handoffs, shared context, and ownership boundaries.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context Teammates — modelar, consultar y coordinar un equipo de agentes

El rol aqui es el de un arquitecto que describe un equipo de agentes como una
reticula de roles, ownership y handoffs, no como una jerarquia de comandos. El
skill modela quienes componen el equipo, que hace cada uno, donde empieza y
termina su dominio, y como se transfiere el trabajo entre ellos. No ejecuta
agentes. No despacha tareas. No llama herramientas de vendor. Solo estructura
el contexto del equipo para que el operador lo inspeccione y actue.

**Gate duro:** no invoca agentes, no escribe estado compartido, no abre red. El
skill solo lee y presenta el modelo del equipo. Cualquier ejecucion, dispatch
o escritura queda detras de confirmacion explicita del operador.

## Cuándo usar

Usar este skill cuando el operador pide:

- "modelar el equipo" / "quienes participan" / "roles del equipo"
- "handoff entre agentes" / "quien le pasa a quien"
- "ownership boundaries" / "que hace cada agente" / "un writer por ruta"
- "contexto compartido del equipo" / "estado compartido"
- coordinar handoffs, declarar boundaries, resolver superposicion de
  ownership antes de ejecutar trabajo

No usar cuando lo que se necesita es ejecutar el equipo (esi es otro skill),
ni cuando basta un solo agente (no hay equipo que modelar), ni cuando el
operador solo quiere listar skills disponibles (ese es inventario, no
modelado). Si no hay equipo declarado o falta el roster, se marca
`coverage_gap` — no se inventan teammates.

## Qué es un teammate

Un teammate es una unidad de agencia con cuatro atributos fijos:

1. **Role.** La funcion que cumple en el equipo (researcher, writer, verifier,
   guardian). El rol define que produce, no a quien obedece — no hay
   orquestador. Cada teammate es peer de los demas.
2. **Ownership.** El dominio sobre el que tiene autoridad de escritura. Se
   expresa como rutas y tipos de artefacto. Fuera de su ownership, un teammate
   solo lee, propone o pide handoff — nunca escribe.
3. **Handoff.** El contrato de transferencia a otro teammate: que entrada
   recibe, en que estado, con que evidencia, y cual es el siguiente rol. Un
   handoff sin receptor declarado queda bloqueado — no se deja al aire.
4. **Boundary.** La frontera dura que no se cruza: un writer por ruta, sin
   excepciones. Si dos teammates reclaman la misma ruta, hay un conflicto de
   ownership que se resuelve antes de ejecutar, no durante.

Un teammate no es un nombre, una personalidad ni un prompt. Es un contrato de
rol + ownership + handoff + boundary. La identidad del agente que lo encarna
es intercambiable; el contrato no.

## Cómo modelar el equipo

- **Declarar el roster.** Listar los teammates con su rol y su ownership. Un
  teammate sin ownership declarado no es modelable — se marca `coverage_gap`
  antes de seguir.
- **Declarar los handoffs.** Para cada par productor-consumidor, fijar que
  artefacto se transfiere, en que estado (draft, reviewed, approved) y con que
  evidencia (hash, receipt, firma). Un handoff sin estado declarado es
  ambiguo y se bloquea.
- **Declarar el contexto compartido.** Que estado es comun a todos los
  teammates y cual es privado de cada uno. El contexto compartido se lee por
  todos; el privado solo lo escribe su dueno. Mezclarlos rompe la traza.
- **Declarar las boundaries.** Una ruta, un writer. Si la allowlist de un
  teammate se solapa con la de otro, se declara el conflicto y se resuelve
  antes de cualquier ejecucion — nunca se permite escritura concurrente sobre
  la misma ruta.

## Cómo coordinar

La coordinacion es por handoffs declarados, no por ordenes:

- Un teammate termina su trabajo y emite un handoff con receptor, artefacto,
  estado y evidencia. El receptor acepta explicitamente o rechaza con razon.
- Si un handoff queda sin receptor, el trabajo se marca bloqueado y se escala
  — no se asume que alguien lo recoge.
- El contexto compartido se actualiza solo por el dueno declarado de cada
  campo. Otro teammate que necesita un cambio lo pide por mensaje, no lo
  escribe por la mano.
- Los conflictos de ownership se resuelven antes de ejecutar: dos peers que
  reclaman la misma ruta es un bug del modelo, no una condicion de carrera.

## Ownership boundaries — un writer por ruta

Esta es la regla mas dura del skill:

- Cada ruta writable tiene exactamente un writer declarado. Sin writer
  declarado, la ruta es read-only para todos.
- Un teammate puede leer cualquier ruta; solo escribe dentro de su allowlist.
- Si un cambio toca rutas de dos teammates, se descompone en dos handoffs —
  cada uno escribe solo su parte. Nunca dos writers sobre la misma ruta.
- Las boundaries se declaran en el modelo del equipo antes de ejecutar. Si se
  descubren durante la ejecucion, se detiene, se declara el conflicto y se
  re-modela — no se improvisa.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO invoca agentes. No despacha tasks. No llama tools de vendor.
- NO escribe estado compartido. No muta el repositorio. No abre red.
- NO publica, no despliega, no activa conectores.
- Si falta el roster, el ownership, el handoff o el boundary, se marca
  `coverage_gap` y se detiene — no se infiere un equipo desde fragmentos
  sueltos. Una ausencia no se sustituye por una conjetura pulida.
- Si dos teammates reclaman la misma ruta, se declara el conflicto y se
  bloquea la ejecucion — no se elige un ganador en silencio.

El unico entregable es el modelo del equipo en prosa: roster, ownership,
handoffs, contexto compartido y boundaries, revisable por el operador antes
de cualquier ejecucion.

## Validación

- El checker local `skills/context-teammates/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y paths
  absolutos, los 4 campos scalar del frontmatter, los 10 campos de LINEAGE, y
  completitud de los fixtures.
- Si no hay equipo declarado, se emite `coverage_gap` en lugar de fabricar un
  modelo generico.

Derivada de teammates (DN-OpenSource/claude-skills, Apache-2.0).
