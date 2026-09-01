# Mantener Frames con R9

## Qué hace Frames

`frames:maintain` es el bootstrap B0 de inspección y handoff para R9. Sus tres modos
son locales, deterministas y de solo lectura. Siempre devuelven `writes: []` y se
detienen ante un gate humano; no registran un veredicto Guardian ni una aprobación.
[METODOLOGIA][DOC]

## Definition of Done documental

- `inspect` liga el repositorio declarado a su remote Git local, rama simbólica,
  base, `HEAD`, trees y estado del worktree.
- `plan` revalida esa inspección y emite un `FramesWorkOrderV1` canónico. Solo
  admite R9, `LOCAL_REVERSIBLE`, archivos exactos y herramientas locales permitidas.
- `prepare-handoff` vuelve a leer el WorkOrder físico, hashes, baseline, solicitud,
  plan documental, inputs y outputs. Bloquea cambios fuera del `writeSet`.

Los inputs son JSON estricto por `stdin`; no se aceptan flags, campos extra,
rutas ambiguas, globs, aliases casefold, symlinks ni hardlinks. La identidad del
remote se normaliza a `owner/repository` y nunca se imprime su URL.

Estados terminales:

| Modo              | Estado            | Siguiente gate          |
| ----------------- | ----------------- | ----------------------- |
| `inspect`         | `STOPPED_AT_GATE` | `HM_CHANGE_APPROVED`    |
| `plan`            | `STOPPED_AT_GATE` | `HM_CHANGE_APPROVED`    |
| `prepare-handoff` | `STOPPED_AT_GATE` | `HM_PROMOTION_APPROVED` |

`gateStatus: REQUIRED` significa que el gate falta; no acredita `PASS`, aprobación
o promoción. [METODOLOGIA][CONFIG]

## Comandos útiles

```sh
pnpm frames:maintain inspect < inspect-input.json
pnpm frames:maintain plan < plan-input.json
pnpm frames:maintain prepare-handoff < handoff-input.json
```

El binding común contiene exactamente:

```json
{
  "schemaVersion": "frames-maintain-binding-v1",
  "repository": "owner/metodologia-frames-agent-os",
  "branch": "codex/candidate-v1",
  "baseRef": "origin/main",
  "baseCommit": "<git-object-id>",
  "baseTree": "<git-tree-id>"
}
```

`inspect` recibe `{schemaVersion, binding}`. `plan` añade
`expectedInspectionSha256` y `workOrder`. `prepare-handoff` añade
`expectedInspectionSha256`, `workOrderRef` y `workOrderPhysicalSha256`. Primero se
captura `inspect`; los modos posteriores bloquean si cambia su hash.

## Siguiente lectura

No hay red, fetch, persistencia, commit, push, merge, publicación, recorder,
Guardian, H01 ni promoción. Git se invoca sin shell y solo mediante comandos de
lectura sobre refs explícitos. [METODOLOGIA][CONFIG]

- `FM-ARG001` / `FM-INPUT001`: modo, argumentos o JSON no admitidos.
- `FM-WORKSPACE001` / `FM-REPO001`: checkout o remote no acreditado.
- `FM-BRANCH001` / `FM-BASE001` / `FM-HEAD001` / `FM-TREE001`: drift Git.
- `FM-PATH001` / `FM-ALIAS001` / `FM-DIRTY001`: path inseguro o fuera de alcance.
- `FM-HASH001` / `FM-WORKORDER001`: material o contrato stale/inválido.
- `FM-EFFECT001`: efecto o herramienta fuera de la capacidad B0.

[INFERENCIA] Un handoff válido solo prepara evidencia para decisión humana; no
convierte el candidato en promovido. [SUPUESTO] El remote local ya existe y no se
consulta por red. [NEUROCIENCIA] No aplica. [PEDAGOGIA] No aplica.
