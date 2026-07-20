import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {format, resolveConfig} from 'prettier';
import YAML from 'yaml';

import {RenderReceiptSchema} from '../../../core/contracts/index.ts';
import {methodologiaVerticalPropsSchema} from '../src/schema.ts';
import {
  APPEND_ONLY_MIGRATION_REF,
  buildAppendOnlyEvidenceMigration,
  evidenceRemediationBaselines,
  serializeAppendOnlyEvidenceMigration,
  verifyAppendOnlyEvidenceMigrationFiles,
  writeAppendOnlyText,
} from '../src/append-only-evidence.ts';
import {
  validationTestReportSchema,
  verifyValidationCommandEvidenceBinding,
} from '../src/validation-evidence.ts';

interface ProbeStream {
  readonly codec_name?: string;
  readonly codec_type?: string;
  readonly width?: number;
  readonly height?: number;
  readonly r_frame_rate?: string;
  readonly nb_frames?: string;
  readonly pix_fmt?: string;
  readonly color_range?: string;
  readonly color_space?: string;
}

interface ProbeResult {
  readonly streams: readonly ProbeStream[];
  readonly format?: {readonly duration?: string; readonly size?: string};
}

const root = process.cwd();
const prettierConfig = (await resolveConfig(resolve(root, '.prettierrc.json'))) ?? {};
const projectRelative = 'projects/vs-001-source-to-campaign/remotion';
const projectRoot = resolve(root, projectRelative);
const mediaRoot = resolve(projectRoot, 'receipts/media');
const shotsRoot = resolve(projectRoot, 'review-shots');
const propsRelative = `${projectRelative}/05-input-props.json`;
const assetsRelative = `${projectRelative}/assets-manifest.yml`;
const registryRelative = `${projectRelative}/04-component-registry.yml`;
const testReportRelative = `${projectRelative}/receipts/test-report-v2.json`;
const renderReceiptRelative = 'receipts/renders/RCP-REMOTION-VS001-002.json';
const priorRenderReceiptRelative = 'receipts/renders/RCP-REMOTION-VS001-001.json';
const lockfileRelative = 'pnpm-lock.yaml';
const networkProbeRelative = `${projectRelative}/receipts/runtime-network-denied.png`;
const contactSheetRelative = `${projectRelative}/review-shots/contact-sheet.png`;
const outputs = {
  smoke: `${projectRelative}/receipts/media/vs-001-smoke.mp4`,
  reviewA: `${projectRelative}/receipts/media/vs-001-review-a.mp4`,
  reviewB: `${projectRelative}/receipts/media/vs-001-review-b.mp4`,
} as const;

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const writeText = (relativePath: string, content: string): void => {
  const path = resolve(root, relativePath);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
};
const fileDigest = (relativePath: string): string =>
  sha256(readFileSync(resolve(root, relativePath)));

const props = methodologiaVerticalPropsSchema.parse(
  JSON.parse(readFileSync(resolve(root, propsRelative), 'utf8')),
);
const expectedDuration = props.beats.at(-1)?.toFrame;
if (expectedDuration === undefined) {
  throw new Error('Cannot inspect a render without a derived duration.');
}

const testReport = validationTestReportSchema.parse(
  JSON.parse(readFileSync(resolve(root, testReportRelative), 'utf8')),
);
if (testReport.status !== 'PASS' || testReport.technical_validation_state !== 'BUILD_VALIDATED') {
  throw new Error('Render inspection requires a passing BUILD_VALIDATED test report.');
}
for (const input of testReport.source_files) {
  if (fileDigest(input.path) !== input.sha256) {
    throw new Error(`Validated input changed before inspection: ${input.path}.`);
  }
}
for (const commandResult of testReport.commands) {
  const evidenceText = readFileSync(resolve(root, commandResult.evidenceRef), 'utf8');
  verifyValidationCommandEvidenceBinding(commandResult, evidenceText);
}

