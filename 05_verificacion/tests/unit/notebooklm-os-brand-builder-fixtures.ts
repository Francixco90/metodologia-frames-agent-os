import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse as parseYaml} from 'yaml';

import {
  hashExperienceValue,
  type BrandIntakePacketV1,
  type BrandKnowledgePackV1,
} from '../../../02_proceso/core/contracts/index.ts';
import {
  activateBrandKnowledgePack,
  compileBrandBootstrap,
  compileBrandEvidence,
  compileBrandKnowledgePack,
  compileBrandNotebookBuild,
  type CompileBrandNotebookBuildInput,
} from '../../../02_proceso/workflows/notebooklm-os/brand-runtime.ts';
import {buildNotebookPlan} from '../../../02_proceso/workflows/notebooklm-os/index.ts';

export interface SyntheticBrandFixture {
  brand_id: string;
  display_name: string;
  primary_locale: string;
  audiences: string[];
  channels: string[];
  inputs: Array<{
    input_id: string;
    kind: 'conversation' | 'attachment' | 'comment';
    modality: 'text' | 'document' | 'image';
    mime_type: string;
    rights: 'APPROVED' | 'REVIEW' | 'BLOCKED';
    sensitivity: 'PUBLIC' | 'INTERNAL' | 'PRIVATE' | 'RESTRICTED';
    content: string;
  }>;
  expected: {
    canonical_phrase: string;
    blocked_phrase: string;
    voice_trait: string;
    status: 'REVIEW';
  };
}

export const fixtures = parseYaml(
  readFileSync(
    resolve(process.cwd(), '05_verificacion/fixtures/notebooklm-os/synthetic-brands.yml'),
    'utf8',
  ),
) as {brands: SyntheticBrandFixture[]};

export const digest = (value: string): string => createHash('sha256').update(value).digest('hex');

export const packetFor = (brand: SyntheticBrandFixture): BrandIntakePacketV1 => ({
  schemaVersion: 'brand-intake-packet-v1',
  brandId: brand.brand_id,
  brandName: brand.display_name,
  objective: 'Compile a governed notebook plan for reliable branded content.',
  audiences: brand.audiences,
  channels: brand.channels,
  responseLocales: [brand.primary_locale],
  requestedOutputs: ['brand knowledge pack', 'content brief'],
  inputRefs: brand.inputs.map((input) => ({
    schemaVersion: 'brand-input-ref-v1',
    inputId: input.input_id,
    kind: input.kind,
    modality: input.modality,
    title: `${input.kind} fixture`,
    mimeType: input.mime_type,
    contentSha256: digest(input.content),
    portableIdentityDigest: digest(`${brand.brand_id}:${input.input_id}`),
    locatorDigest: null,
    provenance: 'Synthetic public QA fixture',
    sensitivity: input.sensitivity,
    rights: input.rights,
    extraction: 'AVAILABLE',
    extractedTextSha256: digest(input.content),
    safety: input.rights === 'APPROVED' ? 'CLEAN' : 'REVIEW',
  })),
  observations: [
    {
      observationId: `${brand.brand_id}:identity`,
      category: 'identity',
      statement: `${brand.display_name} is the active synthetic fixture brand.`,
      status: 'OBSERVED',
      confidence: 0.9,
      inputIds: [brand.inputs[0]?.input_id ?? 'missing-input'],
      sourceRefs: [],
    },
    {
      observationId: `${brand.brand_id}:voice`,
      category: 'voice',
      statement: brand.expected.voice_trait,
      status: 'USER_CONFIRMED',
      confidence: 1,
      inputIds: [brand.inputs[2]?.input_id ?? 'missing-input'],
      sourceRefs: [],
    },
    {
      observationId: `${brand.brand_id}:vocabulary`,
      category: 'vocabulary',
      statement: `Prefer ${brand.expected.canonical_phrase}.`,
      status: 'SOURCE_VERIFIED',
      confidence: 1,
      inputIds: [brand.inputs[1]?.input_id ?? 'missing-input'],
      sourceRefs: [],
    },
    {
      observationId: `${brand.brand_id}:exclusion`,
      category: 'exclusion',
      statement: `Never use ${brand.expected.blocked_phrase}.`,
      status: 'SOURCE_VERIFIED',
      confidence: 1,
      inputIds: [brand.inputs[1]?.input_id ?? 'missing-input'],
      sourceRefs: [],
    },
  ],
  conflicts: [],
  blockingQuestions: [],
  coverageGaps: [],
});

