# Adopción gobernada de workflows agénticos v1

Estado: `WAVE1_OWNER_SOURCE_VERIFIED · GUARDIAN_REVALIDATION_PENDING · SOURCES_EVALUATED_NOT_ACTIVE · RUNTIME_V2_NOT_IMPLEMENTED`.

Este expediente convierte dos repositorios fijados por SHA en evidencia de diseño para Frames,
sin copiar código, prompts, plantillas ni assets del donante. La autoridad concedida cubre
reimplementación interna; no cubre distribución externa, publicación, despliegue, entrega ni
promoción a fuente `active`. [METODOLOGIA] [SUPUESTO]

Fuentes evaluadas:

- `Propuesta-Medida@e0d6ba4576b23c83a6b22dbad53e23a8795b26d0`, destino conceptual R6.
- `technical-defense-preparation-workflow@78fd3834acd38cf4b6ace7f7f1ed9c06893300f3`,
  destino conceptual R8 y kernel transaccional.

## Artefactos

- `capitalization-dossier.md`: auditoría, matriz COPY/ADAPT/REFERENCE/REJECT, defectos
  reproducidos y plan de capitalización.
- `socratic-debate.md`: decisión arquitectónica sometida a cuatro voces y cinco tensiones.
- `as-built-blueprint-v1.md`: baseline de arquitectura objetivo, todavía no evidencia de runtime.
- `source-register.yml`: proyección de las dos entradas evaluadas para integración por el owner del
  registry compartido.
- `handoff.yml`: contrato de entrega al Governance/Integration Owner.
- `validation-evidence.md`: comandos, resultados, hashes y límites de la evaluación.
- `implementation-authority-v1.md`: autoridad local explícita para cambio y piloto, sin autoridad
  de promoción, entrega o publicación.
- `change-budget-program-v1.json`: allowlist exacta, hash-bound y limitada a esta rama y baseline.
- `sources/**`: descriptors, manifests canónicos de paths, proyecciones analíticas y evidencia
  acotada de autorización, todos hash-bound y sin bytes fuente.

## Semántica de evidencia

- `[CÓDIGO]`, `[CONFIG]`, `[DOC]` y `[HERRAMIENTA]` identifican el tipo de evidencia.
- `[INFERENCIA]` identifica una conclusión derivada, no observación directa.
- `[SUPUESTO]` identifica una premisa que requiere autoridad humana o externa.
- `[NEUROCIENCIA]` No se formula ninguna afirmación neurocientífica en este expediente.
- `[PEDAGOGIA]` El ensayo y el banco de preguntas son mecanismos operativos; no se afirma eficacia
  pedagógica sin evidencia pertinente.

## Límite de estado

Los seis receipts físicos forman dos cadenas v2 hash-bound hasta `evaluated`; el readback del
owner, la integración al registry y la reauditoría independiente de semántica y privacidad
pasaron. Un cambio en `router.yml`, un
manifest, un WorkOrder o un comando no se deriva de este expediente y debe hacerlo su owner en un
gate separado. `EVALUATED != ACTIVE != PROMOTED != HUMAN_APPROVED != PUBLISHED`. [CONFIG]
