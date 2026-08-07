// prepare-project/validate-inputs.ts — loads campaign copy, captions, beat map,
// claims ledger and committee decision; asserts the persisted captions match
// the deterministic A07 derivation and the beat map matches P02 ordered synthesis.
// [CÓDIGO]
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {z} from 'zod';
import YAML from 'yaml';

import {
  campaignCopySchema,
  canonicalCommitteeElementSignatures,
  canonicalIncorporatedElements,
} from '../../../../networks/content/src/model.ts';
import {deriveTimeline} from '../../../../networks/content/src/timing.ts';

export type CampaignCopy = z.infer<typeof campaignCopySchema>;
export type Timeline = ReturnType<typeof deriveTimeline>;

export type LoadedInputs = {
  readonly copy: CampaignCopy;
  readonly timeline: Timeline;
  readonly rawBeatMap: string;
  readonly rawCaptions: string;
  readonly rawClaimLedger: string;
  readonly rawCommitteeDecision: string;
};

const readText = (path: string): string => readFileSync(path, 'utf8');

export const loadAndValidateInputs = (root: string): LoadedInputs => {
  const projectRoot = resolve(root, 'projects/vs-001-source-to-campaign');
  const motionRoot = resolve(projectRoot, 'remotion');
  const copyPath = resolve(projectRoot, 'content/campaign-copy.json');
  const captionsPath = resolve(motionRoot, 'captions.json');
  const beatMapPath = resolve(motionRoot, '02-beat-map.yml');
  const claimLedgerPath = resolve(projectRoot, 'claims-ledger.yml');
  const committeeDecisionPath = resolve(motionRoot, 'committee/committee-decision.json');

  const rawCopy = readText(copyPath);
  const rawCaptions = readText(captionsPath);
  const rawBeatMap = readText(beatMapPath);
  const rawClaimLedger = readText(claimLedgerPath);
  const rawCommitteeDecision = readText(committeeDecisionPath);

  const copy = campaignCopySchema.parse(JSON.parse(rawCopy));
  const timeline = deriveTimeline(copy);
  const persistedCaptions = JSON.parse(rawCaptions) as {
    durationInFrames: number;
    captions: Timeline['captions'];
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
    JSON.stringify(committeeElementSignatures) !==
      JSON.stringify(canonicalCommitteeElementSignatures)
  ) {
    throw new Error('Beat map and committee decision do not match exact P02 ordered synthesis.');
  }

  return {copy, timeline, rawBeatMap, rawCaptions, rawClaimLedger, rawCommitteeDecision};
};
