# Blueprint as-built v1

Estado de evidencia:
`WAVE4_LOCAL_VERIFIED · FINAL_GUARDIAN_PENDING · H01_NOT_EXECUTED · NOT_PROMOTED`.

Este documento distingue el baseline del delta implementado y verificado localmente. Acredita
runtime, capacidades y pilotos por tests/readback; no acredita autoridad host, H01 real,
promoción, publicación, distribución o entrega. [METODOLOGIA]

## 1. Línea base y delta

Baseline: Frames `origin/main@9978acd2e9f056fa3634a71ed7c495ba0323af77`.

| Elemento             | Baseline observado                                | Delta objetivo                                                    | Estado              |
| -------------------- | ------------------------------------------------- | ----------------------------------------------------------------- | ------------------- |
| Gateway y route lock | Autoridades Frames existentes                     | Señales inequívocas sin ruta paralela                             | IMPLEMENTED         |
| WorkOrder            | Contratos V1 existentes                           | Hash-bind graph, authority, inputs, outputs y receipts            | IMPLEMENTED         |
| Material adapters    | V1 operativo                                      | V2 puro detrás del kernel; V1 compatible                          | IMPLEMENTED         |
| Kernel transaccional | No existía con el contrato objetivo               | `TransactionKernelV1` create-only                                 | LOCAL_VERIFIED      |
| Proposal             | Perfiles/renderers comerciales reutilizables      | `commercial-proposal` dentro de R6                                | CANARY_PASS         |
| Technical Defense    | Loader local validaba/simulaba                    | Bundle R8 + executor real por kernel                              | PILOT_PASS          |
| Source evidence      | Overlay `PROJECT_LOCAL` + lifecycle global fijado | Proyecciones/receipts verificados; archive/tree/blobs no replayed | RECORDED_NOT_ACTIVE |
| Promotion            | Separación documental RT-11/recorder/H01          | Contratos físicos y recorder V2                                   | TESTED_NOT_EXECUTED |

Los receipts de fuente siguen separados de los receipts transaccionales. Los últimos se probaron
con fixtures sintéticos; no constituyen H01 ni promoción del candidato de adopción. [CONFIG]

## 2. Arquitectura objetivo

```text
┌─────────┐   ┌────────────┐   ┌──────────────────────┐
│ Gateway │ → │ Route lock │ → │ WorkOrder hash-bound │
└─────────┘   └────────────┘   └──────────┬───────────┘
                                          │
                     ┌────────────────────▼────────────────────┐
                     │ Perfil de dominio                       │
                     │ R6 commercial-proposal | R8 local bundle│
                     └────────────────────┬────────────────────┘
                                          │ bytes + intents
                                ┌─────────▼──────────┐
                                │ TransactionKernel │
                                │ V1 CREATE_FILE    │
                                └─────────┬──────────┘
                                          │ physical EffectReceipt
                  ┌───────────────────────▼──────────────────────┐
                  │ Verifier → RT-11 verdict → GuardianReceipt   │
                  └───────────────────────┬──────────────────────┘
                                          │ candidate hash
                                  ┌───────▼───────┐
                                  │ H01 one-use   │
                                  │ approval      │
                                  └───────┬───────┘
                                          │ exact approval receipt
                  ┌───────────────────────▼──────────────────────┐
                  │ Recorder → PromotionReceipt → PROMOTED       │
                  └───────────────────────┬──────────────────────┘
                                          │ PromotionReceipt hash
                                  ┌───────▼───────┐
                                  │ Descendientes │
                                  └───────────────┘
```

El Guardian es read-only. El recorder escribe un evento mecánico, no decide. H01 posee la decisión
final `HM_PROMOTION_APPROVED`, one-use y ligada al hash del candidato. Commands conserva autoridad
única sobre comandos; router no duplica esa superficie. [CONFIG]

La secuencia normativa resuelve la ambigüedad del blueprint inicial a favor de M06: H01 sucede
antes de `PROMOTED` y antes de que cualquier descendiente consuma el PromotionReceipt. H01 no fue
ejecutado; los pilotos declaran `LOCAL_SIMULATION` mientras el host no acredite identidad.
[CONFIG] [SUPUESTO]

## 3. Fronteras de autoridad

| Autoridad              | Decide                                          | No decide                                      |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------- |
| `router.yml`           | Ruta y señales inequívocas                      | Skills, outputs, commands o promoción          |
| Manifest de capability | Contratos, inputs, outputs y efectos permitidos | Ruta global o aprobación humana                |
| WorkOrder              | Instancia exacta, hashes, actores y write set   | Derechos no acreditados o ampliación de efecto |
| `commands.yaml`        | Comandos/gates invocables                       | Route matching o contenido de manifests        |
| Transaction kernel     | Materialización local y receipts causales       | Calidad semántica o autorización comercial     |
| Verifier               | PASS/REVISE/BLOCK por contrato                  | Guardian o promoción                           |
| Guardian / RT-11       | Verdict read-only posterior                     | Remediación, escritura o promoción             |
| Recorder               | Persistencia causal hash-bound                  | Decisión o aprobación                          |
| H01                    | Autoriza candidate exacto y one-use             | Persistencia, publicación o entrega implícita  |

