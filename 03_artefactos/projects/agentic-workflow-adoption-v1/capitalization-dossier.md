# Dossier de capitalización: Proposal + Technical Defense para Frames

Estado: `EVALUATED_INPUTS · DESIGN_BASELINE · NOT_IMPLEMENTED`.

## 1. Decisión ejecutiva

Frames debe absorber semántica de dominio de `Propuesta-Medida` y patrones de integridad de
`technical-defense-preparation-workflow`, pero no sus runtimes. La adopción correcta es un
strangler nativo en TypeScript: R6 conserva la autoridad comercial existente; R8 aloja un bundle
`PROJECT_LOCAL`; R9 conserva cambio y promoción. No se crean rutas, renderers, registries ni
autoridades paralelas. [METODOLOGIA] [INFERENCIA]

```text
Gateway → Route lock → WorkOrder hash-bound
        → Perfil de dominio
        → TransactionKernelV1
        → Effect receipt
        → Verifier PASS
        → RT-11 verdict
        → Recorder → GuardianReceipt
        → H01 one-use approval hash-bound
        → Recorder → PromotionReceipt → PROMOTED
        → Descendientes
```

Esta secuencia resuelve una ambigüedad del borrador inicial a favor de M06 y de los invariantes
causales posteriores: H01 autoriza el candidato exacto antes de persistir `PROMOTED`; nunca después.
[CONFIG]

La evaluación fija dos fuentes:

- `Propuesta-Medida@e0d6ba4576b23c83a6b22dbad53e23a8795b26d0`, árbol
  `457920d64756549eb4862b2653e2bf293d332ab9`.
- `technical-defense-preparation-workflow@78fd3834acd38cf4b6ace7f7f1ed9c06893300f3`, árbol
  `467691b625de2590171290d2dff779a791749f8c`.

`[SUPUESTO] user_authorized_internal_implementation` permite una reimplementación interna y
acotada. No prueba propiedad, licencia pública, redistribución, publicación o entrega. Los
receipts terminan en `evaluated`, no `active`. [CONFIG]

## 2. Semántica COPY / ADAPT / REFERENCE / REJECT

- **COPY**: elevar una invariante o criterio observable al contrato de Frames. Nunca significa
  copiar bytes, código, prompts, tests, plantillas o assets del donante.
- **ADAPT**: reexpresar el comportamiento en contratos, handlers y tests nativos de Frames.
- **REFERENCE**: mantener la ruta y el hash del blob seleccionado como evidencia de análisis, sin
  incorporar su contenido.
- **REJECT**: prohibir la incorporación del componente o del comportamiento observado.

Los manifests de paths seleccionados contienen solo path, Git blob SHA-1, SHA-256 y bytes. Las
proyecciones describen decisiones; ningún source file del donante fue versionado. [CÓDIGO]

## 3. Auditoría 6D

La evaluación usa seis dimensiones: integridad estructural, calidad del comportamiento agéntico,
patrones arquitectónicos, antipatrones, seguridad/cumplimiento y deuda técnica. [METODOLOGIA]

| Dimensión              | Propuesta-Medida                                                                          | Technical Defense                                                            | Decisión Frames                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Integridad estructural | Grafo, contratos y techo de release explícitos; manifest persistido desalineado           | Manifest, schemas y grafo pasan; ejecución colapsa estados causales          | COPY invariantes; regenerar todos los manifests de Frames                  |
| Calidad agéntica       | Readiness y autoridad comercial ricas; runtime propio acopla dominio y motor              | Fail-closed local y hash binding fuertes; identidad de actor es declarativa  | Separar perfil de dominio, kernel, actor authority y recorder              |
| Patrones               | Claims, ROI, pricing authority, fresh-context Guardian                                    | DAG, write sets, create-only, receipts, ledger encadenado                    | ADAPT a contratos TypeScript y authorities existentes                      |
| Antipatrones           | `SUCCEEDED`/skip puede propagarse como aceptación; storage/recovery no cumple objetivo V1 | Target igual en carrera puede aceptarse; `SUCCEEDED` desbloquea dependencias | REJECT causalidad por estado genérico; depender de PromotionReceipt físico |
| Seguridad/cumplimiento | Sin licencia tracked observada; no hay autoridad de distribución                          | Licencia tracked limita uso interno y prohíbe redistribución/hosting externo | Internal implementation only; cero vendoring, red o distribución           |
| Deuda técnica          | Runtime Python y assets duplicarían capacidades Frames                                    | Runtime Python portable no es backend cross-platform seguro                  | Strangler aditivo; adapters V1 intactos; Windows devuelve capability gap   |

