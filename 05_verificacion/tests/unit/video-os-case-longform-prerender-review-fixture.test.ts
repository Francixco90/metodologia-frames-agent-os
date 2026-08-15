import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  CaseLongformAudioDictionaryReceipt,
  CaseLongformAudioTranscript,
  CaseLongformPrerenderReviewAuthoritySchema,
  CaseLongformSemanticPolicyReceipt,
  deriveCaseLongformAudioMatches,
  deriveCaseLongformAudioOperations,
  deriveCaseLongformPcmDonorEvidence,
} from 'workflows/video-os/index.ts';
import {CaseLongformSourceSet} from 'workflows/video-os/_runner/case-longform-graph-structure.ts';
import {
  cleanupCaseFixtures,
  materializeCaseLongformGraphFixture,
  readCaseFixture,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';

export const materializeCaseLongformPrerenderReviewFixture = () => {
  const base = materializeCaseLongformGraphFixture();
  const {root, job, options, contract} = base;
  const a = contract.artifacts;
  const sourceSet = CaseLongformSourceSet.parse(readCaseFixture(root, a.source_set));
  const oldPolicy = CaseLongformSemanticPolicyReceipt.parse(
    readCaseFixture(options.trustPolicy.authorityRoot, a.semantic_policy_receipt),
  );
  // prettier-ignore
  const dictionaryValue = CaseLongformAudioDictionaryReceipt.parse({schema_version: 'case-longform-audio-dictionary-receipt-v1',
    kind: 'audio_dictionary_receipt', job_id: job, plan_sha256: a.plan.sha256,
    source_set_sha256: contract.source_set_sha256, actor_id: oldPolicy.actor_id, entries: [
      {dictionary_id: 'company-clause', variants: ['empresa reservada'], required_treatment: 'CUT_CLAUSE', caption_replacement: 'la empresa'},
      {dictionary_id: 'portal-identifier', variants: ['portal reservado'], required_treatment: 'ROOM_TONE_IDENTIFIER', caption_replacement: '[URL oculta]'}]});
  const dictionary = writeCaseFixture(
    options.trustPolicy.authorityRoot,
    'audio-dictionary.json',
    dictionaryValue,
  );
  // prettier-ignore
  const policyV2Value = {schema_version: 'case-longform-semantic-policy-receipt-v2', kind: 'semantic_policy_receipt_v2',
    job_id: job, plan_sha256: a.plan.sha256, source_set_sha256: contract.source_set_sha256,
    previous_policy_sha256: a.semantic_policy_receipt.sha256, audio_dictionary_sha256: dictionary.sha256,
    actor_id: oldPolicy.actor_id, participants: oldPolicy.participants};
  const policyV2 = writeCaseFixture(
    options.trustPolicy.authorityRoot,
    'semantic-policy-v2.json',
    policyV2Value,
  );
  const speech = (id: string, start_frame: number, end_frame: number, text: string) => ({
    id,
    kind: 'speech' as const,
    start_frame,
    end_frame,
    text,
  });
  // prettier-ignore
  const transcriptValue = CaseLongformAudioTranscript.parse({schema_version: 'case-longform-audio-transcript-v1',
    kind: 'audio_transcript', job_id: job, source_set_sha256: contract.source_set_sha256, fps: 24,
    sources: sourceSet.sources.map((source) => ({role: source.role, source_sha256: source.media.sha256,
      media: source.media, frame_count: 24, segments: source.role === 'body' ?
        [speech('body-before', 0, 2, 'Caso.'), speech('body-cut', 3, 3, 'empresa-reservada'),
          speech('body-after', 4, 23, 'Proceso.')] : source.role === 'closure' ?
        [speech('closure-room', 0, 1, 'portal\nreservado'), speech('closure-after', 2, 23, 'Final.')] :
        [speech(`${source.role}-all`, 0, 23, `${source.role} sin identificadores.`)]}))});
  const transcript = writeCaseFixture(root, 'audio-transcript.json', transcriptValue);
  const matches = deriveCaseLongformAudioMatches(transcriptValue, dictionaryValue);
  const closure = sourceSet.sources.find(({role}) => role === 'closure')!;
  const donor = deriveCaseLongformPcmDonorEvidence(
    readFileSync(resolve(root, closure.media.ref)),
    closure.media,
    closure.media.sha256,
    2,
    3,
  );
  const operations = deriveCaseLongformAudioOperations(
    matches,
    dictionaryValue,
    base.values.segments,
  ).map((operation) =>
    operation.treatment === 'ROOM_TONE_IDENTIFIER' ? {...operation, donor} : operation,
  );
  // prettier-ignore
  const audioValue = {schema_version: 'case-longform-audio-redaction-map-v1', kind: 'audio_redaction_map',
    job_id: job, graph_sha256: a.operation_graph.sha256, source_set_sha256: contract.source_set_sha256,
    dictionary_sha256: dictionary.sha256, transcript_sha256: transcript.sha256,
    source_segment_map_sha256: a.source_segment_map.sha256, matches, operations};
  const audio = writeCaseFixture(root, 'audio-redaction.json', audioValue);
  const reviewContract = CaseLongformPrerenderReviewAuthoritySchema.parse({
    schema_version: 'case-longform-prerender-review-authority-v3',
    job_id: job,
    source_set_sha256: contract.source_set_sha256,
    artifacts: {
      ...a,
      semantic_policy_receipt_v2: policyV2,
      audio_dictionary_receipt: dictionary,
      audio_transcript: transcript,
      audio_redaction_map: audio,
    },
    status: 'BLOCKED_PENDING_SEMANTIC_AND_PRESERVATION_CONTRACTS',
  });
  return {
    ...base,
    reviewContract,
    values: {
      ...base.values,
      dictionary: dictionaryValue,
      policyV2: policyV2Value,
      transcript: transcriptValue,
      audio: audioValue,
    },
  };
};

afterEach(cleanupCaseFixtures);
describe('case-longform PR1c0b1a fixture', () => {
  it('materializes a blocked audio authority', () => {
    expect(materializeCaseLongformPrerenderReviewFixture().reviewContract.status).toBe(
      'BLOCKED_PENDING_SEMANTIC_AND_PRESERVATION_CONTRACTS',
    );
  });
});
