# Registro local de autoridad de implementación v1

- `program_id`: `agentic-workflow-adoption-v1`
- `source_thread_id`: `019fec9f-d8ee-7fb1-adcf-2968997a8b99`
- `authority_mode`: `LOCAL_SIMULATION`
- `frames_base_commit_sha1`: `9978acd2e9f056fa3634a71ed7c495ba0323af77`
- `proposal_donor_commit`: `e0d6ba4576b23c83a6b22dbad53e23a8795b26d0`
- `technical_defense_donor_commit`: `78fd3834acd38cf4b6ace7f7f1ed9c06893300f3`

## Alcance autorizado

[METODOLOGIA] La instrucción humana autoriza implementación local, reversible e
iterativa de las waves 0–4 del plan aprobado: preservación, autoridad de fuentes,
kernel transaccional V2, capacidades R6/R8, pilotos sintéticos y verificación.

[SUPUESTO] Este registro reproduce la autoridad expresada en la tarea y permite
ligar controles locales a una referencia física. No es una credencial verificable
del host ni sustituye un receipt H01.

[INFERENCIA] La autorización cubre cambios y pilotos locales porque esas acciones
fueron solicitadas explícitamente y no producen distribución externa.

## Límites no delegados

- No autoriza `push`, merge, publicación, entrega, red ni distribución.
- No autoriza borrar la quarantine ni sus candidatos de descarte.
- No autoriza promover el candidato final sin H01 ligado a su hash exacto.
- No convierte `LOCAL_SIMULATION` en aislamiento criptográfico.
- No concede a Producer, Verifier, Guardian o Recorder identidades intercambiables.

## Claims fuera de alcance

[NEUROCIENCIA] Este programa no formula ni valida afirmaciones neurocientíficas.

[PEDAGOGIA] Este programa no formula ni valida afirmaciones pedagógicas; cualquier
claim futuro requerirá fuentes pertinentes y un gate independiente.

## Condición de cierre

[METODOLOGIA] El registro permanece fijo. Si cambian el baseline, los commits
donantes o los límites de autoridad, se abre una revisión nueva; no se reescribe
silenciosamente este documento.
