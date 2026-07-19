# Seguridad y privacidad

- Reporta vulnerabilidades de forma privada al owner del repositorio.
- No abras issues con secretos, PII, rutas locales, UUID de notebooks o credenciales.
- Los locators viven únicamente en `work/private/`, ruta ignorada.
- Los adapters externos son fail-closed y dry-run por defecto.
- Los receipts versionables usan IDs portables y hashes; nunca incluyen tokens ni locators reales.
- Un hallazgo crítico bloquea `GUARDIAN_PASS`, `HUMAN_APPROVED`, `READY` y cualquier release.
