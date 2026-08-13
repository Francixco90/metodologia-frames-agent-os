# Frames Operator Core v1

Contrato compartido para producir resultados complejos con Career OS y Video OS
en 3–5 decisiones humanas, sin depender de un historial conversacional completo.
[METODOLOGIA]

## Cadena

`Outcome Lock → Source Freeze → Spec → Work Units → Verify → Human Acceptance`

El core aporta:

- cápsula de reanudación con presupuesto de contexto;
- ocho contratos de trazabilidad y mejora;
- una unidad semántica activa y perfil `safe-laptop`;
- identidad de artefactos y receipts exactos;
- cuatro checkpoints predeterminados más un giro correctivo opcional;
- medición de tokens/prompts que falla cerrada cuando no existe baseline.

## Perfiles

- `CAREER` enlaza R7 y C00–C09.
- `VIDEO` enlaza R6 y V00–V04.
- Trainer OS no pertenece a este registro y se gobierna en otro flujo. [CONFIG]

## Límites

Este incremento no sustituye los runners de dominio ni demuestra todavía el
objetivo de 50 % de ahorro. El perfil común sirve como contrato de integración y
como base para replays comparables con modelos de razonamiento bajo. [INFERENCIA]

## Verificación

El contrato participa en `G08` mediante `pnpm typecheck && pnpm test`. Para una
comprobación focal puede ejecutarse:

```bash
pnpm vitest run 05_verificacion/tests/unit/operator-core-*.test.ts
```
