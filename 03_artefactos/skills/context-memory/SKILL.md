---
name: context-memory
description: This skill should be used when the user wants to create, read, audit, or update durable project memory grounded in the current codebase and explicit user-approved facts.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context Memory

Mantiene memoria durable del proyecto como índice de hechos verificables, no como diario de
conversación. Derivada de memory (DN-OpenSource/claude-skills, Apache-2.0) mediante
adaptación clean-room.

## Activación

Usar cuando el usuario pide crear, consultar, auditar o actualizar memoria persistente. No
activar por una mención casual ni para capturar el estado efímero de una sesión; eso
corresponde a `context-save`. Leer [context.md](context.md) y confirmar la raíz antes de
acceder a memoria privada.

## Modelo de memoria

Cada entrada contiene: `fact`, `scope`, `source_ref`, `confidence`, `last_verified` y
`supersedes`. Los valores de confianza son `verified | user_confirmed | inferred | missing`.
Solo los dos primeros pueden guiar acciones; `inferred` es ayuda de navegación y `missing`
produce `coverage_gap`.

Guardar decisiones, propósito de módulos, entry points, contratos públicos, comandos
comprobados, dependencias y gotchas durables. Excluir secretos, PII, chain-of-thought,
opiniones transitorias, logs extensos y duplicados de documentación canónica.

## Operaciones

1. **Read:** cargar índice, entrada relevante y fuentes señaladas; diferir el resto.
2. **Bootstrap:** solo con intención explícita. Inspeccionar código real, proponer entradas y
   pedir aprobación antes de materializar.
3. **Update:** aplicar cambios dirigidos; no reescribir entradas manuales ni historia.
4. **Audit:** verificar referencias, contradicciones, staleness y duplicación; producir
   propuesta, no remediación silenciosa.

## Resolución de verdad

Código, contratos y receipts actuales prevalecen sobre memoria. Ante contradicción, marcar
la entrada `STALE`, citar ambas evidencias y bloquear su uso hasta resolverla. Las
correcciones crean successor con `supersedes`; no borran historia. Fechas describen eventos,
no identidad normativa.

## Context budget

Cargar máximo el índice, una entrada y hasta tres fuentes por paso. Si hacen falta más,
explicar por qué y dividir. Una lectura masiva de memoria o del repo viola menor contexto
suficiente. El handoff reporta entradas leídas, diferidas y cualquier gap.

## Casos borde

- Sin raíz o autoridad: no bootstrap; `coverage_gap`.
- Entrada sin fuente: conservar como `inferred`, nunca elevar a hecho.
- Fuente borrada: marcar stale y proponer reparación.
- Dos entradas equivalentes: enlazar/supersede, no fusionar historial automáticamente.
- Archivo editado por el usuario: pedir confirmación antes de reemplazar.
- Cambio menor interno: no actualizar si no altera lo que un futuro lector necesita.

## Límites

Operación **fail-closed** y `local-evaluation`: sin red, telemetría, hooks, publicación,
conectores ni memoria entre proyectos. Writes solo tras aprobación explícita y dentro del
state root privado. Nunca aparentar recordar algo que no tiene lineage material.

## Validación

El checker local exige versión, lineage, fixtures, [context.md](context.md), ocho headings,
presupuesto y ausencia de APIs/rutas prohibidas. `pnpm verify:skills` valida el paquete;
declarar memoria en YAML no prueba que fue leída o actualizada.
