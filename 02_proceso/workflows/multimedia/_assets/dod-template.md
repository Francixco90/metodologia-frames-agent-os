# Definition of Done — Multimedia P00–P09

**Fuente**: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato, sección `#quality`. [DOC]

## DoD global

Se ejecutó **una sola etapa**; el alcance observado es explícito; existe un **artefacto versionable**, **criterios de aceptación**, **riesgo**, **fallback** y **siguiente acción**; ninguna ejecución o aprobación fue inventada. [DOC]

## Checklist de cierre por workflow

Todo workflow P00–P09, antes de emitir receipt y detenerse en su gate, debe afirmar:

- [ ] Una sola etapa ejecutada (no se mezclaron P0N con P0M).
- [ ] Alcance observado declarado explícitamente (sección SITUACIÓN del `prompt-spec.md`).
- [ ] Artefacto versionable producido con `schema_ref` declarado en `workflow.yml.outputs`.
- [ ] Criterios de aceptación del `prompt-spec.md` §CRITERIO satisfechos.
- [ ] Riesgo residual registrado.
- [ ] Fallback del `prompt-spec.md` §FALLBACK transcribible si la etapa falla.
- [ ] Siguiente acción + siguiente gate explícitos (`next_workflow` + `gates[0]`).
- [ ] 4-tupla O/I/A/R completa (ver `evidence-tuple.md`).
- [ ] Receipt `multimedia-workflow-receipt-v1` emitido y hash-bound.
- [ ] Ninguna aprobación inventada: `human_approved: false` hasta gate manual.

## Estados no negociables

`RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`. Un build o render exitoso **nunca** concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`. [CONFIG]