## 4. Contratos públicos implementados

```ts
interface ActorAuthorityPortV1 {
  verify(session, expectedRole): ActorAuthorityVerdictV1;
}

interface TransactionKernelV1 {
  execute(input: unknown): TransactionEffectReceiptV1;
  inspect(input: unknown): TransactionInspectionV1;
  inspectRecovery(input: unknown): TransactionRecoveryAssessmentV1;
  recover(input: unknown): TransactionRecoveryReceiptV1;
}

interface ReadOnlyGuardianVerdictEmitterPortV1 {
  emit(input: unknown): TransactionGuardianVerdictV1;
}

interface CausalGateRecorderV1 {
  recordVerification(input: unknown): TransactionVerificationReceiptV1;
  recordGuardianVerdict(input: unknown): TransactionGuardianReceiptV1;
  promote(input: unknown): TransactionPromotionReceiptV1;
}

interface HumanApprovalRecorderV1 {
  recordHumanApproval(input: unknown): TransactionHumanApprovalReceiptV1;
}
```

Las firmas corresponden a los contratos exportados. Guardian emite bytes canónicos read-only; un
recorder distinto persiste el verdict, H01 exige el candidate exacto y promoción reutiliza la
identidad del recorder de `GUARDIAN_PASS`. [CÓDIGO]

## 5. Estado y causalidad

```text
PREPARED
  └─ RUNNING
      └─ EFFECT_SUCCEEDED
          └─ VERIFIED_PASS
              └─ GUARDIAN_PASS
                  └─ [H01_APPROVAL_RECEIPT]
                      └─ PROMOTED
```

Reglas:

1. Un estado solo avanza por receipt físico posterior y hash-bound; H01 autoriza antes de que el
   recorder emita PromotionReceipt.
2. `EFFECT_SUCCEEDED` nunca satisface una dependencia.
3. El hijo consume `TransactionPromotionReceiptV1.sha256`, no una ruta ni status mutable.
4. Crash o ambigüedad produce `BLOCKED_UNCERTAIN`.
5. Recovery agrega eventos; no trunca ledger, borra output ni reescribe receipt.
6. Producer, verifier, Guardian y recorder son actor instances distintos.
7. Mientras el host no acredite identidad, el receipt declara `LOCAL_SIMULATION`. [SUPUESTO]

## 6. Effect boundary V1

Permitido:

- `CREATE_FILE` local dentro de un effect root estable.
- Write set de archivos exactos, sin globs ni directorios.
- Handler puro que retorna bytes y metadata canónica.

Bloqueado:

- overwrite, delete, move, subprocess y network;
- symlink, hardlink inesperado, traversal, UNC, ADS, reserved names, casefold alias y trailing
  dot/space;
- root/parent swap, target preexistente, write parcial, fsync/link/readback fallido;
- cualquier output fuera del write set.

Publicación física: temporal exclusivo → write completo → file `fsync` → hardlink create-only →
parent `fsync` → readback → snapshot post. Un target idéntico aparecido durante una carrera no se
reutiliza sin receipt previo válido bajo el mismo lock. [CÓDIGO]

## 7. R6 commercial-proposal

Señales admisibles: `propuesta comercial`, `commercial proposal`, `proposal deck`. `proposal`
aislado no enruta. [CONFIG]

Secuencia: `P01 → P02 → P03 → P05 → P06 → P07`; P00 condicional por marca faltante, P08 solo tras
`REVISE`, P04/P09 excluidos.

Entradas/claims:

- `BriefSourceSchema` con provenance, rights, authority y hashes reales;
- scope incluido/excluido y supuestos visibles;
- ROI completo y falsable;
- pricing/commitments con authority receipt propio.

Outputs: MD, HTML, JSON canónico y CSV RFC4180. El deck navegable requiere confirmación explícita.
Techo automático `RENDERED_DRAFT`. [DOC]

## 8. R8 technical-defense PROJECT_LOCAL

Identidad: `local.metodologia.technical-defense-preparation`.

- scope: `PROJECT_LOCAL`;
- network: `DENIED`;
- loader: manifest, hashes y sandbox probe;
- executor: `LocalExtensionExecutorV1` respaldado por el kernel;
- estado máximo: `ACTIVE_LOCAL`, sin ruta global.

DAG de dominio:

```text
intake/evidence freeze → requirements inventory
  → architecture/trade-offs → claim matrix → threat/failure model
  → Q&A bank → rehearsal → independent red-team → final MD/HTML package
```

La etapa de red-team no puede autoaprobarse. Omitir rehearsal o usar evidencia mutable bloquea.
`[PEDAGOGIA]` El flujo organiza la práctica; no acredita un efecto educativo.

