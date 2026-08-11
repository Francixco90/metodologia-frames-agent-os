---
name: content-os-transcript-intelligence
description: This skill should be used when the user asks to review, clean, correct, subtitle, search, mine, or narratively structure a transcript; mentions bad diction, poor English pronunciation, code-switching, ASR errors, transcript-derived captions, semantic transcript search, story arcs from interviews, meetings, podcasts, or videos; or when another ContentOS workflow needs a governed layer between ASR and public captions. Produces traceable transcript, caption, semantic, narrative, and private coaching artifacts without publishing.
---

# ContentOS Transcript Intelligence

Convertir ASR candidato y fuentes auxiliares en artefactos lingüísticos trazables. Mantener
separados lo audible, la edición pública de claridad mínima, la búsqueda, el montaje narrativo
y el coaching privado. El estado máximo es `human-reviewed`; nunca `READY` o `PUBLISHED`.

## Secuencia obligatoria

1. **Ingestar.** Verificar hash, procedencia, derechos y clasificación de cada fuente. Notas
   editoriales no equivalen a transcripción literal.
2. **Analizar.** Detectar errores ASR, ambigüedad, disfluencia, code-switching, términos
   técnicos y eventos de inteligibilidad. No evaluar dicción o pronunciación sin audio.
3. **Editar captions.** Corregir solo con autoridad verificable; retirar únicamente muletillas
   sin valor semántico; preservar voz, registro, emoción, gramática y claims.
   Aplicar `minimal-clarity` como política pública canónica.
4. **Indexar y buscar.** Combinar texto, aliases, entidades, temas, acciones, resultados y
   relaciones. Embeddings son opcionales, locales y hash-bound.
5. **Mapear narrativa.** Producir beats con `sourceSpan`; nunca inventar una historia. Si la
   evidencia no alcanza, responder `discard`, `extend` o `reframe`.
6. **Verificar y empaquetar.** Bloquear nombres, cifras, productos o claims materiales
   ambiguos. Excluir siempre `coaching-private.json` del paquete público.

## Política de lenguaje

- Usar `intelligibility_issue` y `english_pronunciation_variance`, no etiquetas sobre la
  persona. Acento comprensible, dialecto y code-switching no son errores.
- Una grafía canónica en captions no demuestra competencia lingüística ni autoriza coaching.
- Sin audio: permitir revisión textual/ASR y emitir `audio_required`; no producir evaluación
  de dicción, articulación o pronunciación.
- No corregir resultados, promesas o datos para que “suenen mejor”. Lo material ambiguo
  bloquea; lo no material puede omitirse o marcarse sin adivinar.
- Mantener doble canal: captions públicos y coaching privado opt-in. El canal privado no se
  copia a receipts o packages públicos.

Leer `references/language-quality-policy.md` para decisiones lingüísticas,
`references/caption-editing-policy.md` al crear subtítulos,
`references/semantic-retrieval.md` para búsquedas y
`references/narrative-mining.md` para arcos y assembly maps.

## Contrato y CLI

Usar `transcript-intelligence-v1` y rutas relativas al job. Ejecutar:

```text
node scripts/transcript-intelligence.mjs ingest|analyze|caption|index|search|narrative|verify|package --job <job.json> --out <dir>
```

`search` exige `--query`; `narrative` acepta `--framework duarte|transformation|impact|pas`.
El runtime es offline-first, determinista y no consulta Documents, Downloads, Google Docs ni
servicios remotos.

## Integración

- `content-os-media` entrega ASR candidato, modelo, idioma y timestamps.
- `content-os-general-video` exige esta compuerta antes de scripts derivados de voz.
- `content-os-embedded-captions` y `content-os-remotion-captions` consumen
  `caption-track.json`, no ASR crudo.
- `content-os-talking-head-recut` consume `semantic-index.json` y `narrative-map.json`.
- `content-os-creative` decide tratamiento visual desde beats ya respaldados.

## Stop rules

- Fuente sin hash/derechos/autoridad o ruta absoluta: STOP.
- Solicitud de pronunciación sin audio: producir `audio_required`, no inferir.
- Ambigüedad material sin resolver: FAIL verification.
- Beat sin `sourceSpan`: excluirlo; si rompe el arco, `reframe` o `discard`.
- Intento de incluir coaching privado en paquete público: FAIL.
- Checks deterministas aprobados: máximo `local-evaluation`; publicación sigue manual.
