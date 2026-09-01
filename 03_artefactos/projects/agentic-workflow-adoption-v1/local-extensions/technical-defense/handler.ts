import type {MaterialSkillHandlerV2} from 'workflows/core/material-skill-adapter-v2.ts';

import {TechnicalDefenseCaseV1Schema} from './technical-defense-contracts-v1.ts';
import {
  TECHNICAL_DEFENSE_OUTPUT_REFS_V1,
  renderTechnicalDefenseV1,
  technicalDefenseOutputBytesV1,
} from './technical-defense-render-v1.ts';

export * from './technical-defense-contracts-v1.ts';
export {TECHNICAL_DEFENSE_OUTPUT_REFS_V1} from './technical-defense-render-v1.ts';

export const TECHNICAL_DEFENSE_EXTENSION_ID = 'local.metodologia.technical-defense-preparation';
export const TECHNICAL_DEFENSE_EXECUTION_MODULE_REFS_V1 = [
  'handler.ts',
  'technical-defense-contracts-v1.ts',
  'technical-defense-render-v1.ts',
] as const;

export const createTechnicalDefenseHandlerV1 = (raw: unknown): MaterialSkillHandlerV2 => {
  const rendered = renderTechnicalDefenseV1(TechnicalDefenseCaseV1Schema.parse(raw));
  return () => ({
    intents: TECHNICAL_DEFENSE_OUTPUT_REFS_V1.map((ref) => ({
      ref,
      bytes: technicalDefenseOutputBytesV1(rendered[ref]),
    })),
  });
};
