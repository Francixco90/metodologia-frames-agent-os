# Audio engine — TTS, transcription, bg-removal (dual offline + remote-opt-in)

El audio engine cubre voiceover (TTS), transcription, background removal, music
(bgm) y sound effects (sfx). **Offline por defecto**; remote opt-in, auth-gated,
fail-closed.

## TTS — voiceover

| Modo    | Engine     | Determinismo     | Auth                       |
| ------- | ---------- | ---------------- | -------------------------- |
| offline | Piper      | deterministic    | local model                |
| offline | Coqui      | deterministic    | local model                |
| remote  | HeyGen TTS | no-deterministic | `heygen` CLI auth (opt-in) |
| remote  | OpenAI TTS | no-deterministic | provider cred (opt-in)     |

**Default**: Piper / Coqui local. Mismo input → mismo output (deterministic,
offline, reproducible). Remote es opt-in, marcado `provider: remote`,
`auth_declared: true`, nunca en el render path default.

Reglas:

- Mismo texto + misma voz + misma velocidad → mismo audio (offline deterministic).
- Sin `Date.now()`/`Math.random()` en TTS params (hereda `content-os-core`).
- Voice id, speed, lang declarados en el brief; no improvisados.
- Word timestamps para captions vienen del engine output (no de heurísticas random).

## Transcription

| Modo    | Engine         | Determinismo     | Auth                   |
| ------- | -------------- | ---------------- | ---------------------- |
| offline | whisper.cpp    | deterministic    | local binary           |
| remote  | OpenAI Whisper | no-deterministic | provider cred (opt-in) |

**Default**: whisper.cpp local. FFmpeg 8.1.1 system binary disponible para
probing/cut. El resultado reproducible se registra como `asr-candidate-v1`, no
como transcripción literal ni subtítulo aprobado. Remote es opt-in.

Reglas:

- Transcription corre offline sobre el archivo resuelto local.
- Word timestamps registrados en `media-manifest.jsonl` entry (`duration_s`,
  word boundaries) para sync con captions.
- Registrar engine, modelo, versión, idioma declarado/detectado y hash. Entregar
  audio + ASR candidato a `content-os-transcript-intelligence`; solo esa compuerta
  puede producir `caption-track.json` y resolver ambigüedades lingüísticas.
- Sin network en el path default.

## Background removal

| Modo    | Engine    | Determinismo     | Auth               |
| ------- | --------- | ---------------- | ------------------ |
| offline | ffmpeg    | deterministic    | local binary       |
| remote  | providers | no-deterministic | opt-in, auth-gated |

**Default**: ffmpeg local (filter complex, deterministic). Remote providers son
opt-in, auth-gated, fail-closed.

Reglas:

- Background removal corre sobre el archivo resuelto local.
- Output registrado en manifest con sha256 + source.
- Sin network en el path default.

## Media playback (framework-owned)

Media playback en composiciones es **framework-owned** (hereda `content-os-core`):
start/stop determinístico por clip. El adapter HTML→MP4 (Playwright 1.61.1 +
FFmpeg 8.1.1) controla playback; la composition no llama `fetch`/`setTimeout`/
`setInterval` para coordinar media.

Reglas:

- Clip start/stop via `data-at` (alinea con `content-os-keyframes` pose contract).
- Sin `Date.now()`/`Math.random()`/`performance.now()` en playback code.
- Sin `fetch` para cargar media en render path (media es local file o data-uri).
- Duración del clip viene del manifest `duration_s`, no de probing en runtime.

## Music (bgm) + sound effects (sfx)

| Modo    | Source                    | Determinismo     | Auth                       |
| ------- | ------------------------- | ---------------- | -------------------------- |
| offline | `assets/audio/bgm/` local | deterministic    | local files                |
| offline | `assets/audio/sfx/` local | deterministic    | local files                |
| remote  | HeyGen audio catalog      | no-deterministic | `heygen` CLI auth (opt-in) |

**Default**: assets/ local. Remote catalog opt-in, auth-gated, fail-closed.

Reglas:

- BGM/sfx resueltos via cascade offline (manifest → assets/ → fail-closed).
- Sin match offline + `--local-only` → error, no supla con placeholder.
- Cross-project reuse solo para match exacto (deterministic floor).
