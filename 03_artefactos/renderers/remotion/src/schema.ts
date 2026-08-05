import type {CalculateMetadataFunction} from 'remotion';
import {z} from 'zod';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const claimIdSchema = z.enum(['CLM-VS001-001', 'CLM-VS001-002', 'CLM-VS001-003']);
const questionSchema = z.enum(['¿De dónde sale?', '¿Cómo se decide?', '¿Hasta dónde llega?']);

export const renderCaptionSchema = z.strictObject({
  captionId: z.string().regex(/^CAP-B0[1-7]-[a-z0-9-]+$/u),
  beatId: z.string().regex(/^B0[1-7]-[a-z0-9-]+$/u),
  text: z.string().min(1).max(190),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  wordCount: z.number().int().positive(),
  readingFrames: z.number().int().positive(),
  effectiveWordsPerMinute: z.number().positive().max(165),
});

export const renderBeatSchema = z.strictObject({
  beatId: z.string().regex(/^B0[1-7]-[a-z0-9-]+$/u),
  question: questionSchema,
  eyebrow: z.string().min(1).max(80),
  headline: z.string().min(1).max(110),
  body: z.string().min(1).max(260),
  claimIds: z.array(claimIdSchema).max(3),
  configRefs: z.array(z.string().regex(/^CFG-[A-Z0-9-]+$/u)).max(3),
  layout: z.enum(['opening', 'source', 'committee', 'custody', 'fork', 'gate', 'closing']),
  fromFrame: z.number().int().nonnegative(),
  toFrame: z.number().int().positive(),
  durationFrames: z.number().int().positive(),
  incomingTransitionFrames: z.number().int().nonnegative(),
  outgoingTransitionFrames: z.number().int().nonnegative(),
  captionId: z.string().regex(/^CAP-B0[1-7]-[a-z0-9-]+$/u),
});

export const methodologiaVerticalPropsSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    projectId: z.literal('vs-001-source-to-campaign'),
    artifactId: z.literal('REMOTION-VS001'),
    language: z.literal('es-CO'),
    status: z.literal('RENDERED_DRAFT'),
    scopeBadge: z.literal('LOCAL TEST ONLY'),
    creativeDirection: z.strictObject({
      proposalId: z.literal('PROP-VS001-02-RT04'),
      title: z.literal('Cadena visible'),
      synthesisId: z.literal('SYNTHESIS-VS001-MOTION-01'),
      incorporatedElements: z.tuple([
        z.literal('three-question-breadcrumb'),
        z.literal('text-shape-pattern-reduced-motion-rights-first'),
        z.literal('zero-of-four-claims-hash-custody'),
        z.literal('persistent-signal-web-motion-fork'),
      ]),
    }),
    sourceSnapshot: z.strictObject({
      sourceId: z.literal('SRC-SYNTH-VS001'),
      id: z.literal('synthetic-vs-001-v1'),
      normalizedSha256: sha256Schema,
    }),
    claims: z
      .array(
        z.strictObject({
          claimId: claimIdSchema,
          sourceId: z.literal('SRC-SYNTH-VS001'),
        }),
      )
      .length(3),
    profile: z.strictObject({
      width: z.literal(1080),
      height: z.literal(1920),
      fps: z.number().int().min(24).max(60),
      codec: z.literal('h264'),
      pixelFormat: z.literal('yuv420p'),
      safeZonePx: z.number().int().min(64).max(160),
      transitionFrames: z.number().int().positive().max(45),
    }),
    canonicalCoverage: z.strictObject({
      confirmed: z.literal(0),
      expected: z.literal(4),
      semantic: z.literal('coverage_gap_not_kpi'),
    }),
    audio: z.strictObject({
      mode: z.literal('silent-first'),
      streams: z.tuple([]),
      reason: z.literal('no-audio-rights-receipt'),
    }),
    reducedMotion: z.boolean(),
    breadcrumbQuestions: z.tuple([
      z.literal('¿De dónde sale?'),
      z.literal('¿Cómo se decide?'),
      z.literal('¿Hasta dónde llega?'),
    ]),
    chainStages: z.tuple([
      z.strictObject({stageId: z.literal('source'), label: z.literal('Fuente')}),
      z.strictObject({stageId: z.literal('committee'), label: z.literal('Comité')}),
      z.strictObject({stageId: z.literal('products'), label: z.literal('Web · Motion')}),
      z.strictObject({stageId: z.literal('gate'), label: z.literal('Gate')}),
    ]),
    beats: z.array(renderBeatSchema).length(7),
    captions: z.array(renderCaptionSchema).length(7),
  })
  .superRefine(({beats, captions, profile, claims}, context) => {
    const beatIds = new Set(beats.map(({beatId}) => beatId));
    const captionIds = new Set(captions.map(({captionId}) => captionId));
    const claimIds = new Set(claims.map(({claimId}) => claimId));
    if (beatIds.size !== beats.length || captionIds.size !== captions.length) {
      context.addIssue({
        code: 'custom',
        message: 'Beat and caption IDs must be unique.',
        path: ['beats'],
      });
    }
    if (claimIds.size !== 3) {
      context.addIssue({
        code: 'custom',
        message: 'Exactly the three active VS-001 claims must be present.',
        path: ['claims'],
      });
    }

    for (const [index, beat] of beats.entries()) {
      if (beat.toFrame - beat.fromFrame !== beat.durationFrames) {
        context.addIssue({
          code: 'custom',
          message: `Beat ${beat.beatId} duration does not match its range.`,
          path: ['beats', index, 'durationFrames'],
        });
      }
      const caption = captions.find(({captionId}) => captionId === beat.captionId);
      if (
        caption === undefined ||
        caption.beatId !== beat.beatId ||
        caption.startFrame < beat.fromFrame + beat.incomingTransitionFrames ||
        caption.endFrame > beat.toFrame - beat.outgoingTransitionFrames
      ) {
        context.addIssue({
          code: 'custom',
          message: `Caption for ${beat.beatId} is absent or outside the readable beat window.`,
          path: ['captions'],
        });
      }

      if (index === 0 && beat.fromFrame !== 0) {
        context.addIssue({
          code: 'custom',
          message: 'The first beat must start at frame zero.',
          path: ['beats', index, 'fromFrame'],
        });
      }
      const previous = beats[index - 1];
      if (
        previous !== undefined &&
        previous.toFrame - beat.fromFrame !== profile.transitionFrames
      ) {
        context.addIssue({
          code: 'custom',
          message: `Transition into ${beat.beatId} must have the governed overlap.`,
          path: ['beats', index, 'fromFrame'],
        });
      }
    }

    for (const [index, caption] of captions.entries()) {
      if (caption.endFrame <= caption.startFrame) {
        context.addIssue({
          code: 'custom',
          message: `Caption ${caption.captionId} has a non-positive duration.`,
          path: ['captions', index, 'endFrame'],
        });
      }
      const next = captions[index + 1];
      if (next !== undefined && caption.endFrame > next.startFrame) {
        context.addIssue({
          code: 'custom',
          message: `Caption ${caption.captionId} overlaps ${next.captionId}.`,
          path: ['captions', index],
        });
      }
    }
  });

export type MethodologiaVerticalProps = z.infer<typeof methodologiaVerticalPropsSchema>;
export type RenderBeat = z.infer<typeof renderBeatSchema>;

export const calculateMethodologiaVerticalMetadata: CalculateMetadataFunction<
  MethodologiaVerticalProps
> = ({props}) => {
  const parsed = methodologiaVerticalPropsSchema.parse(props);
  const durationInFrames = parsed.beats.at(-1)?.toFrame;
  if (durationInFrames === undefined) {
    throw new Error('A derived timeline requires at least one beat.');
  }

  return {
    width: parsed.profile.width,
    height: parsed.profile.height,
    fps: parsed.profile.fps,
    durationInFrames,
    props: parsed,
    defaultCodec: parsed.profile.codec,
    defaultPixelFormat: parsed.profile.pixelFormat,
  };
};
