import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {format, resolveConfig} from 'prettier';
import YAML from 'yaml';

import {
  campaignCopySchema,
  canonicalCommitteeElementSignatures,
  canonicalIncorporatedElements,
} from '../../../networks/content/src/model.ts';
import {deriveTimeline} from '../../../networks/content/src/timing.ts';
import {componentRegistrySchema} from '../src/component-registry-schema.ts';
import {methodologiaVerticalPropsSchema} from '../src/schema.ts';

const root = process.cwd();
const prettierConfig = (await resolveConfig(resolve(root, '.prettierrc.json'))) ?? {};
const projectRoot = resolve(root, 'projects/vs-001-source-to-campaign');
const motionRoot = resolve(projectRoot, 'remotion');
const copyPath = resolve(projectRoot, 'content/campaign-copy.json');
const captionsPath = resolve(motionRoot, 'captions.json');
const beatMapPath = resolve(motionRoot, '02-beat-map.yml');
const claimLedgerPath = resolve(projectRoot, 'claims-ledger.yml');
const committeeDecisionPath = resolve(motionRoot, 'committee/committee-decision.json');
const lockfilePath = resolve(root, 'pnpm-lock.yaml');
const fontAssets = [
  {
    asset_id: 'FONT-WORK-SANS-REGULAR',
    family: 'MetodologIA Work Sans',
    weight: 400,
    path: 'renderers/remotion/src/assets/fonts/WorkSans-Regular.ttf',
    license_path: 'renderers/remotion/src/assets/fonts/WorkSans-OFL.txt',
    rights_holder: 'The Work Sans Project Authors',
    canonical_source_url: 'https://github.com/weiweihuanghuang/Work-Sans',
  },
  {
    asset_id: 'FONT-WORK-SANS-BOLD',
    family: 'MetodologIA Work Sans',
    weight: 700,
    path: 'renderers/remotion/src/assets/fonts/WorkSans-Bold.ttf',
    license_path: 'renderers/remotion/src/assets/fonts/WorkSans-OFL.txt',
    rights_holder: 'The Work Sans Project Authors',
    canonical_source_url: 'https://github.com/weiweihuanghuang/Work-Sans',
  },
  {
    asset_id: 'FONT-JETBRAINS-MONO-REGULAR',
    family: 'MetodologIA JetBrains Mono',
    weight: 400,
    path: 'renderers/remotion/src/assets/fonts/JetBrainsMono-Regular.ttf',
    license_path: 'renderers/remotion/src/assets/fonts/JetBrainsMono-OFL.txt',
    rights_holder: 'The JetBrains Mono Project Authors',
    canonical_source_url: 'https://github.com/JetBrains/JetBrainsMono',
  },
  {
    asset_id: 'FONT-JETBRAINS-MONO-BOLD',
    family: 'MetodologIA JetBrains Mono',
    weight: 700,
    path: 'renderers/remotion/src/assets/fonts/JetBrainsMono-Bold.ttf',
    license_path: 'renderers/remotion/src/assets/fonts/JetBrainsMono-OFL.txt',
    rights_holder: 'The JetBrains Mono Project Authors',
    canonical_source_url: 'https://github.com/JetBrains/JetBrainsMono',
  },
] as const;

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const readText = (path: string): string => readFileSync(path, 'utf8');
const writeText = (relativePath: string, content: string): void => {
  const path = resolve(root, relativePath);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
};

const rawCopy = readText(copyPath);
const rawCaptions = readText(captionsPath);
const rawBeatMap = readText(beatMapPath);
const rawClaimLedger = readText(claimLedgerPath);
const rawCommitteeDecision = readText(committeeDecisionPath);
const copy = campaignCopySchema.parse(JSON.parse(rawCopy));
const timeline = deriveTimeline(copy);
const persistedCaptions = JSON.parse(rawCaptions) as {
  durationInFrames: number;
  captions: typeof timeline.captions;
};
const persistedBeatMap = YAML.parse(rawBeatMap) as {
  creative_direction: {proposalId: string; incorporatedElements: string[]};
  timing: {duration_in_frames: number};
};
const committeeDecision = JSON.parse(rawCommitteeDecision) as {
  synthesis: {
    selectedProposalId: string;
    incorporatedElements: Array<{element: string; sourceProposalId: string}>;
  };
};
const committeeElementSignatures = committeeDecision.synthesis.incorporatedElements.map(
  ({element, sourceProposalId}) => [sourceProposalId, element],
);
if (
  persistedCaptions.durationInFrames !== timeline.durationInFrames ||
  JSON.stringify(persistedCaptions.captions) !== JSON.stringify(timeline.captions)
) {
  throw new Error('Persisted captions do not match the deterministic A07 derivation.');
}
if (
  persistedBeatMap.timing.duration_in_frames !== timeline.durationInFrames ||
  persistedBeatMap.creative_direction.proposalId !== copy.creativeDirection.proposalId ||
  JSON.stringify(persistedBeatMap.creative_direction.incorporatedElements) !==
    JSON.stringify(canonicalIncorporatedElements) ||
  JSON.stringify(copy.creativeDirection.incorporatedElements) !==
    JSON.stringify(canonicalIncorporatedElements) ||
  committeeDecision.synthesis.selectedProposalId !== copy.creativeDirection.proposalId ||
  JSON.stringify(committeeElementSignatures) !== JSON.stringify(canonicalCommitteeElementSignatures)
) {
  throw new Error('Beat map and committee decision do not match exact P02 ordered synthesis.');
}

