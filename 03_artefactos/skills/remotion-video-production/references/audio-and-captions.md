# audio-and-captions

## Propósito

Mantener audio, voz, música y captions sincronizados y accesibles.

## Reglas

- Usar el componente `Audio` vigente de `@remotion/media` solo después de fijar esa dependencia a
  `4.0.494` mediante el writer autorizado.
- Resolver archivos localmente y registrar hash, derechos, sample rate, canales y duración.
- Fijar trims, offsets, fades y ducking en frames.
- Rechazar clipping, silencio accidental, doble reproducción y sample-rate drift.
- Normalizar captions a timestamps monotónicos dentro de la composición.
- Preservar texto literal cuando sea evidencia; registrar correcciones editoriales.
- Definir velocidad de lectura por profile y revisar texto largo manualmente.
- Probar con audio ausente, voz más corta/larga, captions superpuestos y caracteres complejos.

## QA

Comparar PCM normalizado, revisar picos y loudness del perfil, comprobar inicio/final y reproducir el
video completo con y sin sonido.

Fuentes técnicas:

- https://www.remotion.dev/docs/media/audio
- https://www.remotion.dev/docs/captions
