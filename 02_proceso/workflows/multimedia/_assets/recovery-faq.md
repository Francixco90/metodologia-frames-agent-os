# Fallos previsibles y recuperación — Multimedia P00–P09

**Fuente**: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato, sección `#quality` FAQ. [DOC]

## Tabla de recuperación

| Fallo | Recuperación |
|-------|-------------|
| **Mezclar etapas** | Volver al último artefacto aprobado. No reanudar desde un estado intermedio no validado. |
| **Asumir capacidades** | Emitir un Capability Report (P06) antes de continuar. Sin capabilities observadas, no se genera. |
| **Perder continuidad** | Reconstruir desde Biblia de continuidad + Asset Map (P05). Si no existen, retroceder a P05. |
| **Claim o permiso dudoso** | HOLD parcial sobre el artefacto afectado. Conservar evidencia. No publicar. |
| **Resultado débil** | Corregir localmente antes de regenerar. Regenerar de cero es último recurso, no primero. |
| **Publicación no autorizada** | Detener y conservar evidencia. Escalar a governance. El gate `MW_DISTRIBUTION_AUTHORIZED` es fail-closed. |

## Principio

La recuperación privilegia el último estado aprobado sobre el progreso aparente. Un rollback explícito vale más que una continuación asumida. [DOC]

## Integración

Cada `workflow.yml` declara su `fallback` por etapa (ver `prompt-spec.md` §FALLBACK). Esta FAQ es el marco global; el fallback por-prompts es el procedimiento específico. [CONFIG]