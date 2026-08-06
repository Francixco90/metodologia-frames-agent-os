# H-E007 — commands.yaml marks G13-G17 manual + fail_closed

## Metadatos

- **ID**: H-E007
- **Subsistema**: Feedback
- **Estado**: executable (oracle.ts vía generic runner)

## Hipótesis

`commands.yaml` marca los gates G13-G17 como `manual: true` y
`fail_closed: true`. `run-check.ts` rechaza ejecutarlos (exit 2) y nunca
auto-avanza su estado. [CONFIG] · [CÓDIGO]

## Precondiciones

- `05_verificacion/scripts/commands.yaml` tiene entradas para G13, G14, G15,
  G16, G17. [CONFIG]
- Cada entrada G13-G17 declara `manual: true` y `fail_closed: true`. [CONFIG]
- `run-check.ts` rechaza gates con `manual: true` (exit 2). [CÓDIGO]
- `TaskContractSchema` rechaza `state: ENTREGADO` con `gate_target` G13-G17. [CÓDIGO]

## Pasos

1. Parsear `commands.yaml`.
2. Para cada gate en `{G13, G14, G15, G16, G17}`, leer `manual` y
   `fail_closed`.
3. Verificar ambos son `true` para los cinco gates.

## Oráculo

- PASS: los cinco gates G13-G17 tienen `manual: true` y `fail_closed: true`.
- FAIL: alguno tiene `manual: false` o `fail_closed: false`.

## Atribución de fallo

- Subsistema: Feedback (gates manuales fail-closed).
- Fuentes: `05_verificacion/scripts/commands.yaml`,
  `05_verificacion/scripts/run-check.ts`,
  `02_proceso/core/contracts/task-contract.ts` (superRefine G13-G17).
- Invariante: G13-G17 no son automatizables; no se auto-ENTREGADO.
- Nota: runner diferido — afirmación estática sobre manifiesto; cubrir con
  validación de policy cuando se cablee. [coverage_gap]