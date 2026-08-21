---
name: content-os-minimal-redaction
description: This skill should be used when an independently verified redaction-plan-v2 must be applied to a hash-bound class, workshop, interview, demo, or student-deliverable video with localized feathered blur, exact multichannel audio silence, and caption replacement while preserving declared value zones.
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  version: 0.1.0
  lifecycle_state: candidate
  execution_scope: local-candidate-material-execution
---

# ContentOS Minimal Redaction

Ejecutar exclusivamente un `redaction-plan-v2` verificado. La skill transforma una copia
snapshot de la fuente, conserva el original, genera un MP4 lossless y emite
`minimal-redaction-execution-v1`. No detecta señales, no cambia decisiones y no acredita
privacidad de publicación.

## Secuencia

1. Verificar bytes canónicos de política, zonas de valor, plan y receipt independiente.
2. Abrir fuente, FFmpeg y FFprobe mediante snapshots hash-bound; nunca confiar en `PATH`.
3. Reprobar dimensiones, frames, duración y audio contra el plan de preservación.
4. Aplicar blur gaussiano localizado con máscara suavizada y silencio dentro del span con
   fades internos exactos de 45 ms, preservando cada canal de audio.
5. Sustituir únicamente el rango textual acreditado por `[…]`; no reescribir el testimonio.
6. Materializar output y sidecar de subtítulos sin sobrescribir, hashearlos y emitir receipt.

## Reglas

- Solo acepta planes `BLOCKED_PENDING_MINIMAL_REDACTION_EXECUTOR` y sin revisión pendiente.
- Recalcula secuencias, relaciones de señal, geometría, presupuesto y zonas de valor.
- La máscara simultánea no puede superar 10%; más de 5% debe haber sido bloqueado antes.
- `LOCAL_BLUR` usa el ROI autorizado, padding y feather; no existe pantalla completa.
- `REFRAME_PERIPHERAL` bloquea hasta que el plan declare el alcance del transform completo;
  una franja autorizada no permite modificar implícitamente el resto del cuadro.
- `AUDIO_SILENCE` atenúa dentro del span: fade-out, silencio, fade-in. Fuera queda a ganancia 1.
- Video se codifica H.264 lossless; audio transformado usa ALAC para permitir comparación PCM.
- No inpainting, crop libre, fill, borrado de rostros autorizados ni operaciones improvisadas.
- Fuente y output usan raíces físicas distintas; refs, campos, IDs y hashes son estrictos.
- Un output existente, receipt stale, actor incorrecto o tool mutable bloquea sin sobrescribir.

## Uso

```bash
node --import tsx skills/content-os-minimal-redaction/scripts/execute-minimal-redaction.mjs request.json source-root output-root
node --import tsx skills/content-os-minimal-redaction/scripts/check-skill.mjs
```

## Stop rules

- Plan bloqueado, receipt no ligado o metadatos divergentes: FAIL.
- Reframe sin contrato de transform full-frame y preservación focal: FAIL.
- Máscara completa, >10%, >5% no revisada o zona de valor no autorizada: FAIL.
- Audio sin cue/rango exacto o identidad textual divergente: FAIL.
- La salida máxima es `RENDERED_DRAFT`, siempre
  `BLOCKED_PENDING_PUBLICATION_PRIVACY_VERIFIER`.
- Esta skill no observa residuales, no se autoaprueba y no concede `READY` ni `PUBLISHED`.

`coverage_gap`: la autenticidad externa de actores sigue dependiendo del harness de receipts;
el verificador de publicación debe recalcular cambios RGB, audio, residuales y oclusión.