const props = methodologiaVerticalPropsSchema.parse({
  schemaVersion: 1,
  projectId: copy.projectId,
  artifactId: copy.workProductId,
  language: copy.language,
  status: copy.requestedState,
  scopeBadge: copy.scopeBadge,
  creativeDirection: copy.creativeDirection,
  sourceSnapshot: {
    sourceId: copy.sourceSnapshot.sourceId,
    id: copy.sourceSnapshot.sourceSnapshotId,
    normalizedSha256: copy.sourceSnapshot.normalizedSha256,
  },
  claims: [
    {claimId: 'CLM-VS001-001', sourceId: copy.sourceSnapshot.sourceId},
    {claimId: 'CLM-VS001-002', sourceId: copy.sourceSnapshot.sourceId},
    {claimId: 'CLM-VS001-003', sourceId: copy.sourceSnapshot.sourceId},
  ],
  profile: {
    ...copy.profile,
    transitionFrames: copy.timingPolicy.transitionFrames,
  },
  canonicalCoverage: {
    confirmed: 0,
    expected: 4,
    semantic: 'coverage_gap_not_kpi',
  },
  audio: copy.audio,
  reducedMotion: false,
  breadcrumbQuestions: ['¿De dónde sale?', '¿Cómo se decide?', '¿Hasta dónde llega?'],
  chainStages: [
    {stageId: 'source', label: 'Fuente'},
    {stageId: 'committee', label: 'Comité'},
    {stageId: 'products', label: 'Web · Motion'},
    {stageId: 'gate', label: 'Gate'},
  ],
  beats: timeline.beats.map((beat) => ({
    beatId: beat.beatId,
    question: beat.question,
    eyebrow: beat.eyebrow,
    headline: beat.headline,
    body: beat.body,
    claimIds: beat.claimIds,
    configRefs: beat.configRefs,
    layout: beat.layout,
    fromFrame: beat.fromFrame,
    toFrame: beat.toFrame,
    durationFrames: beat.durationFrames,
    incomingTransitionFrames: beat.incomingTransitionFrames,
    outgoingTransitionFrames: beat.outgoingTransitionFrames,
    captionId: beat.caption.captionId,
  })),
  captions: timeline.captions,
});

const componentFiles = [
  'renderers/remotion/src/components/StatusBadge.tsx',
  'renderers/remotion/src/components/PersistentChrome.tsx',
  'renderers/remotion/src/components/SignalRail.tsx',
  'renderers/remotion/src/components/Breadcrumb.tsx',
  'renderers/remotion/src/components/BeatScene.tsx',
  'renderers/remotion/src/components/CaptionBand.tsx',
  'renderers/remotion/src/components/LayoutGuard.tsx',
  'renderers/remotion/src/components/layout-geometry.ts',
  'renderers/remotion/src/components/NetworkGuardProbe.tsx',
  'renderers/remotion/src/Root.tsx',
  'renderers/remotion/src/component-registry-schema.ts',
  'renderers/remotion/src/font-loader.ts',
  'renderers/remotion/src/network-guard.ts',
  'renderers/remotion/src/schema.ts',
  'renderers/remotion/src/theme.ts',
  'projects/vs-001-source-to-campaign/remotion/src/MethodologiaVertical.tsx',
] as const;