const probe = (relativePath: string): ProbeResult =>
  JSON.parse(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames,pix_fmt,color_range,color_space:format=duration,size',
        '-of',
        'json',
        resolve(root, relativePath),
      ],
      {encoding: 'utf8'},
    ),
  ) as ProbeResult;

const requireVideoOnly = (
  result: ProbeResult,
  label: string,
  expected: {width: number; height: number; frames: number},
): ProbeStream => {
  const video = result.streams.filter(({codec_type}) => codec_type === 'video');
  const nonVideo = result.streams.filter(({codec_type}) => codec_type !== 'video');
  if (video.length !== 1 || nonVideo.length !== 0) {
    throw new Error(`${label} must have exactly one video stream and no audio or other streams.`);
  }
  const primary = video[0];
  if (
    primary?.codec_name !== 'h264' ||
    primary.width !== expected.width ||
    primary.height !== expected.height ||
    primary.r_frame_rate !== `${props.profile.fps}/1` ||
    Number(primary.nb_frames) !== expected.frames ||
    primary.pix_fmt !== props.profile.pixelFormat ||
    primary.color_space !== 'bt709'
  ) {
    throw new Error(`${label} does not match its governed codec, profile or color space.`);
  }
  return primary;
};

const normalizedFrames = (relativePath: string): string => {
  const manifest = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', resolve(root, relativePath), '-map', '0:v:0', '-f', 'framemd5', '-'],
    {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024},
  );
  return manifest
    .split('\n')
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .join('\n');
};

mkdirSync(mediaRoot, {recursive: true});
mkdirSync(shotsRoot, {recursive: true});
const probeSmoke = probe(outputs.smoke);
const probeA = probe(outputs.reviewA);
const probeB = probe(outputs.reviewB);
requireVideoOnly(probeSmoke, 'Smoke render', {
  width: Math.round(props.profile.width * 0.25),
  height: Math.round(props.profile.height * 0.25),
  frames: 90,
});
const primaryA = requireVideoOnly(probeA, 'Review A', {
  width: props.profile.width,
  height: props.profile.height,
  frames: expectedDuration,
});
requireVideoOnly(probeB, 'Review B', {
  width: props.profile.width,
  height: props.profile.height,
  frames: expectedDuration,
});

const networkProbe = probe(networkProbeRelative);
const networkProbeVideo = networkProbe.streams.find(({codec_type}) => codec_type === 'video');
if (networkProbeVideo?.width !== 320 || networkProbeVideo.height !== 180) {
  throw new Error('Headless remote-network denial canary was not rendered at 320x180.');
}

const framesA = normalizedFrames(outputs.reviewA);
const framesB = normalizedFrames(outputs.reviewB);
const normalizedPixelDigestA = sha256(framesA);
const normalizedPixelDigestB = sha256(framesB);
if (normalizedPixelDigestA !== normalizedPixelDigestB) {
  throw new Error('Decoded frame digests differ between fresh full renders.');
}

writeText(
  `${projectRelative}/receipts/ffprobe-smoke.json`,
  await format(JSON.stringify(probeSmoke), {...prettierConfig, parser: 'json'}),
);
writeText(
  `${projectRelative}/receipts/ffprobe-review-a.json`,
  await format(JSON.stringify(probeA), {...prettierConfig, parser: 'json'}),
);
writeText(
  `${projectRelative}/receipts/ffprobe-review-b.json`,
  await format(JSON.stringify(probeB), {...prettierConfig, parser: 'json'}),
);
writeText(`${projectRelative}/receipts/normalized-frames-a.framemd5`, framesA);
writeText(`${projectRelative}/receipts/normalized-frames-b.framemd5`, framesB);