Los hallazgos de código son observaciones del SHA fijado, no juicios sobre versiones futuras.
[CÓDIGO] [INFERENCIA]

## 4. Capitalización de Propuesta-Medida en R6

### 4.1 COPY

1. Readiness previo a cualquier construcción material.
2. Claims no vacíos ligados a evidencia, autoridad y derechos.
3. ROI con baseline, fórmula, horizonte, unidad, fuente y supuestos visibles.
4. Precio y compromisos ligados a una autoridad comercial hash-bound distinta del brief.
5. Verificación semántica previa a Guardian y techo automático en borrador.
6. Invalidación ante drift de input, grafo o autoridad. [CONFIG]

Evidencia de selección: `control/objective-contract.json`, `docs/contracts.md`, los contratos de
Python, las etapas `readiness`, `business_case` y `verification`, y sus tests. Solo se conservan sus
hashes en `sources/proposal-measure-e0d6ba4/selected-paths.manifest.tsv`. [DOC] [CÓDIGO]

### 4.2 ADAPT

La semántica entra como `content_class: commercial-proposal` dentro de R6:

```text
P01 → P02 → P03 → P05 → P06 → P07
```

- P00 se inserta únicamente si falta perfil de marca.
- P08 se permite únicamente después de `REVISE`.
- P04 y P09 se excluyen del camino comercial.
- El handler recibe `BriefSourceSchema` con hash, procedencia, derechos y autoridad reales; una
  referencia no se convierte implícitamente en `verified`.
- Los contratos destino son `CommercialProposalReadinessV1`, `CommercialProposalClaimV1`,
  `CommercialProposalSpecV1`, `CommercialProposalArtifactManifestV1` y
  `CommercialProposalVerificationV1`.
- El handler devuelve bytes/intenciones para MD, HTML, JSON canónico y CSV RFC4180. Solo el kernel
  materializa. El deck navegable exige confirmación explícita.
- Se reutilizan renderer MD/HTML, slideshow, template comercial y gates existentes. Estado
  automático máximo: `RENDERED_DRAFT`.

La adaptación evita un W02 alterno y mantiene separadas las autoridades de router, manifest,
WorkOrder y commands. [METODOLOGIA] [CONFIG]

### 4.3 REFERENCE

- Grafo y objetivo: `control/graphs/*.json`, `control/objective-contract.json`.
- Contratos de dominio: `docs/contracts.md`, `src/w02_custom_proposal/contracts/*`.
- Casos negativos: `tests/test_contracts.py`, `tests/test_runtime.py`, `tests/test_stages.py`.
- Defecto de integridad: `control/package-manifest.json`, `tests/test_package_manifest.py`.

Cada referencia está ligada al blob y SHA-256 exactos; no existe locator local privado en el
expediente. [HERRAMIENTA]

### 4.4 REJECT

- Runtime Python completo, CLI, engine, lock y storage como dependencia de producción.
- Prompts `control/sources/**`, template HTML, design profiles, fuentes tipográficas y binaries.
- Manifests del donante como autoridad de Frames.
- Fixtures o salidas que pudieran contener semántica de cliente o entrega.
- Ruta, renderer, registry o workflow R6 paralelo.
- Inferir release por haber generado un artefacto local.

## 5. Capitalización de Technical Defense en R8 y core

### 5.1 COPY

1. DAG acíclico, dependencias existentes, waves crecientes y write sets exactos.
2. WorkOrder/approval ligado al hash del grafo, inputs y autoridad.
3. Path validation cross-platform y publicación create-only como requisito.
4. Receipts físicos inmutables y ledger append-only hash-chained.
5. Fail-closed ante drift, receipt faltante o estado incierto.
6. Red denegada y materialización local como default. [CONFIG]

### 5.2 ADAPT: TransactionKernelV1

El runtime Python se usa como oráculo conceptual, no como dependencia. La implementación destino
debe separar causalmente:

```text
PREPARED → RUNNING → EFFECT_SUCCEEDED
         → VERIFIED_PASS → GUARDIAN_PASS → PROMOTED
```

