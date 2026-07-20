# Renderer Remotion local

`MethodologiaVertical` consume props estrictas Zod 4 y deriva `width`, `height`, `fps` y
`durationInFrames` mediante `calculateMetadata()`. Usa cuatro fonts TTF vendorizadas con OFL 1.1,
hash y licencia local; no usa reloj, aleatoriedad, timers, animaciones CSS, assets remotos ni audio.
[CÓDIGO]

## Pipeline autoritativo

Ejecutar en este orden:

```bash
node --import tsx workflows/content/build.ts
node --import tsx renderers/remotion/scripts/prepare-project.ts
node --import tsx renderers/remotion/scripts/validate-project.ts
node --import tsx renderers/remotion/scripts/render-project.ts
node --import tsx renderers/remotion/scripts/inspect-renders.ts
```

`validate-project.ts` conserva el histórico `test-report.json` V1 y materializa la versión vigente
en `test-report-v2.json` con un ID nuevo. Cada comando apunta a un receipt JSON `*-v2.json` que
conserva identidad, resultado, conteos de bytes y digests, pero no stdout, stderr, rutas absolutas
ni referencias a logs ignorados. Los logs diagnósticos locales permanecen privados, ignorados y
fuera de la cadena portable. Una ruta append-only solo admite replay byte-idéntico; cualquier drift
exige una nueva ruta y un nuevo ID. `render-project.ts` rechaza fuentes cambiadas después de ese
receipt y produce:

- un canary headless que debe bloquear `fetch` remoto;
- un smoke de 90 frames a 270×480;
- dos reviews completos independientes a 1080×1920;
- primer/último frame, siete midpoints y pre/durante/post de seis transiciones;
- `review-shots/contact-sheet.png`.

Los renders usan explícitamente `--muted --enforce-audio-track=false --image-format=png
--pixel-format=yuv420p --color-space=bt709`. `inspect-renders.ts` exige un único stream H.264 de
video, cero streams adicionales, A/B con `framemd5` idéntico, paridad SSIM ≥ 0.97 de cada still
contra su frame codificado y guardas runtime de viewport, safe-zone y overflow de texto. [CONFIG]

Chrome Headless Shell debe estar instalado antes de negar red remota. En macOS sandboxed, el
navegador puede requerir la aprobación de escalación del host. El guard de browser conserva
same-origin para el bundle local; no sustituye el gate autoritativo pendiente de Linux con network
namespace. [CONFIG]

## Semántica de estado

- Governed workflow: `BLOCKED_BEFORE_SOURCE_LOCK`, porque el corpus canónico permanece en 0/4.
- Technical validation: puede alcanzar `RENDER_VALIDATED` solo después del inspector.
- Visible status: siempre `RENDERED_DRAFT · LOCAL TEST ONLY`.
- Human playback, Guardian, H01, release y publicación: pendientes y no concedidos.

El upstream release/commit exacto de los binarios de font y la elegibilidad comercial/productiva de
Remotion siguen como `coverage_gap`; el paquete solo está habilitado para evaluación contractual
local.
