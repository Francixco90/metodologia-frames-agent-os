# Adopción gobernada de workflows agénticos v1

Estado: `PUBLIC_PORT_LOCAL_VERIFIED · FINAL_GUARDIAN_PENDING · H01_NOT_EXECUTED · NOT_PROMOTED`.

Este expediente convierte dos repositorios fijados por SHA en evidencia y una reimplementación
TypeScript gobernada dentro de Frames, sin copiar código, prompts, plantillas ni assets del
donante. La autoridad concedida cubre cambio y pilotos locales; no cubre distribución externa,
publicación, despliegue, entrega, H01 ni promoción a fuente `active`. [METODOLOGIA] [SUPUESTO]

Fuentes evaluadas:

- `Propuesta-Medida@e0d6ba4576b23c83a6b22dbad53e23a8795b26d0`, reimplementado como
  `content_class: commercial-proposal` dentro de R6.
- `technical-defense-preparation-workflow@78fd3834acd38cf4b6ace7f7f1ed9c06893300f3`,
  capitalizado como bundle `PROJECT_LOCAL` R8 y patrón del kernel transaccional.

## Artefactos

- `capitalization-dossier.md`: auditoría, matriz COPY/ADAPT/REFERENCE/REJECT, defectos
  reproducidos y plan de capitalización.
- `socratic-debate.md`: decisión arquitectónica sometida a cuatro voces y cinco tensiones.
- `as-built-blueprint-v1.md`: arquitectura implementada, ADRs TX-001…TX-008 y límites residuales.
- `source-register.yml`: overlay `PROJECT_LOCAL` de las dos entradas evaluadas; fija por hash las
  autoridades globales sin mutarlas ni invalidar el freeze H-01/H-02 existente, y declara
  `EXTERNAL_EVIDENCE_RECORDED_NOT_REPLAYED` para archive, árbol y blobs no versionados.
- `receipts/source-register-project-local-scope-v1.yml`: successor receipt que niega integración
  global, liga el register físico y preserva sin reescribir los seis receipts históricos.
- `handoff.yml`: contrato de cierre local y handoff al Guardian final; H01 permanece como gate
  humano posterior, separado y no autorizado en este expediente.
- `validation-evidence.md`: comandos, resultados, hashes y límites de la evaluación.
- `implementation-authority-v1.md`: autoridad local explícita para cambio y piloto, sin autoridad
  de promoción, entrega o publicación.
- `public-port-authority-v1.md`: autoridad sucesora, ligada al main público y a la rama del port,
  sin permiso de push, merge o promoción.
- `change-budget-program-v1.json`: allowlist exacta, hash-bound y limitada a esta rama y baseline.
- `sources/**`: descriptors, manifests canónicos de paths, proyecciones analíticas y evidencia
  acotada de autorización, todos hash-bound y sin bytes fuente.

## Semántica de evidencia

- `[CÓDIGO]`, `[CONFIG]`, `[DOC]` y `[HERRAMIENTA]` identifican el tipo de evidencia.
- `[INFERENCIA]` identifica una conclusión derivada, no observación directa.
- `[SUPUESTO]` identifica una premisa que requiere autoridad humana o externa.
- `[NEUROCIENCIA]` No se formula ninguna afirmación neurocientífica en este expediente.
- `[PEDAGOGIA]` El ensayo y el banco de preguntas son mecanismos operativos; no se afirma eficacia
  pedagógica sin evidencia pertinente.

## Límite de estado

Los seis receipts históricos de fuente forman dos cadenas v2 hash-bound hasta `evaluated`; ese
estado no implica replay local de los bytes donantes. El runtime V2,
R6 y R8 pasaron suites focales, replays en procesos frescos, crash/recovery y QA visual en el
candidato privado. El port público reprodujo las suites focales, `pnpm check`, `typecheck` y
`pnpm verify`; sus
autoridades siguen separadas entre router, manifests, WorkOrders y commands. La validación del
contrato H01/promoción usa fixtures sintéticos, pero el candidato real no recibió H01 ni fue
promovido. `EVALUATED != ACTIVE != PROMOTED != HUMAN_APPROVED != PUBLISHED`. [CONFIG]
