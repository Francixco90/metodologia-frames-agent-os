# Frames Aula runtime 1.2.0

Motor original Python stdlib + HTML/CSS/JS local. Un motor genera las 20 skills; HTML autónomo, sin fuentes remotas ni red durante lectura. Los ejemplos permanecen `RENDERED_DRAFT`. [METODOLOGIA]

```sh
python3 runtime.py new --kind workbook --out brief.json
python3 runtime.py check --kind workbook --input brief.json --out salida
python3 runtime.py plan --kind workbook --input brief.json --out salida
python3 runtime.py build --kind workbook --edition metodologia --input brief.json --out salida
python3 -m unittest discover -s tests
```

`--out` es archivo JSON en new y directorio en plan/build. Plan valida antes de entregar `outputs`, `buildDependencies`, `assetEvidence`, `profile` y `engineVersion`; no escribe. Build rechaza symlinks y outputs existentes. Los comandos e interfaces `frames-aula-v1` se conservan. Los briefs históricos documentados sin política conservan sus secciones completas.

## Fuente editable y contenido verificable

`schemaVersion: frames-aula-v1`, `title`, `language`, `languages`, `sections`. Textos pueden ser strings o `{es,en,pt,fr}`. Cada idioma declarado requiere traducciones presentes; no se inventan traducciones. Cada sección tiene `id` único y `title`; admite `body`, `objectives`, `acceptance`, `exemplar`, `notes`, `spoken`, `facilitatorNotes`, `prompt`, `fields`, `settings`, `links`, `references`, `factIds`, `scene`, `sceneParams`, `assetRefs`, `layout: auto|left|center` y `reveal`. Los campos semánticos desconocidos o incompatibles bloquean con su ruta exacta, evitando pérdida silenciosa.

- `table` y `matrix`: `{headers:[text],rows:[[text]],caption?:text}`; cada fila coincide con headers.
- `cols` y `cards`: `[{title,body?,items?:[text],icon?:assetId,tag?:text}]`.
- `metrics`: `[{label,value,detail?,factIds?:[id]}]`; `badges`: `[{label,detail?,icon?:assetId}]`.
- `tabs` y `accordion`: `[{title,body}]`. Tabs ofrecen roles y flechas/Home/End.
- `fields` y `settings`: `[{key,label,default?,setting?}]`. El prompt sustituye `{{key}}` literalmente, sin reformularlo. Campos ausentes bloquean.
- `references`: texto o `{title,source,sha256?}`; son procedencia legible, no enlaces activos externos.

`objectives` y `acceptance` también existen en la raíz. `facts` requiere `source`, `confirmed:true`, `sha256` de 64 caracteres; `id` vincula `factIds`. Cifras comerciales en títulos o cuerpos requieren hechos. Los hashes declarados acreditan identidad del material, no su verdad. Afirmaciones pedagógicas o neurocientíficas requieren evidencia del autor; etiquetas editoriales no acreditan investigación. Las etiquetas se preservan en fuente/Markdown y se presentan con lenguaje legible; copiar prompts conserva los bytes. [METODOLOGIA]

Decks conservan `mode: comercial|tecnico` (alias `commercial`), `deckType` y `thesis:{title,pillars:[{achieves,proof}]}`. El renderer no concede aprobación comercial: `deck-workflow.py` conserva intake → aprobación → spec → aprobación → build.

## Clase, workshop inmersivo y límites de autoría

`training:{durationMinutes?,audience?,materials?:[text],runOfShow?:[{sectionId,minutes,notes?}]}` describe la sesión. Los tiempos del run of show coinciden con su duración declarada. Secciones aceptan `durationMinutes`, `demonstration`, `practice`, `checkpoints:[{question,answer?,criterion?}]`, `reflection` y `transfer`. Una actividad puede incluir temporizador con inicio/pausa/reset; las respuestas se revelan voluntariamente. No hay avance automático ni captura de flechas al editar o interactuar con controles. Las tarjetas crecen con su contenido; los SVG conservan sus geometrías desktop/portrait. Una caja fija no debe tapar controles ni truncar prácticas. La duración es un supuesto de planificación, no evidencia de eficacia. [SUPUESTO]

Workshop inmersivo exige objetivos, criterios, un plan completo por sección, tiempos consistentes, práctica con criterios y notas del facilitador, reflexión y transferencia. Su golden original tiene veinte slides por brief explícito; no cambia los límites generales. Incluye temporizadores manuales, campos, prompts y proyección.

`authoringPolicy:{origin:"new"}` limita decks comerciales a 8 secciones y presentaciones académicas a 13; portada y tapa cuentan. `maxSlides` de 1 a 100 requiere `explicitBrief` textual no vacío. `origin:"historical"` reproduce el material completo. Sin política se preserva compatibilidad histórica. Workbooks, índices, ejercicios y Lean Coffee no usan el presupuesto de slides. Módulos aplican la política a cada pieza presentada, no al conjunto. La migración establece origen histórico.

## Identidad y assets

