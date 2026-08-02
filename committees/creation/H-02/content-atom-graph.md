# Comité H-02 — Identidad, linaje e invalidación atómica

Estado: `DECIDED_FOR_IMPLEMENTATION`. Alcance máximo: `QUALIFIED · ATOMIZED`; sin efecto de
composición, render, H-03, distribución o publicación. [CONFIG]

## Inputs y restricciones

- Base: `7377fd6d27dcbf6dde8d791661025722f2757965`.
- Parent editorial: `pilot-carousel-002@0.1.0`, `semanticSha256=9d724e86…`.
- Receipt H-01: `RCP-H01-RT02-SOURCE-FREEZE-001`, self-hash `91ff5903…`.
- Invariantes: atomizador puro, búsqueda limitada al parent graph, cero fuzzy/posición, estados
  `distributionState=NOT_DESIGNED` y `publicationAuthority=false`.

## Cinco posiciones

| ID     | Actor instance | Rol                  | Veredicto                        | Aporte seleccionado                            | Riesgo principal                              |
| ------ | -------------- | -------------------- | -------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| P-RT04 | RT-04-H02-001  | estrategia editorial | ACCEPT_WITH_AMENDMENTS           | surrogate persistente y clave semántica tipada | copy o posición tratados como identidad       |
| P-RT07 | RT-07-H02-001  | dirección creativa   | ACCEPT_WITH_MANDATORY_AMENDMENTS | preservar decisiones visuales al reordenar     | `statement` usado inicialmente como clave     |
| P-RT08 | RT-08-H02-001  | semántica visual     | ACCEPT_WITH_AMENDMENTS           | purpose como guard, bindings como identidad    | confundir fixture 39/50 con límite del schema |
| P-RT10 | RT-10-H02-001  | reproducibilidad     | ACCEPT_WITH_MANDATORY_AMENDMENTS | dominios de hash, tombstones y replay          | reconciliación posicional de compatibilidad   |
| P-RT03 | RT-03-H02-001  | evidencia y derechos | APPROVE_WITH_BLOCKING_CONDITIONS | bindings exactos y rights monotónicos          | excluir prosa también del hash de integridad  |

## Veinte revisiones cruzadas

| ID          | Reviewer | Target | Verdict | Objeción verificable                                      | Disposición                                               |
| ----------- | -------- | ------ | ------- | --------------------------------------------------------- | --------------------------------------------------------- |
| X-RT04-RT07 | RT-04    | RT-07  | AMEND   | Copy mutable no puede formar identidad.                   | Excluir `statement`; conservarlo en payload/revisión.     |
| X-RT04-RT08 | RT-04    | RT-08  | SUPPORT | Purpose sirve como guard, no como ID único.               | Combinar purpose y bindings tipados.                      |
| X-RT04-RT10 | RT-04    | RT-10  | AMEND   | Parent limita búsqueda, pero no es significado editorial. | Guardar parent en lineage/context, no en semantic key.    |
| X-RT04-RT03 | RT-04    | RT-03  | SUPPORT | La integridad requiere conservar copy.                    | Hash de revisión cubre payload y evidencia.               |
| X-RT07-RT04 | RT-07    | RT-04  | SUPPORT | IDs estables conservan decisiones visuales.               | Reconciliación unívoca contra parent declarado.           |
| X-RT07-RT08 | RT-07    | RT-08  | AMEND   | Purpose repetido puede ser legítimo.                      | Label solo desambigua candidatos múltiples.               |
| X-RT07-RT10 | RT-07    | RT-10  | SUPPORT | Tombstones evitan reciclaje silencioso.                   | Reintroducción crea generación nueva.                     |
| X-RT07-RT03 | RT-07    | RT-03  | AMEND   | Derechos no deben heredarse por mera cercanía.            | Propagar únicamente por edges `hard`.                     |
| X-RT08-RT04 | RT-08    | RT-04  | SUPPORT | Singular usa nombre canónico; colección usa ID authored.  | Tipar ambos casos en el reconciliador.                    |
| X-RT08-RT07 | RT-08    | RT-07  | AMEND   | Una edición de frase debe preservar identidad.            | Copy fuera de clave, dentro de payload hash.              |
| X-RT08-RT10 | RT-08    | RT-10  | AMEND   | El fixture no debe congelar extensibilidad.               | Validar 39/50 en fixture/check, no schema genérico.       |
| X-RT08-RT03 | RT-08    | RT-03  | SUPPORT | Evidence/rights deben llegar a visuales semánticos.       | Edges hard propagan; topology-only no.                    |
| X-RT10-RT04 | RT-10    | RT-04  | SUPPORT | Matching exacto reduce churn sin fuzzy.                   | Un match reutiliza, cero crea, varios bloquean.           |
| X-RT10-RT07 | RT-10    | RT-07  | AMEND   | Label no es clave primaria durable.                       | Usarlo solo como discriminador secundario.                |
| X-RT10-RT08 | RT-10    | RT-08  | SUPPORT | Orden debe ser topología, no identidad.                   | Edge incluye source ID y ordinal.                         |
| X-RT10-RT03 | RT-10    | RT-03  | AMEND   | Raw/actores no deben contaminar semántica.                | Persistirlos solo en AtomizationReceiptV1.                |
| X-RT03-RT04 | RT-03    | RT-04  | AMEND   | Excluir prosa de identidad no permite drift invisible.    | Revision/output hashes cambian con copy.                  |
| X-RT03-RT07 | RT-03    | RT-07  | AMEND   | Planned capability no puede ascender a disponible.        | Rights/state efectivos permanecen `planned_only`.         |
| X-RT03-RT08 | RT-03    | RT-08  | AMEND   | Edges topológicos no deben transmitir autoridad.          | Política `topology_only` sin output/evidence upstream.    |
| X-RT03-RT10 | RT-03    | RT-10  | SUPPORT | El receipt debe ligar H-01 y actores distintos.           | Receipt cerrado, self-hash y producer/verifier separados. |

