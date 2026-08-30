# Technical Defense Preparation · extensión R8

[METODOLOGIA] Bundle `PROJECT_LOCAL` code-backed para preparar una defensa técnica con
evidencia congelada, claims trazables, ensayo observado y red-team independiente. Su
identificador cerrado es `local.metodologia.technical-defense-preparation` y su estado
máximo es `ACTIVE_LOCAL`; no crea una ruta global.

[CÓDIGO] `handler.ts` y sus módulos de contratos/render son síncronos, puros y
deterministas. Devuelven nueve intenciones de bytes; solo `LocalExtensionExecutorV1`,
`MaterialSkillAdapterV2` y `TransactionKernelV1` pueden materializarlas como
`CREATE_FILE` create-only. El executor compara los tres módulos importados del bundle
con `manifest.content` y con la copia física materializada.

[CONFIG] El manifest exige `scope: PROJECT_LOCAL`, `kind: bundle`, `effect_class:
local_reversible`, `tools: []` y un probe cuyo resultado físico es `network: DENIED`.
No se admiten `eval`, import dinámico, subprocess, overwrite, delete, move ni red.
El `runner_id` identifica un manifest runtime canónico sobre un superset transitivo:
todos los módulos TypeScript de core, adapters, local extensions y este bundle, más los
locks/config de resolución. Alta, baja, rename o cambio de bytes invalida la activación.
Esta atestación de código local no es aislamiento criptográfico del host; la ejecución
sigue declarando `LOCAL_SIMULATION`.
El probe debe declarar exactamente el mismo conjunto `{ref, sha256}` que
`manifest.content`; evidencia omitida, duplicada o autoelegida bloquea la activación.

[DOC] Fases gobernadas: intake/freeze; requisitos; arquitectura y trade-offs; matriz
de claims; threat/failure model; banco Q&A; dos ensayos observados; red-team
independiente; paquete final MD/HTML. Todos los outputs llevan `BORRADOR LOCAL · NO
VERIFICADO · LOCAL_SIMULATION`.

[HERRAMIENTA] La activación del loader solo demuestra carga local y probe hash-bound.
No equivale a verificación, Guardian PASS, aprobación H01, promoción, publicación o
entrega externa.

[INFERENCIA] Un claim se considera soportado en este piloto únicamente cuando apunta
a evidencia incluida, con hash material, rights y autoridad explícitos. Esta regla es
un control de software; no demuestra que la afirmación sea verdadera fuera del caso.

[SUPUESTO] El piloto usa fixtures sintéticos y autorización interna limitada al repo
Frames. No concede derechos de redistribución de los repos donantes ni autoridad para
usar información real de cliente.

[METODOLOGIA] El contrato exige `pilot_data_classification: SYNTHETIC_ONLY`, un
`technical-defense-pii-redaction-receipt-v1` ligado al payload y una sesión independiente
de Privacy/Provenance ligada al hash exacto de los bytes del caso. El detector local de
patrones directos es defensa adicional, no fuente de PASS. Autoridad ausente, denegada,
stale o colisionada bloquea antes del efecto; esto no garantiza anonimización general ni
autoriza datos personales.

[HERRAMIENTA] Observadores de ensayo y red-team pasan por un
`TechnicalDefenseReviewAuthorityPortV1` runtime con tarea, actor, rol, autoridad y
acción hash-bound. El port sigue declarando `LOCAL_SIMULATION`; si no puede acreditar
una identidad distinta, la ejecución bloquea y no presume independencia host-level.

[CONFIG] El WorkOrder R8 se reconstruye y compara completo: identidad, request hash,
ruta, workflow, step, skill, actor, sets, inputs, outputs, tools, efecto, presupuesto,
criterios y stop rule. La autorización incorpora su hash físico; un WorkOrder alterno
auto-consistente no obtiene acceso al handler.

[NEUROCIENCIA] Este bundle no formula afirmaciones neurocientíficas.

[PEDAGOGIA] Este bundle no formula afirmaciones pedagógicas; organiza evidencia para
una defensa técnica, sin atribuir efectos de aprendizaje.

## Gates fail-closed

- D0 o D1 bloquea.
- D2 exige limitación visible, owner y signoff hash-bound.
- Menos de dos ensayos observados bloquea.
- Producer y red-team deben ser actor instances distintos.
- Producer, cada observador y red-team deben usar tareas y actores distintos, con
  autoridad runtime verificada para su acción exacta.
- Privacy/Provenance usa otra tarea y actor, ligados al hash exacto del caso.
- Datos diferentes de `SYNTHETIC_ONLY`, recibo PII stale o PII detectable bloquean.
- Evidencia mutable, claim sin soporte o write set divergente bloquea.
- `EFFECT_SUCCEEDED` no acredita verificación ni promoción.

## Outputs exactos

`brief.md`, `evidence-map.md`, `architecture-narrative.md`, `claim-matrix.md`,
`qa-bank.md`, `threat-model.md`, `rehearsal-report.md`,
`technical-defense-package.md` y `technical-defense-package.html`.
