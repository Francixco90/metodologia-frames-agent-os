# Comité H-01 — Contrato de contenido canónico

Estado: `DECIDED_FOR_IMPLEMENTATION`. Autoridad máxima: contrato H-01; sin efecto de render,
readiness, distribución o publicación. [CONFIG]

## Inputs congelados

- Base: `7c26b6719451de7b0101262f3c379f85a251f939`.
- Read set portable RT-02: `SOURCE_FREEZE_REQUIRED`.
- Restricción superior: Carousel V2 conserva D3, Three.js, Lottie, GSAP y Remotion como
  `planned_capability`.
- Estado authored: `DRAFT`; estado máximo acreditable por H-01: `SCOPED`.

## Cinco posiciones

| ID     | Actor instance | Rol                  | Veredicto                        | Aporte seleccionado                              | Riesgo principal                              |
| ------ | -------------- | -------------------- | -------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| P-RT04 | RT-04-H01-001  | estrategia editorial | ACCEPT_WITH_AMENDMENTS           | frontmatter estructural y cuerpo editorial único | drift si se duplica significado               |
| P-RT07 | RT-07-H01-001  | producción creativa  | REVISE                           | intención visual authored y V1 no autoritativo   | inferencia decorativa del producer            |
| P-RT08 | RT-08-H01-001  | semántica visual     | ACCEPT_WITH_MANDATORY_AMENDMENTS | relaciones tipadas, refs y equivalencia textual  | apariencia de evidencia sin binding           |
| P-RT10 | RT-10-H01-001  | reproducibilidad     | ACCEPT_WITH_MANDATORY_AMENDMENTS | parser estricto, doble hash y read set completo  | confusión entre hash raw y semántico          |
| P-RT03 | RT-03-H01-001  | evidencia y derechos | APPROVE_WITH_CONSTRAINTS         | claims, locators, límites y gaps explícitos      | capacidad planificada presentada como vigente |

## Veinte revisiones cruzadas

| ID          | Reviewer | Target | Verdict | Objeción                                                            | Disposición                                                             |
| ----------- | -------- | ------ | ------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| X-RT04-RT03 | RT-04    | RT-03  | AMEND   | Los spans físicos no deben ser autoridad editorial.                 | Generar fragment hashes desde locators contra bytes hash-bound.         |
| X-RT04-RT07 | RT-04    | RT-07  | AMEND   | Dirección visual no basta para acreditar scope.                     | Validar también audiencia, problema, promesa, tesis y acción.           |
| X-RT04-RT08 | RT-04    | RT-08  | AMEND   | H-01 no debe anticipar geometría final.                             | Tipar intención y diferir layout y adapters.                            |
| X-RT04-RT10 | RT-04    | RT-10  | AMEND   | Bytes y significado requieren hashes distintos.                     | Adoptar AST, doble hash y adapter fail-closed.                          |
| X-RT07-RT03 | RT-07    | RT-03  | AMEND   | Directivas inline degradan la edición y RENDERED_DRAFT excede H-01. | Resolver soporte→claim; DRAFT authored y SCOPED acreditado.             |
| X-RT07-RT04 | RT-07    | RT-04  | AMEND   | Sin dirección tipada el producer vuelve a inferir.                  | Incorporar AuthoredVisualDirectionV1 y freeze H-01.                     |
| X-RT07-RT08 | RT-07    | RT-08  | AMEND   | Una planned capability no puede aparentar evidencia.                | Exigir mustNotImply y prohibir que soporte claims.                      |
| X-RT07-RT10 | RT-07    | RT-10  | SUPPORT | El read set no debe expandirse al repo externo sucio.               | Verificar solo allowlist portable congelada.                            |
| X-RT08-RT03 | RT-08    | RT-03  | AMEND   | Límites visuales de gobernanza no son claims.                       | Mantener evidencia material y máximo SCOPED.                            |
| X-RT08-RT04 | RT-08    | RT-04  | AMEND   | Prosa visual libre no produce relaciones verificables.              | Usar gramática visual cerrada y refs resolubles.                        |
| X-RT08-RT07 | RT-08    | RT-07  | AMEND   | La dirección mínima necesita tipos y bindings.                      | Añadir relaciones claim/support/capability-bound.                       |
| X-RT08-RT10 | RT-08    | RT-10  | AMEND   | Whitespace no semántico no debe alterar semanticSha256.             | Canonicalizar relaciones y conservar reading order.                     |
| X-RT10-RT03 | RT-10    | RT-03  | AMEND   | El digest agregado no sustituye el read set.                        | Persistir entradas hash-bound completas y dominios de hash.             |
| X-RT10-RT04 | RT-10    | RT-04  | SUPPORT | El híbrido funciona si conserva orden editorial.                    | Adoptar frontmatter estructural y cuerpo authored.                      |
| X-RT10-RT07 | RT-10    | RT-07  | SUPPORT | visual_cue V1 no puede ascender a autoridad.                        | Mantenerlo solo como legacy note.                                       |
| X-RT10-RT08 | RT-10    | RT-08  | AMEND   | H-01 no admite geometría ni capacidad ejecutable.                   | Conservar cinco planned capabilities con gate H-03.                     |
| X-RT03-RT04 | RT-03    | RT-04  | AMEND   | El cuerpo aún podría introducir afirmaciones no ligadas.            | Claims explícitos y bindings soporte→claim.                             |
| X-RT03-RT07 | RT-03    | RT-07  | AMEND   | Un visual puede simular funcionamiento real.                        | Badge planificada y cero outputs o métricas simulados.                  |
| X-RT03-RT08 | RT-03    | RT-08  | AMEND   | Referencia visual y evidencia requieren roles distintos.            | Referencias externas siguen reference-only; capacidades siguen planned. |
| X-RT03-RT10 | RT-03    | RT-10  | AMEND   | Un read set excesivo añade drift.                                   | Congelar solo la allowlist portable necesaria.                          |

