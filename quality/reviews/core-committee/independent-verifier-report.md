# Verificación independiente A03/A04

## Veredicto

`PASS_A03_A04_LOCAL_CONTRACTS`

Los contratos de núcleo y comité revisados cierran los bypasses encontrados y
superan la suite independiente. Este veredicto se limita a A03/A04: no concede
`SOURCE_LOCKED`, `GUARDIAN_PASS`, `HUMAN_APPROVED`, `READY`, release ni
publicación. [CÓDIGO][CONFIG]

El verifier de este informe es `qa-core-committee-independent`, distinto de los
writers `core` y `agents-committee`, del Guardian canónico `RT-11` y de `H01`.
No se modificaron archivos de producción desde la superficie QA. [CONFIG]

## Resultado del comité VS-001

- Cinco propuestas conceptuales con cinco actores y cinco roles distintos.
- Veinte evaluaciones cruzadas: cuatro por propuesta y cuatro por reviewer,
  sin autoevaluación.
- Seis dimensiones de rúbrica con pesos que suman `1`.
- Ranking recalculado: P02 `Cadena visible` gana con `4.375`.
- Dos dissent trazados y dispuestos; cuatro alternativas dispuestas en la
  síntesis.
- Incertidumbre material pero analíticamente resoluble; segundo prototipo no
  justificado.
- La decisión persistida es canónicamente idéntica a
  `adjudicateCommittee(session)`.
- No se detectaron campos ni frases marcadas como razonamiento privado en el
  expediente validado. [CÓDIGO][DOC]

La procedencia está descrita sin exagerar delegación: tres propuestas/review
sets provinieron de subagentes especializados reales y dos de perspectivas
secuenciales explícitas del Lead. [DOC]

## Hallazgos y ciclo de remediación

| ID  | Severidad | Hallazgo inicial                                                                  | Disposición verificada                                                                   |
| --- | --------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| F01 | CRITICAL  | Faltaba RT-11 y el registry de roles cubría solo RT-01–RT-10.                     | RT-11 existe, valida y tiene prohibido producir, remediar, actuar como H01 o publicar.   |
| F02 | HIGH      | Una aprobación aceptaba hashes de evidencia distintos a la transición.            | La transición exige igualdad del conjunto de hashes de request y approval.               |
| F03 | HIGH      | Guardian y human gate aceptaban identidades genéricas.                            | `RT-11` y `H01` son identidades canónicas reservadas y no pueden impersonar otros roles. |
| F04 | CRITICAL  | Receipts, evidencia y memoria exponían estructuras nested mutables.               | Clone y deep-freeze protegen storage, returns y replay; los hashes permanecen estables.  |
| F05 | MEDIUM    | Veinte reviews podían reutilizar un `assessmentId`.                               | Los IDs de assessment deben ser globalmente únicos.                                      |
| F06 | HIGH      | Proposal/review aceptaban etiquetas CoT EN/ES dentro de campos narrativos.        | Los campos narrativos de propuestas y reviews rechazan términos prohibidos EN/ES.        |
| F07 | HIGH      | El schema G10 aceptaba `RT-11` o `H01` como producer/verifier del comité.         | Ambos actores están reservados y se rechazan en los dos lados de G10.                    |
| F08 | HIGH      | Synthesis, dissent, uncertainty y second prototype conservaban el bypass textual. | El control acotado cubre todas esas superficies narrativas y conserva IDs técnicos.      |

Todos los hallazgos están cerrados en el alcance A03/A04. [CÓDIGO]

## Evidencia ejecutada

1. Suite independiente:
   `vitest run tests/contract/core-committee-independent.contract.test.ts tests/negative/core-committee-independent.negative.test.ts`
   → `2` archivos, `26/26` tests PASS.
2. Suite combinada de producer más verifier:
   `vitest run tests/unit/core tests/unit/committee <dos suites independientes>`
   → `9` archivos, `110/110` tests PASS.
