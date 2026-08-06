// prepare-project/postproduction-ledger.ts — renders the 07 postproduction
// ledger markdown template. Byte-stable against the original template. [CÓDIGO]
import type {CampaignCopy, Timeline} from './validate-inputs.ts';

export const renderPostproductionLedger = (
  copy: CampaignCopy,
  timeline: Timeline,
): string => `# 07 Postproduction ledger

## Estado

- Artifact: \`${copy.workProductId}\`.
- Composition: \`MethodologiaVertical\`.
- Governed workflow state: \`BLOCKED_BEFORE_SOURCE_LOCK\`.
- Technical validation state: \`PREFLIGHT_VALIDATED\`.
- Visible state: \`${copy.requestedState}\`.
- Scope: \`${copy.scopeBadge}\`.
- Postproduction: not applied.

No operación de postproducción ha modificado todavía un render. La inspección de streams,
captions, safe-zone y determinismo debe actualizar este ledger sin sustituir claims, assets,
audio ni estados. [CONFIG]

## Operaciones

| ID | Tool | Input | Output | Cambio semántico | QA | Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| PP-000 | none | n/a | n/a | none | pending render | n/a |

## Gates pendientes

- Smoke, review A y review B.
- Receipt real de typecheck, lint, tests y determinismo antes de declarar build validado.
- Stills pre/durante/post de seis transiciones.
- ffprobe: video-only, 1080×1920, ${copy.profile.fps} fps, ${timeline.durationInFrames} frames.
- Digest de píxeles decodificados idéntico entre review A y B.
- Playback humano completo por verifier independiente.
- Render offline autoritativo en Linux con namespace de red; el guard de browser local es una
  segunda capa, no sustituye ese gate.
- Guardian y H01; no concedidos por este ledger.
`;