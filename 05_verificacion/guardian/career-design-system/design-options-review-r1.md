# Guardian review — CV Design Options R1

## Veredicto

`PASS_DESIGN_OPTIONS_READY`

El snapshot R1 satisface el acceptance spec ligado abajo. Este veredicto valida
dos alternativas sintéticas para comparación; no selecciona una, no equivale a
`HUMAN_APPROVED` y no autoriza consolidación, uso de PII, promoción ni
publicación. [CONFIG]

## Binding auditado

- Acceptance spec SHA-256:
  `bdd1f83d87d107d048e8a75da58323da5820e688d42de36d1872c2a20e2a00e3`.
- Manifest SHA-256:
  `06f761c090d94e2421373a78c4ad5fe46b345ef0d6a81cfdc55135caacc0fa65`.
- Producer receipt SHA-256:
  `b858a2338609d0d24577cec874f06ccc5fa037b7343b653b3fedf524ae9d47ba`.
- Blueprint Executive HTML SHA-256:
  `58c6f9dc9578950294a3f4b732117b1cab4ffbf56005fc43bf528bfbd517fa2b`.
- Neo-Swiss Editorial HTML SHA-256:
  `0ec10bbf940120015ddebbb2d6bf6b2a286ca1d15235e2cdf4def5bed47e3526`.
- Comparador HTML SHA-256:
  `f5d963f4f3a43474400e85799e095454fa42dff6697d6cef2c733c7a4f796b83`.
- Shared primitives SHA-256:
  `a3c026ebe5e8dbff6f4bd56d0115f34285bfad63d209ddbfaf91cc68481945b9`.

El manifiesto declara `DESIGN_OPTIONS_READY`, `selection: null`,
`human_approved: false` y `publication_authorized: false`. [CONFIG]

## Resultados materiales

| Área                   | Resultado | Evidencia observada                                                                                                                             |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventario             | PASS      | Exactamente dos narrativas MD, dos previews HTML y un comparador; no existe tercera alternativa.                                                |
| Hashes                 | PASS      | Tamaños y SHA-256 de narrativas, previews, comparador, fuentes y licencias coinciden con el manifiesto; receipt ligado al manifest exacto.      |
| Determinismo           | PASS      | Dos ejecuciones consecutivas de `build-options.mjs --check` devolvieron el mismo manifest y cero drift.                                         |
| Synthetic / privacidad | PASS      | `synthetic_only: true`; escáner del repo revisó 5.633 archivos versionables sin PII, secretos ni locators privados.                             |
| Primitivas             | PASS      | Ambas composiciones contienen el mismo bloque de primitivas y el mismo hash; diferencias limitadas a composición.                               |
| Fuentes y derechos     | PASS      | Poppins y Montserrat están embebidas como `data:` y hash-bound con OFL; Trebuchet MS se declara fuente del sistema.                             |
| Local-first            | PASS      | CSP niega por defecto; no se detectaron CDN, imports, scripts, fuentes ni requests HTTP remotos.                                                |
| Tema                   | PASS      | Navy inicia por defecto; light cambia por teclado, actualiza nombre/estado, persiste en `localStorage` y no altera contenido.                   |
| Contraste              | PASS      | Revisión computada de texto visible en navy/light sin ratios bajo el umbral aplicable; el mínimo focal light medido es 6,26:1.                  |
| Responsive             | PASS      | Sin overflow a 320, 375, 390, 720, 768, 1024 y 1440 px, incluidas orientaciones 667×320 y 844×390.                                              |
| Teclado                | PASS      | Skip link, orden semántico, toggle, details y diálogo son operables; targets visibles ≥44×44 px.                                                |
| Diálogo                | PASS      | X única 44×44, foco inicial y contenido modal, Tab contenido, Escape cierra y el foco retorna al disparador.                                    |
| JS-off                 | PASS      | Toggle y botón modal se ocultan; todo contenido sustantivo y la evidencia mediante `<details>` siguen disponibles.                              |
| Impresión              | PASS      | Tokens light activos; navegación, toggle, estado demo y botón modal quedan ocultos, sin ganar por especificidad.                                |
| Semántica / AX         | PASS      | Un `h1`, jerarquía sin saltos, `main`, skip link, headings y landmarks visibles en el árbol AX de Chrome.                                       |
| Movimiento             | PASS      | `prefers-reduced-motion: reduce` elimina transiciones y animaciones observables.                                                                |
| Iconografía            | PASS      | SVG inline; SVG decorativos ocultos de AX; sin emoji usado como control.                                                                        |
| Oficio visual          | PASS      | Neo-Swiss usa flujo editorial; Blueprint usa retícula funcional. No hay gradient text, glassmorphism ni palabras partidas en el proof strip R1. |
| Comparador             | PASS      | Dos iframes titulados; control desktop/mobile produce 390 px después de la transición; enlaces directos disponibles.                            |

## Cierre de hallazgos R0

1. **Contraste light:** cerrado al oscurecer el token gold compartido; no quedan
   textos normales bajo 4,5:1. [CÓDIGO]
2. **Controles impresos:** cerrado con una regla print que prevalece sobre el
   estado `.js`; `evidence-button` computa `display: none`. [CÓDIGO]
3. **Palabras partidas:** cerrado en Neo-Swiss; `volumen`, `aprender` y
   `permanece` conservan palabras completas a 1440 px. [CÓDIGO]
4. **Foco modal:** cerrado; Tab conserva foco en la X única y Escape retorna al
   disparador. [CÓDIGO]
5. **Targets:** cerrado; navegación, skip link, CTA, summaries, toggle y X visibles
   alcanzan al menos 44×44 px. [CÓDIGO]

## Límites

- La inspección material se ejecutó en Google Chrome local mediante Playwright y
  el árbol AX de Chrome; no afirma equivalencia con todos los navegadores o
  lectores de pantalla. [SUPUESTO]
- La alternativa preferida sigue siendo una decisión humana pendiente ligada a
  estos hashes. Cambiar cualquier input invalida este veredicto. [CONFIG]

## Siguiente gate

`HUMAN_DESIGN_SELECTION` sobre los hashes exactos de este reporte. Hasta entonces,
el estado máximo permanece `DESIGN_OPTIONS_READY`. [CONFIG]
