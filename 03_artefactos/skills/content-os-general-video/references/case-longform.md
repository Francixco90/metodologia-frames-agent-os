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

[PEDAGOGIA] El estado editorial debe distinguir avance, reconocimiento, nombramiento y
certificación sin comparaciones ni credenciales superiores a la evidencia. [NEUROCIENCIA]
No se introducen afirmaciones cognitivas o científicas. [INFERENCIA] Ningún texto sustituye
un fragmento audiovisual ausente. [SUPUESTO] El control plane aporta las raíces y actores
confiables; sin esa autoridad externa, el preflight falla cerrado.