3. Validador del expediente:
   `node --import tsx projects/vs-001-source-to-campaign/remotion/committee/validate-committee.ts`
   → PASS, `5` propuestas, `20` reviews, P02 seleccionada.
4. Typecheck completo:
   `tsc -p tsconfig.json --noEmit` → exit `0`.
5. Lint de la suite independiente:
   `eslint <dos suites independientes>` → exit `0`.
6. Formato de la suite independiente:
   `prettier --check <dos suites independientes>` → PASS. [CÓDIGO]

Hashes SHA-256 de archivo:

| Evidencia                     | SHA-256                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| Contract tests independientes | `a077b117a08f65596053a5aa91258a69ab3c95b9992f3bba0773280862fbf14d` |
| Negative tests independientes | `783223a15b489fa96b9ea35f640de1f04e66219a158af5680b3a5f0a8d16e32b` |
| `committee-session.json`      | `4710b0108c3cad64ca0440ce86728974a7d6052fcc4bcd5519e785db72788623` |
| `committee-decision.json`     | `2ffcac1332a2247be2c63546df05291350ca56955a48ebfd2c5f18e58e7f90f7` |
| RT-11 contract                | `3ad98c144d73b26988e57fde73ee53b5bfd1494067a9337d3f1120e690b2b130` |
| State machine                 | `451710133d2fb918ffdf6205513973bf3b1d49791430ccdc9b2d901a49acdabd` |
| Idempotent receipt store      | `90762c7c20d9352470c0e6231d3dabf9e52cca9bb6ea4408434b2b937917e03b` |
| Committee contracts           | `5ac6652c0d177f6ab2d68ae347250c0aa9e3b5f2d08dd65307a92e7ecea65257` |
| G10 committee approval schema | `1423d6100d545fbc886fa83e59701ddbe7639a558b78ec00cb6c4f6fbaf70b2d` |

El validador canónico reportó además:

- session canonical digest:
  `9846792c603128d7e98aab9bdd6d3996bec49633cd568a328504581355c65033`;
- decision canonical digest:
  `be1a00153ce34c53e814b0becc1e9b50846d03fb2f2ad3584f521c4a623e654b`.

## Cobertura adversarial

La suite independiente rechaza:

- saltos desde `SOURCE_LOCKED` a cualquier estado audiovisual posterior;
- saltos directos de `READY` a autorización o publicación;
- evidencia no vinculada al approval;
- `H01`/`RT-11` como producer, verifier G10 o rol impersonado;
- Guardian/human no canónicos;
- review ID duplicado, review faltante, self-review y propuesta Guardian;
- selección de una propuesta por debajo del score máximo;
- términos CoT/razonamiento privado EN/ES en proposal, review, synthesis,
  dissent, uncertainty, second prototype y memoria;
- mutación nested de receipts;
- published dry-run y publicación sin rollback/output hash. [CÓDIGO]

## `coverage_gaps` y límites

- Los cuatro textos canónicos siguen ausentes (`0/4`) y `source_locked` debe
  permanecer `false`; esto no pertenece al PASS A03/A04.
- El expediente creativo contiene tres delegaciones reales y dos perspectivas
  secuenciales honestamente declaradas, no cinco subagentes reales.
- El comité emitió una decisión técnica reproducible, pero no existe receipt
  que conceda aprobación humana, Guardian pass, release o publicación.
- El filtro CoT detecta marcadores explícitos EN/ES y schemas no declarados; no
  pretende inferir semánticamente razonamiento privado no etiquetado.
- La inmutabilidad validada corresponde al runtime en memoria; la integridad
  durable depende también de receipts y hashes al persistir archivos.

## Próximo gate

El Lead puede aceptar A03/A04 y continuar QA audiovisual. El Guardian RT-11 debe
operar después de QA final, sin remediar, y H01 conserva un gate posterior e
independiente. [CONFIG]
