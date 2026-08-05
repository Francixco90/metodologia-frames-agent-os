---
name: rembg-bg-removal
description: >-
  Remove image backgrounds with rembg, producing transparent-PNG cutouts. Use
  this whenever the user wants to remove/erase/delete a background, cut out or
  isolate a subject, make a transparent PNG, extract a foreground object, or
  batch-process a folder of images into cutouts — including phrasings like
  "抠图", "去背景", "remove background", "cut out this object", "make this
  transparent", "isolate the product", or when they hit rembg errors (missing
  onnxruntime backend, CUDA/libcudart version mismatch, gradio proxy crash). It
  sets up an ISOLATED conda/venv environment (never touching existing envs),
  installs the correct GPU (CUDA 12) or CPU backend for the machine, prefetches
  models, and runs single-image or whole-folder background removal.
---

# rembg background removal

Removes image backgrounds using [rembg](https://github.com/danielgatis/rembg).
The hard part isn't the removal itself — it's getting a working, isolated
environment with a GPU backend that matches the machine's CUDA version. This
skill bundles that setup so it's a one-time script, then a thin run wrapper.

## Workflow

1. **Ensure the environment exists.** Check for it before running anything:

   ```bash
   # conda (default when conda is present):
   conda env list | grep -q '\brembg\b' && echo EXISTS
   # venv fallback:
   test -x ~/.venvs/rembg/bin/rembg && echo EXISTS
   ```

   If it doesn't exist, run the setup script (see below). If it exists, skip
   straight to running.

2. **Run background removal** via the wrapper (auto-detects file vs folder):

   ```bash
   bash <skill>/scripts/run_rembg.sh <input> <output> [-m MODEL] [flags]
   ```

3. **Report** where the outputs went and which model was used. If the user
   cares about quality, point them at the tuning options.

## Setup (first time only)

Run the bundled installer. It creates a **dedicated** environment and installs
only there — it never modifies the user's active or base environment.

```bash
bash <skill>/scripts/setup_env.sh
```

What it does, and why:

- **Isolation.** Creates a dedicated conda env named `rembg` (or a venv at
  `~/.venvs/rembg` if conda isn't available). It computes an explicit
  interpreter path and installs with `<that-python> -m pip`, so nothing lands in
  whatever env happens to be active.
- **Backend matched to CUDA.** Reads the driver's CUDA version from
  `nvidia-smi`. For CUDA 12.x it installs `onnxruntime-gpu==1.22.0` plus the
  matching `nvidia-cudnn-cu12` / `cublas` / `cuda-runtime` wheels. This matters:
  the latest `onnxruntime-gpu` (1.23+) is built for **CUDA 13** and fails to
  import on a CUDA-12 box with `libcudart.so.13: cannot open shared object
  file`. For CUDA ≥13 it uses the latest GPU build; with no GPU it uses the CPU
  build.
- **Loader path.** onnxruntime-gpu needs the pip NVIDIA libs on
  `LD_LIBRARY_PATH`. The installer adds a conda `activate.d` hook, and the run
  wrapper sets it too (so venv works), so the user never has to export anything.
- **Model prefetch.** Downloads `birefnet-general` (~928MB) and `u2net` with
  `wget -c` resume + md5 verification, because the GitHub-release links routinely
  drop mid-download.

Useful overrides (env vars): `ENV_TYPE=venv`, `ENV_PATH=~/.venvs/rembg`,
`FORCE_CPU=1`, `PROXY=http://127.0.0.1:7890` (route downloads through a proxy;
empty by default), `RECREATE=1`
(rebuild from scratch), `MODELS="birefnet-general isnet-anime"`.

## Running

The wrapper handles single files and folders identically — pass a file to get a
file, a directory to get a directory of cutouts. The output path is **optional**:
omit it and the wrapper writes next to the input with a `_rembg` suffix
(`photo.jpg` → `photo_rembg.png`, `icons/` → `icons_rembg/`), so you don't have
to invent one.

```bash
# single image, auto output -> photo_rembg.png
bash <skill>/scripts/run_rembg.sh photo.jpg

# explicit output
bash <skill>/scripts/run_rembg.sh photo.jpg photo_cutout.png

# whole folder, auto output -> icons_rembg/
bash <skill>/scripts/run_rembg.sh ./icons -m birefnet-general -ppm

# pick a model / pass rembg flags (flags may follow the input directly)
MODEL=isnet-anime bash <skill>/scripts/run_rembg.sh char.png -ppm
```

The wrapper unsets any `socks://` proxy first (it crashes rembg's gradio import).
It uses no proxy by default; set `PROXY` to route on-demand model downloads
through an http proxy.

## Choosing a model & tuning quality

Default is `birefnet-general` (best general edges). If the user is unhappy with
edges, mentions hair/soft edges, anime, or portraits, or wants a solid-color
background, read `references/models_and_flags.md` for the full model table and
the flag-tuning order (start with `-ppm`, then a stronger model, then `-a` alpha
matting with `-ae` erode tuning).

## Troubleshooting

- `No onnxruntime backend found` — the GPU wheel failed to import (usually a
  CUDA-major mismatch). Re-run `setup_env.sh`; it picks the matching backend.
- `libcudart.so.13: cannot open shared object file` — onnxruntime-gpu is built
  for CUDA 13 but the box has CUDA 12. This is exactly what the version pin in
  `setup_env.sh` fixes.
- `Unknown scheme for proxy URL 'socks://...'` — a `socks://` `all_proxy` breaks
  gradio/httpx. The run wrapper unsets it; if running rembg by hand, do
  `unset all_proxy ALL_PROXY` first.
- `The CLI dependencies are not installed` — rembg was installed without the
  `[cli]` extra. `setup_env.sh` installs `rembg[cpu,cli]`; re-run it.
- Model download stalls / SSL EOF — set a working `PROXY`, or pre-download with
  `wget -c` into `~/.u2net/<name>.onnx` (the installer does this).
