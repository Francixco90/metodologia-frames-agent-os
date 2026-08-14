# Guía rápida: Video OS

Entrega un pedido normal y referencias fuente autorizadas. Video OS devuelve un plan compacto,
la dirección propuesta y la siguiente decisión. [DOC]

Ejemplo de entrada:

```json
{
  "request": "Crea un caso largo horizontal y luego un reel",
  "sourceRefs": ["sources/session-a.mp4"],
  "sourceAuthority": "verified",
  "rights": "cleared"
}
```

Comandos locales:

```bash
node --import tsx 02_proceso/workflows/video-os/_runner/video-os.ts plan request.json > plan.json
node --import tsx 02_proceso/workflows/video-os/_runner/video-os.ts check state.json
node --import tsx 02_proceso/workflows/video-os/_runner/video-os.ts capsule state.json
```

La respuesta `NEEDS_INPUT` contiene como máximo tres preguntas. `ROUTED` entrega las cinco etapas,
cuatro checkpoints predeterminados y artefactos estándar. El render principal debe verificar
`PASS` antes de solicitar un derivado. [CONFIG]
