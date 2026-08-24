import {deriveCopyRoleHashes} from 'workflows/video-os/_runner/method-explainer-copy-policy.ts';
import type {CopyPolicyInput} from 'workflows/video-os/_runner/method-explainer-copy-policy.ts';

export const HASH = 'a'.repeat(64);
export const makeCopyInput = (overrides: Partial<CopyPolicyInput> = {}): CopyPolicyInput => ({
  beat_id: 'BEAT-PASA-01',
  voice_contract_sha256: HASH,
  voiceover: 'Primero definimos evidencia para orientar cada decisión con criterio.',
  accessibility_caption: 'Primero definimos evidencia para orientar cada decisión con criterio.',
  on_screen: ['Intención verificable', 'Criterio humano'],
  ...overrides,
});

export const makeCopyException = (
  input: CopyPolicyInput,
  rule: 'VOICE_SCREEN_LITERAL' | 'VOICE_SCREEN_CONTAINMENT' | 'VOICE_SCREEN_OVERLAP',
) => ({
  schema_version: 'method-explainer-copy-exception-v1' as const,
  beat_id: input.beat_id,
  rule,
  voice_contract_sha256: input.voice_contract_sha256,
  role_hashes: deriveCopyRoleHashes(input),
  rationale: 'Excepción editorial candidata, pendiente de revisión humana material.',
  authority: 'editorial' as const,
  review: {
    status: 'PENDING_H01' as const,
    reviewer_id: 'H01' as const,
    approval_candidate: {ref: 'approvals/h01-copy.json', sha256: 'b'.repeat(64), size_bytes: 12},
    binding_verification: 'UNVERIFIED' as const,
  },
});
