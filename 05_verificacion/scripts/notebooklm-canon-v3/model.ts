import {z} from 'zod';

import type {KnowledgeDocumentMetadataV1} from '../../../02_proceso/core/contracts/index.ts';

export const CANON_V3_DEFAULT_ROOT =
  '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3';
export const CANON_V3_WORD_BUDGET = 33_682;
export const CANON_V3_BOOTSTRAP_CHARACTER_BUDGET = 9_500;
export const CANON_V3_DUPLICATE_CONTAINMENT_LIMIT = 0.25;

export const REQUIRED_CONTROL_IDS = [
  'CTRL-KNOWLEDGE-MAP-V3',
  'CTRL-AUTHORITY-ROUTER-V3',
  'CTRL-SYSTEM-PROMPT-V3',
  'CTRL-BOOTSTRAP-V3',
  'CTRL-KB-STANDARD-V3',
] as const;

export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export interface ParsedKnowledgeDocument {
  absolutePath: string;
  relativePath: string;
  metadata: KnowledgeDocumentMetadataV1;
  body: string;
  xml: string;
}

export interface DuplicatePair {
  left: string;
  right: string;
  containment: number;
}

export interface CanonV3ValidationReport {
  valid: boolean;
  errors: string[];
  metrics: {
    markdownDocuments: number;
    activeDocuments: number;
    promptTemplates: number;
    normalizedWords: number;
    bootstrapCharacters: number;
    duplicatePairs: DuplicatePair[];
    sourceManifestSources: number;
    importPlanSources: number;
    groundingTests: number;
  };
}

export interface ValidationState {
  errors: string[];
  documents: ParsedKnowledgeDocument[];
  active: ParsedKnowledgeDocument[];
  byId: Map<string, ParsedKnowledgeDocument>;
  byPath: Map<string, ParsedKnowledgeDocument>;
  manifestIds: Set<string>;
  duplicatePairs: DuplicatePair[];
  normalizedWords: number;
  bootstrapCharacters: number;
  promptTemplates: number;
  sourceManifestSources: number;
  importPlanSources: number;
  groundingTests: number;
}

export const emptyMetrics = (): CanonV3ValidationReport['metrics'] => ({
  markdownDocuments: 0,
  activeDocuments: 0,
  promptTemplates: 0,
  normalizedWords: 0,
  bootstrapCharacters: 0,
  duplicatePairs: [],
  sourceManifestSources: 0,
  importPlanSources: 0,
  groundingTests: 0,
});
