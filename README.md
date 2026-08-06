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
- `03_artefactos/skills/vendor/`: publishers vendored reference-only (4 originales + 13 expansión);
  `03_artefactos/skills/<homólogo>/`: homólogos H-03 hash-bound (`content-os-*`, `design-*`,
  `dev-*`) ver § Frames ContentOS.
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
sin runtime deps). 4 publishers originales del dual paradigm + 13 repos de expansión:

- **Originales**: 48 HyperFrames (15 Fase 0 + 33 Fase 1A, Apache-2.0), 11 Remotion
  publisher, 3 Bento, 3 Scroll.
- **Expansión**: gstack (59, MIT), genjutsu (17, MIT), superpowers (14, MIT),
  ponytail (6, MIT), dn-memory (6, Apache-2.0), taste-skill, emil-skills,
  extract-design-system, impeccable, ui-ux-pro-max, gsap-skills, anthropics
  frontend-design (Apache-2.0), vercel web-design-guidelines, design-dna, karpathy,
  rembg, crawl4ai (MIT/Apache-2.0 dual).

### Homólogos hash-bound

- **39 `content-os-*`** en `04_estado/registries/skills/creation-v3-skill-registry.yml`:
  15 originales (Fase 2-3 + `remotion-bridge`) + 10 Fase 2A HyperFrames
  (PRs #35/#36/#37/#39/#41) + 11 Fase 2B Remotion (PRs #42-#45) + 3 Fase 2C Bento
  (#46).
- **28 `design-*`**: 11 design-OS originales (#59-#61) + 16 genjutsu Fase 2F
  (#62-#65) + 1 design-dna Fase 2I (#66).
- **12 `dev-*`**: 8 Fase 2J batch 1+2 (#67: spec, qa, review, ship, investigate,
  careful, retro, qa-only) + 4 plan-review Fase 2J batch 3 (#68: plan-eng-review,
  plan-devex-review, plan-design-review, plan-ceo-review).
- **2 base**: `data-visual-composition`, `motion-library-adapters`.
- **v2** en `04_estado/registries/skills/skill-registry.yml` (shared receipt): familia meta
  `metodologia-*` + `instagram-*` + `scroll-*` + `remotion-video-production-v2`.

Total H-03 v3: 81 entradas. El gate `verify:skills` corre v2 + v3 + reconcile
(`scripts/reconcile-skill-registries.ts`) en cada PR: 0 orphans, 0 cross-registry
dupes, event_ids únicos. Estado del programa multi-vendor (Fases 2A-2D, registry
reconcile, receipt cascade):
[`01_intencion/content-os/roadmap.md`](01_intencion/content-os/roadmap.md). Mapeo vendor→nativas:
[`01_intencion/content-os/capability-matrix.md`](01_intencion/content-os/capability-matrix.md).
Arquitectura dual paradigm + media model:
[`01_intencion/content-os/architecture.md`](01_intencion/content-os/architecture.md). [DOC]

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
