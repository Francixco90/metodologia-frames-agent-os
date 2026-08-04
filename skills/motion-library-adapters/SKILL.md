---
name: motion-library-adapters
description: This skill should be used when the user asks to "integrate GSAP, Three.js or Lottie with Remotion", "validate a frame-driven motion adapter", "route a motion recipe through the H-03 renderer registry", or "test deterministic fallbacks for a creative motion capability".
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 dependency pins, Remotion 4.0.494, React 19 and an offline render profile.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation-only
---

# Motion Library Adapters

Integrar GSAP, Three.js y Lottie bajo el reloj de frames de Remotion. Mantener cada adapter como
capacidad local, determinista y sustituible; no convertirlo en orquestador, fuente editorial,
compositor final ni publicador.

## Preflight

1. Validar `MotionAdapterSpecV1` mediante `schemas/motion-adapter-spec-v1.schema.json`.
2. Resolver versión exacta, lockfile, licencia, assets, fallback y perfil de render.
3. Exigir `{frame, fps, durationInFrames}` explícito.
4. Detener ante red, reloj, aleatoriedad implícita, asset externo o licencia insuficiente.

## Router

- **GSAP:** crear una timeline pausada, apagar su ticker, hacer `seek(frame / fps)`, aislar targets
  numéricos y ejecutar `kill()` al terminar. No usar DOM, plugins, callbacks, repeat ni yoyo.
- **Three/R3F:** usar cámara, luces, seed y geometría first-party fijados. Animar con el frame
  explícito, nunca con `useFrame()`. Exigir ANGLE para el smoke headless.
- **Lottie:** validar JSON local recursivamente. Rechazar expresiones, URLs, fonts e imágenes;
  fijar primer, último y poster frame; mantener loop y autoplay desactivados.
- **Remotion:** obtener el frame solo en el boundary y entregarlo a los adapters. No registrar una
  composición nueva en H-03.

## Adapter family coverage (Fase 2A overlap merge)

`motion-library-adapters` (Remotion-runtime adapters) + `content-os-animation` (HTML+GSAP
rules/blueprints) cubren colectivamente la familia conceptual de adapters de HyperFrames
sin requerir un homólogo por adapter. La decisión de overlap merge (Fase 2A) mapea los
patrones de adapter a las dos skills existentes en lugar de duplicar uno por runtime:

| patrón adapter (HyperFrames conceptual) | homólogo Frames ContentOS                          | runtime                          |
| --------------------------------------- | -------------------------------------------------- | -------------------------------- |
| gsap, gsap-effects                      | `motion-library-adapters` + `content-os-animation` | Remotion frame clock / HTML+GSAP |
| css-animations                          | `content-os-animation`                             | HTML CSS keyframes               |
| tailwind (motion utilities)             | `content-os-animation`                             | HTML CSS                         |
| animejs                                 | `content-os-animation` (out-of-scope offline)      | HTML (declared out-of-scope)     |
| three                                   | `motion-library-adapters`                          | Remotion R3F                     |
| lottie                                  | `motion-library-adapters`                          | Remotion Lottie                  |
| waapi                                   | `content-os-animation`                             | HTML WAAPI                       |
| typegpu                                 | both (out-of-scope offline)                        | declared out-of-scope            |

Autoridad conceptual: `skills/vendor/hyperframes/hyperframes-animation/SKILL.md` (vendor
reference-only, Apache-2.0). No se vendoriza un adapter por runtime; la cobertura se
consolida en estas dos skills hash-bound.

## Fallbacks

Declarar el fallback en el resultado y degradar la disponibilidad de la capacidad. Usar motion
nativo para GSAP, SVG isométrico para Three y poster first-party para Lottie. Un fallback no
acredita el renderer original ni desbloquea Carousel V2.

## Stop rules

Rechazar `fetch`, URLs remotas, timers, CSS animation, GSAP autónomo, `useFrame`, Lottie con
expresiones, perfil ANGLE ausente y solicitud de producción. Remotion permanece
`local_evaluation_only` hasta resolver el veredicto de licencia productiva.

## Verificación

Ejecutar:

```bash
node skills/motion-library-adapters/scripts/check-skill.mjs
pnpm exec vitest run tests/unit/remotion/motion-adapters.test.ts
pnpm typecheck
```

Conservar VS-001, `pilot-carousel-001`, H-01, H-02, n8n y `Root.tsx` byte-idénticos.

## Referencias

- `references/media-use-adapter.md` — cómo los adapters resuelven y reproducen media (audio, video, imagen, Lottie, Three) bajo el reloj de frames de Remotion, determinista y offline-first. Adaptado del patrón `media-use` de HyperFrames (resolve / generate / operate / remember). Remote opt-in auth-gated, fail-closed sin credenciales; registro hash-bound; sin red en el render path.
