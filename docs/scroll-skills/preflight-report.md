# Preflight Report — Scroll Skills Integration

**Fase:** 0 — Preflight del harness
**Fecha:** 2026-08-01
**Commit base:** `3636db20336b0dd6d33aeaf90220453746114899`
**Rama base:** `codex/instagram-os-creation-v3-carousel-v2` (HEAD del worktree principal)
**Rama de trabajo:** `feat/model-agnostic-scroll-skills` (worktree aislado)

---

## 1. Entorno del repositorio

| Aspecto                          | Valor                                                        | Estado    |
| -------------------------------- | ------------------------------------------------------------ | --------- |
| Ruta                             | `<repo-raiz>`                                                | Observado |
| Es repositorio Git               | Si                                                           | Observado |
| Rama activa (worktree principal) | `codex/instagram-os-creation-v3-carousel-v2`                 | Observado |
| Rama por defecto                 | `main` (`cf887ca`)                                           | Observado |
| Remote configurado               | **NINGUNO** (`git remote -v` vacio)                          | Observado |
| Submodulos                       | No hay                                                       | Observado |
| Git LFS                          | Instalado (3.7.1) pero sin reglas `.gitattributes` activas   | Observado |
| Hooks personalizados             | No (solo samples)                                            | Observado |
| Stash                            | `stash@{0}` (saneamiento pre-extraccion ZIP)                 | Observado |
| Worktrees                        | 2 (principal + `scroll-skills-wt`)                           | Observado |
| Cambios locales sin commit       | 4 modified, 1 untracked (en worktree principal, preservados) | Observado |

**Riesgo critico — Remote ausente:** El repositorio no tiene remote configurado.
Las Fases 8-11 (push de rama + Pull Request) requieren un remote. Esto se registra como
`Dato requerido` y se documentara el procedimiento exacto. No se inventara un remote.

---

## 2. Stack tecnologico del harness

| Aspecto                | Valor                                                               | Fuente                 |
| ---------------------- | ------------------------------------------------------------------- | ---------------------- |
| Lenguaje               | TypeScript (E SM modules)                                           | `package.json`         |
| Runtime                | Node 22.23.1 (actual: 24.18.0 — warning no bloqueante)              | `package.json` engines |
| Gestor de paquetes     | pnpm 11.9.0 (save-exact, strict-peer-deps)                          | `package.json`         |
| Framework audiovisual  | Remotion 4.0.494, React 19.2.7                                      | `package.json`         |
| Validacion de esquemas | Zod 4.3.6                                                           | `package.json`         |
| Testing                | Vitest 4.1.10                                                       | `package.json`         |
| Linting                | ESLint 10.7.0 (type-checked, no-floating-promises, no-explicit-any) | `package.json`         |
| Formato                | Prettier 3.9.5                                                      | `package.json`         |
| Tipos estrictos        | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`  | `tsconfig.json`        |

---

## 3. Comandos de validacion oficiales

| Comando              | Que hace                                                   | Cobertura              |
| -------------------- | ---------------------------------------------------------- | ---------------------- |
| `pnpm check:repo`    | DAG + ownership + sources + claims + notebooklm + privacy  | Agregado de gobernanza |
| `pnpm typecheck`     | `tsc --noEmit` (strict)                                    | Tipos                  |
| `pnpm lint`          | `eslint .` (type-checked)                                  | Calidad de codigo      |
| `pnpm test`          | `vitest run` (umbrales: lines/funcs/stmts 80, branches 75) | Pruebas                |
| `pnpm format:check`  | `prettier --check .`                                       | Formato                |
| `pnpm verify:skills` | Valida skills V2 + V3 con hash-binding                     | Skills existentes      |
| `pnpm verify`        | Cadena completa de verificacion                            | Gate completo          |

---

## 4. Linea base (Fase 0)

Ejecutados en `<repo-raiz>` antes de cambios:

| Comando          | Resultado                         | Evidencia          |
| ---------------- | --------------------------------- | ------------------ |
| `pnpm lint`      | PASS (exit 0)                     | Sin errores ESLint |
| `pnpm typecheck` | PASS (exit 0)                     | Sin errores TS     |
| `pnpm test:unit` | PASS (244/244 tests, 24 archivos) | 2.18s duracion     |

**Nota:** `pnpm verify` completo no se ejecuto en Fase 0 por tiempo. La linea base es
lint + typecheck + test:unit. Se ejecutara `pnpm verify` completo en Fase 5.

---

## 5. Convencion de skills del harness

### Estructura de una skill existente (ejemplo: `metodologia-certificate-builder`)

```
skills/<skill-id>/
  SKILL.md          # Frontmatter YAML + instrucciones
  LINEAGE.yml       # Procedencia, version, estado, hashes
  schemas/          # Esquemas Zod o JSON Schema
  scripts/          # Scripts TS de render/validacion
  references/       # Documentacion tecnica
  assets/           # Plantillas y recursos
  fixtures/         # positive/ y negative/ para pruebas
  receipts/         # Comprobantes hash-bound de dependencias
