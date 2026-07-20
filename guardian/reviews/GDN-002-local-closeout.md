# GDN-002 — Local controlled closeout

## Decisión

**Verdict: `PASS_LOCAL_CONTROLLED_CLOSEOUT`.**

El snapshot Git `f03b2753ce2e7551e317454e94f3840bcc308fb2` pasa el cierre técnico local
controlado. Los P1 reabiertos por GDN-001 y por la auditoría auxiliar quedaron corregidos con
evidencia reproducible, sin ocultar que existió una reutilización accidental de siete IDs
append-only. [CÓDIGO][DOC]

Este veredicto tiene alcance exclusivamente técnico y local. **No** concede:

- `SOURCE_LOCKED`;
- `GUARDIAN_PASS` canónico ni `guardian_passed: true`;
- aprobación H01 ni `HUMAN_APPROVED`;
- `READY`, autorización de release o `PUBLISHED`;
- activación de n8n, conectores o distribución externa. [CONFIG]

El estado gobernado permanece `BLOCKED_BEFORE_SOURCE_LOCK`. Los estados técnicos aceptados son Web
`BUILD_VALIDATED` y Motion `RENDER_VALIDATED`; el estado visible continúa
`RENDERED_DRAFT · LOCAL TEST ONLY`. [CONFIG]

## Alcance e independencia

- Review: `GDN-002`.
- Proyecto: `vs-001-source-to-campaign`.
- Rol: Guardian RT-11 independiente.
- Baseline exacto: `f03b2753ce2e7551e317454e94f3840bcc308fb2`.
- Tree Git: `331a45c62a00b7127a9d37eb65f79a946f2e7613`.
- Snapshot: staging clean, rama `main`.
- Modo: lectura y validación sobre producción; Guardian no remedió generadores, receipts, manifests
  ni contratos. [CONFIG]
- Escritura Guardian: únicamente este informe y su recibo estructurado asociado. [CÓDIGO]

## Revalidación de hallazgos

### 1. Estados de proyecto y trazabilidad — REMEDIATED

`project-registry.yml`, `project.yml`, R-023, R-024, R-028 y el render manifest convergen en:

- estado actual `PARTIAL_CONTROLLED`;
- workflow gobernado `BLOCKED_BEFORE_SOURCE_LOCK`;
- Web `BUILD_VALIDATED`;
- Motion `RENDER_VALIDATED`;
- `source_locked`, Guardian canónico, H01, readiness y publicación en `false`. [CÓDIGO][CONFIG]

`pnpm check:projects` pasó dentro de `pnpm verify`. [CÓDIGO]

### 2. Prompt V6: raw, source-normalized y proyección — REMEDIATED

La verificación independiente reprodujo:

- raw SHA-256:
  `19803669c1ae8dacf62af64936060235cb7d15b870c7f0abc23962159be5bde2`;
- source-normalized SHA-256:
  `00de50b02d9cf393a5376781938fd0ba01c3bd8b7460e4b379ef9c31b148e505`;
- proyección inmutable SHA-256:
  `b75c9baa1afc8a893743e96adfddf09a2580cd9f527abdf91d108ee19d6f50f5`.
  [CÓDIGO]

El contrato v2 separa los tres roles. La migración de semántica conserva los cuatro receipts
históricos y sus hashes sin reescribirlos. La matriz de requisitos se declara ahora como vista
mutable de trazabilidad, no como bytes normalizados ni como proyección inmutable. [CONFIG][DOC]

### 3. NotebookLM por agente y workflow — REMEDIATED

Los once contratos RT-01..RT-11 y los cuatro workflows declaran propósito, pregunta, binding,
source IDs, cobertura y política read-only. El check reportó 15 work units válidos. El binding
permanece `none`, con cero evidence refs y `coverage_gap`; por tanto no promueve fuentes ni claims.
[CÓDIGO][CONFIG]

### 4. Skill Foundry, lineage y licencias — REMEDIATED_WITH_LIMITS

- `LINEAGE.yaml` resuelve contra IDs canónicos del source registry.
- La licencia interna tiene texto y receipt hash-bound.
- SHA-256 de `SKILL.md`:
  `6e808a55e0cf4bfc23c12575e28da18ff79db5d0f844d8460e0ff21341989cf3`.
- Receipt de licencia interna:
  `edfd2221161d3c58f5d498f71be656c7b811c5b0b3ba2ac8bfa31accbfe06555`.
- Receipt de evaluación Remotion 4.0.494:
  `24fd97f7ca1dd62e5b3146a990df4c2827e0cabc0248691c286917d48968bb2a`.
  [CÓDIGO]

Los cuatro validadores canónicos pasaron. El uso local de diseño y validación está permitido por la
decisión del programa; la elegibilidad comercial o productiva de Remotion continúa bloqueada como
`coverage_gap`. Las fuentes externas de referencia siguen sin copiarse. [CONFIG]

### 5. Evidence v2 portable — REMEDIATED

`test-report-v2.json` usa `TEST-REPORT-REMOTION-VS001-002`; sus cinco command receipts usan IDs
terminados en `-V2`, paths relativos y hashes semánticos normalizados. No persisten stdout, stderr,
locators absolutos ni referencias a `validation-logs`. [CÓDIGO]

Los cinco evidence refs resolvieron y coincidieron con sus hashes. El render receipt actual
`RCP-REMOTION-VS001-002` referencia únicamente evidencia portable, existente y versionada.
[CÓDIGO]

### 6. Inmutabilidad y supersession — REMEDIATED_WITH_HONEST_HISTORY

