# Piloto `carousel` — Método antes que herramientas

Primer candidato del registro Instagram V2. Produce ocho tarjetas `1080×1350`, galería offline,
contact sheet, caption, alt text, manifests, hashes y revisiones independientes.

La fuente editable es `editorial/pilot-content.yml`; los contratos y artefactos se generan mediante
`pnpm carousel:build`. No editar outputs generados. El paquete se detiene en
`WORKFLOW_PILOT_REVIEW`: `RENDERED_DRAFT` no equivale a `HUMAN_APPROVED`, `READY` ni `PUBLISHED`.

## Límites

- El piloto prueba el workflow `carousel`, no valida los otros siete tipos.
- Los indicadores de ciclo, adopción y retrabajo son sugerencias de medición; no son resultados.
- No hay assets de terceros. Las formas son first-party y las fuentes usan OFL 1.1.
- Aprobar el piloto solo desbloquea `feed-text`; publicación y Ads siguen prohibidos.