const componentRoles: Readonly<Record<(typeof componentFiles)[number], string>> = {
  'renderers/remotion/src/components/StatusBadge.tsx':
    'Estado redundante por texto, forma y patrón.',
  'renderers/remotion/src/components/PersistentChrome.tsx':
    'Marca única, badges y semántica 0/4 persistentes.',
  'renderers/remotion/src/components/SignalRail.tsx':
    'Cadena causal persistente y bifurcación Web/Motion.',
  'renderers/remotion/src/components/Breadcrumb.tsx':
    'Tres preguntas incorporadas como breadcrumb.',
  'renderers/remotion/src/components/BeatScene.tsx':
    'Escena frame-driven con variante reduced-motion.',
  'renderers/remotion/src/components/CaptionBand.tsx':
    'Caption dentro de safe-zone y ventana monotónica.',
  'renderers/remotion/src/components/LayoutGuard.tsx':
    'Espera el portal activo y falla ante overflow, safe-zone o texto recortado dentro de su raíz sentinel-bound.',
  'renderers/remotion/src/components/layout-geometry.ts':
    'Normaliza bounds a coordenadas lógicas de composición para escalas 0.25 y 1.0.',
  'renderers/remotion/src/components/NetworkGuardProbe.tsx':
    'Canary headless que debe observar bloqueo síncrono de red remota.',
  'renderers/remotion/src/Root.tsx': 'Registro de composición con schema y calculateMetadata.',
  'renderers/remotion/src/component-registry-schema.ts':
    'Contrato estricto del component registry y sus campos mínimos.',
  'renderers/remotion/src/font-loader.ts':
    'Carga y verifica cuatro fonts OFL locales con gate de composición, timeout y cancelRender.',
  'renderers/remotion/src/network-guard.ts':
    'Bloquea fetch remoto y conserva recursos same-origin, data y blob.',
  'renderers/remotion/src/schema.ts': 'Zod 4, timeline y calculateMetadata.',
  'renderers/remotion/src/theme.ts': 'Tokens y familias tipográficas vendorizadas.',
  'projects/vs-001-source-to-campaign/remotion/src/MethodologiaVertical.tsx':
    'Composición 9:16 con siete beats y seis overlaps.',
};

const componentCategories: Readonly<
  Record<
    (typeof componentFiles)[number],
    | 'caption'
    | 'chrome'
    | 'composition'
    | 'contract'
    | 'font-loader'
    | 'navigation'
    | 'qa'
    | 'runtime-policy'
    | 'scene'
    | 'status'
    | 'visual-system'
  >
> = {
  'renderers/remotion/src/components/StatusBadge.tsx': 'status',
  'renderers/remotion/src/components/PersistentChrome.tsx': 'chrome',
  'renderers/remotion/src/components/SignalRail.tsx': 'navigation',
  'renderers/remotion/src/components/Breadcrumb.tsx': 'navigation',
  'renderers/remotion/src/components/BeatScene.tsx': 'scene',
  'renderers/remotion/src/components/CaptionBand.tsx': 'caption',
  'renderers/remotion/src/components/LayoutGuard.tsx': 'qa',
  'renderers/remotion/src/components/layout-geometry.ts': 'qa',
  'renderers/remotion/src/components/NetworkGuardProbe.tsx': 'qa',
  'renderers/remotion/src/Root.tsx': 'composition',
  'renderers/remotion/src/component-registry-schema.ts': 'contract',
  'renderers/remotion/src/font-loader.ts': 'font-loader',
  'renderers/remotion/src/network-guard.ts': 'runtime-policy',
  'renderers/remotion/src/schema.ts': 'contract',
  'renderers/remotion/src/theme.ts': 'visual-system',
  'projects/vs-001-source-to-campaign/remotion/src/MethodologiaVertical.tsx': 'composition',
};
const componentRequiredProps: Readonly<Record<(typeof componentFiles)[number], readonly string[]>> =
  {
    'renderers/remotion/src/components/StatusBadge.tsx': ['kind', 'label'],
    'renderers/remotion/src/components/PersistentChrome.tsx': ['props'],
    'renderers/remotion/src/components/SignalRail.tsx': ['beat', 'frame', 'props'],
    'renderers/remotion/src/components/Breadcrumb.tsx': ['beat', 'props'],
    'renderers/remotion/src/components/BeatScene.tsx': ['beat', 'props'],
    'renderers/remotion/src/components/CaptionBand.tsx': ['props', 'text'],
    'renderers/remotion/src/components/LayoutGuard.tsx': [
      'compositionHeight',
      'compositionWidth',
      'safeZonePx',
    ],
    'renderers/remotion/src/components/layout-geometry.ts': [],
    'renderers/remotion/src/components/NetworkGuardProbe.tsx': [],
    'renderers/remotion/src/Root.tsx': [],
    'renderers/remotion/src/component-registry-schema.ts': [],
    'renderers/remotion/src/font-loader.ts': [],
    'renderers/remotion/src/network-guard.ts': [],
    'renderers/remotion/src/schema.ts': [],
    'renderers/remotion/src/theme.ts': [],
    'projects/vs-001-source-to-campaign/remotion/src/MethodologiaVertical.tsx': ['props'],
  };

