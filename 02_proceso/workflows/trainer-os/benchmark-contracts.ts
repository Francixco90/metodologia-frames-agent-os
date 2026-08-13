import {z} from 'zod';

import {HashRefSchema, IdSchema, Sha256Schema, hashModel} from './common.ts';

const SafeText = z
  .string()
  .min(1)
  .refine((value) => !/(?:file:\/\/|\/Users\/|\/home\/|@|private-client)/iu.test(value));

const Metrics = z.strictObject({
  inputTokens: z.number().int().positive(),
  outputTokens: z.number().int().positive(),
  totalTokens: z.number().int().positive(),
  userPrompts: z.number().int().min(3).max(5),
  firstDraftMs: z.number().int().positive(),
  verifiedPackageMs: z.number().int().positive(),
  retries: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  qualityPercent: z.number().min(0).max(100),
  qualityScores: z.strictObject({
    structure: z.number().min(0).max(100),
    pedagogy: z.number().min(0).max(100),
    brandEditorial: z.number().min(0).max(100),
    accessibility: z.number().min(0).max(100),
    privacy: z.number().min(0).max(100),
  }),
  deterministicReplay: z.literal(true),
});
const Receipt = z.strictObject({
  receiptId: IdSchema,
  runtime: z.enum(['sol-5.6-medium', 'luna-5.6-low']),
  scenarioId: IdSchema,
  inputSha256: Sha256Schema,
  outputSha256: Sha256Schema,
  inputRef: z.literal('evals/benchmark-inputs-v1.json'),
  outputRef: z.string().regex(/^evals\/synthetic\//u),
  receiptSha256: Sha256Schema,
  qualityRubric: z.strictObject({
    ref: z.literal('evals/trainer-quality-rubric-v1.json'),
    sha256: Sha256Schema,
  }),
  tokenCounter: z.strictObject({
    name: z.literal('runtime-native'),
    version: z.string().min(1),
    method: z.literal('provider-receipt'),
  }),
  timer: z.strictObject({method: z.literal('monotonic-runtime-receipt')}),
  actors: z
    .strictObject({producer: IdSchema, evaluator: IdSchema})
    .refine(({producer, evaluator}) => producer !== evaluator),
  metrics: Metrics,
  synthetic: z.literal(true),
});
const Execution = z.discriminatedUnion('status', [
  z.strictObject({status: z.literal('observed'), receipt: Receipt}),
  z.strictObject({
    status: z.literal('not_executed'),
    reason: z.literal('runtime_unavailable'),
    coverageGap: z.literal(true),
  }),
]);
const Scenario = z.strictObject({
  scenarioId: z.enum(['ai-literacy', 'operational-productivity', 'technical-training']),
  title: SafeText,
  syntheticBrief: SafeText.regex(/^SYNTHETIC:/u),
  input: HashRefSchema,
  baseline: Execution,
  trainer: Execution,
});

export const TrainerBenchmarkSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-benchmark-v1'),
    benchmarkId: IdSchema,
    benchmarkSha256: Sha256Schema,
    scenarios: z.tuple([Scenario, Scenario, Scenario]),
    qualityRubric: HashRefSchema,
    ablations: z.tuple([
      z.strictObject({
        id: z.literal('without-deterministic-compiler'),
        status: z.literal('pending'),
        hypothesis: z.literal('quality_or_determinism_may_degrade'),
      }),
      z.strictObject({
        id: z.literal('without-typed-contracts'),
        status: z.literal('pending'),
        hypothesis: z.literal('contract_errors_may_increase'),
      }),
    ]),
    promotion: z.strictObject({eligible: z.literal(false), reason: z.literal('coverage_gap')}),
    tokenReductionClaim: z.null(),
    lifecycleState: z.literal('candidate'),
    maximumState: z.literal('RENDERED_DRAFT'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    const ids = value.scenarios.map(({scenarioId}) => scenarioId);
    if (
      new Set(ids).size !== 3 ||
      ids.join(',') !== 'ai-literacy,operational-productivity,technical-training'
    )
      context.addIssue({
        code: 'custom',
        path: ['scenarios'],
        message: 'exact synthetic scenario order required',
      });
    for (const scenario of value.scenarios) {
      const runtimes = ['sol-5.6-medium', 'luna-5.6-low'] as const;
      for (const [index, execution] of [scenario.baseline, scenario.trainer].entries())
        if (execution.status === 'observed') {
          const {metrics, scenarioId, runtime, receiptSha256} = execution.receipt;
          if (
            scenarioId !== scenario.scenarioId ||
            runtime !== runtimes[index] ||
            execution.receipt.outputRef !==
              `evals/synthetic/${scenario.scenarioId}/${index === 0 ? 'baseline' : 'trainer'}-output.json` ||
            metrics.totalTokens !== metrics.inputTokens + metrics.outputTokens ||
            metrics.verifiedPackageMs < metrics.firstDraftMs ||
            hashModel(execution.receipt, 'receiptSha256') !== receiptSha256
          )
            context.addIssue({
              code: 'custom',
              message: 'observed receipt binding or token arithmetic drift',
            });
          if (
            execution.receipt.qualityRubric.ref !== value.qualityRubric.ref ||
            execution.receipt.qualityRubric.sha256 !== value.qualityRubric.sha256
          )
            context.addIssue({code: 'custom', message: 'quality rubric binding drift'});
          const scores = metrics.qualityScores;
          const weighted =
            scores.structure * 0.25 +
            scores.pedagogy * 0.25 +
            scores.brandEditorial * 0.2 +
            scores.accessibility * 0.2 +
            scores.privacy * 0.1;
          if (weighted !== metrics.qualityPercent)
            context.addIssue({code: 'custom', message: 'quality weighted score drift'});
        }
      if (
        scenario.baseline.status === 'observed' &&
        scenario.trainer.status === 'observed' &&
        scenario.baseline.receipt.inputSha256 !== scenario.trainer.receipt.inputSha256
      )
        context.addIssue({code: 'custom', message: 'comparison inputs must be identical'});
      for (const execution of [scenario.baseline, scenario.trainer])
        if (
          execution.status === 'observed' &&
          (execution.receipt.inputSha256 !== scenario.input.sha256 ||
            execution.receipt.inputRef !== scenario.input.ref)
        )
          context.addIssue({code: 'custom', message: 'receipt must bind canonical scenario input'});
    }
    if (hashModel(value, 'benchmarkSha256') !== value.benchmarkSha256)
      context.addIssue({
        code: 'custom',
        path: ['benchmarkSha256'],
        message: 'benchmark hash drift',
      });
  });

export type TrainerBenchmark = z.infer<typeof TrainerBenchmarkSchema>;
