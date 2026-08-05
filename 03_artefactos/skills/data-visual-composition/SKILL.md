---
name: data-visual-composition
description: This skill should be used when the user asks to "build a deterministic D3 visual", "turn verified data into SVG geometry", "create an accessible matrix, chart or tree", "interpolate authored geometry", "validate units and denominators in a chart", or "prepare a semantic visual fallback".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires the H-03 D3 adapter, exact modular D3 dependencies and hash-bound content atoms.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Data Visual Composition

Convertir matrices, series verificadas, árboles e interpolaciones authored en geometría SVG pura.
Mantener el significado en los átomos y usar D3 solo para calcular posiciones, escalas y paths.

## Preflight

1. Leer el atom graph y seleccionar únicamente claims, relaciones y datasets hash-bound.
2. Elegir matriz para mappings, serie solo con métrica completa, jerarquía solo para un árbol e
   interpolación solo para canales geométricos authored con progreso explícito entre `0` y `1`.
3. Declarar el orden completo de filas, columnas o ítems.
4. Redactar el mensaje equivalente y una señal no cromática antes de calcular geometría.
5. Mantener `publicationAuthority=false`; H-03 no produce contenido final.

## Construcción

1. Validar el request con `schemas/d3-geometry-request-v1.schema.json` y el contrato runtime.
2. Enrutar al builder tipado de matriz/serie, jerarquía o interpolación del adapter D3.
3. Conservar los valores originales en la tabla semántica y redondear solo coordenadas a tres
   decimales.
4. Renderizar después, en H-04, la geometría y el fallback desde el mismo resultado hash-bound.
5. Tratar `LABEL_BUDGET_EXCEEDED` como una señal de recomposición; no truncar copy.

## Reglas semánticas

- Prohibir datos vacíos, valores no finitos, IDs duplicados y orden incompleto.
- Incluir cero en el dominio de series con signo y conservar outliers sin recorte silencioso.
- Evitar inferir magnitudes a partir de relaciones categóricas.
- Usar `d3-hierarchy` solo para árboles; representar un DAG como lista o layout explícito.
- Interpolar solo `degrees`, `px` o `ratio`; el canal debe declarar `geometry_only`.
- Prohibir `d3-selection`, `d3-transition`, red, reloj y aleatoriedad.
- Mantener la tabla semántica como fallback obligatorio; no presentarla como prueba de que D3 pasó.

## Verificación

Ejecutar `node --import tsx skills/data-visual-composition/scripts/check.ts`. Exigir bytes y hashes
idénticos para entradas equivalentes, errores estables para fixtures hostiles y licencia ISC
resuelta por paquete.

## Stop rules

Detener ante `SOURCE_GAP`, `METRIC_BINDING_MISSING`, `NON_FINITE_VALUE`, `ORDER_MISMATCH`,
`D3_RENDERER_UNAVAILABLE` o equivalencia textual ausente. No sustituir D3 silenciosamente ni
elevar un fallback a readiness.

## Recursos

- `references/semantics.md`: políticas de dominio, orden, accesibilidad y fallback.
- `schemas/d3-geometry-request-v1.schema.json`: forma portable del request.
- `fixtures/positive/`: matriz, serie, jerarquía e interpolación de prueba.
- `fixtures/hostile/`: vacíos, métrica incompleta, ciclos y progreso fuera de dominio.
- `examples/build-geometry.ts`: invocación mínima.
- `receipts/d3-dependency-license.yml`: versiones y licencias verificables.
