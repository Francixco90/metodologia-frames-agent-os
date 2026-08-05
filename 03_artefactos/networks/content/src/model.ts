import {z} from 'zod';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const canonicalIncorporatedElements = [
  'three-question-breadcrumb',
  'text-shape-pattern-reduced-motion-rights-first',
  'zero-of-four-claims-hash-custody',
  'persistent-signal-web-motion-fork',
] as const;

export const canonicalCommitteeElementSignatures = [
  ['PROP-VS001-04-RT05', 'Tres preguntas como headers y breadcrumb.'],
  ['PROP-VS001-05-RT09', 'Estado por texto, forma y patrón; reduced-motion y rights-first.'],
  ['PROP-VS001-03-RT08', 'Semántica 0/4, claim IDs y hash.'],
  ['PROP-VS001-01-RT07', 'Señal persistente y bifurcación Web/Motion.'],
] as const;

export const claimIdSchema = z.enum(['CLM-VS001-001', 'CLM-VS001-002', 'CLM-VS001-003']);

export const configRefSchema = z.enum([
  'CFG-CANONICAL-CORPUS-GAP',
  'CFG-COMMITTEE-DECISION',
  'CFG-LOCAL-EVALUATION',
]);

export const beatCopySchema = z
  .strictObject({
    beatId: z.string().regex(/^B0[1-7]-[a-z0-9-]+$/u),
    question: z.enum(['¿De dónde sale?', '¿Cómo se decide?', '¿Hasta dónde llega?']),
    eyebrow: z.string().min(1).max(80),
    headline: z.string().min(1).max(110),
    body: z.string().min(1).max(260),
    caption: z.string().min(1).max(190),
    claimIds: z.array(claimIdSchema).max(3),
    configRefs: z.array(configRefSchema).max(3),
    minimumHoldSeconds: z.number().min(2).max(12),
    layout: z.enum(['opening', 'source', 'committee', 'custody', 'fork', 'gate', 'closing']),
    visualAction: z.string().min(1).max(240),
    components: z
      .array(
        z.enum([
          'BeatScene',
          'Breadcrumb',
          'CaptionBand',
          'LayoutGuard',
          'PersistentChrome',
          'SceneGlyph',
          'SignalRail',
          'StatusBadge',
        ]),
      )
      .min(3),
    mood: z.enum([
      'deliberate-opening',
      'source-evidence',
      'committee-contrast',
      'custody-proof',
      'coherent-fork',
      'fail-closed-limit',
      'deliberate-closing',
    ]),
    transition: z.strictObject({
      kind: z.literal('overlap-opacity-translate-y'),
      reducedMotion: z.literal('opacity-only-with-persistent-layout'),
    }),
    accessibility: z.array(z.string().min(1)).min(3),
  })
  .superRefine(({claimIds, configRefs}, context) => {
    if (claimIds.length + configRefs.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Every beat must resolve to an allowed claim or governed configuration.',
        path: ['claimIds'],
      });
    }
  });

export const campaignCopySchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    projectId: z.literal('vs-001-source-to-campaign'),
    workProductId: z.literal('REMOTION-VS001'),
    language: z.literal('es-CO'),
    deterministicTimestamp: z.iso.datetime({offset: true}),
    creativeDirection: z.strictObject({
      proposalId: z.literal('PROP-VS001-02-RT04'),
      title: z.literal('Cadena visible'),
      synthesisId: z.literal('SYNTHESIS-VS001-MOTION-01'),
      incorporatedElements: z.tuple([
        z.literal(canonicalIncorporatedElements[0]),
        z.literal(canonicalIncorporatedElements[1]),
        z.literal(canonicalIncorporatedElements[2]),
        z.literal(canonicalIncorporatedElements[3]),
      ]),
    }),
    sourceSnapshot: z.strictObject({
      sourceId: z.literal('SRC-SYNTH-VS001'),
      sourceSnapshotId: z.literal('synthetic-vs-001-v1'),
      normalizedSha256: sha256Schema,
      allowedUseScope: z.literal('local_contract_testing_only'),
    }),
    requestedState: z.literal('RENDERED_DRAFT'),
    scopeBadge: z.literal('LOCAL TEST ONLY'),
    persistentBadges: z.tuple([z.literal('RENDERED_DRAFT'), z.literal('LOCAL TEST ONLY')]),
    videoContract: z.strictObject({
      objective: z.string().min(1).max(300),
      audience: z.array(z.string().min(1).max(120)).min(1),
      narrativeThesis: z.string().min(1).max(300),
      format: z.literal('vertical_video'),
      platform: z.literal('local_remotion_review'),
      centralMetaphor: z.strictObject({
        value: z.literal('cadena causal visible'),
        rationale: z.string().min(1).max(240),
      }),
      emotionalVisualArc: z.tuple([
        z.literal('claridad inicial'),
        z.literal('confianza por evidencia'),
        z.literal('límite deliberado'),
      ]),
      designSystemRef: z.literal(
        'projects/vs-001-source-to-campaign/remotion/03-visual-philosophy.md',
      ),
      componentRegistryRef: z.literal(
        'projects/vs-001-source-to-campaign/remotion/04-component-registry.yml',
      ),
      humanApprovalRequired: z.literal(true),
    }),
    profile: z.strictObject({
      width: z.literal(1080),
      height: z.literal(1920),
      fps: z.number().int().min(24).max(60),
      codec: z.literal('h264'),
      pixelFormat: z.literal('yuv420p'),
      safeZonePx: z.number().int().min(64).max(160),
    }),
    timingPolicy: z.strictObject({
      wordsPerMinute: z.number().int().min(130).max(190),
      playbackMargin: z.number().min(1).max(1.5),
      captionLeadFrames: z.number().int().min(1).max(60),
      captionTrailFrames: z.number().int().min(1).max(60),
      transitionFrames: z.number().int().min(1).max(45),
    }),
    audio: z.strictObject({
      mode: z.literal('silent-first'),
      streams: z.tuple([]),
      reason: z.literal('no-audio-rights-receipt'),
    }),
    messagesForbidden: z.array(z.string().min(1)).min(4),
    beats: z.array(beatCopySchema).length(7),
  })
  .superRefine(({beats}, context) => {
    const beatIds = new Set(beats.map(({beatId}) => beatId));
    if (beatIds.size !== beats.length) {
      context.addIssue({
        code: 'custom',
        message: 'Beat IDs must be unique.',
        path: ['beats'],
      });
    }

    const usedClaims = new Set(beats.flatMap(({claimIds}) => claimIds));
    for (const claimId of claimIdSchema.options) {
      if (!usedClaims.has(claimId)) {
        context.addIssue({
          code: 'custom',
          message: `Allowed claim ${claimId} must appear in at least one beat.`,
          path: ['beats'],
        });
      }
    }

    const questions = [...new Set(beats.map(({question}) => question))];
    if (questions.length !== 3) {
      context.addIssue({
        code: 'custom',
        message: 'The selected direction requires exactly three breadcrumb questions.',
        path: ['beats'],
      });
    }
  });

export type BeatCopy = z.infer<typeof beatCopySchema>;
export type CampaignCopy = z.infer<typeof campaignCopySchema>;
