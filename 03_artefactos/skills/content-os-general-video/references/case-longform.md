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
cortes, pero todavía no prueban su aplicación. La política mantiene el nombramiento de Danilo
como gap audiovisual, prohíbe certificado, limita a Alejandra a `recognized` y fija Natalia en
`in_progress`. Estado: `BLOCKED_PENDING_PRERENDER_REVIEW_CONTRACTS`. [CONFIG]
`coverage_gap`: PR1c0b debe materializar audio/claims/preservación, derivación de transcript y
diccionario, y review externo del preview; PR1c0a no afirma completitud ni PASS. [METODOLOGIA]

[PEDAGOGIA] El estado editorial debe distinguir avance, reconocimiento, nombramiento y
certificación sin comparaciones ni credenciales superiores a la evidencia. [NEUROCIENCIA]
No se introducen afirmaciones cognitivas o científicas. [INFERENCIA] Ningún texto sustituye
un fragmento audiovisual ausente. [SUPUESTO] El control plane aporta las raíces y actores
confiables; sin esa autoridad externa, el preflight falla cerrado.
