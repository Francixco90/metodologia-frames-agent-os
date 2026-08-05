# Decisión de ownership — `scripts/**` permanece con `repo`

**Status**: Aprobado (governance) · **Fecha**: 2026-08-05 · **Scope**: P5-S16 harness v2

## Contexto

Durante S16 del harness v2 se introdujeron rutas nuevas en `ownership-manifest.yml`
(`registries/tasks/**`, `tasks/**`, `receipts/check-runs/**`, `evals/**`) para dar
cobertura segura a los caminos del harness de tareas. Surgió la pregunta de si
`scripts/**` — actualmente bajo `writers.repo` — debía transferirse a `writers.qa`,
dado que qa autora los scripts del harness (`run-check`, `task-list`, `backfill`,
`check-tasks`, `ongoing-projects`, etc.). [CONFIG]

## Decisión

`scripts/**` **permanece con `repo`** (sin transferir a `qa`). No se añade un
16º writer; no se modifica `non_writers`. [CONFIG]

## Rationale

El validador `05_verificacion/scripts/check-ownership.ts` implementa
`patternsMayOverlap` usando `staticPrefix` (el prefijo antes del primer carácter
glob). Dos patrones colisionan si alguno de los prefijos `startsWith` al otro:

```
staticPrefix(pattern) = pattern.split(/[*?[{]/u, 1)[0] ?? ''
patternsMayOverlap(a, b) =
  aPrefix.startsWith(bPrefix) || bPrefix.startsWith(aPrefix)
```

Para `scripts/**` el prefijo es `scripts/`. Cualquier glob por-archivo bajo
`scripts/` (p.ej. `scripts/check-tasks.ts`, `scripts/lib/mint-task-id.ts`) tiene
como prefijo la propia ruta `scripts/check-tasks.ts`, que `startsWith('scripts/')`
→ colisión. [CÓDIGO]

Si se transfiriera `scripts/**` a `qa` y se añadiera un patrón por-archivo
`scripts/<algo>` a `repo` para la infraestructura de toolchain (o viceversa), cada
par de rutas distintas colisionaría según `patternsMayOverlap`, rompiendo el
invariante `one-writer-per-path` que valida `pnpm check:ownership`. Mantener
`scripts/**` con `repo` preserva el invariante con overlap cero. [DOC]

## Distinción clave: invariante estructural vs ACL runtime

El `ownership-manifest.yml` es un **invariante estructural de
auto-consistencia del manifiesto**, no un ACL runtime. Valida que el propio
manifiesto no se contradiga (un writer por path, sin overlaps cross-writer). No
valida autoría git ni delega ejecución. [CONFIG]

Que los scripts del harness sean autorados por qa como delegación de proceso
**dentro** de la allowlist de `repo` es consistente: el manifiesto no prohibe que
un agente opere rutas de otro writer por delegación explícita del owner; solo
exige que la declaración estructural sea no-contradictoria. La regla 3 de
`AGENTS.md` (un writer por ruta) es un invariante de manifiesto, no un ACL de
ejecución. [SUPUESTO] — revisitar si se introduce un ACL runtime que lea este
manifiesto como fuente de permisos.

## Cobertura nueva (additive, sin overlaps)

| Writer | Patrón nuevo | Prefijo estático | Colisiona con |
|--------|--------------|------------------|---------------|
| lead   | `registries/tasks/**` | `registries/tasks/` | ninguno cross-writer |
| lead   | `tasks/**` | `tasks/` | ninguno |
| lead   | `registries/README.md` | `registries/README.md` | ninguno |
| qa     | `receipts/check-runs/**` | `receipts/check-runs/` | ninguno cross-writer |
| qa     | `evals/**` | `evals/` | ninguno cross-writer |

Verificación: `pnpm check:ownership` → `PASS G04 OWNERSHIP`. [CONFIG]

## Revisitación

Revisitar esta decisión si:
1. Se introduce un ACL runtime que lea `ownership-manifest.yml` como fuente de
   permisos de ejecución (no solo auto-consistencia). [SUPUESTO]
2. `check-ownership.ts` cambia su regla de overlap (p.ej. a coincidencia de
   prefijo de directorio en vez de `startsWith` literal). [SUPUESTO]
3. Surge un subárbol de `scripts/` con dueño funcional distinto y estable que
   justifique partir el glob en patrones por-archivo no colisionantes. [DOC]

## Gaps

- `coverage_gap`: el manifiesto no distingue autoría git de ownership estructural;
  un futuro ACL runtime necesitaría una capa adicional. [CONFIG]