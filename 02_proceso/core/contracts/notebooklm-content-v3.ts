export {
  KnowledgeDocumentLayerSchema,
  KnowledgeDocumentMetadataV1Schema,
  type KnowledgeDocumentMetadataV1,
} from './notebooklm-content-v3/knowledge.ts';
export {NotebookPlanV2Schema, type NotebookPlanV2} from './notebooklm-content-v3/notebook-plan.ts';
export {
  ContentChannelV1Schema,
  PromptTemplateFamilyV1Schema,
  PromptTemplateV1Schema,
  type PromptTemplateV1,
} from './notebooklm-content-v3/prompt-template.ts';
export {
  PromptRegistryV1Schema,
  type PromptRegistryV1,
} from './notebooklm-content-v3/prompt-registry.ts';
export {
  NotebookProfileV2Schema,
  NotebookSystemPromptV2Schema,
  type NotebookProfileV2,
  type NotebookSystemPromptV2,
} from './notebooklm-content-v3/profile.ts';
export {
  ClaimEvidenceV1Schema,
  SourcePackBatchV1Schema,
  StudioBriefV2Schema,
  computeSourceSetSha256,
  type ClaimEvidenceV1,
  type SourcePackBatchV1,
  type StudioBriefV2,
} from './notebooklm-content-v3/studio-brief.ts';