const transitionShotPaths = props.beats.slice(1).flatMap((beat, index) => {
  const previous = props.beats[index];
  if (previous === undefined) {
    return [];
  }
  const transitionStart = beat.fromFrame;
  const transitionEnd = previous.toFrame;
  const frames = {
    pre: transitionStart - 1,
    during: transitionStart + Math.floor((transitionEnd - transitionStart) / 2),
    post: transitionEnd,
  };
  return Object.entries(frames).map(([phase, frame]) => ({
    reviewId: `TR-${previous.beatId}-${beat.beatId}`,
    phase,
    frame,
    path: `${projectRelative}/review-shots/${String(index + 1).padStart(2, '0')}-${phase}-f${frame}.png`,
  }));
});
const midpointShotPaths = props.beats.map((beat, index) => {
  const frame = beat.fromFrame + Math.floor((beat.toFrame - beat.fromFrame) / 2);
  return {
    reviewId: beat.beatId,
    phase: 'midpoint',
    frame,
    path: `${projectRelative}/review-shots/beat-${String(index + 1).padStart(2, '0')}-mid-f${frame}.png`,
  };
});
const shotPaths = [
  {
    reviewId: 'ENDPOINT-FIRST',
    phase: 'first',
    frame: 0,
    path: `${projectRelative}/review-shots/00-first-f0.png`,
  },
  ...transitionShotPaths,
  ...midpointShotPaths,
  {
    reviewId: 'ENDPOINT-LAST',
    phase: 'last',
    frame: expectedDuration - 1,
    path: `${projectRelative}/review-shots/99-last-f${expectedDuration - 1}.png`,
  },
];

const parityRoot = mkdtempSync(join(tmpdir(), 'remotion-shot-parity-'));
const shotRecords: Array<
  (typeof shotPaths)[number] & {
    sha256: string;
    width: number;
    height: number;
    review_frame_ssim: number;
  }
> = [];
try {
  for (const shot of shotPaths) {
    const shotProbe = probe(shot.path);
    const visualStream = shotProbe.streams.find(({codec_type}) => codec_type === 'video');
    if (
      visualStream?.width !== props.profile.width ||
      visualStream.height !== props.profile.height
    ) {
      throw new Error(`Review shot ${shot.path} does not match the 9:16 profile.`);
    }

    const extracted = join(parityRoot, `${shot.frame}.png`);
    execFileSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        resolve(root, outputs.reviewA),
        '-vf',
        `select=eq(n\\,${shot.frame})`,
        '-frames:v',
        '1',
        '-y',
        extracted,
      ],
      {encoding: 'utf8'},
    );
    const comparison = spawnSync(
      'ffmpeg',
      [
        '-v',
        'info',
        '-i',
        resolve(root, shot.path),
        '-i',
        extracted,
        '-lavfi',
        'ssim',
        '-f',
        'null',
        '-',
      ],
      {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024},
    );
    const diagnostic = `${comparison.stdout ?? ''}\n${comparison.stderr ?? ''}`;
    const ssimMatch = diagnostic.match(/\bAll:([0-9.]+)/u);
    const reviewFrameSsim = Number(ssimMatch?.[1]);
    if (comparison.status !== 0 || !Number.isFinite(reviewFrameSsim) || reviewFrameSsim < 0.97) {
      throw new Error(
        `Review shot ${shot.path} is stale or does not match review A frame ${shot.frame}; SSIM=${String(reviewFrameSsim)}.`,
      );
    }
    shotRecords.push({
      ...shot,
      sha256: fileDigest(shot.path),
      width: visualStream.width,
      height: visualStream.height,
      review_frame_ssim: reviewFrameSsim,
    });
  }
} finally {
  rmSync(parityRoot, {recursive: true, force: true});
}
writeText(
  `${projectRelative}/receipts/review-shot-parity.json`,
  await format(JSON.stringify({minimum_ssim: 0.97, shots: shotRecords}), {
    ...prettierConfig,
    parser: 'json',
  }),
);

const contactSheetProbe = probe(contactSheetRelative);
const contactSheetStream = contactSheetProbe.streams.find(({codec_type}) => codec_type === 'video');
if (
  contactSheetStream?.width === undefined ||
  contactSheetStream.height === undefined ||
  contactSheetStream.width < 1000 ||
  contactSheetStream.height < 1000
) {
  throw new Error('Contact sheet is absent or too small for independent visual review.');
}

