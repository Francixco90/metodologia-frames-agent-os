# Debate: best path for Frames ContentOS after the consolidation

Date: 2026-09-05
Trigger: Parte A (F0–F7) y F8–F10, F13, F14 cerradas con `pnpm verify` verde; quedan F11 (symlinks),
F12 (registro único), 19 ramas `wip/*`, los binarios LFS privados y la estrategia de PR hacia dos
destinos. Cada opción tiene consecuencias de implementación divergentes. [DOC]

Principios en juego (AGENTS.md invariantes): 3 autoridades separadas · 4 `planned` ≠ `executed`
(receipt material) · 6 un writer por ruta · 7 fuentes con hash, procedencia y derechos · 8
`RENDERED_DRAFT ≠ HUMAN_APPROVED ≠ READY ≠ PUBLISHED`, publicación con autorización separada · 9
cerrar con artefactos, evidencia, gaps y siguiente gate. [CONFIG]

## D1 · Symlinks raíz (F11)

- Tesis: quitar los 24 symlinks ahora (plan F11).
- Antítesis: mantenerlos; la convención de imports ya es alias de bucket (tsconfig/vitest) y los
  literales `skills/…` en registries y `authority_refs` son identificadores lógicos, no rutas.
- Evidencia [CODE]: 189 sitios `resolve/join` con alias; 1803 literales `alias/…` en código;
  `creation-v3-checks.ts` hace `resolve(root, ref)` sobre `authority_refs` con prefijo `skills/`
  (176 skills, hash-bound); `ownership.ts` usa `realpathSync`; `ledger/path-utils.ts` trabaja en
  espacio de rutas legacy; 119 líneas alias en `ownership-manifest.yml`; PR #280 (windows-v2)
  muestra que los symlinks versionados ya cuestan en Windows.
- Contradicción: quitar symlinks sin resolver antes los identificadores lógicos rompe 176 skills
  hash-bound (principio 4) y el ledger (principio 9). Quitar "todo o nada" queda eliminado.
- Síntesis: programa en tres series, cada una con `verify` verde y presupuesto propio:
  1. codemod de literales de filesystem (`~/Downloads/_frames-consolidacion/f11/codemod-canonical-paths.ts`,
     report-only por defecto) sobre los 189 sitios, con symlinks aún presentes → cero cambio de
     comportamiento;
  2. resolver único `repoPath(root, ref)` en las 4–5 fronteras que hacen `stat`
     (creation-v3-checks, instagram-v2-validation, ownership, ledger path-utils) para que los
     identificadores `skills/…` sigan siendo lógicos;
  3. borrar los 24 symlinks + `03_artefactos/scripts` detrás de un test negativo y reescribir
     `ownership-manifest.yml`, `tsconfig.exclude`, `package.json` scripts y `check-repo.required`.
- Confianza: 0.95 (la serie 1 es mecánica y medible; 2 y 3 dependen de la serie anterior).

## D2 · Registro único de skills (F12)

- Tesis: fusionar los 6 YAML en `skill-registry-v2.yml`.
- Antítesis: conservar los archivos; la coherencia ya está gobernada.
- Evidencia [CODE]: `reconcile-skill-registries.ts` (en `verify:skills`) reporta 30 v2 + 181 v3
  hash-bound, 0 huérfanos, 0 duplicados, `event_ids` únicos; ningún `authority_refs` cita un
  archivo de registro; 5 scripts, 9 tests y 51 menciones en docs/skills nombran los archivos;
  los eventos son append-only y la fusión reescribiría su historia (principio 3 y 9).
- Contradicción: la fusión física no elimina un riesgo que el gate ya cubre y sí toca 65 sitios y
  la historia append-only. Eliminada por coste sin beneficio verificable.
- Síntesis: F12 se cierra como "no hacer"; si un consumidor futuro necesita la unión, se genera una
  proyección de solo lectura (`skills-index.json`, GENERATED, bajo `check:generated`) en vez de
  mover fuentes de verdad.
- Confianza: 0.96.

## D3 · Las 19 ramas `wip/*`

- Tesis: aterrizarlas todas en el PR de consolidación.
- Antítesis: archivarlas.
- Evidencia [CODE]: ledger F10 — presupuestos 200/350 líneas, bases movidas, licencia pendiente
  (moneyprinter), cadena de esquemas (unattended v1→v2→integrity-v2 + capsule); `wip/cv-dsf-v1`
  vacío; `unattended-state-v1/v2` superadas por `integrity-v2`.
- Síntesis: triage por valor, cada grupo como serie propia con partición de presupuesto:
  (a) `canon-v4` brand-knowledge-os-v4 → dividir los 10 módulos >200 líneas antes de entrar;
  (b) cadena unattended + authority-capsule (video-os) → una serie, empezar por partir
  `unattended-run-state-v2.schema.ts`; (c) `trainer-os-v2-autonomous` → programa propio con
  `verify:trainer-os`; (d) siete ramas de career/brand/privacy → replay manual por rama;
  (e) `moneyprinter` bloqueada hasta receipt de licencia; (f) archivar `cv-dsf-v1`,
  `unattended-state-v1`, `unattended-state-v2` (superadas). Ninguna rama se borra antes de
  aterrizar o archivar con nota en el ledger.
- Confianza: 0.95.

## D4 · Binarios LFS privados hacia el repo público

- Tesis: incluirlos (el usuario pidió fusionar todo).
- Antítesis: excluirlos del destino público.
- Evidencia [CODE][DOC]: 67 PDF + 9 JPG (~650 MB) del brand content privado; la cuarentena del
  2026-08-29 clasificó parte del material como `rights-pending`; principio 7 (derechos) y 8
  (publicación requiere autorización separada); cuota LFS de GitHub por repositorio.
- Contradicción: publicar bytes con derechos pendientes viola el principio 7. Eliminada la
  inclusión directa en el público.
- Síntesis: dos ramas del mismo árbol: `codex/consolidation-2026-09` (completa, PR al fork
  JaviMetodologIA) y `codex/consolidation-2026-09-public` = misma historia + un commit
  `git rm --cached` de `03_artefactos/projects/notebooklm-os/**/*.{pdf,jpg,png}` para el PR a
  Francixco90. La decisión final de derechos es humana (gate manual).
- Confianza: 0.90 → 0.95 solo tras la decisión del autor sobre derechos.

## D5 · Estrategia de PR

- Tesis: un PR por destino con la rama completa.
- Antítesis: partir en PRs por fase.
- Evidencia [CODE]: 61 commits sobre `origin/main`; el programa de presupuesto está ligado a la
  rama `codex/consolidation-2026-09`; los commits ya están separados por fase (merge, F8, F9,
  F13, F14) con `verify` verde en cada uno.
- Síntesis: orden fork → público. 1) push `codex/consolidation-2026-09` al fork y PR a
  `JaviMetodologIA/main`; 2) crear la rama `-public` (D4), push al fork y PR cross-repo a
  `Francixco90/main`; el cuerpo del PR ya está en `pr/PR-BODY.md`. Un PR por destino; los
  commits por fase sirven de unidades de revisión.
- Confianza: 0.95.

Integrated Into: `01_intencion/program/consolidation-ledger.md` (sección Debate) y el plan
`~/.claude/plans/en-descargar-hay-un-witty-blanket.md`.
