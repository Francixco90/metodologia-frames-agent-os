import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {format, resolveConfig} from 'prettier';
import YAML from 'yaml';

import {
  beatMapDocumentSchema,
  videoSpecDocumentSchema,
} from '../../networks/content/src/document-contracts.ts';
import {
  campaignCopySchema,
  canonicalCommitteeElementSignatures,
  canonicalIncorporatedElements,
} from '../../networks/content/src/model.ts';
import {deriveTimeline} from '../../networks/content/src/timing.ts';

const root = process.cwd();
const prettierConfig = (await resolveConfig(resolve(root, '.prettierrc.json'))) ?? {};
const projectRoot = resolve(root, 'projects/vs-001-source-to-campaign');
const contentRoot = resolve(projectRoot, 'content');
const motionRoot = resolve(projectRoot, 'remotion');
const copyPath = resolve(contentRoot, 'campaign-copy.json');
const sourceRegistryPath = resolve(root, 'registries/sources/source-registry.yml');
const claimRegistryPath = resolve(root, 'registries/claims/claim-registry.yml');
const sourceBundlePath = resolve(projectRoot, 'source-bundle.yml');
const committeeDecisionPath = resolve(motionRoot, 'committee/committee-decision.json');

const sha256 = (content: Uint8Array | string): string =>
  createHash('sha256').update(content).digest('hex');

const readText = (path: string): string => readFileSync(path, 'utf8');
const rawCopy = readText(copyPath);
const rawSourceRegistry = readText(sourceRegistryPath);
const rawClaimRegistry = readText(claimRegistryPath);
const rawSourceBundle = readText(sourceBundlePath);
const rawCommitteeDecision = readText(committeeDecisionPath);
const copy = campaignCopySchema.parse(JSON.parse(rawCopy));
const sourceRegistry = YAML.parse(rawSourceRegistry) as {
  entries: Array<{
    source_id: string;
    snapshot_id?: string;
    current_state: string;
    hashes: {normalized_sha256: string | null};
    rights: {allowed_use_scope?: string};
  }>;
};
const claimRegistry = YAML.parse(rawClaimRegistry) as {
  claims: Array<{
    claim_id: string;
    state: string;
    source_snapshot_id: string;
    source_normalized_sha256: string;
    allowed_use_scope: string;
  }>;
};
const sourceBundle = YAML.parse(rawSourceBundle) as {
  source_snapshot_id: string;
  source_locked: boolean;
  expected_canonical_sources: {expected_count: number; confirmed_count: number};
};
const committeeDecision = JSON.parse(rawCommitteeDecision) as {
  synthesis: {
    selectedProposalId: string;
    incorporatedElements: Array<{element: string; sourceProposalId: string}>;
    requestedChanges: string[];
  };
};
const committeeElementSignatures = committeeDecision.synthesis.incorporatedElements.map(
  ({element, sourceProposalId}) => [sourceProposalId, element],
);

const source = sourceRegistry.entries.find(
  ({source_id}) => source_id === copy.sourceSnapshot.sourceId,
);
if (
  source?.current_state !== 'active' ||
  source.snapshot_id !== copy.sourceSnapshot.sourceSnapshotId ||
  source.hashes.normalized_sha256 !== copy.sourceSnapshot.normalizedSha256 ||
  source.rights.allowed_use_scope !== copy.sourceSnapshot.allowedUseScope
) {
  throw new Error('Content source does not resolve to the active hash-bound local fixture.');
}

const allowedClaimIds = new Set(copy.beats.flatMap(({claimIds}) => claimIds));
for (const claimId of allowedClaimIds) {
  const claim = claimRegistry.claims.find(({claim_id}) => claim_id === claimId);
  if (
    claim?.state !== 'active' ||
    claim.source_snapshot_id !== copy.sourceSnapshot.sourceSnapshotId ||
    claim.source_normalized_sha256 !== copy.sourceSnapshot.normalizedSha256 ||
    claim.allowed_use_scope !== copy.sourceSnapshot.allowedUseScope
  ) {
    throw new Error(`Claim ${claimId} is not active for the selected snapshot and scope.`);
  }
}