export const packFor = (brand: SyntheticBrandFixture) => {
  const evidence = compileBrandEvidence(packetFor(brand));
  return {
    evidence,
    pack: compileBrandKnowledgePack(evidence, {
      brandName: brand.display_name,
      version: 'v1.0',
      defaultLocale: brand.primary_locale,
      responseLocales: [brand.primary_locale],
    }),
  };
};

export const approvePack = (pack: BrandKnowledgePackV1) => {
  const payload = {
    schemaVersion: 'brand-profile-approval-receipt-v1' as const,
    receiptId: `approval-${pack.brandId}`,
    gate: 'NLM_BRAND_PROFILE_APPROVED' as const,
    brandId: pack.brandId,
    reviewPackSha256: pack.canonicalSha256,
    actorDigest: digest('synthetic-human-reviewer'),
    decision: 'APPROVED' as const,
  };
  const approvalReceipt = {...payload, canonicalSha256: hashExperienceValue(payload)};
  return {activePack: activateBrandKnowledgePack(pack, approvalReceipt), approvalReceipt};
};

export const buildInputFor = (
  brand: SyntheticBrandFixture,
  knowledgePack: BrandKnowledgePackV1,
  evidence = packFor(brand).evidence,
): CompileBrandNotebookBuildInput => {
  const sourceIds = ['NLS-SYNTHETIC-CONTROL', 'NLS-SYNTHETIC-VOICE', 'NLS-SYNTHETIC-ARCHIVE'];
  const notebookPlan = buildNotebookPlan({
    schemaVersion: 'notebook-plan-v1',
    profileId: brand.brand_id,
    provider: 'notebooklm',
    targetNotebookDigest: null,
    operations: [
      {
        operationId: 'prepare-brand-plan',
        stage: 'N03',
        action: 'curate',
        sourceIds,
        requiredGate: null,
        effect: 'LOCAL_REVERSIBLE',
      },
    ],
    sourceIds,
    permissions: [],
    stopRules: ['Stop before external materialization.'],
    rollback: ['Discard the local build plan.'],
  });
  const bootstrapXml = compileBrandBootstrap(knowledgePack, {
    knowledgeMapDocumentId: 'knowledge-map-v1',
    operatingPromptDocumentId: 'operating-prompt-v1',
  });
  return {
    intakeSha256: evidence.intakeSha256,
    evidence,
    knowledgePack,
    knowledgeDocuments: [
      {
        documentId: 'operating-prompt-v1',
        layer: '00-control',
        title: 'Operating prompt',
        version: 'v1.0',
        language: 'en',
        path: 'knowledge/00-control--operating-prompt--v1.0.md',
        contentSha256: digest('operating prompt'),
        sourceRefs: [],
      },
      {
        documentId: 'knowledge-map-v1',
        layer: '00-control',
        title: 'Knowledge map',
        version: 'v1.0',
        language: 'en',
        path: 'knowledge/00-control--knowledge-map--v1.0.md',
        contentSha256: digest('knowledge map'),
        sourceRefs: [],
      },
    ],
    knowledgeMapDocumentId: 'knowledge-map-v1',
    bootstrapXml,
    operatingPromptDocumentId: 'operating-prompt-v1',
    groundingCases: [
      {
        caseId: 'ground-voice-01',
        route: 'voice',
        query: 'Describe the approved voice.',
        sourceSetId: 'source-set-voice',
        acceptance: ['Cites the voice control and exposes gaps.'],
      },
    ],
    sourceSets: [
      {
        sourceSetId: 'source-set-voice',
        purpose: 'Verify voice',
        sourceIds: sourceIds.slice(0, 2).reverse(),
      },
    ],
    notebookPlan,
    stageReceiptDigests: {
      N00: digest('receipt-n00'),
      N01: digest('receipt-n01'),
      N02: digest('receipt-n02'),
      N03: digest('receipt-n03'),
    },
  };
};

export const approvedContextFor = (brand: SyntheticBrandFixture) => {
  const {evidence, pack} = packFor(brand);
  const {activePack, approvalReceipt} = approvePack(pack);
  const notebookBuild = compileBrandNotebookBuild(buildInputFor(brand, activePack, evidence));
  return {
    knowledgePack: activePack,
    approvalReceipt,
    notebookBuild,
    sourceSetId: 'source-set-voice',
  };
};
