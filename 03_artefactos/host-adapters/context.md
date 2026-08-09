<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-HOST-ADAPTERS
-->

# Contexto: 03_artefactos/host-adapters

## 1. Propósito y activación

Proyectar Frames Assist hacia un host declarado o verificar su capacidad material.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/host-adapters/host-adapter-package.json`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/host-adapters/host-adapter-package.json`

Solo bajo demanda:

- `03_artefactos/host-adapters/generate-host-adapters.ts`
- `05_verificacion/scripts/install-host-adapter.ts`

Diferir:

- `Hosts no seleccionados`
- `Configuración global`
- `hooks`
- `red y conectores`

## 4. Routing, workflow y skills

Rutas: `R0`, `R4`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `frames:assist`, `adapter_probe`, `installer_dry_run`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/host-adapters/host-adapter-package.json`

Write set:

- `03_artefactos/host-adapters/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `host_manifest`, `launch_probe`, `semantic_fallback`  
Stop rules: Sin probe material la capacidad queda UNKNOWN · Apply exige opt-in y backup

Hijos:

- Ninguno; devolver handoff al contexto padre.