const components = componentFiles.map((path) => {
  const content = readFileSync(resolve(root, path));
  const componentId = path
    .split('/')
    .at(-1)
    ?.replace(/\.[^.]+$/u, '');
  if (componentId === undefined) {
    throw new Error(`Cannot derive component ID from ${path}.`);
  }
  const category = componentCategories[path];
  const visual = ['caption', 'chrome', 'composition', 'navigation', 'scene', 'status'].includes(
    category,
  );
  return {
    component_id: componentId,
    version: '1.0.0',
    category,
    renderer: 'remotion',
    path,
    sha256: sha256(content),
    role: componentRoles[path],
    runtime: 'Remotion 4.0.494',
    deterministic: true,
    props: {
      required: componentRequiredProps[path],
      defaults: {},
    },
    compatible_formats: ['9:16'],
    preview: visual
      ? {
          status: 'not_applicable',
          reason:
            'Portable review-shot previews are generated after build; this registry remains an unapproved draft.',
        }
      : {
          status: 'not_applicable',
          reason: 'Non-visual runtime, policy or contract module.',
        },
    restrictions: [
      'local contract testing only',
      'no remote assets or fonts',
      'no governed state transition without independent approvals',
    ],
    rights: {
      holder: 'MetodologIA',
      basis: 'locally_authored_first_party_code',
      allowed_scope: 'local_contract_testing_only',
    },
    accessibility: visual
      ? [
          'layout guard checks viewport and safe-zone bounds',
          'status is not communicated by color alone',
        ]
      : ['does not independently render user-facing content'],
    tests: {
      required: true,
      refs: [
        'tests/unit/remotion/contracts.test.ts',
        'tests/unit/remotion/font-loader.test.ts',
        'tests/unit/remotion/layout-geometry.test.ts',
        'tests/unit/remotion/offline-renderer.test.ts',
      ],
    },
    risks: ['formal registry approval receipt absent', 'human playback approval absent'],
    state: 'REGISTRY_DRAFT',
  };
});

const assetsManifest = {
  schema_version: 1,
  manifest_id: 'ASSETS-VS001-001',
  project_id: copy.projectId,
  status: 'PROVISIONALLY_CLEARED_FOR_LOCAL_TEST_ONLY',
  policy: {
    network_allowed: false,
    remote_assets_allowed: false,
    remote_fonts_allowed: false,
    symlinks_allowed: false,
    audio_mode: 'silent-first',
  },
  binary_assets: fontAssets.map((asset) => ({
    ...asset,
    original_filename: asset.path.split('/').at(-1),
    acquisition_origin: {
      source_package: 'claude-cowork/anthropic-skills@1.0.0',
      package_asset_path: `skills/canvas-design/canvas-fonts/${asset.path.split('/').at(-1)}`,
      upstream_release_or_commit: 'unresolved',
      evaluated_at: copy.deterministicTimestamp,
    },
    sha256: sha256(readFileSync(resolve(root, asset.path))),
    mime: 'font/ttf',
    license: 'SIL Open Font License 1.1',
    license_sha256: sha256(readFileSync(resolve(root, asset.license_path))),
    rights_basis: 'OFL-1.1 bundled with the unmodified font binary',
    allowed_scope: 'embedded_and_redistributed_with_license',
    verdict: 'allowed_local_test_with_origin_gap',
  })),
  procedural_first_party_elements: components
    .filter(({path}) => path.includes('/components/') || path.endsWith('/theme.ts'))
    .map(({component_id, path, sha256: digest}) => ({
      asset_id: `PROC-${component_id?.toUpperCase() ?? 'UNKNOWN'}`,
      path,
      sha256: digest,
      mime: path.endsWith('.tsx') ? 'text/tsx' : 'text/typescript',
      rights_holder: 'MetodologIA',
      rights_basis: 'locally_authored_first_party_code',
      allowed_scope: 'local_contract_testing_only',
      verdict: 'allowed_local_test_only',
    })),
  font_policy: {
    loaded_font_assets: fontAssets.map(({asset_id, family, path, weight}) => ({
      asset_id,
      family,
      path,
      weight,
    })),
    css_stack: '"MetodologIA Work Sans" for sans and "MetodologIA JetBrains Mono" for monospace',
    network_fetch: false,
    loader:
      'Four explicit FontFace loads plus status and FontFaceSet checks; component-scoped delayRender, 30000ms timeout, zero retries, cancelRender on error',
    determinism_scope: 'hash_bound_fonts_same_pinned_chromium_profile',
  },
  audio_assets: [],
  coverage_gaps: [
    'audio_rights_receipt_absent_silent_first',
    'cross_host_chromium_pixel_equivalence_unverified',
    'font_binary_origin_version_unresolved',
    'authoritative_linux_network_namespace_offline_render_unexecuted',
    'external_distribution_not_authorized',
  ],
};
const assetsManifestText = await format(YAML.stringify(assetsManifest, {lineWidth: 0}), {
  ...prettierConfig,
  parser: 'yaml',
});
const assetsManifestDigest = sha256(assetsManifestText);

