# 00 Source script — Cadena visible

## Estado y alcance

- Work product: `REMOTION-VS001`.
- Dirección: `PROP-VS001-02-RT04` — Cadena visible.
- Fuente: `SRC-SYNTH-VS001` / `synthetic-vs-001-v1`.
- Hash normalizado: `709d0df2c40af4c69f8c9b3cd64b4efb97a62b184c3c8fcc6fe6476ab68ac9cb`.
- Uso permitido: `local_contract_testing_only`.
- Estado máximo solicitado: `RENDERED_DRAFT`.
- Badge persistente: `LOCAL TEST ONLY`.
- Audio: `silent-first`; cero streams porque falta un rights receipt de audio.
- [CONFIG] El corpus canónico permanece en `0/4`; se comunica como `coverage_gap`, nunca como KPI.

## Tesis

Crear no es improvisar. Es hacer visible una cadena: fuente → decisión → producto → gate.
[INFERENCIA] Esta formulación editorial traduce los tres claims utilizables sin añadir un claim de
desempeño.

## Guion y timing derivado

| Beat              | Pregunta / breadcrumb | Copy en pantalla                                                                                                                                    | Caption                                                                                       | Evidencia                                                             | Rango          |
| ----------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------- |
| `B01-apertura`    | ¿De dónde sale?       | **Crear no es improvisar.** Es hacer visible qué fuente entra, qué decisión se toma y qué gate sigue.                                               | Crear no es improvisar. Es hacer visible una cadena.                                          | `CLM-VS001-001` · `CFG-COMMITTEE-DECISION`                            | `[0, 145)`     |
| `B02-fuente`      | ¿De dónde sale?       | **Primero, una fuente identificada.** El snapshot sintético first-party conserva ID, versión y hash antes de proponer una pieza.                    | Primero, una fuente first-party identificada y versionada.                                    | `CLM-VS001-001` · `CFG-LOCAL-EVALUATION`                              | `[133, 265)`   |
| `B03-comite`      | ¿Cómo se decide?      | **Una decisión material se contrasta.** Producer, verifier y Guardian son roles distintos. La síntesis seleccionada mantiene la disidencia útil.    | Después, una decisión material pasa por un comité con roles distintos.                        | `CLM-VS001-002` · `CFG-COMMITTEE-DECISION`                            | `[253, 435)`   |
| `B04-custodia`    | ¿Cómo se decide?      | **La señal conserva la evidencia.** Snapshot, claim IDs y hash permanecen visibles. El corpus canónico sigue en 0/4: es un coverage_gap, no un KPI. | Snapshot, claims y hash siguen juntos. Cero de cuatro es un gap, no un KPI.                   | `CLM-VS001-001` · `CLM-VS001-002` · `CFG-CANONICAL-CORPUS-GAP`        | `[423, 656)`   |
| `B05-bifurcacion` | ¿Cómo se decide?      | **Un expediente. Dos salidas coherentes.** La señal se bifurca en Web y Motion sin perder snapshot, claims, estado ni límite.                       | Desde el mismo expediente, Web y Motion se bifurcan sin perder trazabilidad.                  | `CLM-VS001-001` · `CLM-VS001-003` · `CFG-COMMITTEE-DECISION`          | `[644, 839)`   |
| `B06-gate`        | ¿Hasta dónde llega?   | **El sistema también sabe detenerse.** Sin derechos, autoridad, hashes y aprobación humana no existe paso legítimo a READY ni PUBLISHED.            | Sin derechos, autoridad, hashes y aprobación humana, el flujo no avanza a READY ni PUBLISHED. | `CLM-VS001-003` · `CFG-LOCAL-EVALUATION`                              | `[827, 1060)`  |
| `B07-cierre`      | ¿Hasta dónde llega?   | **Un borrador útil sigue siendo borrador.** RENDERED_DRAFT y LOCAL TEST ONLY permanecen visibles. El render no concede aprobación ni publicación.   | RENDERED DRAFT. LOCAL TEST ONLY. El límite también es parte del producto.                     | `CLM-VS001-003` · `CFG-LOCAL-EVALUATION` · `CFG-CANONICAL-CORPUS-GAP` | `[1048, 1231)` |

Duración derivada: **1231 frames / 41.033 s a 30 fps**.
[CÓDIGO] Cada hold se calcula desde palabras del caption, 165 WPM,
margen de playback 1.15, lead/trail y la ventana de transición. No
se adopta un default de 36 segundos.

## Elementos incorporados de la síntesis

1. Tres preguntas como headers y breadcrumb.
2. Estado por texto, forma y patrón; variante reduced-motion y rights-first.
3. Semántica `0/4`, claim IDs y hash como custodia secundaria legible.
4. Señal persistente con bifurcación Web/Motion desde el mismo expediente.

## Mensajes prohibidos

- Afirmaciones de desempeño, alcance o conversión.
- Lectura de 0/4 como KPI o progreso porcentual.
- READY, FINAL, HUMAN_APPROVED o PUBLISHED como estado concedido.
- Cinco propuestas o veinte reviews como métrica de éxito.
- Derechos comerciales o elegibilidad productiva del runtime Remotion.