if (
  committeeDecision.synthesis.selectedProposalId !== copy.creativeDirection.proposalId ||
  JSON.stringify(copy.creativeDirection.incorporatedElements) !==
    JSON.stringify(canonicalIncorporatedElements) ||
  JSON.stringify(committeeElementSignatures) !== JSON.stringify(canonicalCommitteeElementSignatures)
) {
  throw new Error(
    'Content does not implement the exact canonical committee decision and ordered elements.',
  );
}
if (
  sourceBundle.source_snapshot_id !== copy.sourceSnapshot.sourceSnapshotId ||
  sourceBundle.source_locked ||
  sourceBundle.expected_canonical_sources.confirmed_count !== 0 ||
  sourceBundle.expected_canonical_sources.expected_count !== 4
) {
  throw new Error('Source bundle must remain unlocked with the canonical 0/4 coverage gap.');
}

const timeline = deriveTimeline(copy);
if (timeline.durationInFrames === copy.profile.fps * 36) {
  throw new Error(
    'Duration must emerge from captions and playback policy, not a 36-second default.',
  );
}

const sourceScript = `# 00 Source script — Cadena visible

## Estado y alcance

- Work product: \`${copy.workProductId}\`.
- Dirección: \`${copy.creativeDirection.proposalId}\` — ${copy.creativeDirection.title}.
- Fuente: \`${copy.sourceSnapshot.sourceId}\` / \`${copy.sourceSnapshot.sourceSnapshotId}\`.
- Hash normalizado: \`${copy.sourceSnapshot.normalizedSha256}\`.
- Uso permitido: \`${copy.sourceSnapshot.allowedUseScope}\`.
- Estado máximo solicitado: \`${copy.requestedState}\`.
- Badge persistente: \`${copy.scopeBadge}\`.
- Audio: \`${copy.audio.mode}\`; cero streams porque falta un rights receipt de audio.
- [CONFIG] El corpus canónico permanece en \`0/4\`; se comunica como \`coverage_gap\`, nunca como KPI.

## Tesis

Crear no es improvisar. Es hacer visible una cadena: fuente → decisión → producto → gate.
[INFERENCIA] Esta formulación editorial traduce los tres claims utilizables sin añadir un claim de
desempeño.

## Guion y timing derivado

| Beat | Pregunta / breadcrumb | Copy en pantalla | Caption | Evidencia | Rango |
| --- | --- | --- | --- | --- | --- |
${timeline.beats
  .map(
    (beat) =>
      `| \`${beat.beatId}\` | ${beat.question} | **${beat.headline}** ${beat.body} | ${beat.caption.text} | ${[...beat.claimIds, ...beat.configRefs].map((id) => `\`${id}\``).join(' · ')} | \`[${beat.fromFrame}, ${beat.toFrame})\` |`,
  )
  .join('\n')}

Duración derivada: **${timeline.durationInFrames} frames / ${timeline.durationSeconds} s a ${timeline.fps} fps**.
[CÓDIGO] Cada hold se calcula desde palabras del caption, ${copy.timingPolicy.wordsPerMinute} WPM,
margen de playback ${copy.timingPolicy.playbackMargin}, lead/trail y la ventana de transición. No
se adopta un default de 36 segundos.

## Elementos incorporados de la síntesis

1. Tres preguntas como headers y breadcrumb.
2. Estado por texto, forma y patrón; variante reduced-motion y rights-first.
3. Semántica \`0/4\`, claim IDs y hash como custodia secundaria legible.
4. Señal persistente con bifurcación Web/Motion desde el mismo expediente.

## Mensajes prohibidos

${copy.messagesForbidden.map((message) => `- ${message}`).join('\n')}
`;

