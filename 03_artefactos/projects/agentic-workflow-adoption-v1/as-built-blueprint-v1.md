# Blueprint as-built inicial v1

Estado de evidencia:
`WAVE1_OWNER_SOURCE_VERIFIED + TARGET_SPECIFIED · GUARDIAN_REVALIDATION_PENDING · RUNTIME_V2_NOT_IMPLEMENTED`.

“As-built inicial” significa que este documento distingue lo existente al baseline de lo que la
adopción deberá construir. No acredita que kernel, adapters, capacidades o pilotos ya existan.
[METODOLOGIA]

## 1. Línea base y delta

Baseline: Frames `origin/main@9978acd2e9f056fa3634a71ed7c495ba0323af77`.

| Elemento             | Baseline observado                           | Delta objetivo                                         | Estado              |
| -------------------- | -------------------------------------------- | ------------------------------------------------------ | ------------------- |
| Gateway y route lock | Autoridades Frames existentes                | Añadir señales inequívocas sin ruta paralela           | PENDING             |
| WorkOrder            | Contratos V1 existentes                      | Hash-bind graph, authority, inputs, outputs y receipts | PENDING             |
| Material adapters    | V1 operativo                                 | V2 puro detrás del kernel; V1 compatible               | PENDING             |
| Kernel transaccional | No existe con el contrato objetivo           | `TransactionKernelV1` create-only                      | PENDING             |
| Proposal             | Perfiles/renderers comerciales reutilizables | `commercial-proposal` dentro de R6                     | PENDING             |
| Technical Defense    | Loader local valida/simula                   | Bundle R8 + executor real por kernel                   | PENDING             |
| Source evidence      | Lifecycle source-promotion-v2                | Dos cadenas hasta `evaluated`                          | VERIFIED_NOT_ACTIVE |
| Promotion            | Separación documental RT-11/recorder/H01     | Receipts físicos y recorder V2                         | RUNTIME_PENDING     |

Los receipts y proyecciones creados por este expediente son evidencia de fuente; no son receipts de
ejecución del kernel. [CONFIG]

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
ejecutado; todo piloto futuro seguirá declarando `LOCAL_SIMULATION` mientras el host no acredite
identidad. [CONFIG] [SUPUESTO]

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

## 4. Contratos públicos objetivo

```ts
interface ActorAuthorityPortV1 {
  verify(session, expectedRole): ActorAuthorityVerdictV1;
}

interface TransactionKernelV1 {
  execute(input): TransactionEffectReceiptV1;
  inspect(input): TransactionInspectionV1;
  inspectRecovery(input): TransactionRecoveryAssessmentV1;
  recover(input): TransactionRecoveryReceiptV1;
}

interface CausalGateRecorderV1 {
  recordVerification(input): TransactionVerificationReceiptV1;
  recordGuardianVerdict(input): TransactionGuardianReceiptV1;
  promote(input): TransactionPromotionReceiptV1;
}
```

Firmas ilustrativas: los tipos y módulos exactos deben cerrarse en el contrato de Wave 2. No deben
copiarse interfaces Python ni introducir un segundo barrel de autoridad. [CÓDIGO]

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

## 10. Evidencia pendiente para llamarlo as-built completo

- Implementación y exports de los tres interfaces públicos.
- Tests de DAG, filesystem, writer, ledger, recovery y Guardian.
- Canary R6 y piloto R8 con fixtures sintéticos.
- Dos procesos frescos con hashes idénticos.
- Crash injection en cada durable seam.
- Visual QA o `BLOCKED/NOT_EXECUTED` si Chrome no está disponible.
- Guardian revalidation y H01 ligado al candidate hash exacto.

Hasta entonces, `DESIGN_BASELINE != VERIFIED_RUNTIME != PROMOTED`. [INFERENCIA]

`[NEUROCIENCIA]` No hay afirmaciones neurocientíficas en esta arquitectura.