```

### Contrato de frontmatter (SKILL.md)

```yaml
---
name: <skill-id> # Debe coincidir con el directorio
description: This skill should be used when ... # Frase de activacion
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-candidate-production
---
```

### Contrato de LINEAGE.yml

```yaml
schema_version: 1
skill_id: <skill-id>
version: <semver>
content_origin: locally_authored_adaptation
lifecycle_state: active
execution_scope: <scope>
authority_refs: [...] # Rutas relativas, deben existir
external_fragments_reused: <bool>
publication_authority: false
```

### Scripts validadores de skills

- `scripts/check-instagram-v2-skills.ts` — valida skills V2
- `scripts/check-creation-v3-skills.ts` — valida `data-visual-composition` y `motion-library-adapters`
  - Verifica: frontmatter, LINEAGE, `creation-v3-skill-registry.yml`, eventos de ciclo de vida,
    checker local, ausencia de rutas absolutas de usuario.

### Registro de skills

`registries/skills/creation-v3-skill-registry.yml` — append-only, con entries hash-bound y eventos.

### DAG (paquete A05 — skill-foundry)

```yaml
A05:
  owner: skill-foundry
  depends_on: [A02b, A02c, A03, A09a]
  gate: G07
```

Ownership: `skill-foundry` escribe `skills/**` y `registries/skills/**`.

---

## 6. Politica de CI

`.github/workflows/validate.yml`:

- Se ejecuta en `pull_request` y `push: [main]`
- Perfil: `ci-code-only` (no puede grant `RENDER_VALIDATED`)
- Pasos: `check:repo`, `typecheck`, `lint`, `test`, `format:check`
- `pnpm install --frozen-lockfile`

---

## 7. Decisiones de Fase 0

1. **Rama de trabajo:** `feat/model-agnostic-scroll-skills` desde `3636db2` (HEAD del worktree
   principal). `main` es ancestro de este commit, por lo que la rama puede mergear a `main`.
2. **Aislamiento:** Worktree dedicado. Los cambios locales
   del usuario (4 modified + 1 untracked) quedan intactos en el worktree principal.
3. **Remote ausente:** Se documenta como `Dato requerido`. El trabajo local se completa hasta Fase 7.
   Push/PR requieren configurar el remote manualmente.
4. **Convencion de skills:** Las skills propias seguiran el formato `skills/<id>/SKILL.md` +
   `LINEAGE.yml` del harness. No se usara el formato `.claude-plugin` de las fuentes externas.
5. **No se ejecutaran scripts de las fuentes externas** hasta que la auditoria (Fase 1) los clasifique.

---

## 8. Riesgos identificados

| Riesgo                                                    | Severidad | Mitigacion                                               |
| --------------------------------------------------------- | --------- | -------------------------------------------------------- |
| Remote ausente bloquea push/PR                            | Alto      | Documentar procedimiento; completar Fases 0-7 localmente |
| Node 24 vs 22 (warning de engine)                         | Bajo      | No bloqueante; CI usa 22.23.1 exacto                     |
| `pnpm verify` completo no ejecutado en linea base         | Medio     | Ejecutar en Fase 5 antes de commits                      |
| Skills externas usan formato Claude Code plugin           | Bajo      | Adaptar a convencion `skills/<id>/` del harness          |
| Fuentes externas pueden tener dependencias de red/modelos | Alto      | Auditar en Fase 1 antes de integrar                      |

---

## 9. Siguiente accion

Proceder a Fase 1 — Auditoria individual de las tres fuentes externas en directorios temporales
aislados (`/tmp/scroll-audit/`), sin instalarlas en el harness.
