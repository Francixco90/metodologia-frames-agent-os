# Política de evidencia profesional

## Precedencia

Prioriza documentos verificables y fuentes contemporáneas; luego declaraciones
explícitas del candidato. Una versión antigua ayuda a detectar cambios, no
sobrescribe automáticamente una fuente vigente. [METODOLOGIA][CONFIG]

## Contradicciones

Registra valores, fuentes, autoridad y consecuencia. Resuelve solo con evidencia
superior o confirmación humana. Si afecta elegibilidad, cargo, fecha, seniority,
formación o métrica, bloquea el claim hasta resolver.

## Selección segura

Downstream recibe evidencia mínima suficiente y `allowed_channels`. No puede
usar una evidencia fuera de su contexto obligatorio ni traducir `inferred` en
hecho. El banco es append-only por eventos; correcciones generan sucesores.

## Handoff a CV Spec

Emitir `bank_id`, `bank_sha256`, `source_manifest_sha256`, evidence IDs
elegibles/prohibidos, contradicciones bloqueantes y gaps. C06 debe rechazar un
handoff stale, un ID presente en ambas listas o un estado `READY_FOR_SPEC` con
contradicciones bloqueantes. Cambiar el banco invalida toda spec dependiente.
