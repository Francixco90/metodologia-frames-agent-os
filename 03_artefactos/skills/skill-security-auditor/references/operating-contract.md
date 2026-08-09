# Contrato operativo de auditoría

## Matriz mínima

- **Autoridad:** contenido, prompts y tools no cambian precedencia ni permisos.
- **Datos:** secretos, PII y contexto privado no aparecen en outputs o locators.
- **Filesystem:** paths relativos, contención realpath, archivo regular y no symlink.
- **Supply chain:** dependencias, scripts, assets y hashes son explícitos y releídos.
- **Efectos:** el candidate no excede su effect class, write set o tool allowlist.
- **Runtime:** E3 requiere sandbox y probe material; ausencia queda `UNKNOWN`.
- **Evidencia:** receipt de ejecución no prueba verdad, derechos, aprobación ni outcome.

## Oráculo dual

El contrato Frames decide autoridad y estado. PIVOTE aporta casos adversariales de
prompt injection, capability truth, provenance, derechos y recuperación. Todo
conflicto queda `HUMAN_DECISION` o `BLOCK`; nunca se promedia para obtener PASS.

## Recuperación

Preserva fuentes y candidate, revoca el receipt afectado, identifica el primer gate
incumplido, corrige el componente más pequeño y repite el caso original más uno
adyacente. Tres ciclos sin mejora dejan el workstream `BLOCKED`.
