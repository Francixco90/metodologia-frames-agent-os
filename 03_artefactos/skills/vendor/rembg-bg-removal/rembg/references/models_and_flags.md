# rembg models & quality flags

Reference for picking a model and tuning edge quality. Read this when the user
asks about output quality, hair/edge artifacts, anime images, portraits, or
which model to use.

## Choosing a model (`-m`)

| Model | Best for | Notes |
|-------|----------|-------|
| `birefnet-general` | **Default recommendation** — general objects, icons, products | Best edges; large (~928MB), slower |
| `birefnet-general-lite` | General, faster/smaller | Good quality/speed balance |
| `birefnet-portrait` | Human portraits | Tuned for people |
| `isnet-general-use` | General, newer than u2net | Fast, solid default if birefnet too heavy |
| `isnet-anime` | Anime / cartoon / illustration | Use for line-art & flat-color characters |
| `u2net` | General (older baseline) | rembg's default; weakest edges |
| `u2netp` | Lightweight u2net | Tiny, lower quality |
| `u2net_human_seg` | Human segmentation | People-only |
| `u2net_cloth_seg` | Clothing parsing | Upper/lower/full body |
| `silueta` | Same as u2net, 43MB | Small footprint |
| `sam` | Prompt-based (points/boxes) | Needs `-x` prompt JSON |
| `bria-rmbg` | SOTA general (BRIA AI) | Check license for commercial use |

Rule of thumb: start with **`birefnet-general`**. For anime, use **`isnet-anime`**.
For people, **`birefnet-portrait`**. If speed matters more than edges, **`isnet-general-use`**.

## Quality flags

Order of things to try, cheapest first:

1. `-ppm` / `--post-process-mask` — cleans specks/holes in the mask. Low cost,
   almost always worth enabling first.
2. Switch to a stronger model (see table) — usually the biggest single win.
3. `-a` / `--alpha-matting` — refines soft/semi-transparent edges (hair, fuzz,
   thin outlines). Noticeably slower; only add if edges still look hard/jagged.

Alpha-matting sub-parameters (only meaningful with `-a`):

- `-af N` foreground threshold (default 240). Foreground getting eaten away →
  lower it (e.g. 220).
- `-ab N` background threshold (default 10). Background residue left behind →
  raise it (e.g. 20).
- `-ae N` erode size (default 10). Halo/fringe of old background around the
  subject → lower it (e.g. 3–5). Too much subject removed → raise it.

Other useful flags:

- `-om` / `--only-mask` — output just the alpha mask (grayscale), not the cutout.
- `-bgc R G B A` — replace the removed background with a solid color instead of
  transparency, e.g. `-bgc 255 255 255 255` for white.
- `-x '<json>'` — model extras. For SAM prompts:
  `-x '{"sam_prompt":[{"type":"point","data":[724,740],"label":1}]}'`

## Recommended starting commands

```bash
# best general quality
run_rembg.sh in_dir out_dir -m birefnet-general -ppm

# hair / soft edges
run_rembg.sh portrait.jpg portrait.png -m birefnet-portrait -a -ae 5

# anime character
run_rembg.sh char.png char_out.png -m isnet-anime -ppm

# white background instead of transparent
run_rembg.sh in.jpg out.png -m birefnet-general -bgc 255 255 255 255
```

## Model storage

Models live in `~/.u2net/<name>.onnx` (override with `U2NET_HOME`). They download
from GitHub releases on first use. The big ones (birefnet ~928MB) often drop
mid-download — `setup_env.sh` prefetches them with `wget -c` resume + md5 check.
Known-good md5s: `u2net` = `60024c5c889badc19c04ad937298a77b`,
`birefnet-general` = `7a35a0141cbbc80de11d9c9a28f52697`.
