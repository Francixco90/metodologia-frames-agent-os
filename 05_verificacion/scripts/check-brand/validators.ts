// check-brand/validators.ts — source bundle + voice profile validation logic.
// [CÓDIGO]
import {sourceBundleSchema, voiceProfileSchema} from './schemas-core.ts';
import {expectedSources} from './expected-sources.ts';

export const validateSourceBundleObject = (input: unknown): string[] => {
  const parsed = sourceBundleSchema.safeParse(input);
  if (!parsed.success) return [`BR001 invalid source bundle: ${parsed.error.message}`];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const source of parsed.data.sources) {
    if (seen.has(source.source_id)) errors.push(`BR002 duplicate source_id ${source.source_id}`);
    seen.add(source.source_id);
    const expected = expectedSources.get(source.source_id);
    if (expected === undefined) {
      errors.push(`BR002 unexpected source ${source.source_id}`);
      continue;
    }
    if (
      source.relative_path !== expected.path ||
      source.sha256 !== expected.sha256 ||
      source.dirty !== expected.dirty ||
      source.commit_bound !== expected.commitBound ||
      source.authority_class !== expected.authority
    ) {
      errors.push(`BR002 source binding drift ${source.source_id}`);
    }
    if (source.dirty && source.authority_class !== 'observational_only') {
      errors.push(`BR003 dirty source promoted as authority ${source.source_id}`);
    }
    if (
      source.authority_class === 'stable_projection_authority' &&
      (source.dirty || !source.commit_bound)
    ) {
      errors.push(`BR003 unstable source promoted as stable ${source.source_id}`);
    }
  }
  for (const expectedId of expectedSources.keys()) {
    if (!seen.has(expectedId)) errors.push(`BR002 missing source ${expectedId}`);
  }
  return errors;
};

export const validateVoiceProfileObject = (input: unknown): string[] => {
  const parsed = voiceProfileSchema.safeParse(input);
  if (!parsed.success) return [`VOICE001 invalid voice profile: ${parsed.error.message}`];
  const errors: string[] = [];
  const pillarIds = parsed.data.pillars.map(({pillar_id: id}) => id).sort();
  if (pillarIds.join(',') !== 'P1,P2,P3') errors.push('VOICE002 pillars must be P1,P2,P3');
  const expectedEvidence = ['dato_real', 'dato_requerido', 'indicador_sugerido', 'señal_a_medir'];
  if (
    parsed.data.evidence_policy.strong_claim_requires_one_of.slice().sort().join(',') !==
    expectedEvidence.sort().join(',')
  ) {
    errors.push('VOICE003 evidence taxonomy drift');
  }
  const expectedCta = ['contexto', 'objeto', 'verbo'];
  if (
    parsed.data.cta_contract.required_parts.slice().sort().join(',') !==
    expectedCta.sort().join(',')
  ) {
    errors.push('VOICE003 CTA must require verbo, objeto and contexto');
  }
  const voiceCandidate = parsed.data.source_bindings.find(
    ({source_id: sourceId}) => sourceId === 'BRAND-SRC-VOICE-V3',
  );
  if (voiceCandidate?.authority_class !== 'first_party_candidate') {
    errors.push('VOICE004 voice candidate promoted beyond source authority');
  }
  for (const forbidden of ['HUMAN_APPROVED', 'READY', 'PUBLISHED']) {
    if (!parsed.data.gate_effect.blocked_scope.includes(forbidden)) {
      errors.push(`VOICE004 candidate voice must block ${forbidden}`);
    }
  }
  return errors;
};
