# Autoridad local del port público v1

- `program_id`: `agentic-workflow-adoption-v1`
- `authority_mode`: `LOCAL_SIMULATION`
- `public_base_commit_sha1`: `a470cf5920c8e730263a6fc293d660f25a13b443`
- `public_branch`: `codex/proposal-defense-adoption-public-v1`
- `private_candidate_commit_sha1`: `db0c2148f397acf84ba79faee9238b0f0cbbb0c1`
- `original_authority_ref`: `implementation-authority-v1.md`

## Alcance

[METODOLOGIA] La instrucción humana autoriza portar las capacidades ya implementadas al fork
público, reconciliarlas con `upstream/main` fijado, actualizar la rama feature y gestionar el PR
hasta dejarlo listo. El port original conserva cuatro cherry-picks trazables; la reconciliación
incorpora el `main` público mediante un merge de dos padres, sin copiar la historia privada.

[INFERENCIA] La autoridad original sobre los donantes, sus límites de reutilización y el alcance
`PROJECT_LOCAL` permanecen vigentes porque este port no cambia los SHAs ni incorpora nuevos bytes
donantes. El source register y sus receipts históricos no se reescriben para aparentar una nueva
observación.

## Límites

- Autoriza `push` reversible a la rama feature y gestión del PR; no constituye por sí misma H01
  hash-bound ni autoriza merge final a `main`, publicación, distribución o entrega externa.
- No autoriza H01, promoción, activación global de fuentes ni mutación de repositorios donantes.
- No convierte resultados del candidato privado en evidencia del port público: cada gate debe
  reproducirse localmente sobre esta rama.
- El Guardian final debe revisar el digest público exacto después de las validaciones.

[SUPUESTO] La orden humana vigente cubre preparación y sincronización de ramas, pero la promoción
del candidato de adopción requiere una aprobación H01 posterior ligada a su SHA y tree exactos.

[NEUROCIENCIA] Este port no formula afirmaciones neurocientíficas.

[PEDAGOGIA] Este port no valida eficacia pedagógica.