const videoSpec = videoSpecDocumentSchema.parse({
  schema_version: 1,
  spec_version: '1.0.0',
  spec_id: 'VIDEO-SPEC-VS001-001',
  content_id: copy.workProductId,
  project_id: copy.projectId,
  objective: copy.videoContract.objective,
  audience: copy.videoContract.audience,
  narrative_thesis: copy.videoContract.narrativeThesis,
  format: copy.videoContract.format,
  platform: copy.videoContract.platform,
  script_ref: 'projects/vs-001-source-to-campaign/remotion/00-source-script.md',
  duration: {
    target_frames: timeline.durationInFrames,
    target_seconds: timeline.durationSeconds,
    provenance: 'caption words + reading WPM + playback margin + lead/trail - transition overlaps',
  },
  resolution_profile: {
    width: copy.profile.width,
    height: copy.profile.height,
    fps: copy.profile.fps,
    codec: copy.profile.codec,
    pixel_format: copy.profile.pixelFormat,
    safe_zones_px: {
      top: copy.profile.safeZonePx,
      right: copy.profile.safeZonePx,
      bottom: copy.profile.safeZonePx,
      left: copy.profile.safeZonePx,
    },
    provenance: 'project profile; not a universal default',
    universal_default: false,
  },
  central_metaphor: copy.videoContract.centralMetaphor,
  emotional_visual_arc: copy.videoContract.emotionalVisualArc,
  design_system_ref: copy.videoContract.designSystemRef,
  component_registry_ref: copy.videoContract.componentRegistryRef,
  accessibility: {
    reduced_motion: true,
    state_redundancy: 'text + shape + pattern',
    safe_zone_runtime_guard: true,
    contrast_target: 'WCAG AA or stronger for material text',
  },
  captions: {
    ref: 'projects/vs-001-source-to-campaign/remotion/captions.json',
    mode: 'open captions',
    overlap_allowed: false,
    maximum_effective_wpm: Number(
      (copy.timingPolicy.wordsPerMinute / copy.timingPolicy.playbackMargin).toFixed(2),
    ),
  },
  sources: [
    {
      source_id: copy.sourceSnapshot.sourceId,
      snapshot_id: copy.sourceSnapshot.sourceSnapshotId,
      normalized_sha256: copy.sourceSnapshot.normalizedSha256,
      allowed_use_scope: copy.sourceSnapshot.allowedUseScope,
    },
  ],
  claims: [...allowedClaimIds]
    .sort()
    .map((claimId) => ({claim_id: claimId, source_id: copy.sourceSnapshot.sourceId})),
  rights: {
    procedural_code: 'locally_authored_first_party_code',
    fonts: 'bundled OFL-1.1 with license files',
    audio: 'absent_no_rights_receipt',
    external_distribution_authorized: false,
  },
  assets: {
    manifest_ref: 'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml',
    remote_assets_allowed: false,
    expected_binary_assets: 4,
    expected_audio_assets: 0,
  },
  props: {
    ref: 'projects/vs-001-source-to-campaign/remotion/05-input-props.json',
    schema_ref: 'renderers/remotion/src/schema.ts',
    strict: true,
  },
  risks: [
    'Canonical corpus remains 0/4 and source lock is unavailable.',
    'Remotion commercial or productive license eligibility is unresolved.',
    'Authoritative Linux network-namespace render is pending.',
    'Upstream release or commit for the vendored font binaries is unresolved.',
    'Guardian and complete human playback approval are absent.',
  ],
  human_approval_required: copy.videoContract.humanApprovalRequired,
  source_snapshot_id: copy.sourceSnapshot.sourceSnapshotId,
  allowed_claim_ids: [...allowedClaimIds].sort(),
  requested_state: copy.requestedState,
  governed_workflow_state: 'BLOCKED_BEFORE_SOURCE_LOCK',
  coverage_gaps: [
    'four_canonical_texts_missing_0_of_4',
    'audio_rights_receipt_absent_silent_first',
    'cross_host_chromium_pixel_equivalence_unverified',
    'font_binary_origin_version_unresolved',
    'authoritative_linux_network_namespace_offline_render_unexecuted',
    'remotion_commercial_license_eligibility_unresolved',
    'guardian_and_human_approval_absent',
    'external_distribution_not_authorized',
  ],
});

const beatMap = beatMapDocumentSchema.parse({
  schema_version: 1,
  beat_map_id: 'BEAT-MAP-VS001-001',
  work_product_id: copy.workProductId,
  governed_workflow_state: 'BLOCKED_BEFORE_SOURCE_LOCK',
  creative_direction: copy.creativeDirection,
  source_snapshot_id: copy.sourceSnapshot.sourceSnapshotId,
  source_normalized_sha256: copy.sourceSnapshot.normalizedSha256,
  timing: {
    fps: timeline.fps,
    duration_in_frames: timeline.durationInFrames,
    duration_seconds: timeline.durationSeconds,
    range_contract: '[from_frame, to_frame)',
    derivation: {
      words_per_minute: copy.timingPolicy.wordsPerMinute,
      playback_margin: copy.timingPolicy.playbackMargin,
      caption_lead_frames: copy.timingPolicy.captionLeadFrames,
      caption_trail_frames: copy.timingPolicy.captionTrailFrames,
      transition_frames: copy.timingPolicy.transitionFrames,
      fixed_36_second_default: false,
    },
  },
  audio: copy.audio,
  beats: timeline.beats.map((beat) => ({
    beat_id: beat.beatId,
    purpose: `${beat.question} — ${beat.eyebrow}`,
    duration_frames: beat.durationFrames,
    narration: beat.caption.text,
    visible_copy: {
      eyebrow: beat.eyebrow,
      headline: beat.headline,
      body: beat.body,
    },
    visual_action: beat.visualAction,
    components: beat.components,
    claim_ids: beat.claimIds,
    data: [copy.sourceSnapshot.sourceSnapshotId, ...beat.claimIds, ...beat.configRefs],
    audio: 'none',
    mood: beat.mood,
    transition: {
      kind: beat.transition.kind,
      incoming_frames: beat.incomingTransitionFrames,
      outgoing_frames: beat.outgoingTransitionFrames,
      reduced_motion: beat.transition.reducedMotion,
    },
    accessibility: beat.accessibility,
    acceptance: [
      'Persistent badges remain visible.',
      `Material text stays inside the ${copy.profile.safeZonePx}px safe zone.`,
      'Claim and config references resolve.',
      'Caption does not overlap a transition.',
      'Runtime LayoutGuard reports no overflow.',
    ],
    config_refs: beat.configRefs,
    from_frame: beat.fromFrame,
    to_frame: beat.toFrame,
    layout: beat.layout,
    caption_id: beat.caption.captionId,
  })),
  transitions: timeline.transitions.map((transition) => ({
    transition_id: transition.transitionId,
    from_beat_id: transition.fromBeatId,
    to_beat_id: transition.toBeatId,
    from_frame: transition.fromFrame,
    to_frame_exclusive: transition.toFrameExclusive,
    duration_frames: transition.durationFrames,
    review_frames: transition.reviewFrames,
    boundary_test_frames: transition.boundaryFrames,
  })),
});

