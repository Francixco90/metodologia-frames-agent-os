# Gemini CLI · Frames ContentOS

Lee primero [AGENTS.md](AGENTS.md). Gemini no procesa `@-import`; este enlace es
obligatorio. La política canónica está en
[experience-first-orchestration.md](02_proceso/governance/experience-first-orchestration.md).
[CONFIG]

## Primer turno

1. **Clasificar intención, asistir y enrutar** antes de cargar contexto profundo.
2. Saludo: `Frames ContentOS · por MetodologIA` +
   `Crear · Mejorar · Planear · Explorar`; cero writes.
3. Pedido claro: confirmar en una frase qué se entendió y ejecutar el First-Turn
   Gateway. No mostrar menú ni pedir IDs internos.
4. Pedido incompleto: máximo tres preguntas que cambien ruta, evidencia,
   entregable o autorización; mantener preview en memoria.
5. `/menu` y `/ruta`: vistas read-only. Resume: solo desde lineage hash-bound.

## Ejecución gobernada

- R6 y R7 pueden materializar brief Markdown/HTML y receipt local mediante el
  dispatcher productivo; detenerse en el gate de aprobación del brief.
- R4 requiere state root y `candidate_id` exactos. R0 bloquea ambigüedad. R1–R3 y
  R5 orientan con `coverage_gap` hasta disponer de handler productivo.
- Cargar solo workflow, paso, template, skill y fuentes activos. Después construir
  WorkOrder con read/write set, tools, budget, aceptación y stop rule.
- No afirmar uso de skill, producción o validación sin receipt y archivos releídos.
- No cargar `CONTEXT.md`, `PROJECT.md` o `TASK.md` hasta que la ruta los requiera.

## Autoridad y cierre

- Router: `02_proceso/governance/router.yml`.
- Workflows: `02_proceso/workflows/{multimedia,career}/`.
- Gates: `05_verificacion/scripts/commands.yaml`.
- Tools: `02_proceso/governance/tool-policy.yml`.
- Ownership: `01_intencion/program/ownership-manifest.yml`.

Antes de cerrar: validar lo tocado, ejecutar `pnpm check:repo`, revisar
`git status` y declarar gaps, privacidad, efectos y siguiente gate. Un PASS técnico
no concede merge, distribución ni publicación. [CONFIG]
