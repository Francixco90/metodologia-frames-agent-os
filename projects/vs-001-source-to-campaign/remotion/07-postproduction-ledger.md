# 07 Postproduction ledger

## Estado

- Artifact: `REMOTION-VS001`.
- Composition: `MethodologiaVertical`.
- Governed workflow state: `BLOCKED_BEFORE_SOURCE_LOCK`.
- Technical validation state: `RENDER_VALIDATED`.
- Visible state: `RENDERED_DRAFT`.
- Scope: `LOCAL TEST ONLY`.
- State effect: none on the governed workflow.
- Postproduction: pass-through inspection only; no media mutation.

## Operaciones

| ID     | Tool                  | Input SHA-256                                                      | Output SHA-256                                                     | Cambio semántico | QA                                                         | Rollback                         |
| ------ | --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------- | -------------------------------- |
| PP-001 | Remotion 4.0.494      | `c77bfb6ea6b09099c0f0e5ae7aebbb5b91018bf891c55a70be39c69a8e9167d0` | `b37d3327e1a3c46fe5f0586a912f62bd831abf8faec046efe419ef238f394010` | none             | render succeeded                                           | re-render from hash-bound inputs |
| PP-002 | ffprobe 8.1.1         | `b37d3327e1a3c46fe5f0586a912f62bd831abf8faec046efe419ef238f394010` | `7578eba76e0d811d1c7794f4ccfec7f1cbc1d6de3d3d5074abd10f87523e26ae` | none             | video-only, 1080×1920, 30 fps, 1231 frames, yuv420p, bt709 | n/a                              |
| PP-003 | ffmpeg framemd5 8.1.1 | review A / review B                                                | `d5f0cc1a5abef9e0488933cf992291d8e7fce870ece5b4219ae31b213de22898` | none             | decoded pixel digests identical                            | retain both source renders       |
| PP-004 | ffmpeg SSIM 8.1.1     | 27 stills / review A                                               | `5b83570699b8f38ba07d2940a00e3e9b2a98d657a3651a9cc7b8107ca21b68da` | none             | every still ≥ 0.97 against its encoded frame               | regenerate stale stills          |

## Review shots

Se conservan 27 stills canónicos: primer/último frame, siete midpoints y
pre/durante/post para cada transición. El contacto portable está en
`projects/vs-001-source-to-campaign/remotion/review-shots/contact-sheet.png`. [CÓDIGO]

## Límites

- No hay audio ni PCM digest: ffprobe observa exactamente un stream de video.
- El canary headless prueba el guard de `fetch` remoto; no sustituye el render autoritativo en
  Linux con network namespace, que permanece como `coverage_gap`.
- Las fonts son OFL y hash-bound, pero el release/commit binario upstream permanece sin resolver.
- No se sustituyeron claims, copy, captions, color ni estado visible.
- La inspección no concede SOURCE_LOCKED, Guardian, H01, release ni publicación.
- Playback humano independiente completo sigue pendiente.
