export type DocumentationAudience = 'person' | 'operator' | 'maintainer';

export type WorkflowStepDocumentationV1 = {
  id: string;
  purpose: string;
  inputs: readonly string[];
  primarySkill: string;
  optionalSkills: readonly string[];
  verifier: string;
  outputs: readonly string[];
  templateId?: string;
  gate: string;
  stopRule: string;
};

export type WorkflowDocumentationV1 = {
  schemaVersion: 'workflow-documentation-v1';
  id: string;
  family: 'content' | 'career' | 'local-extension' | 'maintenance';
  title: string;
  purpose: string;
  command: string;
  source: string;
  inputs: readonly string[];
  deliverables: readonly string[];
  templateRefs?: readonly string[];
  gates: readonly string[];
  nextWorkflow: string | null;
  stopRule: string;
  steps: readonly WorkflowStepDocumentationV1[];
};

export type SequenceMessageV1 = {
  from: string;
  to: string;
  label: string;
  kind: 'request' | 'work' | 'evidence' | 'decision';
};

export type SequenceModelV1 = {
  schemaVersion: 'sequence-model-v1';
  workflowId: string;
  actors: readonly string[];
  messages: readonly SequenceMessageV1[];
  accessibleSummary: readonly string[];
};

export type DocumentationManifestV1 = {
  schemaVersion: 'documentation-manifest-v1';
  generatedFrom: readonly string[];
  audiences: readonly DocumentationAudience[];
  workflows: readonly WorkflowDocumentationV1[];
};

export type DocumentationCoverageV1 = {
  schemaVersion: 'documentation-coverage-v1';
  workflowId: string;
  source: string;
  markdown: string;
  html: string;
  hasSequence: boolean;
  referencesResolvable: boolean;
  unresolvedReferences: string[];
};

export type {
  DocumentationClosureReceiptV1,
  DocumentationImpactPlanV1,
} from '../../core/contracts/documentation-governance-v1.ts';
