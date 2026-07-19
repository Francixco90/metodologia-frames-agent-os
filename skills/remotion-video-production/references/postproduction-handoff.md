# postproduction-handoff

## Propósito

Entregar un draft a postproducción sin perder trazabilidad.

## Paquete

Incluir input media hash, perfil, toolchain, assets permitidos, cambios autorizados, captions,
mezcla, color, safe zones, prohibiciones y aprobaciones vigentes.

## Ledger

Registrar por operación: tool y versión, comando o acción portable, timestamp, actor, input hash,
output hash, razón, cambio semántico, QA y rollback.

## Reglas

- Tratar cada output como nuevo artefacto.
- Invalidar aprobación ligada al hash anterior.
- Prohibir sustitución de claims, assets o audio sin volver al gate correspondiente.
- Repetir inspección de streams, A/V QA, captions y reproducción completa.
- Mantener `RENDERED_DRAFT` hasta aprobación humana independiente.
