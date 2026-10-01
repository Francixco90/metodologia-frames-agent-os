# Frames Aula runtime 1.0.0

Implementación original Python stdlib + HTML/CSS/JS local. [METODOLOGIA]

`python3 runtime.py new --kind workbook --out brief.json`

`python3 runtime.py plan --kind workbook --input brief.json --out salida`

`python3 runtime.py build --kind workbook --edition metodologia --input brief.json --out salida`

`python3 runtime.py check --kind workbook --input brief.json --out salida`

`python3 -m unittest discover -s tests`

`--out` es directorio en build/plan; archivo JSON en new. Build rechaza outputs existentes y symlinks. Plan entrega `{outputs:[...]}` antes de escribir. El build de module crea seis piezas HTML, índice local, workbook Markdown, manifiesto y receipt. La salida individual incluye variantes adaptativas de escritorio/móvil y audiencia sin notas; las dos variantes móviles usan el mismo comportamiento responsive, sin un motor divergente.

## Contrato JSON

schemaVersion `frames-aula-v1`, title, language y languages explícitos; strings pueden ser `{es,en,pt,fr}`. No se traduce automáticamente: traducciones localizadas faltantes para idiomas declarados bloquean. La UI tiene esos cuatro idiomas. sections requiere id único, title; body, notes, scene, prompt y fields son opcionales. Un field tiene key único, label y default. Prompt sustituye `{{key}}` literalmente. objectives y acceptance contienen resultados y criterios de logro. facts requiere source, confirmed=true, sha256; id permite vincular section.factIds. Cifras comerciales en títulos o cuerpos de cualquier idioma necesitan referencias a facts; decks conceptuales no necesitan inventar hechos. No se valida por red la verdad del fact: el hash y confirmación son responsabilidad del autor/validador.

links y pieces aceptan solo rutas locales presentes relativas al brief. Build verifica los enlaces también en el destino de salida. Mantener esos documentos junto a la salida o usar module, que genera sus enlaces. Brand white-label admite name y colors night/gold/white hex; contraste mínimo 4.5:1. MetodologIA no admite override. Tokens de referencia: `brand/tokens/brand-tokens.yml`, SOCIAL canvas #f5f7fa, ink #0a122a, gold_text #8a6d00, white #ffffff, text_soft #334155. Tipografía usa system-ui para independencia offline; no se redistribuyen fuentes ni logos externos.

## Comportamiento

Teclado: flechas navegan fuera de inputs; Escape sale de proyección y restaura foco. Prompts editables, progreso y respuestas se conservan por ruta en localStorage; cambios de idioma conservan respuestas. Copia usa Clipboard API con fallback local. Lean Coffee tiene temporizador, pausa/reset y revelado. Cinco escenas SVG originales con paleta de marca; órbita en loop de 12 segundos con pausa y reduced-motion. No anima cifras. Print muestra todas las secciones y omite notas. Audience elimina notas del payload. Desktop de presentación usa 16:9; edición móvil 9:16 con adaptación responsive. Playbook inmersivo recorre escenas verticales; playbook prioriza impresión; workbook proyecta tarjetas con Escape y retorno de foco. Todos los resultados son RENDERED_DRAFT.

## Límites explícitos

Export Office devuelve coverage_gap y error 3; no fabrica PPTX/DOCX. Los ejemplos no son investigación pedagógica: evidence tags son etiquetas editoriales, no acreditación científica. Tests unitarios no sustituyen revisión humana ni sensores reales de navegador/contraste. No se incluyen logos inventados, fuentes remotas, assets Amaris ni código de paquetes restrictivos.

## Adaptadores explícitos

`python3 migrate.py --input original.json --kind workbook --edition white-label --out migrated.json`

El adapter reconoce `livePrompts`, `slides`, `closureSlides` y `sections` objeto/lista. Conserva el JSON original completo, prompts estructurados literales y texto residual; convierte inputs `[KEY]` declarados en fields `{{key}}`. Escribe `.migration.json` con hash, material no mapeado y pérdidas. Escenas originales no equivalentes exigen `--accept-scene-replacement`; placeholders no resueltos e identidad Amaris bloquean hasta reautoría explícita. No sustituye una traducción editorial ni licencias originales.

`python3 export_office.py --input brief.json --kind workbook --template approved.docx --out review.docx`

Acepta template DOCX con estilos Heading 1/Normal o PPTX con placeholders título/contenido. Requiere python-docx/python-pptx opcionales, conserva plantilla y añade contenido; exporta texto estático, no interacción/escenas equivalentes. Receipt incluye hashes y límites. El comando `runtime.py export` mantiene su error explícito; el adapter separado es la ruta Office implementada.

Decks admiten `mode: comercial|tecnico` (comercial predeterminado; commercial se conserva como alias), `deckType` explícito, `thesis:{title,pillars:[{achieves,proof}]}` y escenas originales. Sections aceptan `table:{headers,rows}`, `tabs:[{title,body}]`, `accordion:[{title,body}]`. Tabs usan roles y flechas/Home/End; tablas validan ancho por fila. La revisión de arco técnico y pilares pertenece al workflow con gates humanos, no se inventan aprobaciones en el renderer. `deck-workflow.py` es el procedimiento intake → aprobación → spec → aprobación → build mantenido por Frames.

Selección explícita: `outputs:["desktop","audience","markdown"]` produce solamente esas piezas y receipt; sin outputs conserva las seis salidas del plan aprobado. Module mantiene su suite completa. `guidelines.json` separa reglas bloqueantes verificables de criterio editorial: títulos comerciales mayores de diez palabras generan advisory REVIEW, nunca aprobación ficticia.
