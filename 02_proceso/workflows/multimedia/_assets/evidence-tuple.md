# Evidence 4-tuple O/I/A/R — Multimedia P00–P09

**Fuente**: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato. Cada prompt declara una 4-tupla de evidencia. [DOC]

## Contrato

Todo artefacto producido por un workflow P00–P09 debe acompañarse de la 4-tupla:

| Slot | Significado | Tag |
|------|------------|-----|
| **O — Observado** | Hecho constatable directamente del input, artefacto previo o ejecución. | `[CÓDIGO]` / `[CONFIG]` / `[DOC]` |
| **I — Inferido** | Conclusión derivada por razonamiento a partir de lo observado. | `[INFERENCIA]` |
| **A — Supuesto** | Hipótesis no verificada que sostiene la inferencia; debe marcarse. | `[SUPUESTO]` |
| **R — Dato requerido** | Información faltante necesaria para promover el artefacto; bloqueante si ausente. | `coverage_gap` |

## Reglas

1. Un claim sin fuente no puede marcarse `[DOC]`. [CONFIG]
2. Un claim sin límite no está completo — toda inferencia declara su supuesto. [CONFIG]
3. Una ausencia no se sustituye por una inferencia pulida — marcar `coverage_gap` explícito; escalada > asunción. [CONFIG]
4. Producer, verifier y Guardian deben ser distintos. [CONFIG]
5. El receipt `multimedia-workflow-receipt-v1` registra los hashes de los artefactos que materializan la tupla.

## Ejemplo trabajado (P02 investigar)

```
O — El Brief P03 declara audiencia "fundaciones corporativas en LATAM". [DOC]
I — El tópico de gobernanza de IA es prioritario para esa audiencia. [INFERENCIA]
A — Se asume que la audiencia tiene poder de decisión sobre herramientas de IA. [SUPUESTO]
R — Datos de adopción de IA en fundaciones LATAM 2025–2026 (pendiente). coverage_gap
```

## Integración

El `prompt-spec.md` de cada workflow declara su 4-tupla verbatim desde la biblioteca. El `multimedia-quality-gate.yml` (D5) assertiona que la tupla está completa antes de avanzar el gate.