# lottie

## Estado

Habilitar Lottie solo tras fijar la integración compatible a `4.0.494` mediante el writer
autorizado.

## Reglas

- Ingerir JSON y assets localmente con hashes y derechos.
- Rechazar assets externos o data URLs no evaluadas.
- Detectar expresiones; cuarentenarlas por posible flicker o no determinismo.
- Fijar frame mapping y velocidad.
- Probar primer/último frame, loops, transparencias, fonts y imágenes faltantes.
- Comparar renders repetidos.

## Fallback

Rasterizar o reimplementar de forma nativa solo si derechos, calidad y trazabilidad lo permiten.
Registrar el derivado como nuevo asset; no modificar silenciosamente el original.

Fuente técnica: https://www.remotion.dev/docs/lottie