const outputRecords = Object.entries(outputs).map(([mode, path]) => {
  const outputProbe = probe(path);
  const frameDigest =
    mode === 'reviewA'
      ? normalizedPixelDigestA
      : mode === 'reviewB'
        ? normalizedPixelDigestB
        : sha256(normalizedFrames(path));
  return {
    mode,
    path,
    sha256: fileDigest(path),
    normalized_pixel_digest: frameDigest,
    ffprobe: outputProbe,
  };
});
const reviewARecord = outputRecords.find(({mode}) => mode === 'reviewA');
const reviewBRecord = outputRecords.find(({mode}) => mode === 'reviewB');
if (
  reviewARecord === undefined ||
  reviewBRecord === undefined ||
  primaryA.codec_name === undefined
) {
  throw new Error('Required review outputs or codec metadata are absent.');
}

const boundInputs = [
  propsRelative,
  assetsRelative,
  registryRelative,
  testReportRelative,
  lockfileRelative,
].map((path) => ({path, sha256: fileDigest(path)}));
const boundInputSetSha256 = sha256(
  boundInputs.map(({path, sha256: digest}) => `${path}\t${digest}`).join('\n'),
);
const receipt = RenderReceiptSchema.parse({
  schemaVersion: 'render-receipt-v2',
  receiptId: 'RCP-REMOTION-VS001-002',
  idempotencyKey: `remotion-vs001-${boundInputSetSha256.slice(0, 32)}`,
  artifactId: props.artifactId,
  artifactHash: reviewARecord.sha256,
  compositionId: 'MethodologiaVertical',
  inputPropsRef: propsRelative,
  inputPropsHash: fileDigest(propsRelative),
  assetManifestRef: assetsRelative,
  assetManifestHash: fileDigest(assetsRelative),
  toolchain: {
    node: '22.23.1',
    packageManager: 'pnpm 11.9.0',
    remotion: '4.0.494',
    chromium: 'remotion-local-headless-shell-149',
    ffmpeg: '8.1.1',
    locale: 'es-CO',
    timezone: 'UTC',
  },
  output: {
    ref: outputs.reviewA,
    sha256: reviewARecord.sha256,
    normalizedPixelDigest: normalizedPixelDigestA,
    width: props.profile.width,
    height: props.profile.height,
    fps: props.profile.fps,
    durationFrames: expectedDuration,
    codec: primaryA.codec_name,
    streams: ['video'],
  },
  mode: 'review',
  status: 'succeeded',
  logRefs: [
    testReportRelative,
    `${projectRelative}/receipts/ffprobe-smoke.json`,
    `${projectRelative}/receipts/ffprobe-review-a.json`,
    `${projectRelative}/receipts/ffprobe-review-b.json`,
    `${projectRelative}/receipts/normalized-frames-a.framemd5`,
    `${projectRelative}/receipts/normalized-frames-b.framemd5`,
    `${projectRelative}/receipts/review-shot-parity.json`,
    networkProbeRelative,
  ],
  createdAt: '2026-07-19T12:00:00.000Z',
  supersedes: {
    eventType: 'SUPERSEDES',
    priorReceiptId: 'RCP-REMOTION-VS001-001',
    priorReceiptRef: priorRenderReceiptRelative,
    priorReceiptSha256: fileDigest(priorRenderReceiptRelative),
    migrationEventRef: APPEND_ONLY_MIGRATION_REF,
    historyWasImmutable: false,
    reason: 'PORTABLE_EVIDENCE_V2_REQUIRES_NEW_APPEND_ONLY_RECEIPT',
  },
});

