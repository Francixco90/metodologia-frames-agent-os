# Política de calidad lingüística

## Taxonomía operativa

| Evento | Significado | Acción |
| --- | --- | --- |
| `asr_error` | El reconocimiento contradice una autoridad verificable. | Corregir y registrar. |
| `disfluency` | Muletilla, falso arranque o repetición oral. | Retirar solo si no cambia intención. |
| `code_switch` | Cambio de idioma o término técnico intencional. | Preservar. |
| `technical_term` | Producto, sigla, código o término de dominio. | Resolver contra glosario. |
| `unidentified_term` | Más de una interpretación plausible. | No adivinar. |
| `intelligibility_issue` | El audio no permite recuperar una forma confiable. | Revisión humana o marca no material. |
| `english_pronunciation_variance` | Forma inglesa no estándar pero identificable. | Caption canónico; coaching solo privado y con audio. |
| `speaker_grammar` | Sintaxis oral atribuible al hablante, no al ASR. | Preservar en claridad mínima. |

## Reglas derivadas

- `LQ-001` — Separar ASR candidato, transcripción literal, caption editado y narrativa.
  Fuente: `SRC-K12-MULTIMEDIA`, sección Captions and subtitles; adaptación first-party.
- `LQ-002` — Nombres, cifras, términos técnicos y significado material son blockers.
  Fuente: `SRC-K12-MULTIMEDIA`, Invariants.
- `LQ-003` — Preservar code-switching y términos técnicos; no normalizar hacia un idioma.
  Fuente: `SRC-INPUT-ANALYSIS`, Mixed Language & Code Signals.
- `LQ-004` — Debajo de autoridad suficiente, sugerir o bloquear; no autocorregir.
  Fuente: `SRC-INPUT-ANALYSIS`, Confidence Framework, adaptado de texto escrito a ASR.
- `LQ-005` — No convertir habla bilingüe o interrumpida en hechos firmes.
  Fuente: `SRC-CAMPAIGN-LESSONS`, aprendizaje sanitizado.
- `LQ-006` — No inferir trastornos, origen, nacionalidad o competencia general.
  Fuente: política MetodologIA de privacidad y no diagnóstico.

## Autoridad para una corrección

Aceptar la forma canónica cuando exista al menos uno de estos apoyos: glosario o nombre
first-party y contexto compatible; repetición clara en la misma fuente; OCR verificado y
ligado al timestamp; o revisión humana registrada. Nombres, cifras, productos y claims
materiales deben declarar además `authorityClass`, `authorityRef` y `verified: true`.
El puntaje ASR por sí solo no autoriza una corrección material. Las notas editoriales,
referencias visuales e inferencias localizan o proponen, nunca reemplazan audio.

## Relojes y procedencia

Toda observación lingüística conserva un span absoluto sobre la fuente y uno local sobre la
pieza. La procedencia liga mediante SHA-256 la fuente, el audio derivado disponible, el ASR,
la autoridad, el modelo y su configuración. Una discrepancia de hash invalida el análisis.

## Coaching privado

Requiere `audioRef`, hash válido y autorización del job. Cada evento incluye timestamp,
forma oída, forma objetivo, explicación neutral y práctica breve. No usar escalas de
“bueno/malo”, diagnósticos ni puntuaciones globales de inglés.
