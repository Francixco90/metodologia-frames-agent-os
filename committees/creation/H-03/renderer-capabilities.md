# Comité H-03 — Capacidad de render ejecutable y gobernada

Estado: `DECIDED_FOR_IMPLEMENTATION`. Alcance máximo: evaluación local de adapters; sin H-04,
Carousel V2, producción, distribución o publicación. [CONFIG]

## Cinco posiciones

| ID     | Actor instance | Rol                   | Veredicto                        | Aporte seleccionado                  | Riesgo principal                     |
| ------ | -------------- | --------------------- | -------------------------------- | ------------------------------------ | ------------------------------------ |
| P-RT04 | RT-04-H03-001  | arquitectura y skills | APPROVE_WITH_AMENDMENTS          | registry aislado y sucesión del lock | alterar Root o gates históricos      |
| P-RT07 | RT-07-H03-001  | dirección de render   | APPROVE_WITH_BLOCKING_CONDITIONS | frame explícito y probes separados   | smoke superficial o fallback oculto  |
| P-RT08 | RT-08-H03-001  | semántica visual      | APPROVE_WITH_CONDITIONS          | D3 puro y equivalencia textual       | visual sin unidad, evidencia o orden |
| P-RT10 | RT-10-H03-001  | reproducibilidad      | GO_CONDICIONADO                  | pines compatibles y riesgos runtime  | ticker, tiempo interno y ANGLE       |
| P-RT03 | RT-03-H03-001  | evidencia y derechos  | APPROVE_WITH_BLOCKING_CONDITIONS | receipts/licencias por capability    | promoción sin licencia adjudicada    |

## Veinte revisiones cruzadas

| ID          | Reviewer | Target | Verdict | Objeción verificable                                    | Disposición                                             |
| ----------- | -------- | ------ | ------- | ------------------------------------------------------- | ------------------------------------------------------- |
| X-RT04-RT07 | RT-04    | RT-07  | SUPPORT | Motion explícito por frame preserva determinismo.       | Aislar probe de Root y VS-001.                          |
| X-RT04-RT08 | RT-04    | RT-08  | SUPPORT | D3 puro evita transiciones y permite equivalencia.      | Exigir unidad, fuente y fallback tabular.               |
| X-RT04-RT10 | RT-04    | RT-10  | AMEND   | El lock nuevo rompe dos gates H-02.                     | Añadir sucesión hash-bound sin reescribir historia.     |
| X-RT04-RT03 | RT-04    | RT-03  | SUPPORT | Receipts separados evitan promociones implícitas.       | Mantener `blocked_license` cuando falte autoridad.      |
| X-RT07-RT04 | RT-07    | RT-04  | SUPPORT | El aislamiento protege VS-001, pero cambia el lock.     | Exigir receipt H-02→H-03 antes del registry.            |
| X-RT07-RT08 | RT-07    | RT-08  | AMEND   | Geometría pura no prueba legibilidad ni equivalencia.   | Añadir metadata, texto equivalente y hostiles.          |
| X-RT07-RT10 | RT-07    | RT-10  | AMEND   | Los pines no resuelven ticker, ANGLE o licencia.        | Probar proceso fresco, cleanup y estado fail-closed.    |
| X-RT07-RT03 | RT-07    | RT-03  | SUPPORT | Un fallback no puede promover una capacidad bloqueada.  | Ligar versión, integridad, licencia y consecuencia.     |
| X-RT08-RT04 | RT-08    | RT-04  | AMEND   | El registry debe gobernar semántica cuantitativa.       | Añadir invariantes D3 y fallback tabla/lista.           |
| X-RT08-RT07 | RT-08    | RT-07  | AMEND   | D3 no controla tiempo; frame sería semántica falsa.     | Registrar `clockMode=not_applicable`.                   |
| X-RT08-RT10 | RT-08    | RT-10  | SUPPORT | Pines y smokes deben bloquear módulos D3 impuros.       | Prohibir selection, transition, timers y orden ambiguo. |
| X-RT08-RT03 | RT-08    | RT-03  | SUPPORT | Una licencia D3 no promueve las otras capacidades.      | Resolver licencia individual y bloquear readiness.      |
| X-RT10-RT04 | RT-10    | RT-04  | AMEND   | El lock nuevo debe suceder al baseline.                 | Receipt append-only y rollback reproducible.            |
| X-RT10-RT07 | RT-10    | RT-07  | AMEND   | Frame seeking no prueba ticker ni reloj interno Three.  | Smokes frescos, concurrencia y evidencia de frames.     |
| X-RT10-RT08 | RT-10    | RT-08  | SUPPORT | D3 puro sirve con orden, dominio y redondeo explícitos. | Excluir selection, transition, timer, force y random.   |
| X-RT10-RT03 | RT-10    | RT-03  | SUPPORT | Licencias fail-closed separan evaluación y producción.  | Bloquear Remotion y revalidar alcance GSAP.             |
| X-RT03-RT04 | RT-03    | RT-04  | AMEND   | Registry aislado sin receipts no acredita procedencia.  | Ligar adapters, skills, licencias y lock sucesor.       |
| X-RT03-RT07 | RT-03    | RT-07  | AMEND   | Smoke sin derechos o hash no acredita capacidad.        | Añadir receipts de fixture, entorno y salida.           |
| X-RT03-RT08 | RT-03    | RT-08  | AMEND   | Texto y geometría pueden resolver evidencia distinta.   | Exigir bindings y cobertura estructural común.          |
| X-RT03-RT10 | RT-03    | RT-10  | SUPPORT | Pines exactos evitan disponibilidad prematura.          | Revalidar por cambio de lock o licencia.                |

Cobertura: cinco actores únicos; cada uno revisa a los otros cuatro; veinte pares dirigidos, únicos y
sin auto-revisión. RT-01 sintetiza sin votar; RT-09 y RT-11 permanecen fuera de producción. [CÓDIGO]

## Síntesis y disidencia

Se adopta un registry estricto con cinco adapters reales, dependencias exactas, frame explícito para
motion, D3 sin reloj, fallback observable y receipts por licencia. Las capacidades solo pueden llegar
a `verified_local_internal_preview`; el conjunto permanece `BLOCKED_LICENSE`. [CONFIG]

Disidencia preservada: RT-07 solicita smoke gráfico completo para acreditar Three; RT-10 advierte que
`ThreeCanvas` usa tiempo interno y que la reproducibilidad entre hosts no está demostrada. Se acepta
una prueba local ANGLE como evidencia H-03, pero no como claim cross-host. RT-03 mantiene que metadata
de licencia no equivale a dictamen legal. [METODOLOGIA]

Rollback: retirar la superficie H-03 y usar el receipt de sucesión para volver al lock H-02. Siguiente
gate solo si RT-09 y Guardian pasan y el gap de licencia se resuelve: `APRUEBO HITO H-04`. [CONFIG]