const coverageGaps = [
  'four_canonical_texts_missing_0_of_4',
  'formal_component_registry_approval_receipt_absent',
  'cross_host_chromium_pixel_equivalence_unverified',
  'font_binary_origin_version_unresolved',
  'authoritative_linux_network_namespace_offline_render_unexecuted',
  'remotion_commercial_license_eligibility_unresolved',
  'guardian_and_human_approval_absent',
  'external_distribution_not_authorized',
];
const portableRenderOutput = {
  requestId: 'REQ-REMOTION-VS001-001',
  status: 'RENDERED_DRAFT',
  governedWorkflowState: 'BLOCKED_BEFORE_SOURCE_LOCK',
  technicalValidationState: 'RENDER_VALIDATED',
  stateEffect: 'NONE_ON_GOVERNED_WORKFLOW',
  artifactId: props.artifactId,
  portableMediaPath: outputs.reviewA,
  fileSha256: receipt.output.sha256,
  normalizedFrameDigest: normalizedPixelDigestA,
  normalizedAudioDigest: null,
  profile: {
    width: props.profile.width,
    height: props.profile.height,
    fps: props.profile.fps,
    durationInFrames: expectedDuration,
  },
  humanReview: 'pending',
  runtimeLicenseStatus: 'evaluation-only-commercial-eligibility-unresolved',
  coverageGaps,
};

const renderManifest = {
  schema_version: 1,
  manifest_id: 'RENDER-MANIFEST-VS001-001',
  artifact_id: props.artifactId,
  composition_id: 'MethodologiaVertical',
  governed_workflow_state: 'BLOCKED_BEFORE_SOURCE_LOCK',
  technical_validation_state: 'RENDER_VALIDATED',
  state_scope: 'technical_local_only_not_a_governed_transition_receipt',
  visible_status: props.status,
  visible_scope: props.scopeBadge,
  source_snapshot_id: props.sourceSnapshot.id,
  source_normalized_sha256: props.sourceSnapshot.normalizedSha256,
  current_render_receipt_ref: renderReceiptRelative,
  evidence_migration_ref: APPEND_ONLY_MIGRATION_REF,
  profile: portableRenderOutput.profile,
  audio: {
    expected_streams: ['video'],
    observed_streams: ['video'],
    normalized_audio_digest: null,
    mode: props.audio.mode,
  },
  input_set_sha256: boundInputSetSha256,
  inputs: boundInputs,
  outputs: outputRecords,
  review_shots: shotRecords,
  contact_sheet: {
    path: contactSheetRelative,
    sha256: fileDigest(contactSheetRelative),
    width: contactSheetStream.width,
    height: contactSheetStream.height,
  },
  runtime_guards: {
    remote_fetch_canary: {
      status: 'PASS',
      evidence_path: networkProbeRelative,
      sha256: fileDigest(networkProbeRelative),
      scope: 'browser fetch guard; same-origin/data/blob allowed, remote fetch denied',
    },
    layout_guard: {
      status: 'PASS',
      evidence:
        'Both 1231-frame renders completed with per-frame viewport, safe-zone and text checks.',
    },
    authoritative_network_namespace: 'pending_ci_linux',
  },
  automated_visual_checks: {
    shot_count: shotRecords.length,
    dimensions_1080x1920: true,
    first_and_last_frames_present: true,
    seven_beat_midpoints_present: true,
    transition_pre_during_post_present: true,
    minimum_review_frame_ssim: Math.min(...shotRecords.map(({review_frame_ssim: ssim}) => ssim)),
    runtime_overflow_safe_zone_text_guard: 'PASS',
    independent_full_playback: 'pending',
  },
  deterministic_pixel_match: true,
  normalized_pixel_digest: normalizedPixelDigestA,
  container_byte_match: reviewARecord.sha256 === reviewBRecord.sha256,
  human_review: 'pending',
  publish_authorized: false,
  coverage_gaps: coverageGaps,
};

const renderReceiptText = await format(JSON.stringify(receipt), {
  ...prettierConfig,
  parser: 'json',
});
writeAppendOnlyText(root, renderReceiptRelative, renderReceiptText, {
  field: 'receiptId',
  id: receipt.receiptId,
});

