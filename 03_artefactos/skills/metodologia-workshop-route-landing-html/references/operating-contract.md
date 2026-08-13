# Contrato operativo — Workshop Route Landing HTML

## Spec → Compile → Verify

[METODOLOGIA] Usar `workshop-route-landing-spec-v1` como autoridad única. Resolver el
design-system lock por referencia y SHA-256 antes de compilar. Cambiar contenido, traducción,
recurso, CTA o lock invalida manifest, receipt y golden anteriores.

`sha256-canonical-json-v1` significa retirar solo `specSha256`, ordenar recursivamente las
claves de objetos, conservar arrays, serializar JSON UTF-8 sin espacios ni salto final y
calcular SHA-256 sobre esos bytes.

[PEDAGOGIA] Usar las ocho secciones como progresión: entrada, tensión, ruta, método, recursos,
resultados, confianza e invitación. Diferenciar capacidades demostradas de resultados
proyectados y no convertir una CTA en evidencia de aprendizaje.

[NEUROCIENCIA] No añadir claims neurocientíficos.

### Compile

- Escapar texto y generar landmarks, headings, skip link, navegación por fragmentos y foco
  visible.
- Generar un HTML por idioma: `es/index.html`, `en/index.html`, `pt/index.html`.
- Usar solo CSS inline y SVG inline. No incluir scripts, fuentes remotas, imágenes remotas,
  formularios, analytics ni storage.
- Emitir `build-manifest.json` con hashes de outputs y `build-receipt.json` ligado a los bytes
  del manifest. No incluir timestamps.

### Verify

- Exigir schema estricto, hash vigente y exactamente ocho secciones en orden.
- Exigir ES/EN/PT y paridad de IDs de secciones y recursos.
- Exigir CTA de una a tres palabras.
- Exigir `ref` relativo solo en recursos disponibles; prohibirlo en pendientes.
- Construir en dos procesos separados y comparar bytes y golden tree hash.
- Comprobar contenido legible sin JS, navegación de teclado nativa, impresión y ausencia de
  overflow estructural obvio mediante CSS responsivo.

## Estado

`candidate != evaluated != active`; `RENDERED_DRAFT != HUMAN_APPROVED != READY != PUBLISHED`.

[INFERENCIA] El checker estático no demuestra calidad visual, accesibilidad completa ni
conversión. Mantener `coverage_gap` hasta revisión independiente.

[SUPUESTO] El host aporta el design-system lock y contenido autorizado. La skill no navega,
instala, publica ni promueve estados.
