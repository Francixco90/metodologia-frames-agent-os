# beat-map-design

## Propósito

Convertir el guion en `02-beat-map.yml` con tiempo verificable.

## Procedimiento

1. Usar frames enteros y rangos semiabiertos `[from, to)`.
2. Asignar a cada beat: `beat_id`, propósito, claim IDs, inicio, duración, layout, motion, audio,
   captions, transición y criterio de aceptación.
3. Calcular frames desde segundos solo una vez mediante el fps fijado.
4. Probar el frame inicial, último y cada borde `T-1`, `T`, `T+1`.
5. Restar solapamientos de transiciones al total.
6. Rechazar gaps o overlaps no declarados.
7. Mantener captions dentro de la duración del beat y de la composición.

## Edge cases

Probar beats de un frame, texto vacío, ausencia de audio, transición mayor o igual a la escena,
duración cero, offsets negativos y final exacto de composición.

Fuentes técnicas:

- https://www.remotion.dev/docs/sequence
- https://www.remotion.dev/docs/series
- https://www.remotion.dev/docs/transitions/transitionseries
