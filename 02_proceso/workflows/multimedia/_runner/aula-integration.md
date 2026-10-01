# Aula y decks: recorrido desde lenguaje normal

Frames conserva el brief y sus decisiones antes de producir una pieza. Las 18
skills activas pueden generar borradores locales; la aprobación de cada pieza y
su publicación siguen siendo decisiones humanas separadas. [METODOLOGIA]

## Entrada

`pnpm frames:assist` recibe texto o JSON por stdin. Sin `--apply` orienta sin
escribir. El pedido selecciona formato por pertinencia y usa MetodologIA por
defecto; «marca blanca» o `edition: white-label` seleccionan esa edición.

Un pedido suficiente conserva los contratos existentes `decision_funnel`,
`decision_selection`, fuentes con autoridad, workspace y timestamps. El primer
paso materializa `brief.md`, su proyección HTML y receipt. La continuación exige
un registro de una decisión humana sobre los bytes actuales del brief.

## Continuación P05 → P06 → P07

Agregar `aula_continuation` al mismo pedido y ejecutar con `--apply`:

```json
{
  "stage": "spec",
  "edition": "metodologia",
  "inputRef": "inputs/content.json",
  "briefRef": "brief/brief.md",
  "briefApprovalRef": "approvals/brief.json",
  "outputDirectoryRef": "design/successor-01",
  "writeSet": ["design/successor-01/**"]
}
```

P05 valida el contrato original `frames-aula-v1`/`deck-v1`, fija request, ruta,
edición, skill y hashes. Escribe `spec.json`, WorkOrder y receipt; se detiene en
`MW_SPEC_APPROVED`. La aprobación de especificación liga los bytes de `spec.json`
y del contenido. La continuación `stage: build` agrega `specRef` y
`specApprovalRef`, selecciona un directorio nuevo y un write set correspondiente.

P06 invoca el handler material, verifica el plan exacto y relee hashes. P07 genera
un reporte mecánico con aceptación humana pendiente. Todos los outputs quedan
`RENDERED_DRAFT`; el reporte no concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`.

## Registros de decisiones

Las aprobaciones se validan con Zod estricto y comparten `decision: APPROVED`,
`actor` no vacío, `basis: explicit_human_decision`, `requestHash`, `routeId: R6` y
`edition`. No deben generarse a partir de una puntuación o del éxito de tests.

- Brief: `gate: EXP_BRIEF_APPROVED` y `briefSha256`.
- Spec: `gate: MW_SPEC_APPROVED`, `specSha256` e `inputSha256`.
- Deck: agrega `intakeRef` e `intakeApprovalRef`; la decisión
  `DECK_INTAKE_APPROVED` exige `intakeSha256` y datos de audiencia, problema y
  decisión. Tanto intake como especificación aprobados son obligatorios.

Un cambio de contenido, marca, petición, fuente aprobada o motor invalida el gate
correspondiente. Los archivos existentes se preservan mediante successors.

## Evaluación y promoción

`promote-aula-decks.mjs --evaluate` registra evaluación reproducible de los 18
paquetes y los recorridos, sin activar skills. `--activate --review` requiere una
revisión independiente `PASS`, rol `RT-11`, actor distinto del productor y del
evaluador, y hash exacto del recibo de evaluación. Conserva eventos anteriores.
La regeneración de paquetes debe preservar el estado y volver a congelar hashes.

## Sensores

`pnpm verify:aula` verifica paquetes, routing, recorridos y navegador offline en
escritorio, tableta y móvil. CI instala Python y Chromium emparejado con
Playwright. En local puede declararse `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` para
un ejecutable observado. Un sensor ausente causa fallo; no equivale a aceptación.
Office es opcional y estático; bancos públicos son opcionales y fijados por hash.
