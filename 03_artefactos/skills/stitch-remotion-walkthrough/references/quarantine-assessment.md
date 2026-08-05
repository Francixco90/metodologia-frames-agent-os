# Evaluación de cuarentena

## Decisión

Conservar únicamente un wrapper original de auditoría. No incluir archivos, ejemplos, templates ni
scripts de la copia legacy observada.

## Razones

- La skill observada está especializada en walkthroughs de pantallas Stitch, aunque usa el ID
  genérico `remotion`.
- Su contrato depende de MCP y rutas upstream que no corresponden a la arquitectura canónica
  actual.
- La estructura de transición observada y su cálculo de duración no cumplen el contrato actual.
- Hardcodea decisiones de profile que deben pertenecer al video spec.
- Carece de lineage, rights registry, contracts portables, fixtures negativas y QA determinista.
- No se conoce el commit exacto de origen de la copia local.

## Ruta futura posible

Crear desde cero un adapter Stitch separado solo cuando:

1. exista una necesidad aprobada;
2. se resuelvan licencia y commit de las fuentes;
3. el adapter produzca inputs portables para `remotion-video-production`;
4. no active red ni downloads durante render;
5. supere los mismos gates de hashes, derechos, autoridad y determinismo.
