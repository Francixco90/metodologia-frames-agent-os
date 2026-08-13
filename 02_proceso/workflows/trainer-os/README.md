# Trainer OS — Contratos

[METODOLOGIA] Contratos y máquina de estados reiniciable para producir rutas formativas sin
conectores ni publicación.

Secuencia canónica:

`INTAKE → CONTEXT_READY → SPEC_READY → DESIGN_LOCKED → COMPILED → VERIFIED → HUMAN_REVIEW → RENDERED_DRAFT`

Los cinco schemas y esta unidad runtime materializan `intake` y `spec` de forma reiniciable.
El runner verifica fuentes, manifest y continuidad, escribe state/resume/handoff atómicos e
invalida derivados cuando cambia su autoridad. `build`, `verify`, `package` y `benchmark`
fallan cerrados hasta PRs posteriores.

```bash
node --import tsx 02_proceso/workflows/trainer-os/runner.ts --mode intake --run <manifest>
node --import tsx 02_proceso/workflows/trainer-os/runner.ts --mode spec --run <manifest>
pnpm trainer --mode intake --run <manifest>
pnpm vitest run 05_verificacion/tests/integration/trainer-runtime.test.ts
```

El techo es `RENDERED_DRAFT`. Producer no concede revisión humana, readiness ni publicación.

## Activos de diseño candidatos

[CONFIG] `design/tokens.authority.json` vincula los tokens canónicos de MetodologIA y
proyecta JSON, CSS y TypeScript byte-idénticos. El manifiesto de derechos reutiliza fuentes e
íconos autorizados sin duplicar binarios; los perfiles fijan únicamente formas genéricas de
landing, masterclass, workbook, playbook y biblioteca de prompts en ES/EN/PT.

Esta unidad no contiene una decisión H01 ni un `trainer-design-lock-v1`, por lo que no concede
`DESIGN_LOCKED`. El lock solo podrá materializarse en una ejecución real con exactamente dos
direcciones y un receipt humano verificable. [DOC]

`EXP_TRAINER_RUNTIME_VALIDATED` ejecuta la suite focal material. `coverage_gap`: todavía no
existe binding de versión del runtime/compilador ni receipt de consumo observado. Los conteos
de las fixtures son datos sintéticos de prueba, no mediciones reales. El registro global legado
todavía solo modela productos web y video.
