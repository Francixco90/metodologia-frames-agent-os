# NotebookLM read-only grounding adapter

Este adaptador valida un binding ya resuelto por una superficie privada y permite transportar solo
un digest portable y cobertura agregada. No descubre notebooks, no conserva locators y no ejecuta
mutaciones.

## Declaración por unidad de trabajo

Cada agente `RT-01..RT-11` y cada workflow `core`, `web`, `content` y `adapters` incluye una
declaración validable contra `registries/notebooks/work-unit-binding-contract.yml`. La declaración
contiene:

- binding portable (`digest` o `none`) sin notebook ID ni locator;
- propósito y pregunta de grounding;
- source IDs previstos;
- partición exacta entre fuentes cubiertas y faltantes;
- referencias de evidencia y permisos read-only.

El registro vigente conserva `mode: none` y `state: coverage_gap`. En consecuencia, las quince
unidades declaran cero fuentes cubiertas, cero evidencias y todas las fuentes previstas como
faltantes. [CONFIG][coverage_gap]

## Invariantes

- Aceptar exactamente uno de estos estados:
  - `mode: digest` con `binding_digest` SHA-256 y objeto `coverage`.
  - `mode: none` con `reason_code` explícito.
- Rechazar cualquier operación distinta de las declaradas en `contract.yml`.
- Rechazar material locator aunque el resto del payload sea válido.
- Devolver `blocked` o `partial` cuando falta binding o cobertura; nunca simular grounding.
- Mantener NotebookLM como evidencia consultiva. No convertir una respuesta del notebook en
  autoridad superior a la fuente original.
- No incluir títulos privados, UUID, cookies, tokens, rutas locales ni contenido bruto restringido
  en registros versionables.
- Impedir que una unidad en `mode: none` declare fuentes cubiertas, evidence refs, mutación o efecto
  sobre `SOURCE_LOCKED`.

## Validación

Ejecutar:

```bash
pnpm check:notebooklm
pnpm vitest run tests/contract/notebooklm-work-units.contract.test.ts \
  tests/negative/notebooklm-work-units.negative.test.ts
```

El check cruza las quince unidades con los registros de bindings y fuentes, valida entrypoints y
rechaza locators locales. Las pruebas negativas demuestran que `mode: none` no puede fingir
cobertura, evidencia ni permisos de escritura.
