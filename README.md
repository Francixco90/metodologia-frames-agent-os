# MetodologIA Creative Agent OS

Sistema local para convertir fuentes gobernadas en productos Web y Contenido/Motion con evidencia, decisiones, aprobaciones y receipts reproducibles.

## Estado

`PARTIAL_CONTROLLED`: la arquitectura y el vertical slice pueden validarse con fixtures first-party. El sistema no puede declarar `SOURCE_LOCKED`, `HUMAN_APPROVED`, `READY` ni `PUBLISHED` mientras falten sus receipts específicos.

## Principios

- Source-first y claims trazables.
- Estados fail-closed.
- Un writer por ruta; producer, verifier y Guardian distintos.
- Memoria y receipts append-only; nunca chain-of-thought.
- Remotion renderiza, NotebookLM fundamenta y n8n transporta paquetes aprobados.
- Publicación separada y siempre humana.

## Inicio rápido

```bash
pnpm install --frozen-lockfile
pnpm check:repo
pnpm test
pnpm web:build
pnpm render:smoke
```

Consulta `docs/program/execution-ledger.md` para gates, gaps y evidencia de cada oleada.

