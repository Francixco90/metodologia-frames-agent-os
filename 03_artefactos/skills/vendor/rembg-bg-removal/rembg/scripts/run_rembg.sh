#!/usr/bin/env bash
# =============================================================================
# run_rembg.sh — run rembg background removal in the isolated env
# =============================================================================
# Auto-detects single-file vs folder, wires up the GPU loader path, and works
# around two footguns we hit during setup:
#   * a socks:// all_proxy breaks gradio's httpx import (rembg loads all CLI
#     commands, including the gradio-based server, on startup) -> we unset it.
#   * models download from GitHub releases on first use -> if PROXY is set we
#     use it for on-demand fetches so they don't stall (empty by default).
#
# Config (env vars, mirror setup_env.sh):
#   ENV_TYPE=auto|conda|venv   ENV_NAME=rembg   ENV_PATH=~/.venvs/rembg
#   MODEL=birefnet-general     PROXY="" (empty=no proxy; set a URL to enable)
#
# Usage:
#   bash run_rembg.sh input.png                 # -> input_rembg.png (auto)
#   bash run_rembg.sh input.png output.png
#   bash run_rembg.sh ./in_dir                  # -> ./in_dir_rembg/ (auto)
#   bash run_rembg.sh ./in_dir ./out_dir -m isnet-anime -ppm
#   MODEL=u2net bash run_rembg.sh a.jpg
# If <output> is omitted it defaults to the input's name + "_rembg" (a file gets
# a .png sibling; a folder gets a "<name>_rembg" sibling dir). Any trailing args
# after the output are passed straight to rembg (e.g. -a -ppm -ae 5).
# =============================================================================
set -euo pipefail

ENV_TYPE="${ENV_TYPE:-auto}"
ENV_NAME="${ENV_NAME:-rembg}"
ENV_PATH="${ENV_PATH:-$HOME/.venvs/rembg}"
MODEL="${MODEL:-birefnet-general}"
PROXY="${PROXY:-}"

if [ "$#" -lt 1 ]; then
  echo "usage: run_rembg.sh <input> [output] [extra rembg flags]" >&2
  exit 2
fi
INPUT="$1"; shift

# Derive a default output next to the input when the 2nd arg is missing (or is
# actually a flag, e.g. `run_rembg.sh in.png -ppm`). This lets the agent run
# without inventing an output path.
if [ "$#" -eq 0 ] || [ "${1#-}" != "$1" ]; then
  if [ -d "$INPUT" ]; then
    OUTPUT="${INPUT%/}_rembg"
  else
    dir="$(dirname "$INPUT")"; base="$(basename "$INPUT")"
    OUTPUT="$dir/${base%.*}_rembg.png"
  fi
else
  OUTPUT="$1"; shift
fi
EXTRA=("$@")

# --- resolve the env's python -----------------------------------------------
if [ "$ENV_TYPE" = "auto" ]; then
  if command -v conda >/dev/null 2>&1; then ENV_TYPE="conda"; else ENV_TYPE="venv"; fi
fi
if [ "$ENV_TYPE" = "conda" ]; then
  CONDA_SH="$(conda info --base 2>/dev/null)/etc/profile.d/conda.sh"
  [ -f "$CONDA_SH" ] || CONDA_SH="$HOME/.mini_conda3/etc/profile.d/conda.sh"
  # shellcheck disable=SC1090
  source "$CONDA_SH"
  ENV_PREFIX="$(conda run -n "$ENV_NAME" python -c 'import sys; print(sys.prefix)')"
  PYBIN="$ENV_PREFIX/bin/python"
else
  PYBIN="$ENV_PATH/bin/python"
fi
[ -x "$PYBIN" ] || { echo "env not found ($PYBIN). Run setup_env.sh first." >&2; exit 1; }
REMBG_BIN="$(dirname "$PYBIN")/rembg"
[ -x "$REMBG_BIN" ] || { echo "rembg CLI not found ($REMBG_BIN). Reinstall with rembg[cli]." >&2; exit 1; }

# --- environment hygiene + GPU loader path -----------------------------------
unset all_proxy ALL_PROXY 2>/dev/null || true
[ -n "$PROXY" ] && export https_proxy="$PROXY" http_proxy="$PROXY"
SITE="$("$PYBIN" -c 'import site; print(site.getsitepackages()[0])')"
for d in cudnn cublas cuda_runtime cuda_nvrtc; do
  [ -d "$SITE/nvidia/$d/lib" ] && export LD_LIBRARY_PATH="$SITE/nvidia/$d/lib:${LD_LIBRARY_PATH:-}"
done

# --- single file (i) vs folder (p) -------------------------------------------
if [ -d "$INPUT" ]; then CMD="p"; mkdir -p "$OUTPUT"; else CMD="i"; fi

echo "==> rembg $CMD -m $MODEL ${EXTRA[*]:-} $INPUT -> $OUTPUT"
exec "$REMBG_BIN" "$CMD" -m "$MODEL" "${EXTRA[@]}" "$INPUT" "$OUTPUT"