## 9. Matriz de implementación

| Wave          | Owner de escritura                   | Entrega                                      | Gate mínimo                                |
| ------------- | ------------------------------------ | -------------------------------------------- | ------------------------------------------ |
| 1             | Governance/Source owners separados   | Authorities alineadas + sources evaluated    | Baseline, rights, lifecycle                |
| 2             | Core Runtime owner único             | Kernel, recorder, adapters core              | DAG/filesystem/ledger/recovery adversarial |
| 3A            | R6 owner                             | Contracts + handler puro commercial proposal | Proposal negative suite                    |
| 3B            | R8 owner                             | Bundle + LocalExtensionExecutorV1            | Defense negative suite                     |
| 3 integration | Integration Owner único              | Router/exports/registries/commands           | Ownership + parity R0–R10                  |
| 4             | Producer/Verifier/Guardian separados | Pilotos, replay, crash injection             | Determinism + causal receipts              |

Waves 1–4 están implementadas y verificadas localmente; la fila de promoción describe un contrato
probado con fixtures, no un gate real ejecutado. [HERRAMIENTA]

## 10. ADRs de transacción

| ADR    | Decisión                                                   | Evidencia                                     | Consecuencia                                            | Estado         |
| ------ | ---------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- | -------------- |
| TX-001 | Separar dominio R6/R8 de un kernel único                   | Router, profiles, bundle y core disjuntos     | No runtime o autoridad paralela                         | ACCEPTED       |
| TX-002 | Ligar contratos, receipts y bytes por hash canónico/físico | Schemas, canonical JSON y readback            | Drift o bytes no canónicos bloquean                     | IMPLEMENTED    |
| TX-003 | Usar raíz estable y publicación `CREATE_FILE` create-only  | PathGuard, snapshots, fsync, link y readback  | Overwrite/delete/move/red quedan denegados              | IMPLEMENTED    |
| TX-004 | Ledger y recovery son append-only                          | Hash chain y crash tests por seam             | Incertidumbre nunca se convierte en éxito               | IMPLEMENTED    |
| TX-005 | Guardian es read-only; recorder es actor distinto          | Verdict serializado y autoridad revalidada    | RT-11 no remedia, persiste ni promueve                  | IMPLEMENTED    |
| TX-006 | H01 liga candidate exacto; promoción usa el mismo recorder | Tests de candidate drift y recorder collision | El contrato existe; el H01 real permanece pendiente     | TESTED_NO_GATE |
| TX-007 | Commercial Proposal es content class dentro de R6          | Señales, perfiles, template y canary          | Techo automático `RENDERED_DRAFT`; sin workflow alterno | IMPLEMENTED    |
| TX-008 | Technical Defense queda `PROJECT_LOCAL`, con red denegada  | Manifest, sandbox probe y piloto R8           | `ACTIVE_LOCAL` no se convierte en ruta global           | IMPLEMENTED    |

Estas decisiones son propias de Frames; los SHAs donantes permanecen como referencia y no como
dependencias ejecutables. [DOC] [CONFIG]

## 11. Evidencia de cierre y gaps

- Implementación/exports, DAG, filesystem, writer, ledger, recovery y contratos/suites causales de
  Guardian: `PASS_LOCAL`.
- Procedencia: gate global de 11 y gate `PROJECT_LOCAL` de 2 separados; register/successor y seis
  receipts históricos con readback físico. Archive, árbol completo y blobs donantes:
  `EXTERNAL_EVIDENCE_RECORDED_NOT_REPLAYED`.
- Canary R6 y piloto R8 sintéticos: `PASS_LOCAL`; techo R6 `RENDERED_DRAFT`, R8 `ACTIVE_LOCAL`.
- Dos procesos frescos: hashes R6/R8 idénticos; crash real en seams y recovery exacto: `PASS`.
- Chrome desktop/mobile: sin overflow ni errores; landmarks/nombre accesible básico: `PASS`.
- Browser proof: `swiftshader` fijado tras aislar deriva `angle/swangle`; 128 renders de estrés y
  tres replays completos sin divergencia, manteniendo hashes PNG byte-identical: `PASS_LOCAL`.
- El resolver de presupuesto conserva el branch real y solo recupera `GITHUB_HEAD_REF` para un
  checkout detached de GitHub Actions ligado a `pull_request`, base `main` y branch `codex/*`.
  El focal privado cerró 19/19; push, base distinta y ref insegura quedan inactivos. [CÓDIGO]
- Guardian final sobre el digest exacto: pendiente al redactar este estado.
- H01 real, promoción, publicación, distribución y entrega: `NOT_EXECUTED`.
- Linux/Windows: `NOT_EXECUTED`; Windows mantiene capability gap hasta backend seguro.

`LOCAL_VERIFIED != GUARDIAN_FINAL != H01_APPROVED != PROMOTED`. [INFERENCIA]

`[NEUROCIENCIA]` No hay afirmaciones neurocientíficas en esta arquitectura.