`EFFECT_SUCCEEDED` no habilita descendientes. La dependencia consumible es el hash físico de un
`TransactionPromotionReceiptV1`. `ActorAuthorityPortV1` comprueba actor/session/role; el Guardian
solo emite verdict read-only; un recorder mecánico distinto persiste `GUARDIAN_PASS` y, tras la
aprobación H01 one-use, un `PromotionReceipt`. RT-11 no es owner de promoción ni de archivos de
implementación. H01 no se ha ejecutado en este expediente. [METODOLOGIA]

V1 admite solo `CREATE_FILE` local. Overwrite, delete, move, subprocess, network y efectos externos
bloquean. El kernel debe incorporar snapshots pre/post, exact-path PathGuard, defensa de alias y
links, temporal exclusivo, `fsync`, hardlink create-only, readback, locks durables y recovery
append-only. Windows declara un capability gap mientras no exista backend seguro. [CÓDIGO]

### 5.3 ADAPT: bundle PROJECT_LOCAL

El bundle `local.metodologia.technical-defense-preparation` vive bajo R8 con
`scope: PROJECT_LOCAL` y `network: DENIED`. Sus fases son:

1. intake, objetivo y evidencia congelados;
2. inventario de requisitos;
3. narrativa de arquitectura y trade-offs;
4. matriz de claims;
5. threat/failure model;
6. banco de preguntas;
7. ensayo;
8. red-team independiente;
9. paquete final.

Salidas mínimas: brief, evidence map, architecture narrative, claim matrix, Q&A bank, threat model,
rehearsal report y paquete MD/HTML. El loader conserva manifest, hashes y sandbox probe; un
`LocalExtensionExecutorV1` respaldado por `TransactionKernelV1` reemplaza la simulación. Estado
máximo: `ACTIVE_LOCAL`; nunca ruta global. [DOC] [CONFIG]

### 5.4 REFERENCE

- Schemas: `contracts/*.schema.json`.
- Integridad: `docs/integrity.md`, `MANIFEST.sha256`.
- Fases: `docs/phase-a.md`, `docs/phase-b.md`.
- Algoritmos a estudiar: `authority.py`, `graph_validation.py`, `path_guard.py`,
  `receipt_store.py`, `executor.py`.
- Casos negativos: `tests/test_contracts.py`, `tests/test_runtime.py`.

### 5.5 REJECT

- Vendoring del package Python o ejecución Python como autoridad operacional.
- `SUCCEEDED` como combinación de efecto, verificación y promoción.
- Reutilizar un target idéntico creado por un writer ajeno durante una carrera.
- Identidad de actor acreditada solo por strings del request.
- Recovery que borra, trunca, reescribe receipts o infiere éxito.
- Cualquier red, defensa real, hosting de terceros o distribución externa.

## 6. Defectos reproducidos

### D-01 — Manifest de Propuesta-Medida desactualizado

- Severidad de adopción: **HIGH / integridad**.
- Reproducción: Python 3.11.13, `unittest discover -s tests -v`.
- Resultado: 55 tests; 54 PASS y 1 FAIL. Falla
  `test_package_manifest_recomputes_exactly`.
- Diferencia material única: `control/graphs/runtime-graph.json`.
- Manifest persistido: SHA-256
  `465bc0c5e75363426785e3d4ec065a28a49be6bc934e4bfccfb52314eb947d67`, 10 164 bytes.
- Blob observado en el commit: SHA-256
  `776d573e9c05a19937eb12fd45a9a6889d3789adaf7cfb9ba4abd294f90264fb`, 9 821 bytes.

Consecuencia: REJECT del manifest como autoridad portable; Frames debe regenerar y verificar su
propio manifest desde el árbol candidato. Un suite mayoritariamente verde no suple la desigualdad
hash-bound. [HERRAMIENTA] [CÓDIGO]

### D-02 — Carrera de target idéntico en Technical Defense

- Severidad de adopción: **HIGH / causalidad + TOCTOU**.
- Reproducción: durante `atomic_publish_no_replace`, un writer ajeno crea el target con bytes
  idénticos entre el precheck y `os.link`; el link levanta `FileExistsError`.
- Resultado observado: el hash del target y el result son
  `ff7479507d5c90392210ed5b3a0b952a19138f75b9213044a01c4a095b5b2a8f`, pero el runtime emite
  `SUCCEEDED` aunque el writer ajeno creó el archivo.

Consecuencia: REJECT del branch de “reuse equal content” ante carrera. Sin receipt previo válido
bajo el mismo lock y la misma causalidad, el estado correcto es `BLOCKED_UNCERTAIN`; igualdad de
bytes no prueba autoría del efecto. [HERRAMIENTA] [CÓDIGO] [INFERENCIA]

