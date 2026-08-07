---
name: frames-token-efficiency-orchestrator
description: This skill should be used when the user asks to "usar RTK", "medir consumo con ccusage", "comprimir contexto con Headroom", "mapear código con Graphify", "usar Caveman", "auto-orquestar con Claude Native Toolkit", reduce terminal output, inspect token cost, or choose a cost-aware Frames orchestration primitive.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Frames Token Efficiency Orchestrator

Router Frames para seis capacidades externas homologadas mediante contratos
propios. Carga este archivo primero; abre un solo capítulo de `references/`
después de resolver una ruta. No copia prompts, identidad ni defaults del
vendor. [METODOLOGIA][CONFIG]

## Contrato

Optimizar el costo de contexto sin cambiar el significado del pedido, omitir
evidencia o ampliar autoridad. Un ahorro que vuelve irreproducible un gate no
es ahorro. La salida optimizada nunca sustituye el artefacto material, error,
exit code, hash, cita, evidence tag o veredicto que fundamenta una decisión.
[METODOLOGIA][CONFIG]

Opera `fail-closed`: solo `PASS` habilita la ruta optimizada.

Esta skill decide; no instala binarios, modifica hooks, crea índices
persistentes ni inicia proxies. Toda ejecución de una capacidad requiere
preflight local, presupuesto y confirmación según
`receipts/runtime-boundary.yml`. [METODOLOGIA][CONFIG]

## Routing determinista

Evalúa en orden y selecciona como máximo una transformación y un observador:

1. `usage_observation` → `references/adapters.md#ccusage` cuando se piden consumo, costo o budget.
2. `terminal_output` → `references/adapters.md#rtk` cuando una herramienta local produce salida
   voluminosa y existe recuperación verbatim.
3. `code_relationships` → `references/adapters.md#graphify` solo para código y registries, con
   índice privado, efímero y opt-in.
4. `context_window_pressure` → `references/adapters.md#headroom` solo en shadow/quarantine y con
   equivalencia recuperable demostrable.
5. `operator_concision` → `references/adapters.md#caveman` solo para coordinación interna; nunca
   para contenido, fuente, QA, Guardian o aprobación humana.
6. `orchestration_choice` → `references/adapters.md#claude-native-toolkit` cuando la tarea exige
   decidir entre direct, chain, subagent o workflow.

Si dos transformadores compiten, conserva la ruta más estrecha. No encadenes
RTK y Headroom sobre el mismo payload. Si ninguna ruta satisface sus gates,
continúa sin transformación y registra `coverage_gap`; no inventes un modo de
compresión. [METODOLOGIA][CONFIG]

## Preflight común

- Clasifica el payload: `evidence`, `code`, `tool_output`, `content_draft`,
  `private` o `verdict`.
- Resuelve owner, read set, write set, effect class y gate vigente.
- Declara baseline medible: bytes/tokens estimados, latencia y capacidad de
  recuperar el original.
- Verifica runtime y versión contra `references/source-lock.yml`; `UNKNOWN`
  bloquea el runtime, no la tarea principal.
- Preserva instrucciones L1, separación producer/verifier/Guardian y gates
  manuales. El contexto diferido permanece diferido.

## Invariantes de Frames

- `PASS` es la única condición de avance; `UNKNOWN` y `coverage_gap` bloquean
  claims de eficiencia o equivalencia.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.
- Logs crudos, índices, perfiles de uso y caches viven fuera de Git y no se
  convierten en fuentes.
- Ningún capítulo concede red, publicación, conector, rebaseline, H-03 ni
  cambio de `producerCutoverAllowed`.
- Caveman queda apagado para outputs humanos o publicables y para RT-09/RT-11.
- Guardian recibe evidencia sin transformar o una referencia hash-bound al
  original; nunca un resumen irrecuperable.
- Las cifras de ahorro se reportan como medición local, no como reducción de
  facturación, salvo evidencia del proveedor.

## Salida mínima

Devuelve `route_id`, capítulo cargado, baseline, presupuesto, preservaciones,
resultado `PASS|FAIL|UNKNOWN|BLOCKED`, fallback y siguiente gate. Si se ejecutó
una herramienta, incluye versión observada, exit code, hashes materiales y
ubicación privada del original; nunca persistas razonamiento privado.

## Stop rules

Detente y vuelve al modo verbatim ante pérdida de citas, tags, warnings,
errores, hashes, orden causal o código; colisión de hooks; índice con PII;
runtime distinto al lock; overhead mayor al ahorro; red o proxy no aprobado;
o imposibilidad de recuperar el original. [METODOLOGIA][CONFIG]

Derivada como adaptación clean-room de RTK, Caveman, Graphify,
claude-native-toolkit, ccusage y Headroom; fuentes y límites están fijados en
`references/source-lock.yml`. Los seis capítulos viven en
`references/adapters.md`; no reutiliza fragmentos externos.
