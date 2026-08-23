# `case-longform` · preflight V00/V01

`case-longform-preflight-v1` congela cinco roles exactos: cortinilla de entrada, contexto del
host, cuerpo del participante, cierre probatorio y cortinilla de salida. Cada fuente exige
bytes y hash reales, procedencia, autoridad, derechos y consentimiento; los receipts de
autoridad y preview se resuelven desde raíces externas no solapadas y actores allowlisted.
[CONFIG]

Source y preview deben ser contenedores MP4 reales 1920×1080, CFR24, con audio, conteo
coherente de frames y decode de todos los streams (`-map 0`). El probe opera sobre un
snapshot de bytes hash-bound después de revalidar identidad; sustitución TOCTOU, contenedor
renombrado, archivo con solo firma `ftyp`, raíz anidada, actor no confiable o cualquier campo
post-render bloquean. [CÓDIGO]

El estado terminal de este slice es `BLOCKED_PENDING_EVIDENCE_CONTRACTS`: no autoriza full
render, vertical, upload, conectores ni publicación. El grafo ejecutado, cobertura framewise,
evidencia semántica, auditoría multimodal, attestations y paquete exacto pertenecen al gate
posterior; `UNKNOWN` o ausencia material conservan el bloqueo. [METODOLOGIA]

PR1b consume y revalida el preflight material exacto, liga fuentes/plan/preview, grafo
`intro→host→body→closure→outro`, ejecutables allowlisted y cleanup material. Su estado es
`BLOCKED_PENDING_COVERAGE_CONTRACTS`: PR1b2 debe demostrar movimiento, cobertura framewise
y observaciones de frontera; PR1c conserva ejecución, auditoría, attestations, paquete exacto
y `RENDERED_DRAFT`. Ningún slice anterior autoriza render. [CONFIG]

PR1b2 reejecuta esa autoridad y acepta solo evidencia observada del preview: framehash real,
cobertura exacta derivada, cambio local dentro del ROI de scroll/fades y hashes por cada
`span×mask×frame` sensible. El full queda como perfil planificado sin media; el estado máximo es
`BLOCKED_PENDING_EXECUTION_AND_POSTRENDER_CONTRACTS`; observar fronteras no prueba ejecución,
lineage ni causalidad. [CÓDIGO]
`coverage_gap`: start/mid/end prueban cambio local muestreado, no continuidad entre esos puntos;
PR1c debe verificar la continuidad local framewise. [CONFIG]

PR1c0a congela únicamente segmentos fuente incluidos, la política semántica externa y el orden
`timeline_cut→audio_identifier_replace→visual_mask_source_space→scale_1920x1080→compose_single_caption_track→encode`.
Los segmentos `PASSTHROUGH` cubren el output sin solapes; los gaps entre rangos fuente reservan
cortes, pero todavía no prueban su aplicación. La política requiere el nombramiento de Danilo,
prohíbe certificado, limita a Alejandra a `recognized` y fija Natalia en `in_progress`; la
ausencia audiovisual actual no se convierte en política permanente. Estado:
`BLOCKED_PENDING_PRERENDER_REVIEW_CONTRACTS`. [CONFIG]
`coverage_gap`: PR1c0b debe materializar audio/claims/preservación, derivación de transcript y
diccionario, y review externo del preview; PR1c0a no afirma completitud ni PASS. [METODOLOGIA]

PR1c0b1a congela policy V2 sin gaps, diccionario externo, transcript completo por fuente y
censura de audio derivada de cues sensibles dedicados. `CUT_CLAUSE` debe coincidir con un gap
fuente exacto; `ROOM_TONE_IDENTIFIER` exige donor PCM recalculado de la misma fuente, sin TTS ni
clonación. RMS/peak son mediciones, no prueba de ausencia de habla: `speech_free_review` permanece
`PENDING_EXTERNAL_REVIEW`. El transcript es un mapa declarado hash-bound, no evidencia acreditada
del audio; URLs convergen sin scheme/`www`, el donor fija `audio_stream_index: 0` y usa FFmpeg
absoluto/hash-bound para resamplear a 48 kHz antes del corte. Estado:
`BLOCKED_PENDING_TRANSCRIPT_SEMANTIC_PRESERVATION_REVIEW_CONTRACTS`. [CONFIG]
FFprobe también es absoluto/hash-bound: video y `a:0` deben iniciar en cero con tolerancia máxima
de una muestra a 48 kHz; cualquier PTS desplazado bloquea mapa y donor. [CONFIG]
`coverage_gap`: PR1c0b1b debe cerrar claims, preservación de evidencia/texto funcional y review
externo antes de cualquier autoridad de render. [METODOLOGIA]

