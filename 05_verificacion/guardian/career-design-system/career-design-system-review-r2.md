# Guardian review — CV Design-System-First R2

## Veredicto

`PASS_R2_DESIGN_SYSTEM_FIRST`

El sistema público, la selección de composición y el consumidor privado fueron
observados materialmente. La composición seleccionada es `blueprint-executive`;
la alternativa `neo-swiss-editorial` permanece disponible como secundaria. La
selección está `HUMAN_APPROVED`, pero los CV privados permanecen
`RENDERED_DRAFT`: este veredicto no concede `READY`, `PUBLISHED` ni autoridad de
postulación. [CONFIG]

## Binding público

- Acceptance base SHA-256:
  `bdd1f83d87d107d048e8a75da58323da5820e688d42de36d1872c2a20e2a00e3`.
- Design-system manifest SHA-256:
  `b5090af119c179bf43e03331e1f92ad656b5bf3eaf4e7d547ad9e9a7e6518f66`.
- Design-system reference SHA-256:
  `16c70ff8ed5bea12a532dc0574e7995e42d3425394747cf1ecce3b305de7ad4c`.
- Selection document SHA-256:
  `125f6a545ad6b92cfba9b8d7f246eecb50633f2bc5c0ccb7ea9f8d3ae3c62d19`.
- Canonical selection SHA-256:
  `6ce1af8fc96868cfd3b19b62d493edcb672b6764e219e86a9f232e046cfa65db`.
- Design-options manifest SHA-256:
  `b6bfee1e2abba03356127b4f0364ba3f58369cf5392d65f480c220165a400bc3`.
- `career-design-system` skill SHA-256:
  `15cdc2cd9021ba8f2bc69410ac69cd382a3659bf6bceee0dec2b3e1cd68e90a7`.
- `evidence-first-cv` 0.3 skill SHA-256:
  `759ea85b4b531df6b9891d26ed0c07462311910189724e8b74445d256e1908c7`.
- CV quality contract SHA-256:
  `ab0987f65786816d59a3a7738bad8ab4aa24ab9120112b5ec2739b1e1a887cd6`.
- `cv-package-v3` JSON schema SHA-256:
  `319a1fd031b19264ef72307200ac49715ef5c4e2d8b0261291de563dfcdace49`.

No se persisten hashes, locators, contactos ni contenido del consumidor privado:
sus receipts permanecen en almacenamiento ignorado local. [CONFIG]

## Matriz de resultados

| Área                     | Resultado | Evidencia observada                                                                                                                          |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Autoridad visual         | PASS      | Design system compilado con tokens, componentes, snippets, iconos, composiciones, impresión, accesibilidad y manifest hash-bound.            |
| Paleta central           | PASS      | Los previews consumen variables derivadas de la autoridad de marca; no duplican una paleta literal independiente.                            |
| Previews                 | PASS      | Exactamente dos opciones MD+HTML y un comparador; CSS de paleta y fuentes viajan como `data:` sin dependencias remotas.                      |
| Selección                | PASS      | `blueprint-executive` es la única primaria, la decisión canónica y su aprobación humana coinciden; `neo-swiss-editorial` es secundaria.      |
| Contratos                | PASS      | `cv-spec-v2` y `cv-package-v3` validan bindings visuales por variante, ATS-neutral, invalidación y estados fail-closed.                      |
| Migración                | PASS      | v1/v2 quedan compatibility-only mediante migradores explícitos; no son autoridad activa ni infieren selección visual.                        |
| C06 / C08                | PASS      | Executive HTML exige `CR_CV_DESIGN_APPROVED`; ATS-only continúa neutral; QA invalida spec, diseño, evidencia o contenido stale.              |
| Skills                   | PASS      | `career-design-system` 1.0 y `evidence-first-cv` 0.3 están activos, registrados, hash-bound y sin autoridad de publicación.                  |
| Focal design             | PASS      | Checker 10/10 y 3 archivos/11 pruebas; doble build check-only conserva el manifest de opciones.                                              |
| Career OS                | PASS      | 18 archivos/119 pruebas y checker C00–C09; C09 mantiene STOP sin efecto externo.                                                             |
| Tipos y privacidad       | PASS      | TypeScript sin errores; 5.769 archivos versionables escaneados sin secretos ni locators privados.                                            |
| Aislamiento privado      | PASS      | Solo el `.gitkeep` de la frontera privada está versionado; outputs, evidencias y bindings reales están ignorados.                            |
| Reproducibilidad privada | PASS      | Dos builds aislados en un directorio temporal produjeron bytes y manifiesto idénticos al snapshot congelado. No se persistieron sus digests. |
| Paridad privada          | PASS      | Ambas composiciones proyectan el mismo contenido canónico; la verificación local reportó paridad normalizada.                                |
| Responsive privado       | PASS      | A y B sin overflow a 320, 390, 720, 768, 1024 y 1440 px, además de landscape 667×320 y 844×390.                                              |
| Tema privado             | PASS      | Navy por defecto, light por control de 44×44 px y persistencia local; impresión fuerza fondo claro y oculta controles.                       |
| Diálogos privados        | PASS      | Una X de 44×44 por diálogo, foco contenido, Escape y retorno al disparador.                                                                  |
| JS-off privado           | PASS      | Toggle oculto, contenido principal legible, 38/38 profundizaciones visibles, details disponibles y cero overflow.                            |
| Red y movimiento         | PASS      | Cero requests remotos o errores de página; reduced motion elimina movimiento observable.                                                     |

## Hallazgos cerrados en R2

1. El overflow de Neo-Swiss a 320 px fue corregido en el generador; la
   reauditoría observó `scrollWidth == clientWidth` en toda la matriz. [CÓDIGO]
2. La referencia activa de `evidence-first-cv` ya exige `cv-spec-v2` y
   `cv-package-v3`; v1/v2 quedaron documentados y validados solo como
   compatibilidad. [CÓDIGO]
3. Los fixtures y el checker principal fueron regenerados sobre v2/v3; los
   contratos legacy no pueden presentarse como paquete nuevo. [CÓDIGO]

## Límites y gaps

- La validación visual se ejecutó con Google Chrome local y Playwright. La
  revisión manual con lector de pantalla permanece `coverage_gap`; no invalida
  los checks de teclado y árbol accesible ya observados, pero debe cerrarse antes
  de una afirmación amplia de compatibilidad AT. [SUPUESTO]
- `verify:skills` termina con código cero y valida el skill Career; conserva dos
  líneas diagnósticas heredadas de `voice-draft-migration-gate`, fuera del alcance
  CV. Se registran como `coverage_gap` transversal, no como PASS de esa familia.
  [CONFIG]
- No se intentó publicación, sincronización externa ni postulación. [CONFIG]

## Siguiente gate

El paquete puede continuar a integración Git y CI. Cualquier cambio en spec,
decisión, design system, contenido, assets o outputs exige successor y nueva
revisión. La publicación del CV continúa fuera de alcance. [CONFIG]
