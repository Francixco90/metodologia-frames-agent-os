# rendering-and-review

## Secuencia

1. Validar props, assets, timeline y licencia.
2. Renderizar stills de frames críticos.
3. Renderizar smoke corto con logs verbosos.
4. Renderizar pieza completa de baja resolución.
5. Comparar frames y PCM normalizados.
6. Renderizar perfil de entrega.
7. Inspeccionar streams, codec, fps, dimensiones, duración y color.
8. Reproducir de inicio a fin.
9. Emitir receipt y revisión separada.

## Evidencia

Registrar runtime exacto, lockfile digest, Chromium/profile, concurrencia, comando portable,
input/output hashes, logs sanitizados, review shots y findings.

## Reglas

- Usar `renderMedia()` o CLI fijada; no depender de MCP.
- No equiparar código de salida cero con aprobación.
- Marcar siempre `RENDERED_DRAFT`.
- Comparar píxeles/PCM para determinismo; conservar SHA del contenedor para identidad.
- Invalidar review si cambian inputs, assets, código o toolchain.

Fuente técnica: https://www.remotion.dev/docs/renderer/render-media
