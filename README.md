# MetodologIA Creative Agent OS

Repositorio local y autocontenido para transformar fuentes gobernadas en productos Web y
Contenido/Motion mediante decisiones trazables, comités creativos, aprobaciones separadas y
receipts reproducibles.

## Estado exacto

`PARTIAL_CONTROLLED`. El vertical slice usa una fixture first-party para demostrar el flujo técnico
Web + Motion, pero el corpus canónico permanece incompleto (`0/4`). Por ello el workflow gobernado
se detiene antes de `SOURCE_LOCKED` aunque un artefacto pueda obtener evidencia técnica
`BUILD_VALIDATED` o `RENDER_VALIDATED`. En el slice actual, Web está `BUILD_VALIDATED` y Motion está
`RENDER_VALIDATED`; ambos permanecen `RENDERED_DRAFT` para uso local.

Un build o render exitoso nunca concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`. El manifiesto
vigente está en
[`04_estado/registries/projects/project-registry.yml`](04_estado/registries/projects/project-registry.yml).

## Qué contiene

- `02_proceso/core/`: contratos, estado, evidencia, receipts, approvals y memoria append-only.
- `03_artefactos/networks/web/`: modelo, renderer offline, UX, accesibilidad y QA Web.
- `03_artefactos/networks/content/`: estrategia y producción de Contenido/Motion.
- `02_proceso/agents/RT-01` … `02_proceso/agents/RT-11`: responsabilidades separadas; RT-11 es Guardian.
- `02_proceso/committees/`: protocolo de cinco especialistas, síntesis, dissent y rúbrica.
- `03_artefactos/skills/remotion-video-production/`: skill router canónica con 15 módulos.
- `03_artefactos/skills/vendor/`: 25 publisher dirs vendored reference-only (originales dual
  paradigm + expansión multi-vendor, `source-lock.json` hash-bound);
  `03_artefactos/skills/<homólogo>/`: homólogos H-03 hash-bound (`content-os-*`, `design-*`,
  `dev-*`, `gstack-*`, `context-*`, `web-*`, `media-*`, `motion-*`) ver § Frames ContentOS.
- `03_artefactos/adapters/notebooklm/`: contrato de grounding read-only y fail-closed.
- `03_artefactos/adapters/n8n/`: transporte opcional, inactivo y dry-run; no toma decisiones creativas.
- `03_artefactos/projects/vs-001-source-to-campaign/`: primer vertical slice y toda su evidencia.
- `04_estado/receipts/`, `04_estado/registries/`, `04_estado/approvals/`, `05_verificacion/quality/`: trazabilidad y controles compartidos.

La arquitectura, DAG, propiedad de rutas y estrategia de pruebas están documentados en
[`01_intencion/program/system-architecture.md`](01_intencion/program/system-architecture.md),
[`01_intencion/program/dag.yml`](01_intencion/program/dag.yml),
[`01_intencion/program/ownership-manifest.yml`](01_intencion/program/ownership-manifest.yml) y
[`01_intencion/program/test-strategy.md`](01_intencion/program/test-strategy.md).

## Inicio rápido

Para entrar por la experiencia asistida, escribe una petición normal. El modo por
defecto interpreta y orienta sin escribir:

```bash
printf '%s\n' 'Ayúdame a crear una pieza' | pnpm frames:assist
```

`/menu` y `/ruta` inspeccionan sin writes. La materialización local exige un JSON
completo y `--apply`; siempre se detiene en la aprobación del brief. Las rutas,
contextos y adapters se verifican con `pnpm verify:instructions`.

Requiere las versiones exactas declaradas en `package.json`: Node, pnpm, Remotion, Zod, Playwright
y FFmpeg. Chrome estable es un prerrequisito local para la inspección Web.

```bash
pnpm install --frozen-lockfile
pnpm check:toolchain
pnpm check:repo
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
```

Reconstruir el slice y el artefacto Web:

```bash
pnpm slice:build
pnpm web:build
node scripts/web-visual-smoke.mjs
```

Validar y renderizar Motion desde una única base inmutable:

```bash
pnpm remotion:prepare
pnpm remotion:validate
pnpm render:all
pnpm verify:media
```

No se deben modificar inputs entre `remotion:validate` y `render:all`. La secuencia operativa,
los stop rules y el cierre están en
[`01_intencion/program/operator-runbook.md`](01_intencion/program/operator-runbook.md).

## Adaptadores de agent CLI

El repo se adapta a distintos agent CLIs sin duplicar gobernanza. `AGENTS.md` es el
núcleo CLI-agnóstico de reglas; `CLAUDE.md` (Claude Code, `@-import`) y `GEMINI.md`
(Gemini CLI, enlaces markdown) son cabinas que apuntan a él y a las fuentes versionadas
en `02_proceso/governance/` + `05_verificacion/scripts/commands.yaml`. La política
completa y el patrón para añadir un CLI nuevo (Cursor, Copilot CLI, Codex, afines):
[`02_proceso/governance/agent-cli-adapters.md`](02_proceso/governance/agent-cli-adapters.md). [CONFIG]

## Primer vertical slice

El expediente
[`03_artefactos/projects/vs-001-source-to-campaign/`](03_artefactos/projects/vs-001-source-to-campaign/) conserva:

- una fuente sintética first-party y tres claims limitados a pruebas locales;
- cinco propuestas conceptuales, veinte revisiones cruzadas, síntesis y dissent;
- un artefacto Web offline con build receipt y capturas desktop/mobile;
- el dossier audiovisual `00`–`07`, assets y fuentes vendorizados, captions, props y composición;
- smoke render, dos renders completos, review shots críticos y receipts de inspección;
- estados gobernados y técnicos deliberadamente separados.

Los cuatro textos canónicos, la elegibilidad comercial de la licencia Remotion, el playback humano,
la aprobación H01 y cualquier distribución externa permanecen como `coverage_gap`.

## Frames ContentOS

> Un producto MetodologIA. Autoría de Franklin Ospina y Javier Montaño.

El programa Frames ContentOS extiende el dual paradigm (Remotion + HTML+GSAP) con un
programa multi-vendor + homólogos gobernado por receipts reproducibles. Todo skill
nuevo entra al registro H-03 (recibo per-skill `receipts/runtime-boundary.yml`,
`LicenseRef-MetodologIA-Internal`); v2 permanece estable (familia meta `metodologia-*`,
`instagram-*`, `scroll-*` y `remotion-video-production-v2`).

### Publishers vendored (reference-only, bypass `verify:skills`)

Bajo `skills/vendor/` (text-only, `source-lock.json` hash-bound, sin `package.json`,
sin runtime deps). **25 publisher dirs**: originales del dual paradigm + expansión
multi-vendor (Fases 2A-2I):

- **Originales dual paradigm**: `hyperframes` (28 sub-skills Apache-2.0),
  `remotion-publisher` (12), `bento`, `scroll-experience`, `scroll-world`,
  `cinematic-scroll`.
- **Expansión**: `gstack`, `genjutsu`, `superpowers`, `ponytail`, `dn-memory`,
  `taste-skill`, `emil-skills`, `extract-design-system`, `impeccable`,
  `ui-ux-pro-max`, `gsap-skills`, `anthropics-skills`, `vercel-skills`,
  `vercel-agent-skills`, `design-dna`, `karpathy-skills`, `rembg-bg-removal`,
  `crawl4ai-skill`, `harness-creator`.

### Homólogos hash-bound (H-03 v3)

Los registros v2 y v3 son la única autoridad del inventario; este README no fija
conteos que puedan quedar obsoletos. `pnpm verify:skills` comprueba entradas,
paquetes, eventos, huérfanos y duplicados entre registros. Estado del programa:
[`01_intencion/content-os/roadmap.md`](01_intencion/content-os/roadmap.md). Mapeo
vendor→nativas:
[`01_intencion/content-os/capability-matrix.md`](01_intencion/content-os/capability-matrix.md).
Arquitectura dual paradigm + media model:
[`01_intencion/content-os/architecture.md`](01_intencion/content-os/architecture.md). [DOC]

### Multimedia workflows (P00-P09)

Cadena determinista de 10 stages en `02_proceso/workflows/multimedia/`
(`definir-sistema` → `distribuir`), schema `multimedia-workflow-v1` (Zod). Cada
stage: `workflow.yml` (source of truth con `brief`, `execution_steps`, templates y
`capability_map` skills/assets), `prompt-spec.md` (outputs-first + mermaid schematic), `task-template.yaml`,
`build.ts`, `notebooklm-binding.yml`, `schematic.html` (brand-ready, generado desde
template). Quality-gate `MW-Q01..Q10` fail-closed (`_runner/quality-gate.ts`).
Generator `pnpm mw:render-schematics` (1 template + 1 script → 10 HTML,
determinista, regenerable). Checker `pnpm verify:multimedia` (gate `MW_CAPABILITY`).
Chain schematic:
[`02_proceso/workflows/multimedia/_assets/chain-schematic.md`](02_proceso/workflows/multimedia/_assets/chain-schematic.md). [DOC]

Todo pedido de pieza entra por R6: el router formula hasta tres preguntas
bloqueantes y selecciona solo los stages necesarios. P03 genera siempre el
`brief.md` canónico de 12 secciones; su HTML es una proyección determinista del
mismo modelo, usa el perfil `metodologia-html-v7` y no puede añadir contenido
editorial. La producción se detiene en `MW_BRIEF_APPROVED`; P09 prepara el
paquete, pero nunca distribuye ni publica sin autorización humana separada.
La biblioteca P00–P09 se regenera desde los workflows mediante
`_runner/render-library.ts`. [CONFIG]

### Frames Experience OS

**Frames ContentOS · por MetodologIA** recibe lenguaje cotidiano y lo convierte
en un recorrido gobernado. Un saludo ofrece `Crear · Mejorar · Planear · Explorar`
sin escribir; un pedido claro omite el menú, ejecuta el adapter R6 o R7 y prepara
el brief canónico. Skills declaradas permanecen `planned` hasta que exista un
receipt de invocación ligado al WorkOrder y a outputs materiales. [CONFIG]

El Blueprint Markdown y su HTML offline viven en
`03_artefactos/content/experience/`; componentes, microcopy, paridad y cápsulas
están en `02_proceso/workflows/experience/`. El estado máximo es
`active/local-evaluation`: publicación, conectores y efectos externos siguen
bloqueados. Solo una cápsula con RT-09 `PASS`, RT-11 `PASS` y H01 `APPROVE`
puede entrar al vault inmutable. [CONFIG]

La operación completa —primer turno, route lock, workflow management, AutoPrime,
WorkOrder, receipts, continuidad y hospitalidad— está definida en
[`experience-first-orchestration.md`](02_proceso/governance/experience-first-orchestration.md).
R6/R7 tienen handlers locales brief-first; R4 exige lineage hash-bound. R1–R3 y
R5 siguen como `coverage_gap` y no deben presentarse como ejecución disponible.

## Governance

`02_proceso/governance/` — fuentes versionadas de gobernanza (la cabina `CLAUDE.md`/`AGENTS.md`
apunta aquí, no duplica):

- `router.yml` — router R0-R7 con First-Turn Gateway (proyecto/tarea/eval/contenido/carrera).
- `experience-first-orchestration.md` — contrato de interacción y workflow manager.
- `tool-policy.yml` — política de herramientas permitidas por gate.
- `agent-cli-adapters.md` — patrón para adaptar el repo a otros agent CLIs (Cursor, Copilot CLI, Codex).
- `atemporal-naming-policy.md` — política de naming atemporal (Fase 7, ADR 0027).
- `loose-task-policy.md` — política de tareas sueltas (harness-creator).
- `docs-budget-policy.yml` — presupuesto de docs (corpus, hard-cap, history).
- `multimedia-quality-gate.yml` — quality-gate MW-Q01..Q10 multimedia.
- `harness-subsystem-reconciliation.md` — reconciliación SPEC 5 subsistemas ↔ harness-creator 7.
- `ownership-scripts-decision.md` — decisión de ownership de scripts.
- `a09-a10-cross-verifier-verdict.yml` — veredicto cross-verifier.

Gates → comandos: `05_verificacion/scripts/commands.yaml` (manifiesto `commands-v1`).
[CONFIG]

## Verification

`05_verificacion/` — subsistema de verificación integral:

- **Gates G00-G21 + MW_**_: `scripts/commands.yaml`. G13-G17 manuales fail-closed
  (H01 human approval, Guardian lock, readiness, publish). G18-G21 (env drift,
  eval suite, tool grants convergence, atemporal naming) automatizados. MW__
  (multimedia: `MW_CAPABILITY`, `MW_BRIEF_APPROVED` P03, `MW_SPEC_APPROVED` P05, `MW_ASSET_REVIEW` P06,
  `MW_EDIT_APPROVED` P08, `MW_DISTRIBUTION_AUTHORIZED` P09).
- **Evals**: `evals/H-E001`..`H-E023` + `ablation/` — 23 eval suites con `runner.ts`.
- **Tests**: inventario vivo en `tests/`; `pnpm test` informa el conteo ejecutado. Harness contract:
  `tests/contract/harness/`.
- **Check scripts**: 35 scripts `check-*.ts`/`.mjs` en `scripts/` (brand, repo, skills,
  env-drift, tool-grants, privacy, multimedia-capabilities, content-os, etc.).
- **Guardian**: `guardian/` — verificador independiente (producer, verifier, Guardian
  son distintos).
- **Receipts append-only**: `04_estado/receipts/check-runs/` (check-run receipts
  hash-bound), `04_estado/receipts/dependency-audits/` (auditoría de dependencias,
  schema `dependency-audit-receipt-v1`, `supersedesReceiptId` append-only).
- **Quality reports**: `quality/` — reports de drift, brand, env.

Verify aggregate: `pnpm verify` (check:repo, check:atemporal, check:md-budgets,
verify:docs, verify:multimedia, verify:content-os, typecheck, lint, test,
format:check). [CONFIG]

## ADRs

`01_intencion/adrs/` — Architecture Decision Records (27 decisiones):

- `0001-0020-decisions.md` — decisiones fundacionales (gobernanza, dual paradigm, receipts).
- `0021-0026-renderer-adapters.md` — renderer adapters (Remotion, HTML+GSAP, Bento, Scroll).
- `0027-atemporal-naming.md` — naming atemporal (Fase 7 densification 81→152 skills).

[DOC]

## Principios no negociables

- Source-first: ningún claim material sin snapshot, hash, alcance y autoridad.
- Fail-closed: una ausencia no se sustituye por una inferencia pulida.
- Un writer por ruta; producer, verifier, Guardian y H01 son responsabilidades distintas.
- No se persiste chain-of-thought privado: solo evidencia, supuestos, scores, objeciones y decisión.
- Assets locales, versiones exactas y render gobernado por frames; sin red durante render.
- MetodologIA es la única identidad visible.
- NotebookLM fundamenta; Remotion renderiza; n8n transporta; ninguno gobierna por sí solo.
- Publicación, envío y conectores permanecen inactivos sin autorización humana explícita.

## Seguridad, derechos y release

No añadas secretos, PII, locators privados ni rutas locales a artefactos versionados. Consulta
[`SECURITY.md`](SECURITY.md), el registro de fuentes, el ledger de claims y el veredicto de licencia
antes de ampliar el alcance. Este repositorio no incluye autorización de release.

La trazabilidad integral contra Prompt Maestro V6 está en
[`01_intencion/program/requirements-traceability.md`](01_intencion/program/requirements-traceability.md).
