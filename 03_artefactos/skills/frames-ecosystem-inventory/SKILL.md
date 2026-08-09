---
name: frames-ecosystem-inventory
description: This skill should be used when the user asks to "inventariar Frames", "actualizar índices del ecosistema", "contar skills y workflows", "detectar assets huérfanos", or reconcile agents, routes, templates, commands and local extensions.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Frames Ecosystem Inventory

## Contexto operativo

Lee [`context.md`](context.md). Reconcilia filesystem, registries y relaciones para producir conteos y referencias comprobables; no mantiene cifras manuales. [METODOLOGIA][CONFIG]

## Procedimiento

1. Resuelve scope público, proyecto-local o usuario-local.
2. Carga registries y manifests canónicos antes de recorrer archivos.
3. Clasifica agentes, skills, rutas, workflows, templates, assets, entregables, componentes, renderers, adapters, gates y comandos.
4. Detecta duplicados, huérfanos, refs muertos, estado contradictorio y hashes stale.
5. Ordena por ID estable y genera JSON, Markdown y HTML desde el mismo modelo.
6. Compara dos ejecuciones offline y devuelve gaps sin fabricar estado.

Abre [`references/operating-contract.md`](references/operating-contract.md) para separación público/local y reglas de freshness.

## Invariantes

- Inventariar no activa, ejecuta, promociona ni publica capacidades.
- El inventario público excluye extensiones y locators privados.
- El inventario local vive en estado ignorado y muestra origen/scope.
- Un conteo en README deriva del inventario; no se edita a mano.
- Duplicados y refs irresolubles bloquean claims de completitud.

## Salida

Devuelve modelo, proyecciones, conteos derivados, hallazgos, hashes, replay y siguiente gate. `UNKNOWN` permanece visible.
