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
[`registries/projects/project-registry.yml`](registries/projects/project-registry.yml).

## Qué contiene

- `core/`: contratos, estado, evidencia, receipts, approvals y memoria append-only.
- `networks/web/`: modelo, renderer offline, UX, accesibilidad y QA Web.
- `networks/content/`: estrategia y producción de Contenido/Motion.
- `agents/RT-01` … `agents/RT-11`: responsabilidades separadas; RT-11 es Guardian.
- `committees/`: protocolo de cinco especialistas, síntesis, dissent y rúbrica.
- `skills/remotion-video-production/`: skill router canónica con 15 módulos.
- `adapters/notebooklm/`: contrato de grounding read-only y fail-closed.
- `adapters/n8n/`: transporte opcional, inactivo y dry-run; no toma decisiones creativas.
- `projects/vs-001-source-to-campaign/`: primer vertical slice y toda su evidencia.
- `receipts/`, `registries/`, `approvals/`, `quality/`: trazabilidad y controles compartidos.

La arquitectura, DAG, propiedad de rutas y estrategia de pruebas están documentados en
[`docs/program/system-architecture.md`](docs/program/system-architecture.md),
[`docs/program/dag.yml`](docs/program/dag.yml),
[`docs/program/ownership-manifest.yml`](docs/program/ownership-manifest.yml) y
[`docs/program/test-strategy.md`](docs/program/test-strategy.md).

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
[`docs/program/operator-runbook.md`](docs/program/operator-runbook.md).

## Primer vertical slice

El expediente
[`projects/vs-001-source-to-campaign/`](projects/vs-001-source-to-campaign/) conserva:

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
programa multi-vendor + homólogos:

- **4 publishers vendored** (reference-only, bypass `verify:skills`): 48 HyperFrames
  (15 Fase 0 + 33 Fase 1A, Apache-2.0), 11 Remotion publisher, 3 Bento, 3 Scroll.
- **26 homólogos H-03 hash-bound** `content-os-*` en
  `registries/skills/creation-v3-skill-registry.yml` (17 originales + 9 Fase 2A
  batches 1-3, PRs #35/#36/#37 merged).

Estado del programa multi-vendor (Fases 2A-2D, registry reconcile, receipt cascade):
[`docs/content-os/roadmap.md`](docs/content-os/roadmap.md). Mapeo vendor→nativas:
[`docs/content-os/capability-matrix.md`](docs/content-os/capability-matrix.md).
Arquitectura dual paradigm + media model:
[`docs/content-os/architecture.md`](docs/content-os/architecture.md). [DOC]

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
[`docs/program/requirements-traceability.md`](docs/program/requirements-traceability.md).
