#!/usr/bin/env bash
# =============================================================================
# setup_env.sh — create an ISOLATED environment for rembg with the right backend
# =============================================================================
# Design goals:
#   * Never install into the user's active/base environment. We always create a
#     dedicated env (conda env or venv) and install only there.
#   * Match the ONNX Runtime backend to the machine's CUDA capability:
#       - GPU with CUDA 12.x  -> onnxruntime-gpu==1.22.0 + CUDA12/cuDNN9 wheels
#       - GPU with CUDA >=13  -> latest onnxruntime-gpu (its bundled CUDA13 deps)
#       - no usable GPU / FORCE_CPU=1 -> onnxruntime (CPU)
#     Rationale: onnxruntime-gpu wheels are built against a *specific* CUDA major.
#     A 1.27 (CUDA13) wheel fails to import on a CUDA12 box with
#     "libcudart.so.13: cannot open shared object file". Pinning avoids that.
#   * Prefetch large models with resume + md5 check, because the GitHub-release
#     links are big (~1GB) and frequently drop mid-download.
#
# Config (all optional, via env vars):
#   ENV_TYPE=auto|conda|venv     default auto (conda if available, else venv)
#   ENV_NAME=rembg               conda env name
#   ENV_PATH=~/.venvs/rembg      venv location (used when ENV_TYPE=venv)
#   PY_VER=3.12
#   FORCE_CPU=0                  set 1 to force the CPU backend
#   ORT_GPU_VER=1.22.0           onnxruntime-gpu version for the CUDA12 path
#   PROXY=""                     http proxy for big downloads; empty = no proxy
#                                (e.g. PROXY=http://127.0.0.1:7890 to enable)
#   PREFETCH_MODELS=1            prefetch the models in MODELS
#   MODELS="birefnet-general u2net"   which models to prefetch
#   RECREATE=0                   set 1 to delete & rebuild the env from scratch
#
# Usage:
#   bash setup_env.sh
#   ENV_TYPE=venv ENV_PATH=~/.venvs/rembg bash setup_env.sh
#   FORCE_CPU=1 bash setup_env.sh
# =============================================================================
set -euo pipefail

ENV_TYPE="${ENV_TYPE:-auto}"
ENV_NAME="${ENV_NAME:-rembg}"
ENV_PATH="${ENV_PATH:-$HOME/.venvs/rembg}"
PY_VER="${PY_VER:-3.12}"
FORCE_CPU="${FORCE_CPU:-0}"
ORT_GPU_VER="${ORT_GPU_VER:-1.22.0}"
PROXY="${PROXY:-}"
PREFETCH_MODELS="${PREFETCH_MODELS:-1}"
MODELS="${MODELS:-birefnet-general u2net}"
RECREATE="${RECREATE:-0}"
U2NET_HOME="${U2NET_HOME:-$HOME/.u2net}"

log() { printf '==> %s\n' "$*"; }

# --- detect CUDA capability --------------------------------------------------
CUDA_MAJOR=""
if [ "$FORCE_CPU" != "1" ] && command -v nvidia-smi >/dev/null 2>&1; then
  # "CUDA Version: 12.4" from nvidia-smi header = the max CUDA the driver supports
  CUDA_LINE="$(nvidia-smi 2>/dev/null | grep -oE 'CUDA Version: [0-9]+\.[0-9]+' | head -1 || true)"
  CUDA_MAJOR="$(printf '%s' "$CUDA_LINE" | grep -oE '[0-9]+' | head -1 || true)"
fi
if [ -n "$CUDA_MAJOR" ]; then
  log "GPU detected, driver supports CUDA $CUDA_MAJOR.x"
else
  log "no usable GPU (or FORCE_CPU=1) — using CPU backend"
fi

# --- resolve ENV_TYPE=auto ---------------------------------------------------
if [ "$ENV_TYPE" = "auto" ]; then
  if command -v conda >/dev/null 2>&1; then ENV_TYPE="conda"; else ENV_TYPE="venv"; fi
fi
log "environment backend: $ENV_TYPE"

