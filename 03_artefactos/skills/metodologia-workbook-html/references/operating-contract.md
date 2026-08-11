# Contrato operativo — Workbook HTML

## Frontera Spec -> Compile -> Verify

[METODOLOGIA] Usar `workbook-spec-v1` como autoridad. Resolver el design-system lock por
referencia y SHA-256 antes de compilar. Cualquier cambio en spec, traducciones, tokens o assets
invalida outputs y receipts previos.

[PEDAGOGIA] Modelar tres o más hojas con propósito, resultado y pasos observables. Mantener los
mismos IDs y orden en todos los idiomas. Tratar prompts, checklists y recursos como ayudas de
práctica, no como evidencia automática de aprendizaje.

[NEUROCIENCIA] No añadir claims neurocientíficos sin una fuente autorizada y trazable.

### Compile

- Ordenar locales, hojas, pasos y assets según la spec; no reordenar por heurística.
- Escapar contenido y generar DOM semántico con headings, landmarks, tabs y fragmentos.
- Incluir CSS de impresión y fallback no-JS; mantener el contenido completo en el HTML inicial.
- Permitir `localStorage` solo para tema/idioma cuando esté declarado. Prohibir respuestas,
  notas, checks del participante, analytics y telemetría.
- Emitir manifest con `specSha256`, `designSystemSha256`, hashes de inputs y hashes de outputs.
- Recompilar dos veces en directorios limpios y comparar bytes.

### Verify

- Schema PASS y `additionalProperties: false` en todos los objetos contractuales.
- Paridad exacta de IDs de hojas y pasos entre locales.
- Al menos tres hojas y un paso por hoja.
- Assets relativos, locales, hash-bound y `rights.status: cleared`.
- Tabs con flechas Home/End, foco visible y fragmentos utilizables sin JS.
- Impresión sin navegación, botones ni pérdida de contenido.
- Cero rutas privadas, `file:`, `/edit`, formularios de envío o red en runtime.

## Estados y guardrails

`RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

[INFERENCIA] Un PASS estático no demuestra calidad visual ni pedagógica. Registrar
`coverage_gap` hasta contar con revisión independiente.

[SUPUESTO] El host aporta un compilador autorizado; esta skill solo enruta, define contrato y
verifica el paquete. No instalar dependencias ni publicar desde el router.

