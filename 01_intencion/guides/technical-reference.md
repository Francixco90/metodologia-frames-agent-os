# Referencia técnica de Frames para operadores

Esta guía explica cómo se conecta la experiencia humana con los controles internos. No es necesaria para pedir una pieza o mejorar un CV.

## Cuándo necesitas esta referencia

Úsala para inspeccionar una ruta, ejecutar el CLI local, desarrollar un workflow, revisar un receipt, validar el repositorio o preparar una promoción. Para descubrir capacidades, vuelve a [qué puede hacer Frames](capabilities.md).

## Del pedido al workflow

1. `frames:assist` recibe texto o JSON sin interpolarlo en shell.
2. First-Turn Gateway clasifica saludo, acción, ambigüedad o reanudación.
3. El router fija una sola ruta: R6 para ContentOS, R7 para Career y R4 para resume hash-bound.
4. `WorkflowPlanV1` selecciona pasos, outputs, skills, gates y stop rules.
5. AutoPrime carga solo el paso activo, template y contexto necesario.
6. `WorkOrderV1` liga actor, read/write set, presupuesto, herramientas y aceptación.
7. Una skill solo aparece como ejecutada con `SkillInvocationReceiptV1` y outputs materiales verificados.

R1–R3 y R5 permanecen `coverage_gap` en el dispatcher productivo. No deben presentarse como ejecución disponible.

## Estados y gates

Un gate es una condición que impide avanzar sin evidencia o aprobación.

- `EXP_BRIEF_APPROVED`: aprobación del brief Experience.
- `MW_BRIEF_APPROVED`: brief multimedia.
- `MW_SPEC_APPROVED`: especificación creativa.
- `MW_ASSET_REVIEW` y `MW_EDIT_APPROVED`: revisión de activos y edición.
- `MW_DISTRIBUTION_AUTHORIZED`: distribución.
- `CR_BRIEF_APPROVED`, `CR_PACKAGE_APPROVED` y `CR_SUBMISSION_AUTHORIZED`: Career.

Solo `PASS` promueve. `UNKNOWN` y `BLOCKED` conservan el trabajo válido y detienen la transición. Build, render o test no equivalen a aprobación humana.

## Arquitectura por utilidad

| Necesidad                | Autoridad técnica                         | Por qué existe                               |
| ------------------------ | ----------------------------------------- | -------------------------------------------- |
| Entender un pedido       | `content-os-router` y First-Turn Gateway  | evita exigir prompts sofisticados            |
| Mantener contexto mínimo | `context.md` + ContextSurface registry    | reduce carga y mezcla de dominios            |
| Crear contenido          | P00–P09                                   | hace visibles decisiones y entregables       |
| Carrera profesional      | C00–C09                                   | protege evidencia y privacidad del candidato |
| HTML coherente           | Markdown canónico + renderer determinista | evita dos versiones editoriales              |
| Verificar ejecución      | receipts con hashes                       | diferencia planificación de trabajo material |
| Separar decisiones       | producer, RT-09, RT-11 y H01              | evita autoaprobación                         |

## Comandos de verificación

```bash
pnpm check:toolchain
pnpm verify:instructions
pnpm verify:skills
pnpm verify:content-os
pnpm verify:multimedia
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm verify
```

El CI suministra `BUDGET_BASE_REF` con la base real del PR. Cada PR authored conserva máximo 12 archivos/1.200 LOC. Solo la documentación explicativa registrada en `user-facing-docs.yml` está exenta de límites por archivo; contratos, gobierno, skills y tests no lo están.

## Seguridad y efectos

- Inputs, workspace y outputs se validan por contención lexical y realpath; symlinks de escape bloquean antes de escribir.
- Bash es wrapper mínimo; las decisiones viven en TypeScript y contratos versionados.
- Render offline: sin fetch, telemetría ni assets remotos.
- Publicación, conectores, uploads, mensajes y postulaciones permanecen desactivados sin autorización exacta.
- Datos reales y PII viven en `work/private/` u otro state root autorizado, nunca en Git.

## Fuentes de verdad

- `AGENTS.md`: reglas universales.
- `02_proceso/governance/router.yml`: rutas.
- `02_proceso/workflows/`: contratos de ejecución.
- `04_estado/registries/`: inventarios canónicos.
- `05_verificacion/scripts/commands.yaml`: gates y comandos.
- `02_proceso/governance/docs-budget-policy.yml`: cobertura y límites.

La documentación explica; los contratos y la evidencia determinan qué puede promoverse.