Cobertura: cinco actores únicos, cuatro targets no-self por actor y veinte pares dirigidos únicos.
[CÓDIGO]

## Alternativas y trade-offs

- Mínima: ampliar el snapshot V1. Se rechaza porque no resuelve autoridad, rights, locators ni
  semántica visual.
- A: frontmatter semántico completo. Se rechaza porque duplicaría el cuerpo Markdown.
- B seleccionada: frontmatter de identidad/routing/bindings + cuerpo editorial estructurado +
  manifest/receipt derivado.
- Automática: detectar claims mediante NLP. Se rechaza por no determinismo y falsa cobertura.

Trade-off aceptado: la gramática cerrada añade fricción de autoría, pero permite errores accionables,
hash semántico estable y un producer que no inventa relaciones. [METODOLOGIA]

## Síntesis y disidencia

Se selecciona `P-RT08` como columna semántica. Se incorporan el híbrido de RT-04, los límites de
producción de RT-07, el parser/read set de RT-10 y la evidencia fail-closed de RT-03. [CONFIG]

Disidencia preservada:

- RT-03 prefiere directivas inline para claims; la decisión usa bindings estructurales
  soporte→claim y recorrido→claim.
- RT-04 prefiere menos estructura visual; la decisión tipa relaciones sin seleccionar layout.
- RT-07 advierte que capabilities como refs pueden aparentar disponibilidad; la decisión exige
  `planned_capability` y `mustNotImply`.

## Decisión, pruebas y rollback

Implementar `CanonicalContentDocumentV1`, parser estricto, doble hash, source-freeze manifest de
read set completo, receipt generado, adapter V1 read-only y `verify:creation-doc`. [CONFIG]

Pruebas obligatorias: unknown fields; YAML duplicado/alias/anchor/tag/merge; tesis/acción únicas;
claims y refs huérfanos; hashes stale; reflow/CRLF; cambio de frase; links inseguros; red list;
capability vigente falsa; symlink fuera del root; receipt/publicación inválidos; V1 byte-idéntico.
[CONFIG]

Rollback: retirar solo la superficie H-01 de esta rama. V2, VS-001, `pilot-carousel-001`,
dependencias, adapters n8n y repositorio fuente permanecen intactos. Siguiente gate:
`APRUEBO HITO H-02`. [CONFIG]
