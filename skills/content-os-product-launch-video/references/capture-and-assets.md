# Capture and Assets — Product Launch Video

Reference for Step 1 (capture) and asset handling. The orchestrator loads this
on-demand during Step 1 and Step 3 (storyboard `asset_candidates`).

## Capture paths (Step 1)

Three input classes — pick by what the user gave:

| Input class         | source_type        | capture | tokens    | visible-text   | asset-descriptions |
| ------------------- | ------------------ | ------- | --------- | -------------- | ------------------ |
| Explicit URL        | `url`              | true    | from site | from site text | from site assets   |
| Pasted script/brief | `script` / `brief` | false   | empty     | = script/brief | none               |
| Brand name only     | `url` (resolved)   | true    | from site | from site text | from site assets   |

- **Explicit URL** → Playwright capture. Inspect result immediately. Non-zero
  exit, `ok: false`, or `capture/BLOCKED.md` → **hard stop**. Report reason, do
  NOT consume partial screenshots/DOM/assets, do NOT fabricate a synthetic
  no-capture fallback.
- **Brand name only** → one-line WebSearch to confirm canonical URL, then crawl
  as explicit URL. If WebSearch ambiguous, ask user (do not guess domain).
- **Pasted script/brief** → no-capture path. Save as `user_script.txt`.
  `tokens.json` = `{}`. `visible-text.txt` = the script/brief verbatim.
  `asset-descriptions.md` = `none` (no captured assets). Design runs on preset
  palette alone.

## Capture output (URL path)

```
capture/
  BLOCKED.md            # only if hard-stop; absent = ok
  capture.json          # {ok, url, screenshots[], assets[], ...}
  extracted/
    tokens.json         # brand colors (hex) + fonts (family stack)
    visible-text.txt    # visible site text (headings, CTAs, body)
    asset-descriptions.md  # canonical asset inventory (described)
  assets/               # downloaded images/svgs (offline-cached)
  screenshots/          # viewport + full-page.png
```

- `tokens.json` keys: `colors: {primary, secondary, accent, surface, text}`,
  `fonts: {heading, body}`. Empty `{}` on no-capture path.
- `asset-descriptions.md` is the canonical inventory. Storyboard
  `asset_candidates` reference entries from here, NOT raw `capture/assets/`
  paths. Each entry: `{id, kind: screenshot|image|svg, source, description}`.
- Vision captioning optional (DOM context fallback when no vision key).

## Hard-stop discipline (capture/BLOCKED.md)

If capture fails (network, paywall, bot-block, JS-heavy timeout, non-200):

1. Write `capture/BLOCKED.md` with reason + raw error.
2. Set `capture_blocked: true` in `workflow-state.yml`.
3. STOP Step 1. Report to user. Do NOT advance to Step 2.
4. Do NOT consume partial screenshots or DOM fragments.
5. Do NOT fabricate a synthetic no-capture fallback (e.g. "imagine the site
   looks like..."). That is a `capture-blocked` violation.

Options after hard-stop: user provides a pasted script/brief (pivot to
no-capture path), or user provides alt URL, or user confirms proceed with
brand-name-only design (no capture, preset palette).

## Site tour / showcase brief

For "site tour" or "show it as-is" briefs: captured screenshots are the visual
source of truth.

- Do NOT rebuild the full website in HTML (that is `footage-in-launch`-adjacent
  fabrication; use real screenshots instead).
- Overlay real assets (logos, product UI shots) on preset frames, or animate a
  viewport rectangle panning over `full-page.png` to simulate a scroll tour.
- `asset_candidates` from `asset-descriptions.md` (real screenshots), tagged
  `kind: screenshot`.

## Footage boundary

Captured screenshots and downloaded images are **assets**, not footage.
Footage = real video footage (live-action clips). This workflow forbids footage
(captured stills only). Do not stage video clips as "assets."
