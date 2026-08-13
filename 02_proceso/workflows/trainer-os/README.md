# Trainer OS — Contratos

[METODOLOGIA] Contratos y máquina de estados reiniciable para producir rutas formativas sin
conectores ni publicación.

Secuencia canónica:

`INTAKE → CONTEXT_READY → SPEC_READY → DESIGN_LOCKED → COMPILED → VERIFIED → HUMAN_REVIEW → RENDERED_DRAFT`

Esta unidad materializa únicamente los cinco schemas, las relaciones de estado e
invalidación, el proyecto gobernado y su lifecycle. Todavía no existe un runtime ejecutable:
`intake`, `spec`, `build`, `verify`, `package`, `benchmark`, la CLI, los receipts y las fixtures
se incorporan en PRs secuenciales posteriores. Declarar el contrato no acredita ejecución.

El techo es `RENDERED_DRAFT`. Producer no concede revisión humana, readiness ni publicación.

`coverage_gap`: no existe aún un gate ejecutable para Trainer OS; tampoco hay binding de
versión de runtime/compilador, medición de tokens ni integración con el registro global legado,
que todavía solo modela productos web y video.