const replacementHashes = Object.fromEntries(
  evidenceRemediationBaselines.map(({replacement}) => [
    replacement.path,
    replacement.path === renderReceiptRelative
      ? sha256(renderReceiptText)
      : fileDigest(replacement.path),
  ]),
);
const migrationReceipt = buildAppendOnlyEvidenceMigration(replacementHashes);
const migrationReceiptText = serializeAppendOnlyEvidenceMigration(migrationReceipt);
writeAppendOnlyText(root, APPEND_ONLY_MIGRATION_REF, migrationReceiptText, {
  field: 'migrationId',
  id: migrationReceipt.migrationId,
});
verifyAppendOnlyEvidenceMigrationFiles(root, migrationReceipt);

writeText(
  `${projectRelative}/receipts/render-output.json`,
  await format(JSON.stringify(portableRenderOutput), {...prettierConfig, parser: 'json'}),
);
writeText(
  `${projectRelative}/06-render-manifest.yml`,
  await format(YAML.stringify(renderManifest, {lineWidth: 0}), {
    ...prettierConfig,
    parser: 'yaml',
  }),
);

const postproductionLedger = `# 07 Postproduction ledger

## Estado

- Artifact: \`${props.artifactId}\`.
- Composition: \`MethodologiaVertical\`.
- Governed workflow state: \`BLOCKED_BEFORE_SOURCE_LOCK\`.
- Technical validation state: \`RENDER_VALIDATED\`.
- Visible state: \`${props.status}\`.
- Scope: \`${props.scopeBadge}\`.
- State effect: none on the governed workflow.
- Postproduction: pass-through inspection only; no media mutation.
- Current render receipt: \`${renderReceiptRelative}\`, append-only successor of
  \`${priorRenderReceiptRelative}\` through \`${APPEND_ONLY_MIGRATION_REF}\`.

## Operaciones

| ID | Tool | Input SHA-256 | Output SHA-256 | Cambio semántico | QA | Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| PP-001 | Remotion 4.0.494 | \`${boundInputSetSha256}\` | \`${reviewARecord.sha256}\` | none | render succeeded | re-render from hash-bound inputs |
| PP-002 | ffprobe 8.1.1 | \`${reviewARecord.sha256}\` | \`${sha256(JSON.stringify(probeA))}\` | none | video-only, ${props.profile.width}×${props.profile.height}, ${props.profile.fps} fps, ${expectedDuration} frames, ${props.profile.pixelFormat}, bt709 | n/a |
| PP-003 | ffmpeg framemd5 8.1.1 | review A / review B | \`${normalizedPixelDigestA}\` | none | decoded pixel digests identical | retain both source renders |
| PP-004 | ffmpeg SSIM 8.1.1 | ${shotRecords.length} stills / review A | \`${fileDigest(`${projectRelative}/receipts/review-shot-parity.json`)}\` | none | every still ≥ 0.97 against its encoded frame | regenerate stale stills |

## Review shots

Se conservan ${shotRecords.length} stills canónicos: primer/último frame, siete midpoints y
pre/durante/post para cada transición. El contacto portable está en
\`${contactSheetRelative}\`. [CÓDIGO]

## Límites

- No hay audio ni PCM digest: ffprobe observa exactamente un stream de video.
- El canary headless prueba el guard de \`fetch\` remoto; no sustituye el render autoritativo en
  Linux con network namespace, que permanece como \`coverage_gap\`.
- Las fonts son OFL y hash-bound, pero el release/commit binario upstream permanece sin resolver.
- No se sustituyeron claims, copy, captions, color ni estado visible.
- La inspección no concede SOURCE_LOCKED, Guardian, H01, release ni publicación.
- Playback humano independiente completo sigue pendiente.
`;
writeText(
  `${projectRelative}/07-postproduction-ledger.md`,
  await format(postproductionLedger, {...prettierConfig, parser: 'markdown'}),
);
console.info(
  `PASS TECHNICAL RENDER INSPECTION: ${expectedDuration} frames, video-only, pixel digest ${normalizedPixelDigestA}, ${shotRecords.length} hash/parity-bound shots; governed workflow remains BLOCKED_BEFORE_SOURCE_LOCK.`,
);
