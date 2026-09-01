import type {MaterialReferenceV1} from '../../../core/contracts/index.ts';
import type {BriefSourceV1} from '../../multimedia/_schema/brief-v1.schema.ts';
import {createContentBriefMaterialHandlerV1} from '../brief-material-handlers-v1.ts';

export interface ContentIntentForBriefV1 {
  request: string;
  request_hash: string;
  content_class: string;
  audience: string | null;
  outcome: string | null;
  selected_stage_path: string[];
  channels: string[];
  restrictions: string[];
}

export interface AuthorizedContentExecutionV1 {
  routeId: 'R6';
  domainIntent: ContentIntentForBriefV1;
  briefSources?: BriefSourceV1[];
  sourceAuthorityReceipts?: MaterialReferenceV1[];
}

export const createAuthorizedContentBriefHandlerV1 = (
  root: string,
  intent: ContentIntentForBriefV1,
  sources: BriefSourceV1[],
  authorityReceipts: MaterialReferenceV1[],
) =>
  createContentBriefMaterialHandlerV1({
    root,
    request: intent.request,
    requestHash: intent.request_hash,
    contentClass: intent.content_class,
    audience: intent.audience ?? 'por resolver',
    objective: intent.outcome ?? 'por resolver',
    workflowPlan: intent.selected_stage_path as Array<
      'P00' | 'P01' | 'P02' | 'P03' | 'P04' | 'P05' | 'P06' | 'P07' | 'P08' | 'P09'
    >,
    channels: intent.channels,
    restrictions: intent.restrictions,
    sources,
    authorityReceipts,
  });
