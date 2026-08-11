---
name: content-os-media
description: This skill should be used when the user asks to "resolve a media asset for a Frames ContentOS composition", "generate TTS voiceover offline", "transcribe audio locally", "remove background from video offline", "audit a media manifest for remote-without-auth", or "declare remote media opt-in for a project".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires the content-os-core HTML composition contract. Offline render profile by default. Remote adapters (HeyGen, OpenAI) are opt-in per project, auth-gated, fail-closed without credentials. No network in the default render path.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Media

Media OS for Frames ContentOS compositions: **resolve · generate · transcribe · operate ·
remember** — every media type, dual offline-default + remote-opt-in, one contract,
zero context noise. Adaptado de `hyperframes-media-use` (vendoreado Fase 0,
Apache 2.0, reference-only) al arquitectura local fail-closed + offline-first.

Diferencia con el vendor: el adapter HeyGen es **opt-in por proyecto** y
**fail-closed sin credenciales** — no degrada, no suple, no network en el render
path default. Los placeholders del vendor (`at_test`, fixtures) NO se reusan; el
adapter local usa su propio contrato de credenciales. Media playback es
framework-owned (start/stop determinístico por clip, hereda `content-os-core`).

Para motion-craft ver `content-os-animation`. Para pose contract ver
`content-os-keyframes`. Para brand tokens ver `content-os-creative` +
`metodologia-brand-router`. Esta skill es la capa de **media resolution +
generation** debajo de esos contratos.

## Preflight (siempre)

1. Leer `schemas/media-manifest-v1.schema.json` — cada entrada resuelta registra
   `id`, `type`, `path`, `sha256`, `source`, `provider` (`offline`|`remote`),
   `auth_declared` (bool), `duration_s`/`dims` cuando aplique.
2. Confirmar el perfil del proyecto: `offline` (default) o `remote-opt-in`
   (declarado explícitamente). Sin declaración, solo offline.
3. Para adapters remotos, verificar auth: pattern `npx … auth status`. Sin
   credenciales → error fail-closed (no degrade, no supla).
4. Correr `scripts/media-audit.mjs <manifest-or-brief>` antes de render. Falla
   closed si una entrada `provider: remote` no tiene `auth_declared: true` o el
   proyecto no declara opt-in.

## Default: offline resolve cascade

```bash
node <SKILL_DIR>/scripts/media-resolve.mjs --type <type> --intent "<desc>" --project <dir> [--local-only]
```

Devuelve una linea: `resolved <id> → <path> (<type>, <provider>, <metadata>)`.
Cascade offline determinística:

1. Match en `.media/manifest.jsonl` (case/whitespace-insensitive) → auto-reuse.
2. Scan `assets/` local sin registrar que comparta palabra con el intent → adopt.
3. Sin match offline y `--local-only` (default) → error fail-closed (no network).
4. Sin `--local-only` Y proyecto declara opt-in Y auth presente → adapter remoto.

El default es `--local-only`. El render path default **nunca** toca network. Los
adapters remotos son scripts separados (referenciados en
`references/resolve-cascade.md`), opt-in por proyecto, auth-gated, fail-closed.

## Routing

| Topic                                                           | Carga                                       |
| --------------------------------------------------------------- | ------------------------------------------- |
| Resolve bgm/sfx/image/icon/logo/voice offline                   | scripts/media-resolve.mjs + resolve-cascade |
| TTS voiceover (Piper/Coqui local default; HeyGen remote opt-in) | references/audio.md                         |
| Transcription (whisper.cpp local; OpenAI remote opt-in)         | references/audio.md                         |
| Background removal (ffmpeg local; remote opt-in)                | references/audio.md                         |
| Remote adapter opt-in + auth gating                             | references/resolve-cascade.md               |
| Auditar manifest (remote-without-auth, network-in-render-path)  | scripts/media-audit.mjs                     |
| Media manifest schema                                           | schemas/media-manifest-v1.schema.json       |

## Media Contract (ground truth)

1. **Offline por defecto.** El render path default no toca network. Media
   resuelto via cascade local (manifest → assets/ → fail-closed). Sin
   `--local-only` + opt-in + auth, nada remoto.
2. **Fail-closed sin credenciales.** Adapters remotos error (no degradan, no
   suplen) sin auth. Pattern `npx … auth status`. Un fallo de red no es una
   oportunidad de suplir con un placeholder.
