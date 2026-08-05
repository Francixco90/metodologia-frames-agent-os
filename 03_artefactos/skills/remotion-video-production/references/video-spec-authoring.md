# video-spec-authoring

## Propósito

Convertir `00-source-script.md` en `01-video-spec.yml` sin añadir claims ni permisos.

## Procedimiento

1. Registrar `spec_id`, versión, proyecto y `source_snapshot_id`.
2. Enumerar claims permitidos y prohibidos por ID.
3. Fijar audiencia, objetivo, CTA, canal y estado esperado `RENDERED_DRAFT`.
4. Definir profiles separados para 16:9, 9:16 o 1:1; no inferir 30 fps ni 1080x1920.
5. Definir duración objetivo y tolerancia, safe zones, accesibilidad, audio y captions.
6. Declarar assets esperados mediante IDs; no insertar rutas ni URLs.
7. Declarar riesgos, gaps y stop rules.
8. Validar el documento contra `schemas/video-spec.schema.json`.

## Rechazos

- Claim sin entrada activa en el ledger.
- CTA o uso que exceda derechos.
- Perfil ambiguo, duración no acotada o locale no fijado.
- Estado final solicitado superior a `RENDERED_DRAFT`.

Fuente técnica: https://www.remotion.dev/docs/parameterized-rendering