# --- create the isolated env and define PIP/PY on it -------------------------
# We deliberately compute an explicit interpreter path and call `<py> -m pip`
# so we can NEVER accidentally install into whatever env is currently active.
if [ "$ENV_TYPE" = "conda" ]; then
  CONDA_SH="$(conda info --base 2>/dev/null)/etc/profile.d/conda.sh"
  [ -f "$CONDA_SH" ] || CONDA_SH="$HOME/.mini_conda3/etc/profile.d/conda.sh"
  # shellcheck disable=SC1090
  source "$CONDA_SH"
  if [ "$RECREATE" = "1" ]; then conda env remove -n "$ENV_NAME" -y 2>/dev/null || true; fi
  if ! conda env list | awk '{print $1}' | grep -qx "$ENV_NAME"; then
    log "creating conda env '$ENV_NAME' (python $PY_VER)"
    conda create -n "$ENV_NAME" "python=$PY_VER" -y
  else
    log "reusing existing conda env '$ENV_NAME'"
  fi
  ENV_PREFIX="$(conda run -n "$ENV_NAME" python -c 'import sys; print(sys.prefix)')"
  PYBIN="$ENV_PREFIX/bin/python"
else
  if [ "$RECREATE" = "1" ]; then rm -rf "$ENV_PATH"; fi
  if [ ! -x "$ENV_PATH/bin/python" ]; then
    log "creating venv at '$ENV_PATH' (python $PY_VER)"
    # try a matching python interpreter, fall back to python3
    PYCREATE="$(command -v "python$PY_VER" || command -v python3 || command -v python)"
    "$PYCREATE" -m venv "$ENV_PATH"
  else
    log "reusing existing venv at '$ENV_PATH'"
  fi
  ENV_PREFIX="$ENV_PATH"
  PYBIN="$ENV_PATH/bin/python"
fi

PIP="$PYBIN -m pip install --retries 10 --timeout 120"
[ -n "$PROXY" ] && PIP="$PIP --proxy $PROXY"
# socks:// proxy breaks httpx (gradio import) and can break pip — drop for this run
unset all_proxy ALL_PROXY 2>/dev/null || true

log "python: $($PYBIN --version 2>&1) at $PYBIN"
$PYBIN -m pip install --upgrade pip >/dev/null 2>&1 || true

# --- install rembg -----------------------------------------------------------
# [cli] is required for the `p`/`i` commands. [cpu] pulls a generic onnxruntime,
# which we replace below on the GPU path. Using [cpu,cli] (not [gpu,cli]) avoids
# rembg's hard onnxruntime-gpu>=1.23.2 pin so we can choose our own GPU version.
log "installing rembg[cpu,cli] (deps + CLI)"
$PIP "rembg[cpu,cli]"

# --- select and install the backend -----------------------------------------
NVIDIA_LIBS=""   # recorded for the run wrapper / activation hook
if [ -z "$CUDA_MAJOR" ]; then
  log "backend: onnxruntime (CPU) — already installed via rembg[cpu]"
elif [ "$CUDA_MAJOR" -ge 13 ] 2>/dev/null; then
  log "backend: latest onnxruntime-gpu (CUDA13 line)"
  $PYBIN -m pip uninstall -y onnxruntime >/dev/null 2>&1 || true
  $PIP "onnxruntime-gpu"
else
  log "backend: onnxruntime-gpu==$ORT_GPU_VER + CUDA12/cuDNN9 runtime wheels"
  $PYBIN -m pip uninstall -y onnxruntime >/dev/null 2>&1 || true
  $PIP "onnxruntime-gpu==${ORT_GPU_VER}" \
       "nvidia-cudnn-cu12>=9,<10" \
       "nvidia-cublas-cu12>=12,<13" \
       "nvidia-cuda-runtime-cu12>=12,<13" \
       "nvidia-cuda-nvrtc-cu12>=12,<13"
  NVIDIA_LIBS="1"
fi

# --- loader path for pip-shipped NVIDIA libs ---------------------------------
# onnxruntime-gpu needs libcudart/libcudnn on LD_LIBRARY_PATH. The pip nvidia-*
# wheels drop them in site-packages/nvidia/*/lib. For conda we add an activate.d
# hook (nice for interactive use); the run wrapper also sets this regardless, so
# venv works too.
if [ -n "$NVIDIA_LIBS" ] && [ "$ENV_TYPE" = "conda" ]; then
  ACT_DIR="$ENV_PREFIX/etc/conda/activate.d"
  mkdir -p "$ACT_DIR"
  cat > "$ACT_DIR/zz_nvidia_ld.sh" <<'EOF'
