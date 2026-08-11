# Contrato operativo — Masterclass HTML

## Frontera Spec -> Compile -> Verify

[METODOLOGIA] Usar `masterclass-spec-v1` como autoridad. Resolver el design-system lock por
referencia y SHA-256 antes de compilar. Invalidar HTML, manifest y receipts al cambiar spec,
traducciones, timing, tokens, recursos o assets.

[PEDAGOGIA] Asociar cada slide con una intención, una nota accionable para facilitación, tiempo
en ambas variantes y recursos. Usar deep links para abrir la práctica correspondiente sin
duplicar el workbook. Un timing declarado guía la sesión; no prueba que la actividad ocurrió.

[NEUROCIENCIA] No añadir claims neurocientíficos sin fuente autorizada y trazable.

### Compile

- Renderizar los locales en el orden declarado y preservar IDs de slides.
- Generar landmarks, headings, controles etiquetados, progreso, contador y recorrido.
- Implementar teclado sin secuestrar eventos de inputs, textareas, selects o elementos
  editables. Respetar `prefers-reduced-motion`.
- Resolver recursos por discriminante: `deep-link` exige ruta relativa, fragmento y target;
  `reference` exige URL pública HTTPS y autoridad.
- Mantener assets locales y runtime sin red; una referencia HTTPS es un enlace iniciado por la
  persona, nunca una dependencia de render.
- Emitir manifest con hashes de spec, lock, assets y bytes de salida. Comparar dos builds limpios.

### Verify

- Schema PASS y objetos contractuales cerrados con `additionalProperties: false`.
- Paridad exacta de `slide.id` y orden entre locales.
- Suma exacta core 90 y extended 120 por locale.
- Teclas obligatorias, botones visibles y recorrido operable.
- Deep links relativos, con `preserveLocale`, `preserveFragment` y fallo cerrado.
- Assets hash-bound con `rights.status: cleared`.
- Cero rutas privadas, `file:`, `/edit`, autoplay, tracking o publicación implícita.

## Estados y guardrails

`RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

[INFERENCIA] El PASS contractual no demuestra claridad de exposición ni viabilidad del ritmo;
mantener `coverage_gap` hasta un ensayo y revisión independientes.

[SUPUESTO] El host aporta el compilador y el resolver de destinos autorizados. Esta skill no
instala dependencias, no abre red y no publica.