const visualPhilosophy = `# 03 Visual philosophy — Cadena visible

## Dirección operativa

La pieza usa una cadena causal vertical y una señal persistente. Cada beat responde una de tres
preguntas: **¿De dónde sale?**, **¿Cómo se decide?** y **¿Hasta dónde llega?**. [DOC]

## Sistema verificable

- Lienzo: ${copy.profile.width}×${copy.profile.height}; ${copy.profile.fps} fps; safe zone de ${copy.profile.safeZonePx} px.
- Paleta: fondo \`#090A0C\`, texto \`#F7F6F1\`, señal \`#D6FF4B\`, bifurcación \`#68E6E0\`,
  límite \`#FF8A70\`. El contraste de texto principal contra fondo es mayor a 7:1. [CONFIG]
- Tipografía: Work Sans y JetBrains Mono vendorizadas con licencia OFL 1.1, archivo de licencia y
  SHA-256. \`FontFace\` + \`delayRender\` bloquean el frame hasta cargar las cuatro variantes; no
  hay font remota ni fallback de host. La equivalencia cross-host queda pendiente hasta una matriz
  con el mismo Chromium pinneado.
- Densidad: máximo un headline, un cuerpo, una evidencia secundaria y una señal causal por beat.
- Safe zone: ningún texto material entra en los 96 px exteriores; captions usan una banda inferior
  separada de badges y UI de plataforma.
- Jerarquía: pregunta 30–34 px, eyebrow 28 px, headline 68–88 px, cuerpo 36–42 px, caption 38 px.
- Estado redundante: \`RENDERED_DRAFT\` usa texto + rectángulo + patrón diagonal; \`LOCAL TEST ONLY\`
  usa texto + círculo + trama de puntos. El color nunca comunica estado por sí solo.

## Gramática de movimiento

- Entrada y salida: opacity + translateY de máximo 28 px, calculados solo con frames y clamps.
- Continuidad: la señal y los dos badges son persistentes; Web/Motion se bifurcan únicamente en
  \`B05-bifurcacion\`.
- Transiciones: solapamiento fijo de ${copy.timingPolicy.transitionFrames} frames ya restado en el
  total; no hay CSS animations, timers, reloj, red ni aleatoriedad.
- Quietud: cada caption conserva su hold completo después de la entrada.
- Reduced motion: elimina desplazamiento y escala; mantiene opacity acotada, layout, caption,
  texto, forma y patrón.

## Derechos, audio y assets

La implementación usa texto, primitives 2D first-party y cuatro archivos de font OFL
hash-bound. No importa imagen, video, SVG no confiable, música ni voz. El perfil es silent-first y
ffprobe debe mostrar solo stream de video. [CONFIG]

## Casos de QA

- Captions: monotónicos, sin overlap, dentro de beat y composición; WPM efectivo ≤
  ${copy.timingPolicy.wordsPerMinute / copy.timingPolicy.playbackMargin}.
- Límites: revisar cada transición en pre/durante/post y probar \`T-1/T/T+1\`.
- Texto: fixtures vacía, larga, RTL, CJK, emoji y fallback deben fallar o permanecer dentro de
  bounds definidos.
- Playback: revisar primer frame, último frame, siete beats, seis transiciones, badges persistentes,
  bifurcación, gate y ausencia de audio.
- Estado máximo local: \`RENDERED_DRAFT\`; un receipt técnico puede registrar
  \`RENDER_VALIDATED\` o \`POSTPRODUCTION_VALIDATED\`, nunca aprobación humana.
`;

