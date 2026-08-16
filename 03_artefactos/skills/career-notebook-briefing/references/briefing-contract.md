# Contrato de briefing Career Notebook v1

## Autoridad

Compilar desde fuentes canónicas ya cerradas. Incluir hashes de ledger, funnel y
track; no pedir a Studio que reconstruya el estado operativo. El digest excluye
IDs remotos y URLs firmadas, pero incluye métricas, fecha, fuentes y sistema visual.

## Capability probe

| Estado | Criterio | Acción |
| --- | --- | --- |
| `READY` | Lectura autenticada y cinco capabilities disponibles | Sincronizar y crear |
| `UNAVAILABLE` | Falta una capability | Conservar salida local |
| `BLOCKED_AUTH` | La lectura falla por autenticación | Detener mutación |
| `PARTIAL` | Una creación, consulta o descarga falla | Registrar artefactos completos y gap |

Ejecutar `notebook_get` primero. Verificar título/binding y fuentes antes de
`studio_create`. Crear con source IDs explícitos, consultar `studio_status`,
descargar y hashear. Nunca deducir éxito por una llamada aceptada.

## Identidad e idempotencia

- Daily: deck, data table y mind map.
- Weekly: deck e infographic, solo domingo después del daily.
- Título: `<artefacto> · YYYY-MM-DD · rN` o `YYYY-Www`.
- Un digest ya registrado produce `NO_MATERIAL_DELTA`.
- Un cambio el mismo día incrementa revisión; no elimina la anterior.

## Métricas

Exigir `strong_fit + partial_fit = confirmed`. Exigir
`labels_applied - overlapping_labels = unique_messages`. Mostrar labels y
conversaciones como magnitudes distintas. Separar hechos, inferencias y gaps.

## Revisión

Revisar todas las páginas descargadas: fecha, cifras, truncamiento, placeholders,
paleta dominante, densidad y próximos gates. Si el PDF es raster o no etiquetado,
mantener Markdown/CSV como compañero accesible y registrar el límite.
