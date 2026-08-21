---
name: content-os-contextual-privacy-planner
description: This skill should be used after a sensitive-signal inventory exists and a class, workshop, interview, demo, or student-deliverable video needs explicit KEEP, PROTECT, AUDIO_SILENCE, or BLOCK_FOR_REVIEW decisions while preserving the visible value of the work.
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  version: 0.1.0
  lifecycle_state: candidate
  execution_scope: local-candidate-evaluation
---

# ContentOS Contextual Privacy Planner

Convertir un inventario verificado y una decisión humana por caso en `privacy-policy-v1`,
`value-preservation-plan-v1` y `redaction-plan-v2`. Esta skill planea; no modifica media,
no observa el resultado y no autoriza publicación.

## Secuencia

1. Verificar bytes canónicos del inventario, el registro de aliases, su receipt
   independiente y la directiva humana ligada a caso, participante, fuente y dimensiones.
2. Exigir una decisión única por cada señal: `KEEP`, `PROTECT`, `AUDIO_SILENCE` o
   `BLOCK_FOR_REVIEW`. No inferir autorización por contexto ni por conversación.
3. Registrar zonas de valor: entregable, operación, rostro autorizado, dibujo, interfaz
   relevante o resultado. Una zona solo permite las señales de redacción enumeradas.
4. Derivar operaciones mínimas. Chrome periférico puede reencuadrarse; otras señales
   visuales usan blur localizado. Audio usa silencio exacto con fades de 45 ms y `[…]`.
5. Medir el efecto autorizado. Más de 5% exige revisión; más de 10%, pantalla completa o
   invasión no autorizada de una zona de valor bloquea.
6. Entregar los tres contratos al ejecutor. No ejecutar, corregir ni promover estados.

## Reglas

- `UNKNOWN` siempre se convierte en `BLOCK_FOR_REVIEW`.
- `REVIEW_REQUIRED` no puede conservarse con `KEEP`.
- `PROTECT` exige geometría y frames; `AUDIO_SILENCE` exige tiempo de audio.
- Cada operación liga señal, evidencia, ROI, tracking, padding, feathering o fades.
- `signal_roi` localiza la señal; `authorized_effect_roi` incluye padding y feather.
- No se usa inpainting generativo. `CROP` y `FILL` quedan fuera de este candidato.
- El cálculo conservador suma áreas simultáneas; no subestima solapamientos.
- Contratos, arrays, IDs, secuencias y hashes son estrictos, únicos y deterministas.
- No guardar razonamiento privado, campos libres de justificación, red, reloj o azar.

## Uso

```bash
node skills/content-os-contextual-privacy-planner/scripts/plan-contextual-privacy.mjs request.json
node skills/content-os-contextual-privacy-planner/scripts/check-skill.mjs
```

## Stop rules

- Inventario, receipt, directiva, actor, binding, geometría o hash inválido: FAIL.
- Decisión faltante, autorización ambigua o zona invadida: bloquear revisión humana.
- Máscara estimada sobre 10%: FAIL; sobre 5%: revisión obligatoria.
- Solicitud de ejecución, render, upload, publish, `READY` o outcome: fuera de alcance.
- Plan válido: máximo `candidate`; requiere auditoría e integración material posteriores.
