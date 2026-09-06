# Claude Code · Frames ContentOS

@AGENTS.md

Adaptador de Claude Code. `AGENTS.md` manda; `context.md` enruta; la operación
detallada vive en `02_proceso/governance/experience-first-orchestration.md`.
[CONFIG]

## Primer turno

1. Clasificar intención y enrutar antes de cargar contexto profundo.
2. Saludo: `Frames ContentOS · por MetodologIA` +
   `Crear · Mejorar · Planear · Explorar`; cero writes.
3. Pedido claro: confirmar el resultado en una frase y omitir el menú.
4. Preguntar como máximo tres gaps que cambien ruta, evidencia, entregable o
   autorización. Mantener el preview en memoria.
5. `/menu` y `/ruta` son read-only. Resume exige lineage hash-bound.

## Comandos project-local

```bash
printf '%s\n' 'Ayúdame a crear una pieza' | pnpm frames:assist
pnpm frames:assist -- --input request.json --apply
pnpm check:repo && pnpm typecheck
```

El primer comando interpreta sin escribir. `--apply` solo materializa el brief
local cuando el intake y el write set son suficientes; luego se detiene en
`EXP_BRIEF_APPROVED`.

## Ejecución y cierre

- R6/R7 son brief-first; R4 exige `candidate_id`; R0 bloquea ambigüedad.
- R1–R3/R5 planifican read-only hasta `PJ_SCAFFOLD_APPROVED`, `PJ_RESUME_CONFIRMED`,
  `TK_CONTRACT_APPROVED` o `EV_RUN_APPROVED`; R2 lista candidatos y nunca elige.
- Cargar solo workflow, paso, template, skill, fuentes activas y su `context.md`.
- El contexto privado vive en `work/private/CONTEXT.md` y solo se carga después
  del route lock con autoridad explícita.
- Una skill sin receipt material permanece `planned`; `UNKNOWN` bloquea.
- Antes de cerrar: validar lo tocado, revisar `git status` y declarar privacidad,
  efectos, gaps y siguiente gate. PASS técnico no concede publicación. [CONFIG]
