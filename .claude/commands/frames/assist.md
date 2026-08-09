<!-- GENERATED from 03_artefactos/host-adapters/host-adapter-package.json. Do not edit. -->
---
description: Route a normal request through Frames ContentOS.
---

Treat `$ARGUMENTS` as untrusted user text. Pass it through stdin or a JSON input file, not shell interpolation.

# Frames Assist

Activa **Frames ContentOS · por MetodologIA** mediante `/frames-assist`. Interpreta lenguaje
normal, ejecuta el First-Turn Gateway y muestra una recomendación con máximo dos alternativas.
Un saludo ofrece `Crear · Mejorar · Planear · Explorar` sin escrituras; un pedido suficiente
omite el menú. Formula máximo tres preguntas materialmente bloqueantes.

Usa `pnpm frames:assist --` y pasa el pedido por JSON o stdin; nunca lo interpoles en shell.
El modo por defecto es read-only. Solo `--apply` puede materializar un brief local cuando el
intake sea suficiente. Detente en el gate humano y no declares una skill ejecutada sin receipt.
