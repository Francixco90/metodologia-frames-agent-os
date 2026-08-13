# Trainer OS — Contratos

[METODOLOGIA] Contratos y máquina de estados reiniciable para producir rutas formativas sin
conectores ni publicación.

Secuencia canónica:

`INTAKE → CONTEXT_READY → SPEC_READY → DESIGN_LOCKED → COMPILED → VERIFIED → HUMAN_REVIEW → RENDERED_DRAFT`

Los cinco schemas y esta unidad runtime materializan `intake` y `spec` de forma reiniciable.
El runner verifica fuentes, manifest y continuidad, escribe state/resume/handoff atómicos e
invalida derivados cuando cambia su autoridad. `build` materializa outputs gobernados y los
promueve atómicamente; `verify` revalida bytes y árbol sin escribir. `package` exige estado
`RENDERED_DRAFT`, receipt técnico y aprobación H01 ligados al build, y produce un paquete local
atómico, determinista y sin autoridad de publicación. `benchmark` permanece fail-closed en el CLI: PR5 solo aporta
el contrato, los tres inputs sintéticos y la proyección local `not_executed`; ingerir receipts
observados requiere un resolver de evidencia posterior.

```bash
node --import tsx 02_proceso/workflows/trainer-os/runner.ts --mode intake --run <manifest>
node --import tsx 02_proceso/workflows/trainer-os/runner.ts --mode spec --run <manifest>
pnpm trainer --mode intake --run <manifest>
pnpm trainer --mode package --run <manifest>
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

## Núcleo del compilador

[CÓDIGO] `build` exige un run `DESIGN_LOCKED`, route spec, design lock, artifact plan,
asset manifest, decisión, tokens y assets existentes con hashes vigentes. Bloquea locators
privados, PII, derechos desconocidos, locale discordante, symlinks y efectos externos. Produce
un árbol `dist/` exacto y un build manifest con receipt ligado a sus bytes.

[DOC] La promoción de `dist/` es atómica y conserva rollback durante el reemplazo. El build
manifest, continuidad y run manifest se escriben después; no constituyen una transacción
multiarchivo. Un corte entre pasos queda detectable por hashes y bloquea `verify`, pero el
journaling y la recuperación automática completa permanecen como `coverage_gap` posterior.

`verify` es read-only: vuelve a calcular todos los bindings y rechaza bytes mutados, outputs
faltantes o residuales. El HTML sintético solo demuestra el compilador común; no afirma que
existan adaptadores completos para landing, masterclass, workbook, playbook o prompts.

`EXP_TRAINER_RUNTIME_VALIDATED` ejecuta juntas las suites de runtime y compilador. El build
manifest liga la versión y el árbol transitivo de fuentes del compilador; `coverage_gap`:
todavía no existe un receipt de consumo observado ni registro global del compiler. Los conteos
de las fixtures son datos sintéticos, no mediciones reales. El registro global legado todavía
solo modela productos web y video.
