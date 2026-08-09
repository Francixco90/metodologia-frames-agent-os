import {EvidenceBankV1Schema, type EvidenceBankV1} from '../_schema/contracts-v1.schema.ts';
import {
  CareerCvV1Schema,
  CareerLetterV1Schema,
  type CareerCvV1,
  type CareerLetterV1,
} from '../_schema/document-v1.schema.ts';
import {sha256Text, stableStringify} from './canonical.ts';

type CareerDocument = CareerCvV1 | CareerLetterV1;

export class CareerEvidenceError extends Error {
  public constructor(public readonly issues: readonly string[]) {
    super(`CAREER-EVIDENCE-BLOCKED: ${issues.join(', ')}`);
    this.name = 'CareerEvidenceError';
  }
}

export const calculateEvidenceBankHash = (bank: EvidenceBankV1): string =>
  sha256Text(stableStringify({candidate_id: bank.candidate_id, evidence: bank.evidence}));

export const assertCareerEvidence = (
  documentInput: unknown,
  bankInput: unknown,
): CareerDocument => {
  const document =
    typeof documentInput === 'object' && documentInput !== null && 'schema_version' in documentInput
      ? documentInput.schema_version === 'career-cv-v1'
        ? CareerCvV1Schema.parse(documentInput)
        : CareerLetterV1Schema.parse(documentInput)
      : CareerLetterV1Schema.parse(documentInput);
  const bank = EvidenceBankV1Schema.parse(bankInput);
  const issues: string[] = [];
  if (bank.candidate_id !== document.candidate_id) issues.push('CANDIDATE_MISMATCH');
  if (calculateEvidenceBankHash(bank) !== bank.bank_sha256) issues.push('BANK_HASH_MISMATCH');
  const channel = document.schema_version === 'career-cv-v1' ? 'cv' : document.channel;
  const claims =
    document.schema_version === 'career-cv-v1'
      ? document.experience.flatMap(({achievements}) => achievements)
      : document.claims;
  const byId = new Map(bank.evidence.map((item) => [item.evidence_id, item]));
  for (const claim of claims) {
    claim.evidence_ids.forEach((id, index) => {
      const evidence = byId.get(id);
      if (!evidence) return issues.push(`${claim.claim_id}:EVIDENCE_MISSING:${id}`);
      if (!['verified', 'user_confirmed'].includes(evidence.confidence)) {
        issues.push(`${claim.claim_id}:CONFIDENCE_NOT_PROMOTABLE:${id}`);
      }
      if (!evidence.allowed_channels.includes(channel)) {
        issues.push(`${claim.claim_id}:CHANNEL_NOT_ALLOWED:${id}`);
      }
      if (!evidence.source_sha256 || evidence.source_sha256 !== claim.evidence_hashes[index]) {
        issues.push(`${claim.claim_id}:EVIDENCE_HASH_MISMATCH:${id}`);
      }
    });
  }
  if (issues.length > 0) throw new CareerEvidenceError(issues);
  return document;
};
