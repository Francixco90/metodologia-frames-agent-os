---
name: stitch-remotion-walkthrough
description: This skill should be used when the user asks to "audit the quarantined Stitch Remotion walkthrough", "assess a legacy Stitch-to-Remotion skill", or "plan a migration away from the legacy Remotion walkthrough".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Reference-only quarantine wrapper. Do not use for rendering or generic Remotion production.
metadata:
  owner: MetodologIA
  lifecycle_state: quarantined
  execution_scope: audit-only
---

# Stitch Remotion Walkthrough

Mantener esta skill en cuarentena. Usarla únicamente para auditar la existencia y el riesgo de una
skill legacy orientada a convertir pantallas de Stitch en walkthroughs Remotion.

No usarla para producir video, instalar dependencias, llamar MCP, descargar assets, copiar ejemplos
ni definir la skill canónica. Enrutar producción nueva a `remotion-video-production`.

## Procedimiento de auditoría

1. Leer `LINEAGE.yml`.
2. Confirmar que la copia legacy no está incluida en este paquete.
3. Confirmar que el registro conserva `current_state: quarantined`.
4. Comparar conceptos, no texto, contra la API oficial de Remotion fijada.
5. Registrar incompatibilidades, derechos, commit de origen y alcance.
6. Diseñar una migración limpia y original cuando exista permiso.
7. Exigir evaluación determinista completa antes de cualquier promoción.

## Hallazgos mínimos que deben permanecer visibles

- El identificador legacy `remotion` es demasiado genérico para un adapter Stitch.
- El flujo observado depende de superficies MCP obsoletas para el runtime actual.
- El ejemplo observado no representa correctamente la jerarquía y aritmética de transiciones.
- La procedencia exacta de la copia local y su licencia aplicable no están resueltas.
- La copia observada no aporta contracts, fixtures, lineage ni gates suficientes.

Consultar `references/quarantine-assessment.md` para la evaluación original resumida.

## Stop rules

Detener si se solicita:

- copiar código, scripts, ejemplos o documentación de la skill legacy;
- activar el ID genérico `remotion`;
- inferir licencia por similitud con un repositorio;
- ejecutar downloads o MCP desde este paquete;
- promover sin commit, licencia, rights, API parity y suite determinista.

Emitir `coverage_gap` y remitir a la skill canónica.

## Check

Ejecutar:

```bash
node skills/stitch-remotion-walkthrough/scripts/check-quarantine.mjs
```
