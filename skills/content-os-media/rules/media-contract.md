# Media Contract — ground truth

8 reglas load-bearing para media resolution + generation en Content OS.

## 1. Offline por defecto

El render path default no toca network. Media resuelto via cascade local
(manifest → assets/ → fail-closed). Sin `--local-only` + opt-in + auth, nada
remoto. El default es offline.

## 2. Fail-closed sin credenciales

Adapters remotos error (no degradan, no suplen) sin auth. Pattern `npx … auth
status`. Un fallo de red no es una oportunidad de suplir con un placeholder. Se
escala al agente.

## 3. Opt-in por proyecto

Un proyecto declara explícitamente qué adapters remotos habilita
(`remoteOptIn: [heygen, openai]`); sin declaración, solo offline. La declaración
vive en el project config, no en la composition.

## 4. Media playback framework-owned

Start/stop determinístico por clip (hereda `content-os-core`). Sin
`Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en media ops. Sin
`fetch`/`setTimeout`/`setInterval` en composition code (hereda core). Clip
start/stop via `data-at` (alinea con `content-os-keyframes`).

## 5. Provenance obligatoria

Cada entrada del manifest tiene `sha256` + `source` + `provider`. Sin hash ni
source, no se promueve a `RENDERED_DRAFT`. El auditor (`media-audit.mjs`) falla
closed si falta provenance.

## 6. No reuso vendor placeholders

`at_test`, fixtures del vendor, tokens ficticios — no se reusan. El adapter
local usa su propio contrato de credenciales. El credential contract es propio.

## 7. Determinismo primero

TTS/transcription/bg-removal local son reproducibles (mismo input → mismo output).
Remote adapters son no-deterministas por definición → solo opt-in, marcados
`provider: remote`, nunca en el render path default.

## 8. RENDERED_DRAFT != HUMAN_APPROVED != READY != PUBLISHED

Media resuelto produce `RENDERED_DRAFT`. `READY`/publicación requiere gates
humanos G13-G17 (manuales por diseño fail-closed).

## Example brief (valid, offline-only)

```yaml
projectId: metodologia-demo
mediaProfile: offline
remoteOptIn: []
entries:
  - id: bgm_001
    type: bgm
    path: assets/audio/bgm/launch.mp3
    sha256: <64-hex>
    source: local-assets
    provider: offline
    auth_declared: false
    duration_s: 25
```

## Failure modes

| Síntoma                                | Causa                          | Fix                                    |
| -------------------------------------- | ------------------------------ | -------------------------------------- |
| `FAIL media-resolve: no offline match` | sin match en manifest/assets   | agregar asset local o declarar opt-in  |
| `remote-without-auth`                  | provider=remote sin auth       | presentar cred o usar offline          |
| `remote-without-opt-in`                | remote sin project declaration | declarar `mediaProfile: remote-opt-in` |
| `network-in-render-path`               | https URL en entry.path        | congelar local, usar file://           |
| `missing-sha256` / `missing-source`    | provenance incompleta          | calcular sha256 + registrar source     |
| `vendor-placeholder-reuse`             | `at_test` reusado              | usar credential contract propio        |
| `placeholder-media`                    | media sin resolve real         | correr media-resolve, no inventar      |
