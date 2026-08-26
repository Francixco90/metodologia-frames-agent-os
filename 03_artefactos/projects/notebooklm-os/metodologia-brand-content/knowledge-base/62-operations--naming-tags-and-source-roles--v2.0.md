# Naming, tags y roles de fuente

Versión: `v2.0` · Estado: `ACTIVE_OPERATION_CONTROL`

## Naming local

Formato: `NN-layer--scope-topic--vX.Y.ext`.

- `NN`: capa ordenable;
- `layer`: `control`, `canon`, `evidence`, `templates`, `reference`, `assets`, `operations`, `pedagogy` o `archive`;
- `scope-topic`: slug ASCII, estable y específico;
- versión: cambia cuando cambia significado o precedencia.

Ejemplo: `70-pedagogy--s09-multimedia-con-ia--v1.0.md`. [METODOLOGIA]

## Título visible en NotebookLM

Formato preferido: `NN · Rol · Scope · Título · vX.Y`.

Ejemplos:

- `00 · Control · System Router · v2.0`
- `40 · Edition · S03 · Automatismo y Presencia · Mañana · 2026`
- `70 · Pedagogy · S09 · Multimedia con IA · v1.0`

No se renombran masivamente fuentes históricas si hacerlo rompe receipts; se crea un alias en el manifest. [METODOLOGIA]

## Labels

- `00 Control`
- `10 Canon`
- `20 Evidence`
- `30 Templates`
- `40 Golden References`
- `50 Assets`
- `60 Operations`
- `70 Pedagogy`
- `80 Working Sets`
- `90 Archive`

## Tags semánticos

Cada manifest declara: `scope`, `audience`, `confidentiality`, `content_type`, `authority`, `owner`, `version`, `validity`, `notebook_role`, `channel`, `week`, `rights`, `replaces` y `status` cuando apliquen. [METODOLOGIA]

## Roles

- `CONTROL`: gobierna comportamiento.
- `CANON`: definición vigente confirmada.
- `EVIDENCE`: sustenta o limita claims.
- `TEMPLATE`: compila producción.
- `GOLDEN_REFERENCE`: ejemplo o edición de calidad.
- `ASSET_CONTROL`: derechos y uso.
- `PEDAGOGY`: enseña y comprueba comprensión.
- `OPERATIONS`: gobierna ciclo y receipts.
- `ARCHIVE`: historia sin autoridad vigente.

El label facilita descubrimiento; nunca cambia autoridad por sí solo. [METODOLOGIA]
