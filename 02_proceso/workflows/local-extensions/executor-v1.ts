import type {
  TechnicalDefensePrivacyAuthorityPortV1,
  TechnicalDefenseReviewAuthorityPortV1,
} from './contracts.ts';
import {
  validateTechnicalDefenseActivationV1,
  type LocalExtensionExecutionInputV1,
  type LocalExtensionRunnerAuthorityV1,
} from './technical-defense-executor-attestation-v1.ts';
import {validateTechnicalDefenseCaseExecutionV1} from './technical-defense-executor-case-v1.ts';
import type {
  TransactionEffectReceiptV1,
  TransactionKernelV1,
} from '../../core/contracts/transaction-kernel-v1.ts';
import {
  MaterialSkillAdapterV2,
  type ProducerActionAuthorizerV1,
} from '../core/material-skill-adapter-v2.ts';
import {
  TECHNICAL_DEFENSE_EXTENSION_ID,
  createTechnicalDefenseHandlerV1,
} from 'projects/agentic-workflow-adoption-v1/local-extensions/technical-defense/handler.ts';

export {
  TECHNICAL_DEFENSE_MANIFEST_SHA256_V1,
  technicalDefenseAuthorizationV1,
  technicalDefenseRunnerSha256V1,
} from './technical-defense-executor-attestation-v1.ts';
export type {
  LocalExtensionExecutionInputV1,
  LocalExtensionRunnerAuthorityV1,
} from './technical-defense-executor-attestation-v1.ts';

export class LocalExtensionExecutorV1 {
  public readonly simulationOnly = true;
  public constructor(
    private readonly kernel: TransactionKernelV1,
    private readonly producerAuthorizer: ProducerActionAuthorizerV1,
    private readonly runnerAuthority: LocalExtensionRunnerAuthorityV1,
    private readonly reviewAuthority: TechnicalDefenseReviewAuthorityPortV1,
    private readonly privacyAuthority?: TechnicalDefensePrivacyAuthorityPortV1,
  ) {}

  public async execute(input: LocalExtensionExecutionInputV1): Promise<TransactionEffectReceiptV1> {
    const manifest = validateTechnicalDefenseActivationV1(input, this.runnerAuthority);
    const technicalCase = validateTechnicalDefenseCaseExecutionV1(
      input,
      manifest,
      this.runnerAuthority,
      this.reviewAuthority,
      this.privacyAuthority,
    );
    return new MaterialSkillAdapterV2(
      this.kernel,
      {[TECHNICAL_DEFENSE_EXTENSION_ID]: createTechnicalDefenseHandlerV1(technicalCase)},
      this.producerAuthorizer,
    ).invoke({execution: input.execution});
  }
}
