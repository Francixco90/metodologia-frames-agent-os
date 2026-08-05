# Semántica del adapter D3/SVG

## Autoridad

Tratar los átomos, claims y datasets hash-bound como autoridad. Tratar el request normalizado como
la única entrada del cálculo. No añadir labels, conclusiones o métricas desde el adapter.

## Orden y dominio

- Enumerar cada ID exactamente una vez en `rowOrder`, `columnOrder` u `order`.
- Resolver empates por el orden authored; no depender del orden del objeto o del dataset.
- En árboles, exigir una raíz, parent único y orden de hermanos no ambiguo.
- En interpolación, exigir progreso `[0, 1]`, orden total y canales `geometry_only`.
- Incluir cero en el dominio cuantitativo. Usar `[0, 1]` cuando todos los valores sean cero.
- Conservar negativos y outliers. Bloquear cualquier recorte no documentado.
- Mantener valores sin redondear en la tabla; redondear coordenadas a tres decimales.

## Accesibilidad

Producir geometría y tabla desde la misma lista normalizada. Incluir una señal no cromática.
Conservar labels completos. Emitir `LABEL_BUDGET_EXCEEDED:<id>` cuando un label supere 48
caracteres; resolver la composición en H-04.

## Fallbacks

- Matriz: tabla fila, columna, estado, label y marker.
- Serie: tabla ID, label, valor, unidad, denominador, período y método.
- Jerarquía: lista de adyacencia con parent, profundidad y orden.
- Interpolación: snap al endpoint authored más próximo.
- Renderer ausente: devolver `D3_RENDERER_UNAVAILABLE` y usar el fallback tipado para revisión.

No considerar el fallback como evidencia de que la capacidad D3 está disponible.

## Límites

Usar módulos de cálculo sin DOM. No usar selections, transitions, axes automáticos, timers, red o
aleatoriedad. Usar jerarquía únicamente para árboles de parent único; un DAG requiere posiciones
explícitas o una lista de adyacencia.

Fuentes oficiales:

- https://github.com/d3/d3/blob/main/docs/getting-started.md
- https://github.com/d3/d3/blob/main/docs/d3-array/summarize.md
- https://github.com/d3/d3/blob/main/docs/d3-scale/linear.md
- https://github.com/d3/d3-hierarchy/blob/main/README.md
- https://github.com/d3/d3-interpolate/blob/main/README.md
- https://github.com/d3/d3/blob/main/LICENSE
