import {parityFields, textContent} from './html-verifier.mjs';

const normalizeMetric = (value) => value.replaceAll(',', '.').match(/[0-9]+(?:\.[0-9]+)?/gu) ?? [];

export const verifyBilingualParity = ({source, evidenceBank, esHtml, enHtml}) => {
  const issues = [];
  const esFields = parityFields(esHtml);
  const enFields = parityFields(enHtml);
  for (const key of ['identity', 'role', 'date', 'metric', 'attribution']) {
    const expectedEs = key === 'identity' ? source.identity : source.variants.es[key];
    const expectedEn = key === 'identity' ? source.identity : source.variants.en[key];
    if (esFields[key] !== expectedEs) issues.push(`PARITY_ES_${key.toUpperCase()}`);
    if (enFields[key] !== expectedEn) issues.push(`PARITY_EN_${key.toUpperCase()}`);
  }
  if (esFields.identity !== enFields.identity) issues.push('PARITY_IDENTITY_DRIFT');
  if (esFields.date !== enFields.date) issues.push('PARITY_DATE_DRIFT');
  if (esFields.attribution !== enFields.attribution) issues.push('PARITY_ATTRIBUTION_DRIFT');
  if (
    normalizeMetric(esFields.metric ?? '').join('|') !==
    normalizeMetric(enFields.metric ?? '').join('|')
  ) {
    issues.push('PARITY_METRIC_DRIFT');
  }
  for (const claim of evidenceBank.claims) {
    if (claim.confidence !== 'verified' && claim.confidence !== 'user_confirmed') {
      issues.push(`CLAIM_CONFIDENCE:${claim.evidence_id}`);
    }
    if (!claim.channels.includes('cv')) issues.push(`CLAIM_CHANNEL:${claim.evidence_id}`);
    if (!textContent(esHtml).includes(claim.es)) issues.push(`CLAIM_ES:${claim.evidence_id}`);
    if (!textContent(enHtml).includes(claim.en)) issues.push(`CLAIM_EN:${claim.evidence_id}`);
    for (const metric of claim.metrics) {
      if (!normalizeMetric(esHtml).includes(metric) || !normalizeMetric(enHtml).includes(metric)) {
        issues.push(`CLAIM_METRIC:${claim.evidence_id}:${metric}`);
      }
    }
  }
  return {status: issues.length ? 'BLOCKED' : 'PASS', issues};
};
