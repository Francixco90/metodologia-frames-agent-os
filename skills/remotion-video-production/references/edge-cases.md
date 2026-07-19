# edge-cases

## Matriz mínima

Probar:

- duración 1 frame, último frame y composición larga;
- beat vacío, transición igual/mayor a escena y offsets negativos;
- texto vacío, muy largo, RTL, CJK, emoji y fallback de font;
- asset ausente, corrupto, MIME falso, enorme, symlink y SVG no confiable;
- audio ausente, clipping, silencio, duración divergente y captions fuera de rango;
- dataset vacío, cero, negativos, outliers y etiquetas largas;
- concurrencia 1/N y procesos frescos;
- red negada, locale/timezone distintos y GPU ausente;
- props adicionales, hashes inválidos y IDs duplicados;
- licencia, rights, autoridad o aprobación ausentes;
- Lottie con expresiones, R3F `useFrame`, GSAP ticker y D3 transitions.

## Resultado

Definir para cada caso `expected_status`, `expected_error`, evidencia y retryability. Exigir que los
casos negativos fallen por el código previsto, no por excepción accidental.