MetodologIA conserva navy/oro, wordmark, Poppins títulos y Montserrat cuerpo locales. Fuentes mantienen OFL-1.1; geometría propia mantiene MIT. Marca blanca usa perfil neutral funcional o `brand:{name,colors:{night,gold,white}}` con hex seguros y contraste comprobado. MetodologIA rechaza overrides. `theme: light|dark` selecciona superficies semánticas; nuevas clases/decks usan oscuro por defecto y briefs antiguos mantienen claro. `brand.colors` conserva sus tres claves; `brand.tokens` contiene las superficies auxiliares.

Cada paquete incluye catálogo core de 32 iconos/16 escenas y fuentes/licencias locales. `scene` usa un ID conocido, con `sceneParams:{slot:text}`. `assetRefs:[{id,kind:"icon"|"scene",label?}]` incluye piezas adicionales. Las escenas son composiciones declarativas originales: desktop 960×540 y portrait 420×740 con las mismas relaciones. Los textos se envuelven en líneas, sin recorte ni reducción automática; presupuesto excedido bloquea. Un ID ausente o hash alterado bloquea con diagnóstico. Los maxChars del catálogo son techos, no garantías de ancho de una palabra; `SCENE_WORD_OVERFLOW` identifica el slot para reescribir con etiquetas breves. Check precede a la entrega, sin truncar ni reducir fuentes.

El banco completo opcional contiene 256 iconos y 160 escenas por edición. Se obtiene durante preparación explícita; HTML solo incorpora los assets seleccionados. Verificar e instalar localmente:

```sh
python3 bank.py verify banco.zip --sha256 HASH
python3 bank.py install banco.zip --sha256 HASH --dest banco-local
python3 runtime.py build --kind immersive-class --input brief.json --out salida --bank banco-local
python3 bank.py sync --pin assets/bank.json --dest cache/banco-1.1.0
```

Sync usa URL de release GitHub y hash fijados, presupuesto de descarga, redirects restringidos y caché confinada sin symlinks. Reutilizar caché requiere `manifestSha256` fijado. Los ZIP admiten máximo 1.024 miembros y 30.000.000 bytes descomprimidos: hashes, conjunto exacto, paths, duplicados, symlinks y SVG seguros se verifican antes de escribir. No se admiten scripts, recursos externos ni SVG activo. La edición del banco debe coincidir. La galería y sus capturas quedan fuera del ZIP de ejecución.

## Salidas, interacción y evidencia

Sin `outputs`, una pieza genera escritorio, móvil, audiencia, audiencia móvil, Markdown y receipt. `outputs:["desktop","audience","markdown"]` conserva selección explícita. Audience elimina notes/spoken/facilitatorNotes, notas de run of show y la fuente de migración del payload; mantiene comprobaciones y respuestas para revelado controlado. Markdown conserva objetivos, criterios, componentes, tablas, ejemplos, referencias, actividades y prompts completos.

Module genera seis piezas HTML, índice, workbook Markdown, manifest y receipt. `pieceSections` permite contenido propio por formato. `links`/`pieces` requieren rutas locales existentes. En index, plan declara cada archivo enlazado y build copia sus bytes desde el directorio del brief, ligándolos a receipt; colisiones con salidas reservadas bloquean. En otros formatos los auxiliares deben existir también en el destino y el host debe declararlos. `assetFiles` conserva el mapa del host de hasta 20 HTML relativos y sus hashes, sin conceder permiso para sobrescribir salidas.

Respuestas/progreso se conservan por ruta en localStorage; cambio de idioma conserva valores. Copia ofrece fallback local; proyección restaura foco al salir con Escape. Navegación no captura teclas de inputs, tabs ni controles. Movimiento de entrada es finito, con pausa y movimiento reducido; los temporizadores usan tiempo transcurrido y nunca avanzan la escena. Impresión expande contenido y omite notas.

Plan y receipt incluyen hashes de perfil, fuentes, catálogo y assets seleccionados. Refs `assets/core/...` se resuelven dentro del renderer; `bank/...` dentro del banco aprobado; `input/...` son piezas locales ligadas al brief. `engineSha256` conserva la fórmula histórica runtime.py+app.js+style.css. `assetEvidence` registra ID, tipo, origen y hashes de contenido/catálogo. Ningún recibo acredita aceptación humana ni publicación.

## Migración y Office

`python3 migrate.py --input original.json --kind workbook --edition white-label --out migrated.json` conserva el original completo, los componentes reconocidos y prompts estructurados. Reconoce livePrompts/slides/closureSlides/sections, convierte inputs declarados y registra pérdidas, residual y hash en `.migration.json`. Escenas no equivalentes requieren `--accept-scene-replacement`; placeholders e identidad restringida bloquean hasta reautoría explícita.

`runtime.py export` conserva error 3 y `coverage_gap`. `export_office.py` es el adaptador opcional separado con plantillas DOCX/PPTX compatibles y dependencias opcionales: produce texto estático, receipt y límites; no reproduce la interacción ni fabrica archivos ante adaptador ausente. Pruebas mecánicas y fixtures no sustituyen revisión humana ni sensores reales de navegador. [METODOLOGIA]
