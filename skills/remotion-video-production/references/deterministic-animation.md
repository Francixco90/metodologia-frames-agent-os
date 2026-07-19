# deterministic-animation

## Propósito

Garantizar que cada frame dependa solo de inputs fijados y del número de frame.

## Reglas

- Derivar movimiento con `useCurrentFrame()` y `useVideoConfig()`.
- Usar semillas explícitas con `random(seed)`; prohibir `random(null)`.
- Fijar clamps de `interpolate()` cuando el valor no deba extenderse.
- Fijar parámetros de `spring()`.
- Prohibir reloj, timezone, timers, CSS animations/transitions, red y tickers.
- Precalcular decisiones narrativas aleatorias y conservarlas en props.
- Evitar orden dependiente del filesystem u objetos sin sort estable.
- Fijar fonts, locale, Chromium, GPU/ANGLE y concurrencia del perfil canónico.

## Prueba

Renderizar el mismo still en dos procesos frescos y con concurrencia 1/N. Comparar RGBA
decodificado. Renderizar una versión completa de baja resolución y comparar digests de frames y
PCM. Registrar el SHA del contenedor solo como identidad, no como prueba portátil única.

Fuentes técnicas:

- https://www.remotion.dev/docs/use-current-frame
- https://www.remotion.dev/docs/use-video-config
- https://www.remotion.dev/docs/interpolate
- https://www.remotion.dev/docs/random
- https://www.remotion.dev/docs/troubleshooting/css-animations