const captions = {
  schemaVersion: 1,
  captionsId: 'CAPTIONS-VS001-001',
  language: copy.language,
  sourceSnapshotId: copy.sourceSnapshot.sourceSnapshotId,
  fps: timeline.fps,
  durationInFrames: timeline.durationInFrames,
  durationMs: Math.round((timeline.durationInFrames / timeline.fps) * 1000),
  readingPolicy: {
    wordsPerMinute: copy.timingPolicy.wordsPerMinute,
    playbackMargin: copy.timingPolicy.playbackMargin,
    maximumEffectiveWordsPerMinute: Number(
      (copy.timingPolicy.wordsPerMinute / copy.timingPolicy.playbackMargin).toFixed(2),
    ),
  },
  captions: timeline.captions,
};

const outputs = new Map<string, string>([
  [
    'projects/vs-001-source-to-campaign/remotion/00-source-script.md',
    await format(sourceScript, {...prettierConfig, parser: 'markdown'}),
  ],
  [
    'projects/vs-001-source-to-campaign/remotion/01-video-spec.yml',
    await format(YAML.stringify(videoSpec, {lineWidth: 0}), {
      ...prettierConfig,
      parser: 'yaml',
    }),
  ],
  [
    'projects/vs-001-source-to-campaign/remotion/02-beat-map.yml',
    await format(YAML.stringify(beatMap, {lineWidth: 0}), {
      ...prettierConfig,
      parser: 'yaml',
    }),
  ],
  [
    'projects/vs-001-source-to-campaign/remotion/03-visual-philosophy.md',
    await format(visualPhilosophy, {...prettierConfig, parser: 'markdown'}),
  ],
  [
    'projects/vs-001-source-to-campaign/remotion/captions.json',
    await format(JSON.stringify(captions), {...prettierConfig, parser: 'json'}),
  ],
]);

for (const [relativePath, content] of outputs) {
  const outputPath = resolve(root, relativePath);
  mkdirSync(dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

const receipt = {
  schemaVersion: 1,
  receiptId: 'RCP-CONTENT-VS001-001',
  artifactId: copy.workProductId,
  producerActorId: 'A07-content',
  sourceSnapshotId: copy.sourceSnapshot.sourceSnapshotId,
  sourceNormalizedSha256: copy.sourceSnapshot.normalizedSha256,
  creativeDecision: {
    proposalId: copy.creativeDirection.proposalId,
    synthesisId: copy.creativeDirection.synthesisId,
    incorporatedElementCount: copy.creativeDirection.incorporatedElements.length,
  },
  timing: {
    method: 'caption-words-reading-hold-playback-margin-and-transition-overlap',
    fps: timeline.fps,
    durationInFrames: timeline.durationInFrames,
    durationSeconds: timeline.durationSeconds,
    fixed36SecondDefault: false,
  },
  inputs: [
    {
      path: 'projects/vs-001-source-to-campaign/content/campaign-copy.json',
      sha256: sha256(rawCopy),
    },
    {path: 'registries/sources/source-registry.yml', sha256: sha256(rawSourceRegistry)},
    {path: 'registries/claims/claim-registry.yml', sha256: sha256(rawClaimRegistry)},
    {
      path: 'projects/vs-001-source-to-campaign/source-bundle.yml',
      sha256: sha256(rawSourceBundle),
    },
    {
      path: 'projects/vs-001-source-to-campaign/remotion/committee/committee-decision.json',
      sha256: sha256(rawCommitteeDecision),
    },
  ],
  outputs: [...outputs].map(([path, content]) => ({path, sha256: sha256(content)})),
  status: copy.requestedState,
  scope: copy.scopeBadge,
  publishAuthorized: false,
  coverageGaps: videoSpec.coverage_gaps,
  generatedAt: copy.deterministicTimestamp,
};

const receiptPath = resolve(contentRoot, 'build-receipt.json');
writeFileSync(
  receiptPath,
  await format(JSON.stringify(receipt), {...prettierConfig, parser: 'json'}),
  'utf8',
);
console.info(
  `Built A07 content: ${timeline.durationInFrames} frames (${timeline.durationSeconds}s) from ${timeline.captions.length} captions.`,
);
