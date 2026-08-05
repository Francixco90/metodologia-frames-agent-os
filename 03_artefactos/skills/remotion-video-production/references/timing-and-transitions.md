# timing-and-transitions

## Propósito

Construir timelines sin off-by-one ni duraciones ficticias.

## Reglas

- Usar `Sequence` para posicionar contenido y recordar que el frame interno es local.
- Usar `Series` para escenas consecutivas y documentar offsets.
- Usar `TransitionSeries` solo cuando el solapamiento sea parte del contrato.
- Mantener `TransitionSeries.Transition` como hijo directo.
- Calcular total como suma de secuencias menos transiciones.
- No restar overlays.
- Rechazar transiciones de duración mayor o igual a una escena adyacente.
- Fijar `premountFor` explícitamente; sus defaults cambian entre versiones.
- Validar que todo frame referenciado esté dentro de `[0, durationInFrames)`.

## Prueba

Capturar review shots antes, durante y después de cada transición. Verificar ausencia de frames
vacíos, doble audio accidental y cortes de captions.

Fuentes técnicas:

- https://www.remotion.dev/docs/sequence
- https://www.remotion.dev/docs/series
- https://www.remotion.dev/docs/transitions/transitionseries
