# three-and-r3f

## Estado

Habilitar 3D solo tras fijar `@remotion/three` a `4.0.494` mediante el writer autorizado.

## Reglas

- Usar `ThreeCanvas` de `@remotion/three`.
- Animar desde `useCurrentFrame()`; prohibir `useFrame()`.
- Usar `Sequence layout="none"` dentro del canvas.
- Fijar cámara, luces, semillas, modelos, texturas y orden de carga.
- Resolver assets localmente y registrar rights/hash.
- Renderizar servidor con `chromiumOptions.gl = 'angle'`.
- Probar ausencia de GPU, texturas faltantes, modelos pesados y precisión de color.

## Stop rule

Detener o usar fallback 2D cuando ANGLE, assets o determinismo no estén disponibles. No aceptar un
preview interactivo como prueba de render headless.

Fuente técnica: https://www.remotion.dev/docs/three