PR1c0b1b-claims materializa solo policy V3, claims y gaps. Las declaraciones usan
`SOURCE_AUDIOVISUAL_ONLY`; Natalia puede presentar `En progreso` como `EDITORIAL_LABEL` separado
del habla. Danilo permanece `PRE_RENDER_BLOCKED` mientras falte el nombramiento audiovisual; sin
ese gap el máximo es `BLOCKED_PENDING_PRESERVATION_AND_EXTERNAL_REVIEW_CONTRACTS`. No existe
`PreservationMap`, review ni autoridad de render. [CONFIG]
`coverage_gap`: preservación requiere un PR separado con diff RGB crudo fuera de máscaras y ratio
residual mínimo impuesto por policy; hashes o áreas declaradas no cierran ese gate. [METODOLOGIA]

PR1c1a congela una policy externa de preservación y un `PreservationPlan`: inventario exacto
multi-región, mapeo `PASSTHROUGH`, overlays de máscara y herramientas absolutas hash-bound
ejecutadas desde snapshot. Una matriz canónica impide omitir las categorías/roles mínimos por
participante; RGB tolera como máximo 8 por canal y el residual visual exige al menos 900000 ppm.
Captions no son una exclusión visual en 1a: su layout/single-track se valida por separado. Revalida V4 y permanece
`BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS`; no existe ledger, PASS, review ni render. [CONFIG]
`coverage_gap`: PR1c1b debe comparar RGB24 de todos los frames fuera de la unión temporal/geométrica,
recalcular ppm y residual mínimo, probar solapes sin cargar el longform completo en memoria y
cerrar la autoridad de layout/single-caption. [METODOLOGIA]

PR1c1b1a1 migra preview/frame evidence y las herramientas de V5 al snapshot común absoluto,
hash-bound y acotado; elimina la ruta productiva por `PATH`/`Buffer`, sin crear RGB ledger. [CÓDIGO]

PR1c1b1 recalcula un ledger RGB24 framewise desde snapshots comunes hash-bound: procesa cada
región por chunks, resta la unión temporal exacta de máscaras, aplica tolerancia de policy y
encadena todos los frames con residual, changed pixels y worst frame. Captions no son excluibles;
permanece `BLOCKED_PENDING_CAPTION_AND_EXTERNAL_REVIEW_CONTRACTS`. [CÓDIGO]
`coverage_gap`: falta autoridad material de layout/compositor, cue/ROI/timing, single-caption y
review externo antes de cualquier render. [METODOLOGIA]

PR1c1b2a1 congela únicamente contratos: layout, compositor y verificador viven en raíces externas
disjuntas con actores distintos; fonts, ejecutables, configuración y comandos canónicos quedan
hash-bound. Cada placement se deriva del grafo, mapa temporal, captions y policy de layout, sin ROI
libre. Danilo conserva `PRE_RENDER_BLOCKED`; los demás no superan
`BLOCKED_PENDING_CAPTION_MATERIAL_LEDGER_CONTRACTS`. [CONFIG] `coverage_gap`: faltan ledger material
de captions y review externo; este slice no compone, observa, renderiza, publica ni emite `PASS`.

PR1c1b2b1 añade un `CaptionExecutionLedger` de alcance `CAPTION_DATA_GRAPH_ONLY`: una entrada
encadenada por cada fragmento cue×layout liga texto, fuente, geometría, frames, grafo, mapa temporal,
track, cleanup y autoridades del compositor. El ledger se recalcula desde V7a y no acredita píxeles
ni observación visual. Danilo conserva `PRE_RENDER_BLOCKED`; los demás quedan
`BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS`. [CONFIG] `coverage_gap`: evidencia visual y
review externo siguen separados; no existen `PASS`, composición, render, efectos ni publicación.

V7c0 añade solo el contrato y la derivación pura del plan externo: actores independientes y
allowlisted, raíz léxicamente absoluta/canónica/disjunta y producto exacto de cada entrada del
CaptionExecutionLedger por cinco checks. Danilo conserva `PRE_RENDER_BLOCKED`; los demás permanecen
`BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS`. [CONFIG]
`coverage_gap`: el public gate full-chain V7b/V7c no está acreditado hasta un slice futuro
expresamente autorizado con fixture media sintética. V7c0 no contiene observation, evidence,
verdict, `PASS`, receipt, media, render, efectos ni publicación. [METODOLOGIA]

[PEDAGOGIA] El estado editorial debe distinguir avance, reconocimiento, nombramiento y
certificación sin comparaciones ni credenciales superiores a la evidencia. [NEUROCIENCIA]
No se introducen afirmaciones cognitivas o científicas. [INFERENCIA] Ningún texto sustituye
un fragmento audiovisual ausente. [SUPUESTO] El control plane aporta las raíces y actores
confiables; sin esa autoridad externa, el preflight falla cerrado.
