# Resolve cascade — offline-default + remote-opt-in

La cascade de resolution es **offline por defecto**. El render path default nunca
toca network. Los adapters remotos son opt-in por proyecto, auth-gated,
fail-closed sin credenciales.

## Offline cascade (default, deterministic, no network)

```bash
node skills/content-os-media/scripts/media-resolve.mjs --type <type> --intent "<desc>" --project <dir>
```

Pasos:

1. **Manifest match** (deterministic floor): `.media/manifest.jsonl` case/whitespace-insensitive match → auto-reuse. Nunca fuzzy.
2. **Assets/ scan**: archivos sin registrar en `assets/` que compartan palabra con el intent → adopt (registra con sha256 + source `local-assets`).
3. **Fail-closed**: sin match offline + `--local-only` (default) → error. No network, no supla, no placeholder.

El default es `--local-only`. Sin `--local-only` Y proyecto declara opt-in Y auth presente → adapter remoto (script separado, ver abajo).

## Remote adapters (opt-in, auth-gated, fail-closed)

Los adapters remotos NO están wired en `media-resolve.mjs` (ese resolver stays offline). Son scripts separados, opt-in por proyecto:

| Adapter       | Provider            | Auth pattern           | Fail-closed sin auth |
| ------------- | ------------------- | ---------------------- | -------------------- |
| TTS           | HeyGen              | `heygen` CLI auth      | error, no degradan   |
| TTS           | OpenAI              | provider cred env var  | error, no degradan   |
| Transcription | OpenAI              | provider cred env var  | error, no degradan   |
| Image         | HeyGen assets       | `heygen` CLI auth      | error, no degradan   |
| Logo          | svgl / simple-icons | network fetch (opt-in) | error sin opt-in     |

Reglas:

- **Opt-in por proyecto**: el project config declara `remoteOptIn: [heygen, openai]`. Sin declaración, los adapters remotos rechazan.
- **Auth-gated**: cada adapter verifica auth antes de ejecutar. Sin auth → error fail-closed. El credential contract es propio (no se reusan placeholders del vendor como `at_test`).
- **No degrade**: un fallo de red o falta de auth no suple con un placeholder. Se escala al agente.
- **Marcado en manifest**: toda entrada remota se registra con `provider: remote`, `auth_declared: true`, `source: <catalog-id-or-url>`.
- **Nunca en render path default**: las entradas remote solo se usan cuando el proyecto declara opt-in; el render path default es offline.

## Provider table

| Type  | Offline (default)                      | Remote (opt-in)         |
| ----- | -------------------------------------- | ----------------------- |
| bgm   | `assets/audio/bgm/` local              | HeyGen audio catalog    |
| sfx   | `assets/audio/sfx/` local              | HeyGen sfx catalog      |
| image | `assets/images/` local                 | HeyGen asset search     |
| icon  | `assets/images/` local (transparent)   | HeyGen asset search     |
| logo  | `assets/images/` local (official mark) | svgl / simple-icons     |
| voice | Piper / Coqui local TTS                | HeyGen TTS / OpenAI TTS |
| grade | ffmpeg local correction                | remote providers        |
| lut   | `assets/luts/` local `.cube`           | remote catalog          |

## Reuse antes de resolver

Antes de resolver fresh, lista candidatos reusables y juzga fit tu mismo:

```bash
node skills/content-os-media/scripts/media-resolve.mjs --type bgm --intent "upbeat tech" --candidates --project .
```

Reglas de reuse:

- **Deterministic floor**: match exacto normalizado auto-reusa. Fuzzy nunca auto-aplica.
- **Semantic reuse**: decision explicita del agente via `--reuse <sha>`. Nunca automático.
- **Cross-project**: cache global solo para entidades que matchean exactamente. Nunca reuses un brand mark de otro proyecto en un match loose.
- **Trust guardrail**: en duda, resolve fresh. Un download redundante es barato; shippear el asset equivocado no.

## Provenance obligatoria

Toda entrada del manifest tiene:

- `sha256`: hash del archivo resuelto.
- `source`: catalog id, ingest url (si remote), o `local-assets`/`manifest-reuse`.
- `provider`: `offline` | `remote`.
- `auth_declared`: `true` si `provider: remote`.

Sin `sha256` + `source` + `provider`, no se promueve a `RENDERED_DRAFT`. El auditor
(`media-audit.mjs`) falla closed si falta provenance.