Cobertura: cinco actores únicos; cada uno evalúa los otros cuatro; veinte pares dirigidos únicos y
sin auto-revisión. RT-01 sintetiza sin votar; RT-09 y RT-11 no producen esta decisión. [CÓDIGO]

## Alternativas y trade-offs

- Mínima: IDs por posición. Rechazada porque insertar o reordenar reasigna identidad.
- A: `purpose` como identidad única. Rechazada porque dos beats legítimos pueden compartirla.
- B seleccionada: surrogate persistente, clave tipada y reconciliación exacta dentro del parent.
- C: hash del copy. Rechazada porque una mejora de frase destruiría linaje útil.
- Fuzzy matching. Rechazado por no determinismo y riesgo de ligar contenido incorrecto.

Trade-off aceptado: el ledger de generaciones y tombstones añade estado, pero evita resurrecciones,
permite invalidación mínima y hace auditable cada reutilización. [METODOLOGIA]

## Síntesis, disidencia y decisión

Se adopta `atom-identity-v1`: IDs opacos derivados inicialmente de dominio, `contentId`, clase,
tipo, clave reconciliable y generación. Los beats usan `purpose + claimIds + capabilityIds +
stateDisclosure`; `label` solo resuelve múltiples candidatos. Coincidencia única reutiliza ID; cero
crea; varias producen `ATOM_IDENTITY_AMBIGUOUS`. Una eliminación crea tombstone y una reaparición
usa generación nueva. [CONFIG]

Disidencia preservada:

- RT-05 propuso `purpose` como ancla única. Se conserva como alternativa simple, rechazada por
  colisión y por no distinguir bindings.
- RT-10 planteó inicialmente compatibilidad posicional. La retiró en su posición formal al comprobar
  que inserción y reorder cambian el significado del ID.
- RT-07 incluyó `statement` en la clave. Se acepta su objetivo de continuidad visual, pero se excluye
  el copy de identidad para cumplir la edición selectiva.

## Pruebas, rollback y siguiente gate

Pruebas: rebuild/proceso fresco; CRLF/reflow; frase, inserción, reorder, split/merge, eliminación y
tombstone; ambigüedad; ciclo/huérfano/self-edge; drift de claim, authority, locator, fragment,
rights, parent y receipt; revisión no monotónica; ID/receipt reciclado; capability/readiness/publicación
promovidos; preservación exacta H-01/V1/VS-001/lock/n8n. [CONFIG]

Rollback: retirar únicamente contratos, workflow, checks, pruebas y derivados H-02. Si un grafo fue
aceptado, registrar su revocación sin reescribir el snapshot. H-01 permanece fuente inmutable y el
estado vuelve como máximo a `SCOPED`. Siguiente gate humano: `APRUEBO HITO H-03`. [CONFIG]
