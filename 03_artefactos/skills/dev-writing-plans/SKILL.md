---
name: dev-writing-plans
description: This skill should be used when the user has a specification or multi-step requirement and needs an implementation plan with traceable tasks, acceptance criteria, budgets, risks, and stop rules before execution.
version: 0.4.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Writing Plans

Convierte requisitos en un plan que otro implementador pueda ejecutar sin adivinar.
Derivada de superpowers/writing-plans (obra/superpowers, MIT) mediante adaptación
clean-room.

## Activación

Usar para specs multi-paso, refactors gobernados o planes de implementación. No usar para
ejecutar, investigar un bug aislado ni inflar una lista ya suficiente. Leer
[context.md](context.md), instrucciones aplicables y solo las superficies afectadas. Sin
spec o evidencia accesible, devolver `coverage_gap`.

## Inputs y autoridad

Congelar objetivo, no-objetivos, base, restricciones, fuentes y efectos. Distinguir hechos,
configuración, inferencias y supuestos. Una decisión nueva se etiqueta `[SUPUESTO]` hasta
aprobación; autoridad o ownership no resolubles bloquean.

## Descomposición

1. Mapear cada requisito a un resultado observable.
2. Identificar dependencias y el camino crítico.
3. Agrupar por capacidad coherente y writer; no por tipo de archivo.
4. Convertir cada grupo en incremento material y reversible.
5. Asignar owner, read/deferred/write sets, tools, budget y stop rule.
6. Separar producer, test author, verifier y Guardian cuando el riesgo lo exija.

Usar direct por defecto, chain para dependencia secuencial y subagent solo por juicio
especializado o separación real. Paralelizar únicamente write sets disjuntos.

## Contrato de tarea

Cada tarea declara: propósito, inputs, archivos exactos, pasos, output, pruebas, criterio de
aceptación, riesgos, rollback y siguiente gate. Un paso representa una acción; su criterio
incluye comando o inspección, salida esperada y condición de fallo. “Implementar”, “agregar
tests” o “manejar errores” sin detalle son placeholders y se reescriben.

## Trazabilidad y tamaño

Mantener una matriz `requisito → tarea → evidencia → gate`. Cero requisitos huérfanos y
cero tareas sin requisito. Declarar target/hard max por incremento y artefacto. Si un hard
max se supera, dividir; no crear override para ampliar el presupuesto. Generated outputs se
reportan aparte del authored churn.

## Riesgos y casos borde

- Cambios incompatibles: ADR, migración y rollback separados.
- Archivo compartido: un integrador único; productores no concurrentes.
- Herramienta no disponible: fallback o `coverage_gap`, nunca ejecución simulada.
- Gate humano: detener explícitamente; PASS técnico no equivale a aprobación.
- Requisito ambiguo: recomendar interpretación y preguntar solo si cambia materialmente el
  resultado.
- Plan mayor al límite: dividir por valor desplegable, no por capítulos arbitrarios.

## Cierre del plan

Auto-revisar cobertura, orden, tipos/nombres, ownership, privacidad, budgets y recovery.
Cerrar con recomendación, milestones, criterios de aceptación globales, gaps y primera
acción. El plan no autoriza su propia ejecución.

## Gobierno documental transversal

Antes de planificar o autorizar cualquier `CREATE`, `EXPAND`, `EXTEND`, `CORRECT`,
`MIGRATE` o `DEPRECATE`, exigir un `DocumentationImpactPlanV1` completo. No declarar el
trabajo terminado sin `DocumentationClosureReceiptV1` ligado al candidate y evidencia del
gate `DOCS_TRANSVERSAL_COMPLETE`; el plan no autoaprueba ese gate. Aplicar el contrato de
[gobierno documental](references/documentation-governance.md).

## Límites

Operación **fail-closed** y `local-evaluation`: sin commits, tests, builds, installs, red,
worktrees, hooks, publicación ni vendor runtime. Puede proponer comandos, no afirmar que se
ejecutaron. Evidencia insuficiente permanece `coverage_gap`.

## Validación

El checker local exige versión 0.4.0, lineage, fixtures, [context.md](context.md), ocho
headings, presupuesto y ausencia de APIs/rutas prohibidas. `pnpm verify:skills` valida el
paquete integrado.
