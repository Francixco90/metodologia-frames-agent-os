// prepare-project/build-props.ts — builds and schema-validates the A08 input
// props object from campaign copy and the derived timeline. Key order byte-stable.
// [CÓDIGO]
import {methodologiaVerticalPropsSchema} from '../../src/schema.ts';
import type {CampaignCopy, Timeline} from './validate-inputs.ts';

export const buildProps = (copy: CampaignCopy, timeline: Timeline) =>
  methodologiaVerticalPropsSchema.parse({
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

export type Props = ReturnType<typeof buildProps>;