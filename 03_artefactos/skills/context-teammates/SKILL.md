---
name: context-teammates
description: This skill should be used when the user wants to model or inspect agent roles, ownership boundaries, handoffs, shared context, and separation of duties before orchestration.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context Teammates

Compila un modelo de equipo verificable antes de desplegar agentes. No despacha ni simula
agentes. Derivada de teammates (DN-OpenSource/claude-skills, Apache-2.0) mediante
adaptación clean-room.

## Activación

Usar para definir roster, ownership, producer-verifier, handoffs o contexto compartido.
No usar si una ejecución directa basta, para listar skills ni para lanzar un team. Leer
[context.md](context.md) y el registry de agentes aplicable; si no hay roster autorizado,
emitir `coverage_gap`.

## Contrato de teammate

Cada miembro requiere:

- `actor_id` y `canonical_perspective`;
- objetivo y output material;
- read/deferred/write sets;
- tools y effect class;
- presupuesto y stop rule;
- receptor y gate del handoff.

Una personalidad o nombre sin este contrato no es un teammate operativo. Producer,
verifier y Guardian deben usar actores y sesiones distintos cuando el riesgo lo exige.

## Decisión de orquestación

1. Elegir `direct` si una transformación tiene un writer y contexto estrecho.
2. Elegir `chain` para dependencias secuenciales sin juicio independiente.
3. Elegir `subagent` por especialización, contexto aislado o separación de funciones.
4. Elegir team solo si dos especialistas necesitan coordinación entre pares y sus write
   sets son realmente disjuntos.

Si coordinar no añade evidencia, simplificar. Máximo lead más dos agentes activos salvo
contrato explícito; verifier y Guardian son secuenciales.

## Ownership y handoffs

Resolver rutas por path canónico. Cero o múltiples owners bloquean. Un cambio que cruza dos
owners se divide; nunca se concede escritura compartida. Cada handoff declara emisor,
receptor, candidate hash, outputs, evidencia, gaps y siguiente gate. Sin aceptación del
receptor, el trabajo permanece bloqueado.

El contexto compartido contiene estado, decisiones y artefactos mínimos. Mensajes privados,
chain-of-thought y corpus no asignado no se copian. Cargar solo el work order del rol y las
fuentes necesarias para su paso.

## Conflictos y recuperación

- Write sets solapados: detener y reasignar antes de ejecutar.
- Handoff sin receptor o output: `BLOCKED`.
- Agente que excede tools/effects: cancelar y preservar candidate.
- Verifier que remedia: invalidar independencia y crear successor.
- Reporte sin receipt material: estado `planned`, no `executed`.
- Falla repetida dos veces: escalar; no abrir equipos anidados.

## Límites

Operación **fail-closed**, read-only y `local-evaluation`: no lanza agentes, no escribe
estado compartido, no abre red, no publica y no activa conectores. No inventa roster,
ownership, identidad o resultados. Una ausencia permanece `coverage_gap`.

## Salida

Entregar una tabla compacta de miembros y un grafo de handoffs, seguida de conflictos,
presupuesto y recomendación de primitiva. Esta salida es propuesta; la ejecución requiere
work orders e invocaciones reales.

## Validación

El checker local exige versión, lineage, fixtures, [context.md](context.md), ocho headings,
presupuesto y ausencia de APIs/rutas prohibidas. `pnpm verify:skills` valida integración;
un roster documentado no acredita delegación.