### Riesgos observados, no presentados como defectos reproducidos

- Proposal: ledger JSONL sin la separación objetivo entre effect, verifier, Guardian y recorder;
  recovery con mutaciones destructivas; actor independence basada en identifiers declarados.
- Defense: lock sin recovery gobernado de stale lock; sin snapshot completo del effect root, root
  swap/hardlink defense o API `inspectRecovery/recover`; un output por request.

Estos ítems requieren tests adversariales en la implementación Frames antes de elevar severidad o
declarar cierre. [INFERENCIA]

## 7. Capitalización de scripts, schemas, templates y tests

| Activo donante        | Tratamiento                    | Producto Frames                                  | Regla de no contaminación                          |
| --------------------- | ------------------------------ | ------------------------------------------------ | -------------------------------------------------- |
| Scripts de validación | REFERENCE + ADAPT              | Checks TypeScript y comandos existentes          | No copiar archivos ni crear runtime Python         |
| JSON schemas          | ADAPT                          | Zod/interfaces versionadas y fixtures sintéticos | Mapear semántica, no texto o estructura wholesale  |
| Grafos                | COPY invariantes + ADAPT nodos | DAG kernel + rutas R6/R8 existentes              | Router sigue siendo autoridad separada             |
| Templates HTML/design | REJECT                         | Template comercial y renderers Frames existentes | Cero fonts/assets/templates sin nueva trazabilidad |
| Prompts               | REJECT                         | Instrucciones propias, mínimas y auditables      | No incorporar prompts donantes                     |
| Tests                 | ADAPT ideas                    | Suites negativas y crash injection nativas       | Reescribir fixtures sintéticos; no copiar tests    |
| Manifests/receipts    | REFERENCE semántica            | Hashes canónicos y receipts Frames               | Regenerar; nunca confiar en manifest donante       |

## 8. Plan de ejecución y gates

1. **Wave 1 — autoridad:** integrar entradas `evaluated`, corregir paridad R0–R10 y separar
   RT-11/recorder/H01. Gate: source lifecycle + baseline verde.
2. **Wave 2 — kernel:** contratos, canonical hash, DAG, PathGuard, writer, ledger, inspect/recovery,
   recorder y fachada. Gate: adversarial suite por seam.
3. **Wave 3 — dominios:** R6 y R8 en rutas disjuntas; un solo Integration Owner para shared files.
   Gate: contratos, ownership y no activación prematura.
4. **Wave 4 — pilotos:** un output, DAG padre-hijo, multi-output; procesos frescos y crash
   injection. Gate: hashes idénticos y cero PASS/promoción espuria.
5. **Promoción:** `R9 freeze → HM_CHANGE_APPROVED → LX_BRIEF_APPROVED → piloto →
HM_CANDIDATE_VERIFIED → DOCS_TRANSVERSAL_COMPLETE → HM_PROMOTION_APPROVED`.

`HM_PROMOTION_APPROVED` debe ser one-use y hash-bound al candidato exacto. H01 es el único owner
humano de la decisión final; commands es la autoridad de comandos y no se duplica en router o docs.
[CONFIG]

## 9. Criterios de go/no-go

GO de implementación local solo cuando:

- las fuentes `evaluated` tienen receipts físicos continuos y proyecciones hash-bound;
- el WorkOrder liga hashes de autorización, grafo, input y write set;
- producer, verifier, Guardian y recorder son actor instances distintas;
- un descendiente exige PromotionReceipt físico, no estado `SUCCEEDED`;
- no hay `UNKNOWN`, `coverage_gap`, high o blocker en el camino obligatorio.

NO-GO para activación/promoción mientras:

- el contrato reforzado de receipts y su hash-chain no esté integrado;
- falte H01 ligado al hash candidato;
- Windows no tenga backend seguro y se pretenda paridad de filesystem;
- una prueba visual dependa de Chrome no disponible;
- exista drift entre router, manifests, gateway, commands o documentación.

## 10. Límites epistemológicos

`[NEUROCIENCIA]` No se usa neurociencia para justificar routing, autonomía o gates.

`[PEDAGOGIA]` El banco de preguntas y el ensayo organizan preparación; no se afirma mejora de
aprendizaje, retención o desempeño sin un estudio pertinente.

`[SUPUESTO]` La autorización del usuario es suficiente para la reimplementación interna solicitada,
pero no sustituye una licencia pública ni acredita redistribución.