const componentRegistry = componentRegistrySchema.parse({
  schema_version: 1,
  registry_id: 'COMPONENTS-VS001-001',
  composition_id: 'MethodologiaVertical',
  state: 'REGISTRY_DRAFT',
  approval_receipt: null,
  committee_decision_ref:
    'projects/vs-001-source-to-campaign/remotion/committee/committee-decision.json',
  creative_direction: copy.creativeDirection,
  components,
  asset_manifest_sha256: assetsManifestDigest,
  forbidden_runtime_behaviors: [
    'network',
    'clock',
    'randomness',
    'timers',
    'css_animation',
    'css_transition',
    'remote_font',
  ],
});
const componentRegistryText = await format(YAML.stringify(componentRegistry, {lineWidth: 0}), {
  ...prettierConfig,
  parser: 'yaml',
});
const componentRegistryDigest = sha256(componentRegistryText);

const inputPropsText = await format(JSON.stringify(props), {...prettierConfig, parser: 'json'});
const inputPropsDigest = sha256(inputPropsText);
const claimLedgerDigest = sha256(rawClaimLedger);
const rendererEntryPath = 'renderers/remotion/src/index.ts';
const rendererEntryDigest = sha256(readFileSync(resolve(root, rendererEntryPath)));
const lockfileDigest = sha256(readFileSync(lockfilePath));

const preflight = {
  requestId: 'REQ-REMOTION-VS001-001',
  projectId: copy.projectId,
  requestedState: copy.requestedState,
  governedWorkflowState: 'BLOCKED_BEFORE_SOURCE_LOCK',
  technicalValidationState: 'PREFLIGHT_VALIDATED',
  sourceSnapshot: {
    id: copy.sourceSnapshot.sourceSnapshotId,
    normalizedSha256: copy.sourceSnapshot.normalizedSha256,
  },
  claimsLedgerDigest: claimLedgerDigest,
  assetsManifestDigest,
  profile: {
    width: copy.profile.width,
    height: copy.profile.height,
    fps: copy.profile.fps,
    durationInFrames: timeline.durationInFrames,
  },
  props,
  runtime: {
    remotionVersion: '4.0.494',
    zodMajor: 4,
    networkAllowed: false,
    licenseVerdict: 'evaluation_only',
  },
};

