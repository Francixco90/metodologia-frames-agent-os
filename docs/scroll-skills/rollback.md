# Procedimiento de Rollback — Scroll Skills

**Rama:** feat/model-agnostic-scroll-skills
**Base:** 3636db2 (codex/instagram-os-creation-v3-carousel-v2)

---

## Rollback completo (revertir toda la rama)

Si se necesita revertir todos los cambios de esta rama:

```bash
# En el worktree principal
cd C:/Users/USUARIO/Projects/metodologia-instagram-agent-os

# La rama feat/model-agnostic-scroll-skills esta en un worktree separado.
# Si se hizo merge a main:
git revert <merge-commit> --no-edit

# Si no se hizo merge, simplemente borrar la rama y el worktree:
git worktree remove ../scroll-skills-wt --force
git branch -D feat/model-agnostic-scroll-skills
```

## Rollback granular por commit

Los commits se dividen logicamente. Para revertir un commit especifico:

```bash
# Identificar el commit a revertir
git log --oneline feat/model-agnostic-scroll-skills

# Revertirlo
git revert <commit-hash> --no-edit
```

## Rollback de vendors unicamente

Para eliminar los vendors sin tocar las skills propias:

```bash
# Eliminar skills/vendor/
rm -rf skills/vendor/

# Revertir eslint.config.js (quitar 'skills/vendor/**' de ignores)
git checkout eslint.config.js

# Revertir .prettierignore (quitar 'skills/vendor/**')
# NOTA: mantener inbox/Muestras/** si el usuario lo necesita
```

## Rollback de una skill individual

Cada skill esta en su propio directorio:

```bash
# Ejemplo: eliminar scroll-world-agnostic
rm -rf skills/scroll-world-agnostic/
```

## Archivos modificados (fuera de skills/ y docs/scroll-skills/)

Estos son los archivos existentes que se modificaron:

| Archivo                                    | Cambio                                           | Revertir                                                   |
| ------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------- |
| `eslint.config.js`                         | Anadido `skills/vendor/**` a ignores             | `git checkout eslint.config.js`                            |
| `.prettierignore`                          | Anadido `skills/vendor/**` + `inbox/Muestras/**` | `git checkout .prettierignore` (o mantener inbox/Muestras) |
| `tests/unit/docs-budget-v2.test.ts`        | Baseline actualizado (80615/30760)               | `git checkout tests/unit/docs-budget-v2.test.ts`           |
| `docs/program/file-disposition-ledger.yml` | Regenerado                                       | `git checkout docs/program/file-disposition-ledger.yml`    |
| `docs/program/file-disposition-ledger.md`  | Regenerado                                       | `git checkout docs/program/file-disposition-ledger.md`     |

## Verificacion post-rollback

Despues de cualquier rollback, ejecutar:

```bash
pnpm lint && pnpm typecheck && pnpm test:unit && pnpm format:check
```

Si todos pasan, el rollback fue limpio.
