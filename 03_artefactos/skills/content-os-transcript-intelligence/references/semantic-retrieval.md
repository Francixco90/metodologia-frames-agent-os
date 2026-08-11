# Recuperación semántica autocontenida

## Índice

Cada segmento conserva `sourceSpan`, texto literal, caption, hablante, entidades, temas,
acciones, resultados, claims, demostraciones, reconocimientos y aliases. El índice nunca
reemplaza la fuente.

## Ranking offline

1. Normalizar mayúsculas, tildes y puntuación sin alterar el texto persistido.
2. Expandir la consulta con `assets/semantic-intents.json` y el glosario del job.
3. Puntuar coincidencias exactas, aliases, entidades, temas, roles narrativos y tokens.
4. Desempatar por densidad de evidencia y luego por inicio temporal.

Un adaptador de embeddings es opcional. Debe declarar modelo local, licencia y SHA-256; la
ausencia del modelo conserva búsqueda enriquecida y agrega `coverage_gap`.

## Reglas derivadas

- `SR-001` — Una consulta recupera conceptos sin repetir la misma frase mediante aliases,
  roles y relaciones.
- `SR-002` — “muestra aplicaciones funcionando” expande a demo, dashboard, HTML,
  herramienta y operación.
- `SR-003` — “lo nombran embajador” expande a reconocimiento, certificación, validación y
  comunidad.
- `SR-004` — Cada hit devuelve evidencia y timestamp; nunca solo un resumen.
