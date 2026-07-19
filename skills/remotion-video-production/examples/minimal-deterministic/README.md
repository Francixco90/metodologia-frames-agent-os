# Ejemplo mínimo determinista

Este ejemplo compila de forma aislada y demuestra:

- props con Zod 4;
- `calculateMetadata()` sin reloj ni red;
- animación derivada de frames;
- clamps explícitos;
- composición sin assets ni dependencias opcionales.

Validar con:

```bash
node skills/remotion-video-production/scripts/check-example.mjs
```

El ejemplo no constituye una pieza lista ni autorización de producción.

El tsconfig aislado mantiene `strict` del repositorio y usa `skipLibCheck` únicamente para no
bloquear la prueba por el tipo ambiental `Timer` expuesto por las declaraciones de Remotion
4.0.494; el código del ejemplo continúa comprobándose.
