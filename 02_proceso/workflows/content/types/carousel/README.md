# Plugin `carousel`

Implementa el primer tipo de contenido V2 sin añadir condiciones al core. El manifest declara
renderer, outputs, fixtures y gates; `plugin.ts` valida, ordena y hash-bound el spec.

El resultado siempre queda en `RENDERED_DRAFT`. `WORKFLOW_PILOT_REVIEW` solicita revisión humana;
solo un `WORKFLOW_PILOT_ACCEPTED` posterior puede desbloquear `feed-text`. Ningún evento concede
publicación.
