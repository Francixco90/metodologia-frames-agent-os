import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';

export type QualityGateCheckResult = {
  id: string;
  name: string;
  passed: boolean;
  detail?: string;
};

export type QualityGateResult = {
  passed: boolean;
  checks: QualityGateCheckResult[];
  failures: string[];
};

export type QualityGateContext = {
  workflowId: string;
  workflowDir: string;
  workflowRawYaml: string;
  workflowParsed: MultimediaWorkflow;
  taskTemplatePath: string;
  promptSpecPath: string;
  noRegressionChecklistPath: string;
  receiptPayload: Record<string, unknown>;
  receiptDir: string;
  inputResolutions: Array<{input: string; resolved: string; exists: boolean}>;
  outputResolutions: Array<{
    ref: string;
    stagedPath: string;
    exists: boolean;
    sha256: string;
    companions: Array<{
      format: 'md' | 'html';
      ref: string;
      stagedPath: string;
      exists: boolean;
      sha256: string;
    }>;
  }>;
  autoAdvance: boolean;
};

export type AddCheck = (id: string, passed: boolean, detail?: string) => void;
