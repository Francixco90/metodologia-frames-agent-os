# Media-use adapter — motion-library-adapters

How the GSAP, Three.js and Lottie adapters resolve and play media assets under
the Remotion frame clock, deterministically and offline-first. Adapted from the
HyperFrames `media-use` pattern (resolve / generate / operate / remember) to
the adapter context. See LINEAGE for provenance.

## Resolve (offline-first)

- **Default: local assets.** `staticFile("x.png")` → `public/` resolved at
  render time. Audio `staticFile("a.mp3")`, video `staticFile("v.mp4")`, Lottie
  `staticFile("anim.json")` — all local, all hash-bound.
- **Remote is opt-in, auth-gated.** A remote asset (CDN, signed URL) requires
  explicit per-project opt-in + credentials. No remote asset in the render path
  without auth. Fail-closed if credentials are missing.
- **Rights + provenance.** No promotion without hashes, provenance, rights and
  authority verified (AGENTS.md). An adapter does not promote a source it
  cannot verify.

## Operate (deterministic, frame-driven)

Every media element is a pure function of `frame` — no running clock, no
side-effect, no network at render time.

| Media                          | Adapter rule                                                                                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<Audio>`                      | `<Audio src={staticFile("a.mp3")} />` — Remotion seeks the audio to `frame/fps` deterministically. Volume via `volume={interpolate(frame, ...)}`. No `play()` call.                                                     |
| `<Video>` / `<OffthreadVideo>` | `<Video src={staticFile("v.mp4")} />` — frame-driven seek. `playbackRate`, `startFrom`, `endAt` are scalar props, not runtime state.                                                                                    |
| `<Img>`                        | `<Img src={staticFile("x.png")} />` — static. Use `delayRender()`/`continueRender()` only if the image needs async prep (rare; prefer a prepped local asset).                                                           |
| Lottie                         | `lottie.loadAnimation({container, animationData: staticFile("anim.json"), autoplay: false})` — then `anim.goToAndStop(frame/fps * fps_lottie, true)`. Never `play()`. Register on a seek registry; `kill()` on unmount. |
| Three/R3F                      | Geometry, camera, lights, seed first-party-fixed. Animate via `useCurrentFrame()` derivations in the render loop. No `requestAnimationFrame`, no `Date.now()`, no `Math.random()`.                                      |

## Forbidden in the render path

`Date.now()`, `Math.random()`, `new Date()`, `performance.now()`, `fetch`,
`setTimeout`, `setInterval`, `getBoundingClientRect`, `repeat: -1`, CSS
`transition:` on animated elements. These break deterministic frame capture.

## Fallbacks

- Asset missing or hash mismatch → fail-closed. Do not substitute a polished
  inference; mark `coverage_gap` (AGENTS.md).
- Remote auth missing → fail-closed. Do not fall back to an unauthenticated
  fetch.
- Lottie animationData unresolvable → `kill()` and surface the gap; do not
  silently skip the frame.

## Remember (registry)

- Adapter media assets are registered (hash-bound) like any adapter. A media
  asset is not promoted to the registry without `raw_sha256`, provenance,
  rights and authority.
- The adapter does not own the media registry — `content-os-media` does (for
  the HTML+GSAP paradigm). In the Remotion paradigm, the adapter records media
  use in its spec (`MotionAdapterSpecV1`) for replay.

## Scope boundary

This reference covers media **use inside adapters** (resolve + deterministic
playback). Media **generation** (TTS, transcription, bg-removal) is
`content-os-media`'s domain, not the adapter's. The adapter consumes resolved
media; it does not generate it.