La auditoría confirmó que el commit histórico `ce732781ae5602859679de72800ae05397e47ca0`
reutilizó accidentalmente siete IDs. La corrección no reescribe Git ni declara una historia falsa:

- los siete V1 actuales son byte-idénticos a
  `d4a90901de20c7e54cdaa6e76394f37654341bea`;
- los siete hashes accidentales de `ce73278` permanecen registrados;
- cada reemplazo usa path e ID nuevos;
- `MIG-REMOTION-VS001-APPEND-ONLY-001` mapea 7/7 pares
  original → mutación accidental → replacement;
- el migration receipt declara explícitamente `historyWasImmutable: false`;
- el writer append-only admite replay byte-idéntico y rechaza drift bajo el mismo ID. [CÓDIGO]

Hashes actuales principales:

- migration receipt:
  `a8e8b02ef1eae0f346875646e5b90981d8e89a1eedd7f873220bb4f7cf255658`;
- test report v2:
  `458cce400fde20059ee088c2d5c832002234f0873773de28442970995dc60806`;
- render receipt v2:
  `1e6ec18aea9fb784cc6616dc8d599fd6b1f1e9d8d703cce28c66ea68658878e7`.
  [CÓDIGO]

El replay independiente de `remotion:validate` y `verify:media` dejó el árbol Git clean y el set
append-only byte-idéntico al commit auditado. [CÓDIGO]

### 7. Cross-root y media — PASS

Los tests focales prueban evidencia byte-idéntica entre roots, clocks e inventarios opcionales
distintos. El replay actual confirmó:

- artifact A/B SHA-256:
  `b37d3327e1a3c46fe5f0586a912f62bd831abf8faec046efe419ef238f394010`;
- normalized pixel digest:
  `d5f0cc1a5abef9e0488933cf992291d8e7fce870ece5b4219ae31b213de22898`;
- H.264, `1080×1920`, 30 fps, 1231 frames, video-only;
- 27 review shots hash-bound;
- SSIM mínimo `0.975161`, sobre el umbral `0.97`. [CÓDIGO]

## Checks independientes

| Check                                         | Resultado                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm verify`                                 | PASS: check:repo, typecheck, lint, 32 archivos/276 tests y formato           |
| `pnpm remotion:validate`                      | PASS: 60 inputs, source set `7ef005e0…3008`                                  |
| `pnpm verify:media`                           | PASS: 1231 frames, video-only, A/B y 27 stills                               |
| Suite adversarial focal                       | PASS: 9 archivos/95 tests                                                    |
| `pnpm committee:validate`                     | PASS: 5 propuestas, 20 peer assessments                                      |
| 4 validadores Skill Foundry                   | PASS                                                                         |
| Prompt/source/NotebookLM/projects/privacy/n8n | PASS fail-closed dentro de `check:repo`                                      |
| Generator replay + `git diff`                 | PASS: árbol clean, evidencia append-only byte-idéntica                       |
| Dependency audit escalado                     | `No known vulnerabilities found`, evidencia de sesión sin receipt persistido |

[CÓDIGO]

## Estado de fuentes, claims, privacidad y release

- Fuentes registradas: 8.
- Corpus canónico: `0/4`; `SOURCE_LOCKED` permanece bloqueado.
- Claims activos: 3, limitados al fixture sintético first-party y prueba contractual local.
- Privacidad: 375 archivos versionables sin secretos, PII ni locators privados.
- Identidad visible: MetodologIA; otras entidades aparecen solo como procedencia técnica.
- n8n: `active: false`, dos nodos, sin credenciales, red ni publicación.
- `receipts/releases/`: ausente.
- Approvals audiovisuales: solo README y template; no existe receipt H01 real. [CÓDIGO][CONFIG]

## P2 no bloqueantes

1. `receipts/migrations/**` aún no aparece en `ownership-manifest.yml`. La creación de este receipt
   estuvo autorizada expresamente para la remediación auditada y no colisiona con otra allowlist,
   pero el check actual solo detecta overlaps, no cobertura total. Antes de una futura migración debe
   asignarse un writer canónico y reforzarse el check de coverage. [CONFIG][INFERENCIA]
2. El audit de dependencias pasó en la sesión escalada, pero no existe un receipt durable dentro del
   repositorio. No se usa esa observación como sustituto de evidencia de supply-chain persistida.
   [CÓDIGO][coverage_gap]

Estos P2 no alteran los límites fail-closed ni la reproducibilidad del snapshot local. [INFERENCIA]

## Coverage gaps y siguiente gate

- Cuatro fuentes canónicas ausentes: `0/4`. [coverage_gap]
- Binding NotebookLM live ausente. [coverage_gap]
- Elegibilidad comercial/productiva de Remotion sin adjudicar. [coverage_gap]
- Commit/release upstream de binarios tipográficos sin resolver. [coverage_gap]
- Prueba autoritativa Linux con network namespace y equivalencia cross-host pendientes.
  [coverage_gap]
- Playback humano editorial y revisión humana de accesibilidad pendientes. [coverage_gap]
- Guardian canónico post-`SOURCE_LOCKED` y H01 ausentes. [coverage_gap]
- Release y distribución externa no autorizados. [coverage_gap]

Siguiente gate legítimo: promover este commit y sus dos archivos GDN-002 como un snapshot clean; no
intentar un gate canónico hasta resolver el corpus, licencias, playback humano, Guardian
post-source-lock y H01. [CONFIG]

El cierre técnico local queda aceptado como `PASS_LOCAL_CONTROLLED_CLOSEOUT`; todos los gates
canónicos permanecen en `false`. [CONFIG]