3. **Opt-in por proyecto.** Un proyecto declara explícitamente qué adapters
   remotos habilita; sin declaración, solo offline. La declaración vive en el
   project config, no en la composition.
4. **Media playback framework-owned.** Start/stop determinístico por clip
   (hereda `content-os-core`). Sin `Date.now()`/`Math.random()`/`new Date()` en
   media ops. Sin `fetch`/`setTimeout`/`setInterval`/`performance.now()` en
   composition code (hereda core).
5. **Provenance obligatoria.** Cada entrada del manifest tiene `sha256` +
   `source` + `provider`. Sin hash ni source, no se promueve a `RENDERED_DRAFT`.
6. **No reuso vendor placeholders.** `at_test`, fixtures del vendor, tokens
   ficticios — no se reusan. El adapter local usa su propio contrato de
   credenciales.
7. **Determinismo primero.** TTS/transcription/bg-removal local son
   reproducibles (mismo input → mismo output). Remote adapters son
   no-deterministas por definición → solo opt-in, marcados `provider: remote`,
   nunca en el render path default.
8. **ASR es candidato.** Toda transcripción registra modelo, versión, idioma,
   timestamps, relojes absoluto/local y hashes de fuente, audio derivado, modelo y
   configuración como `asr-candidate-v1`. No se promueve a verdad, caption ni
   claim: `content-os-transcript-intelligence` debe revisarla contra audio.
9. **RENDERED_DRAFT != HUMAN_APPROVED != READY != PUBLISHED.** Media resuelto
   produce `RENDERED_DRAFT`. `READY`/publicación requiere gates humanos G13-G17.

## Media types

| Type  | Offline (default)                    | Remote (opt-in, auth-gated)     |
| ----- | ------------------------------------ | ------------------------------- |
| bgm   | assets/audio/bgm/ local              | HeyGen audio catalog (opt-in)   |
| sfx   | assets/audio/sfx/ local              | HeyGen sfx catalog (opt-in)     |
| image | assets/images/ local                 | HeyGen asset search (opt-in)    |
| icon  | assets/images/ local (transparent)   | HeyGen asset search (opt-in)    |
| logo  | assets/images/ local (official mark) | svgl/simple-icons (opt-in)      |
| voice | Piper / Coqui local TTS              | HeyGen TTS (opt-in, auth-gated) |
| grade | ffmpeg local correction              | remote providers (opt-in)       |
| lut   | assets/luts/ local `.cube`           | remote catalog (opt-in)         |

Ver `references/resolve-cascade.md` para cascade completo + provider table.

## Audio engine

TTS, transcription, bg-removal, music, sfx — ver `references/audio.md`.

- **TTS**: Piper / Coqui local engines (default, offline, deterministic).
  HeyGen TTS via adapter opt-in (auth-gated).
- **Transcription**: whisper.cpp local (default). OpenAI Whisper API (opt-in).
  Su salida siempre es candidata y conserva procedencia reproducible y ambos relojes.
- **Background removal**: ffmpeg local (default). Remote providers (opt-in).
- **Media playback**: framework-owned, start/stop determinístico por clip
  (hereda `content-os-core`).

## Critical Constraints

- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en media ops
  (hereda `content-os-core`).
- No `fetch`/`setTimeout`/`setInterval` en composition code (hereda core).
- No network en render path default (offline-first).
- Remote adapters: opt-in por proyecto + auth-gated + fail-closed sin creds.
- Sin `sha256` + `source` + `provider`, no se promueve entrada a manifest.
- `provider: remote` requiere `auth_declared: true` + project opt-in declarado.
- No reuso vendor placeholders (`at_test`, fixtures ficticios).

## Stop rules

- Manifest auditable (`media-audit.mjs` PASS), provenance completa, offline-only
  declarado: STOP resolve.
- Proyecto declara opt-in, auth presente, adapter remoto disponible: STOP remote.
- Sin auth o sin opt-in para adapter remoto: STOP, no degrade, no supla.
- Sin `sha256`/`source` en entrada: STOP, no promueve.

## Done

Media resuelto via cascade offline deterministica, manifest auditable PASS,
provenance completa (sha256 + source + provider), playback framework-owned,
`RENDERED_DRAFT` != `HUMAN_APPROVED`. Remote opt-in declarado por proyecto +
auth-gated + fail-closed sin creds. `READY`/publicación bloquea gates humanos
G13-G17 (manuales por diseño).
