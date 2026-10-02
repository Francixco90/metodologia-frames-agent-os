# Contrato de contenido

`schemaVersion: frames-aula-v1`; `title`, `language`, `languages`, `objectives`, `acceptance`, `sections`. Cada sección tiene `id` único, `title`, `body`; admite `scene`, `sceneParams`, `assetRefs`, `prompt`, `fields`, `settings`, `links`, `factIds`, `table`, `matrix`, `cols`, `cards`, `metrics`, `badges`, `tabs`, `accordion`, `references`. Strings pueden ser objetos con los idiomas declarados. Campos desconocidos se rechazan con su ruta, nunca se descartan silenciosamente.

`scene` es un ID real del catálogo; `sceneParams` rellena slots de esa escena. Usa etiquetas breves: maxChars es un techo de contenido, no garantiza que una palabra quepa en el ancho tipográfico desktop/portrait. SCENE_WORD_OVERFLOW indica el slot que debes reescribir; check antes de prometer un resultado, sin truncar ni reducir fuentes. `assetRefs`: lista de `{id,kind:icon|scene,label?}`. Núcleo local: engine/assets/core/catalog.json. Banco instalado: --bank DIRECTORIO; obtención opcional indicada en asset-bank.md.

`training`: duración, audiencia, materiales y runOfShow con sectionId/minutes/notes. Cada sección puede tener durationMinutes, demonstration, practice, checkpoints(question/answer/criterion), reflection, transfer y facilitatorNotes. Los tiempos de ejemplo son supuestos de diseño, no afirmaciones pedagógicas.

`authoringPolicy:{origin:new}` usa máximo8 comercial/13 académico. `maxSlides` requiere `explicitBrief`; cuenta portada y tapa. Sin política, entradas históricas se reproducen íntegras. `theme:dark|light`; brand configurable solo en marca blanca.

`facts`: id, texto, source, sha256 y confirmed. Un hash declarado no prueba verdad. `pieces` en índice/módulo requieren archivos existentes; pieceSections mantiene el contenido específico de cada formato. Ver runtime.md para límites completos. [METODOLOGIA]
