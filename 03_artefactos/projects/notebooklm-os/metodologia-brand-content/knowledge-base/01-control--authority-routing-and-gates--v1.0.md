# Autoridad, routing y gates

Versión: `v1.0`
Estado: `ACTIVE`

## Función del notebook

El notebook es una proyección para recuperar, estudiar y crear. Los originales, manifiestos y activos aprobados conservan autoridad. Una respuesta del chat o una generación de Studio no modifica el canon. [METODOLOGIA]

## Routing

- Pregunta sobre marca, método, currículo o fuente: recuperar y citar.
- Solicitud de contenido: ContentOS diseña la intención y el brief; NotebookLM OS selecciona fuentes, opera Studio y verifica.
- Solicitud mixta: encadenar diseño de contenido y operación del notebook sin fusionar autoridades.
- Solicitud de compartir, publicar o eliminar: detener y pedir el gate correspondiente.

## Estados

- `DRAFT`: creado, no verificado.
- `RENDERED_DRAFT`: existe una representación visible.
- `VERIFIED_DRAFT`: bytes descargados, formato y contenido releídos.
- `HUMAN_APPROVED`: Javier aprobó voz y visuales.
- `READY`: cumple condiciones de distribución, todavía no publicado.
- `PUBLISHED`: existe receipt y readback del canal final.

Ningún estado implica automáticamente el siguiente. [METODOLOGIA]

## Gates

- Crear notebook, configurar chat o importar: `NLM_PLAN_APPROVED`.
- Sincronizar Drive: `NLM_SYNC_APPROVED`.
- Generar Studio: `NLM_STUDIO_GENERATION_APPROVED`.
- Invitar o hacer público: `NLM_SHARE_AUTHORIZED`, de un solo uso.
- Eliminar: `NLM_DESTRUCTIVE_AUTHORIZED`, con targets resueltos y readback.

## Identidad y deduplicación

La identidad de una fuente se resuelve por Drive ID, URL canónica o hash. Un título igual con hash distinto es una versión o un conflicto. Dos procedencias con el mismo hash son un contenido con múltiples receipts. [METODOLOGIA]

## Presupuesto activo

- Hasta 15 controles.
- Hasta 15 activos o referencias.
- Hasta 20 fuentes de trabajo.

Los corpus grandes se organizan en packs versionados. Este perfil integra 43 PDF por decisión humana expresa; las consultas y generaciones deben seleccionar `source_ids` explícitos. [METODOLOGIA]