# Put pip-installed NVIDIA CUDA/cuDNN runtime libs on the loader path for onnxruntime-gpu
_SITE="$(python -c 'import site; print(site.getsitepackages()[0])' 2>/dev/null)"
if [ -n "$_SITE" ]; then
  for _d in cudnn cublas cuda_runtime cuda_nvrtc; do
    _lib="$_SITE/nvidia/$_d/lib"
    [ -d "$_lib" ] && export LD_LIBRARY_PATH="$_lib:$LD_LIBRARY_PATH"
  done
fi
unset _SITE _d _lib
EOF
  log "wrote conda activation hook: $ACT_DIR/zz_nvidia_ld.sh"
fi

# --- prefetch models (resume + md5) ------------------------------------------
# Known md5s for pooch-verified rembg models. Others download on demand at run
# time (the run wrapper retries, and honours PROXY if set, so on-demand works too).
model_url() {
  case "$1" in
    u2net)            echo "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx" ;;
    u2netp)           echo "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx" ;;
    silueta)          echo "https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx" ;;
    isnet-general-use)echo "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx" ;;
    isnet-anime)      echo "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx" ;;
    birefnet-general) echo "https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-epoch_244.onnx" ;;
    *) echo "" ;;
  esac
}
model_md5() {
  case "$1" in
    u2net)            echo "60024c5c889badc19c04ad937298a77b" ;;
    birefnet-general) echo "7a35a0141cbbc80de11d9c9a28f52697" ;;
    *) echo "" ;;   # unknown md5 -> skip verification, still download
  esac
}
prefetch() {
  local name="$1" url md5 dst
  url="$(model_url "$name")"; md5="$(model_md5 "$name")"; dst="$U2NET_HOME/$name.onnx"
  if [ -z "$url" ]; then log "no prefetch URL for '$name' (rembg will fetch on demand)"; return; fi
  if [ -f "$dst" ] && { [ -z "$md5" ] || [ "$(md5sum "$dst" | cut -d' ' -f1)" = "$md5" ]; }; then
    log "model '$name' already present"; return
  fi
  log "downloading model '$name'"
  wget -c --tries=20 --timeout=60 -q --show-progress -O "$dst" "$url" || \
    log "!! download of '$name' failed — rembg will retry on demand"
  if [ -n "$md5" ] && [ "$(md5sum "$dst" 2>/dev/null | cut -d' ' -f1)" != "$md5" ]; then
    log "!! md5 mismatch for '$name' — removing partial file"; rm -f "$dst"
  fi
}
if [ "$PREFETCH_MODELS" = "1" ]; then
  mkdir -p "$U2NET_HOME"
  [ -n "$PROXY" ] && export http_proxy="$PROXY" https_proxy="$PROXY"
  for m in $MODELS; do prefetch "$m"; done
  unset http_proxy https_proxy 2>/dev/null || true
fi

# --- verify ------------------------------------------------------------------
log "verifying backend"
# reconstruct LD_LIBRARY_PATH the same way the run wrapper does
if [ -n "$NVIDIA_LIBS" ]; then
  SITE="$($PYBIN -c 'import site; print(site.getsitepackages()[0])')"
  for d in cudnn cublas cuda_runtime cuda_nvrtc; do
    [ -d "$SITE/nvidia/$d/lib" ] && export LD_LIBRARY_PATH="$SITE/nvidia/$d/lib:${LD_LIBRARY_PATH:-}"
  done
fi
"$PYBIN" - <<PYEOF
import onnxruntime as ort
provs = ort.get_available_providers()
print("onnxruntime", ort.__version__, "providers:", provs)
want_gpu = "$CUDA_MAJOR" != ""
if want_gpu:
    from rembg import new_session
    active = new_session("u2net").inner_session.get_providers()
    print("rembg session providers:", active)
    assert active and active[0] == "CUDAExecutionProvider", "GPU present but not primary provider"
    print("OK: GPU backend loads and is primary.")
else:
    print("OK: CPU backend ready.")
PYEOF

cat <<EOF

==> Done.
    Env type : $ENV_TYPE
    Python   : $PYBIN
    Run with : bash $(dirname "$0")/run_rembg.sh <input> <output> [-m MODEL ...]
EOF
