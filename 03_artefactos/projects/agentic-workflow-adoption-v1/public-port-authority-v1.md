# Autoridad local del port público v1

- `program_id`: `agentic-workflow-adoption-v1`
- `authority_mode`: `LOCAL_SIMULATION`
- `public_base_commit_sha1`: `5e2a18c54ed6343b58428ab940f735405710c643`
- `public_branch`: `codex/proposal-defense-adoption-public-v1`
- `private_candidate_commit_sha1`: `db0c2148f397acf84ba79faee9238b0f0cbbb0c1`
- `original_authority_ref`: `implementation-authority-v1.md`

## Alcance

[METODOLOGIA] La instrucción humana autoriza portar las capacidades ya implementadas al fork
público sobre el `upstream/main` fijado, resolver conflictos preservando las autoridades actuales y
validar localmente el resultado. El port usa cuatro cherry-picks trazables; no mezcla historias por
merge mayorista.

[INFERENCIA] La autoridad original sobre los donantes, sus límites de reutilización y el alcance
`PROJECT_LOCAL` permanecen vigentes porque este port no cambia los SHAs ni incorpora nuevos bytes
donantes. El source register y sus receipts históricos no se reescriben para aparentar una nueva
observación.

## Límites

- No autoriza `push`, PR, merge a `main`, publicación, distribución ni entrega externa.
- No autoriza H01, promoción, activación global de fuentes ni mutación de repositorios donantes.
- No convierte resultados del candidato privado en evidencia del port público: cada gate debe
  reproducirse localmente sobre esta rama.
- El Guardian final debe revisar el digest público exacto después de las validaciones.

[SUPUESTO] La integración remota a fork o `main` será una acción humana o una tarea posterior con
autoridad separada.

[NEUROCIENCIA] Este port no formula afirmaciones neurocientíficas.

[PEDAGOGIA] Este port no valida eficacia pedagógica.