const initialRenderManifest = {
  schema_version: 1,
  manifest_id: 'RENDER-MANIFEST-VS001-001',
  artifact_id: copy.workProductId,
  composition_id: 'MethodologiaVertical',
  governed_workflow_state: 'BLOCKED_BEFORE_SOURCE_LOCK',
  technical_validation_state: 'PREFLIGHT_VALIDATED',
  state_scope: 'technical_local_only_not_a_governed_transition_receipt',
  visible_status: copy.requestedState,
  visible_scope: copy.scopeBadge,
  source_snapshot_id: copy.sourceSnapshot.sourceSnapshotId,
  source_normalized_sha256: copy.sourceSnapshot.normalizedSha256,
  profile: preflight.profile,
  audio: {
    expected_streams: ['video'],
    mode: 'silent-first',
  },
  inputs: [
    {
      path: 'projects/vs-001-source-to-campaign/remotion/05-input-props.json',
      sha256: inputPropsDigest,
    },
    {
      path: 'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml',
      sha256: assetsManifestDigest,
    },
    {
      path: 'projects/vs-001-source-to-campaign/remotion/04-component-registry.yml',
      sha256: componentRegistryDigest,
    },
    {path: rendererEntryPath, sha256: rendererEntryDigest},
    {
      path: 'projects/vs-001-source-to-campaign/remotion/02-beat-map.yml',
      sha256: sha256(rawBeatMap),
    },
    {
      path: 'projects/vs-001-source-to-campaign/remotion/captions.json',
      sha256: sha256(rawCaptions),
    },
    {
      path: 'projects/vs-001-source-to-campaign/remotion/committee/committee-decision.json',
      sha256: sha256(rawCommitteeDecision),
    },
    {path: 'pnpm-lock.yaml', sha256: lockfileDigest},
  ],
  expected_outputs: [
    'projects/vs-001-source-to-campaign/remotion/receipts/media/vs-001-smoke.mp4',
    'projects/vs-001-source-to-campaign/remotion/receipts/media/vs-001-review-a.mp4',
    'projects/vs-001-source-to-campaign/remotion/receipts/media/vs-001-review-b.mp4',
  ],
  outputs: [],
  review_shots: [],
  deterministic_pixel_match: 'pending',
  human_review: 'pending',
  publish_authorized: false,
  coverage_gaps: [
    'four_canonical_texts_missing_0_of_4',
    'formal_component_registry_approval_receipt_absent',
    'cross_host_chromium_pixel_equivalence_unverified',
    'font_binary_origin_version_unresolved',
    'authoritative_linux_network_namespace_offline_render_unexecuted',
    'remotion_commercial_license_eligibility_unresolved',
    'guardian_and_human_approval_absent',
    'external_distribution_not_authorized',
  ],
};

const rightsReceipt = {
  schema_version: 1,
  receipt_id: 'RCP-ASSETS-VS001-001',
  project_id: copy.projectId,
  assets_manifest_sha256: assetsManifestDigest,
  binary_asset_count: assetsManifest.binary_assets.length,
  audio_asset_count: 0,
  procedural_element_count: assetsManifest.procedural_first_party_elements.length,
  rights_holders: [
    'MetodologIA for procedural renderer code',
    'The Work Sans Project Authors for Work Sans',
    'The JetBrains Mono Project Authors for JetBrains Mono',
  ],
  rights_basis: 'locally_authored_first_party_code plus bundled OFL-1.1 fonts',
  font_license_receipts: assetsManifest.binary_assets.map(
    ({asset_id, license_path, license_sha256, sha256: fontSha256}) => ({
      asset_id,
      font_sha256: fontSha256,
      license_path,
      license_sha256,
      license: 'SIL Open Font License 1.1',
    }),
  ),
  allowed_scope: 'local_contract_testing_only',
  verdict: 'PROVISIONALLY_CLEARED_FOR_LOCAL_TEST_ONLY',
  coverage_gaps: ['font_binary_origin_version_unresolved'],
  external_distribution_authorized: false,
  generated_at: copy.deterministicTimestamp,
};

writeText('projects/vs-001-source-to-campaign/remotion/05-input-props.json', inputPropsText);
writeText(
  'projects/vs-001-source-to-campaign/remotion/04-component-registry.yml',
  componentRegistryText,
);
writeText('registries/components/component-registry.yml', componentRegistryText);
writeText('projects/vs-001-source-to-campaign/remotion/assets-manifest.yml', assetsManifestText);
writeText(
  'projects/vs-001-source-to-campaign/remotion/06-render-manifest.yml',
  await format(YAML.stringify(initialRenderManifest, {lineWidth: 0}), {
    ...prettierConfig,
    parser: 'yaml',
  }),
);
writeText(
  'projects/vs-001-source-to-campaign/remotion/receipts/preflight-render-input.json',
  await format(JSON.stringify(preflight), {...prettierConfig, parser: 'json'}),
);
writeText(
  'projects/vs-001-source-to-campaign/remotion/receipts/assets-rights.yml',
  await format(YAML.stringify(rightsReceipt, {lineWidth: 0}), {
    ...prettierConfig,
    parser: 'yaml',
  }),
);

const postproductionLedger = `# 07 Postproduction ledger

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
writeText(
  'projects/vs-001-source-to-campaign/remotion/07-postproduction-ledger.md',
  await format(postproductionLedger, {...prettierConfig, parser: 'markdown'}),
);

console.info(
  `Prepared A08 props and manifests: duration=${timeline.durationInFrames} assets=${assetsManifest.binary_assets.length} input=${inputPropsDigest}.`,
);
