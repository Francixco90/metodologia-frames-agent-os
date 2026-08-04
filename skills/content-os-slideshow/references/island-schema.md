# JSON Island Schema — Content OS Slideshow

The JSON island is the single source of truth for slide order, notes,
fragments, hotspots, and branches. Declared as one script block near the top of
`<body>`, before scene divs.

```html
<script type="application/hyperframes-slideshow+json">
  { "slides": [...], "slideSequences": [...] }
</script>
```

## SlideshowManifest

| Field            | Type              | Notes                                          |
| ---------------- | ----------------- | ---------------------------------------------- |
| `slides`         | `SlideRef[]`      | Main line, in order. Excludes branch slides.   |
| `slideSequences` | `SlideSequence[]` | Off-line branch sequences (hotspot-reachable). |

## SlideRef

| Field                                | Type             | Notes                                                           |
| ------------------------------------ | ---------------- | --------------------------------------------------------------- |
| `sceneId`                            | `string`         | Must resolve a scene `data-composition-id`.                     |
| `notes`                              | `string`         | Presenter-only speaker notes.                                   |
| `fragments`                          | `number[]`       | Absolute composition-timeline hold-points within `[start,end]`. |
| `hotspots`                           | `SlideHotspot[]` | Click targets that push a branch sequence onto the nav stack.   |
| `ttsScript`/`ttsUrl`/`ttsDurationMs` | reserved         | Unused in Content OS (deck is unnarrated).                      |

## SlideHotspot

| Field    | Type        | Notes                                              |
| -------- | ----------- | -------------------------------------------------- |
| `id`     | `string`    |                                                    |
| `label`  | `string`    |                                                    |
| `target` | `string`    | Must reference a `slideSequence` id.               |
| `region` | `{x,y,w,h}` | Hotspot region (normalized or px per composition). |

## SlideSequence

| Field    | Type         | Notes                           |
| -------- | ------------ | ------------------------------- |
| `id`     | `string`     | Referenced by `hotspot.target`. |
| `label`  | `string`     |                                 |
| `slides` | `SlideRef[]` | Branch slides, in order.        |

## Slide writing rules (hard constraints)

- **Headline = complete-sentence claim, not a label.** "SMBs spend 14
  hours/week on manual scheduling" not "Scheduling problem".
- **One idea + one visual per slide.** Tempted to add a second bullet cluster
  or second chart → split the slide.
- **Lead with the punchline.** Strongest point first — in the slide and in the
  deck order.
- **Bottom-up market sizing.** Never "$50B TAM" without showing the math. Build
  from unit economics up.
- **Font ≥30pt equivalent.** At 1920×1080: headline 72-96px, body 48px, never
  below 40px for audience-readable text.

## Lint checks (Step 4 verify)

- Every `slide.sceneId` resolves a scene `data-composition-id`.
- Every `hotspot.target` references a `slideSequence` id.
- Fragment times within slide `[start, end]`.
- No two main-line slides overlap in time.
- Branch scene IDs not duplicated in main `slides[]`.
