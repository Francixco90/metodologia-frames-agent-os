import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {TrainerBenchmarkSchema} from '../../../02_proceso/workflows/trainer-os/benchmark-contracts.ts';
import {TrainerBenchmarkInputBundleSchema} from '../../../02_proceso/workflows/trainer-os/benchmark-input-contracts.ts';
import {
  createPendingBenchmark,
  renderBenchmarkReport,
  runSyntheticBenchmark,
} from '../../../02_proceso/workflows/trainer-os/benchmark.ts';
import {hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';

const receipt = (value: Record<string, unknown>) => ({
  ...value,
  receiptSha256: hashModel(value, 'receiptSha256'),
});
const observed = (scenarioId: string, runtime: 'sol-5.6-medium' | 'luna-5.6-low') => ({
  status: 'observed',
  receipt: receipt({
    receiptId: `${scenarioId}-${runtime.startsWith('sol') ? 'baseline' : 'trainer'}`,
    runtime,
    scenarioId,
    inputSha256: '20d2b5bb682d61db9ec496c5760ea663794ad89f2fbb7a85a7a162ca2e9ea7d3',
    outputSha256: 'b'.repeat(64),
    inputRef: 'evals/benchmark-inputs-v1.json',
    outputRef: `evals/synthetic/${scenarioId}/${runtime.startsWith('sol') ? 'baseline' : 'trainer'}-output.json`,
    receiptSha256: '',
    qualityRubric: {
      ref: 'evals/trainer-quality-rubric-v1.json',
      sha256: '8d1261f27cc6c92939d25ef0320b0267b1f72545f020875dc54e2514b4d01c31',
    },
    tokenCounter: {name: 'runtime-native', version: '1', method: 'provider-receipt'},
    timer: {method: 'monotonic-runtime-receipt'},
    actors: {producer: 'producer-1', evaluator: 'evaluator-1'},
    synthetic: true,
    metrics: {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      userPrompts: 4,
      firstDraftMs: 10,
      verifiedPackageMs: 20,
      retries: 0,
      errors: 0,
      qualityPercent: 95,
      qualityScores: {
        structure: 95,
        pedagogy: 95,
        brandEditorial: 95,
        accessibility: 95,
        privacy: 95,
      },
      deterministicReplay: true,
    },
  }),
});
const rehash = (value: Record<string, unknown>) => ({
  ...value,
  benchmarkSha256: hashModel(value, 'benchmarkSha256'),
});
type ReceiptLane = {receipt: Record<string, unknown>};
const validObservedPair = () => {
  const value = structuredClone(createPendingBenchmark()) as unknown as Record<string, unknown>;
  const scenarios = (value as {scenarios: Array<Record<string, unknown>>}).scenarios;
  const first = scenarios[0];
  if (!first) throw new Error('scenario missing');
  const baseline = observed('ai-literacy', 'sol-5.6-medium') as ReceiptLane;
  const trainer = observed('ai-literacy', 'luna-5.6-low') as ReceiptLane;
  first.baseline = baseline;
  first.trainer = trainer;
  return {value, scenarios, first, baseline, trainer};
};

describe('Trainer OS low-model benchmark', () => {
  it('keeps exactly three synthetic scenarios pending without fabricated metrics', () => {
    const value = createPendingBenchmark();
    expect(value.scenarios).toHaveLength(3);
    expect(
      value.scenarios.flatMap(({baseline, trainer}) => [baseline.status, trainer.status]),
    ).toEqual(Array(6).fill('not_executed'));
    expect(value.tokenReductionClaim).toBeNull();
    expect(renderBenchmarkReport(value)).toContain('coverage_gap / not_executed');
  });

  it('parses structurally valid observed evidence but blocks operational report ingestion', () => {
    const value = structuredClone(createPendingBenchmark());
    value.scenarios[0].baseline = observed('ai-literacy', 'sol-5.6-medium') as never;
    expect(() =>
      TrainerBenchmarkSchema.parse(rehash(value as unknown as Record<string, unknown>)),
    ).not.toThrow();
    expect(() =>
      renderBenchmarkReport(
        TrainerBenchmarkSchema.parse(rehash(value as unknown as Record<string, unknown>)),
      ),
    ).toThrow('OBSERVED_REPORT_UNAVAILABLE');
    const stale = structuredClone(createPendingBenchmark());
    stale.scenarios[0].title = 'mutated after receipt';
    expect(() => renderBenchmarkReport(stale)).toThrow();
  });

  it('replays pending benchmark bytes deterministically', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'trainer-benchmark-'));
    const input = resolve(dir, 'input.json');
    const one = resolve(dir, 'one.json');
    const two = resolve(dir, 'two.json');
    writeFileSync(input, `${JSON.stringify(createPendingBenchmark(), null, 2)}\n`);
    runSyntheticBenchmark(input, 'one.json');
    runSyntheticBenchmark(input, 'two.json');
    expect(readFileSync(one)).toEqual(readFileSync(two));
    const fixture: unknown = JSON.parse(
      readFileSync('03_artefactos/projects/trainer-os/evals/benchmark.pending.json', 'utf8'),
    );
    expect(fixture).toEqual(createPendingBenchmark());
    const inputs = readFileSync('03_artefactos/projects/trainer-os/evals/benchmark-inputs-v1.json');
    expect(
      TrainerBenchmarkInputBundleSchema.parse(JSON.parse(inputs.toString())).scenarios,
    ).toHaveLength(3);
    for (const scenario of createPendingBenchmark().scenarios)
      expect(scenario.input.sha256).toBe(createHash('sha256').update(inputs).digest('hex'));
    expect(renderBenchmarkReport()).toContain('No son resultados observados.');
    expect(() => runSyntheticBenchmark(input, '../escape.json')).toThrow('OUTPUT_ESCAPE');
    expect(() => runSyntheticBenchmark(input, '/tmp/escape.json')).toThrow('OUTPUT_ESCAPE');
    const rubric = readFileSync(
      '03_artefactos/projects/trainer-os/evals/trainer-quality-rubric-v1.json',
    );
    expect(createPendingBenchmark().qualityRubric.sha256).toBe(
      createHash('sha256').update(rubric).digest('hex'),
    );
  });

  it.each([
    ['file:/', '/', 'Users', '/person/source.pdf'].join(''),
    ['person', 'example.test'].join('@'),
  ])('rejects hostile source %s in the canonical input authority', (hostileSource) => {
    const input: unknown = JSON.parse(
      readFileSync('03_artefactos/projects/trainer-os/evals/benchmark-inputs-v1.json', 'utf8'),
    );
    const mutated = structuredClone(input) as {scenarios: Array<{sources: string[]}>};
    mutated.scenarios[0]!.sources[0] = `SYNTHETIC: ${hostileSource}`;
    expect(() => TrainerBenchmarkInputBundleSchema.parse(mutated)).toThrow();
  });

  it.each(['tokens', 'prompts', 'receipt', 'private', 'stale', 'claim'] as const)(
    'blocks adversarial %s evidence',
    (mode) => {
      const value = structuredClone(createPendingBenchmark()) as unknown as Record<string, unknown>;
      const record = value as {
        scenarios: Array<Record<string, unknown>>;
        tokenReductionClaim: unknown;
      };
      const scenario = record.scenarios[0];
      if (!scenario) throw new Error('scenario missing');
      const lane = observed(String(scenario.scenarioId), 'sol-5.6-medium') as {
        receipt: Record<string, unknown>;
      };
      const metrics = lane.receipt.metrics as Record<string, unknown>;
      if (mode === 'tokens') metrics.totalTokens = 0;
      if (mode === 'prompts') metrics.userPrompts = 6;
      if (mode === 'receipt') delete lane.receipt.outputSha256;
      if (mode === 'private')
        scenario.syntheticBrief = `SYNTHETIC: ${['file:/', '/', 'Users', '/person/private-client'].join('')}`;
      if (mode === 'stale') lane.receipt.scenarioId = 'stale-output';
      if (mode === 'claim') record.tokenReductionClaim = 50;
      if (!['receipt', 'private', 'claim'].includes(mode)) lane.receipt = receipt(lane.receipt);
      scenario.baseline = lane;
      expect(() => TrainerBenchmarkSchema.parse(rehash(value))).toThrow();
    },
  );

  it.each(['lane', 'input-sha', 'rubric', 'input-ref', 'output-ref', 'order'] as const)(
    'independently rejects %s binding drift',
    (mode) => {
      const draft = validObservedPair();
      if (mode === 'lane') draft.first.baseline = observed('ai-literacy', 'luna-5.6-low');
      if (mode === 'input-sha') draft.trainer.receipt.inputSha256 = 'd'.repeat(64);
      if (mode === 'rubric')
        (draft.trainer.receipt.qualityRubric as Record<string, unknown>).sha256 = 'e'.repeat(64);
      if (mode === 'input-ref') draft.trainer.receipt.inputRef = 'evals/synthetic/wrong-input.json';
      if (mode === 'output-ref') draft.trainer.receipt.outputRef = draft.baseline.receipt.outputRef;
      if (mode === 'order') {
        const second = draft.scenarios[1];
        if (!second) throw new Error('scenario missing');
        draft.scenarios[0] = second;
        draft.scenarios[1] = draft.first;
      }
      if (['input-sha', 'rubric', 'input-ref', 'output-ref'].includes(mode))
        draft.trainer.receipt = receipt(draft.trainer.receipt);
      expect(() => TrainerBenchmarkSchema.parse(rehash(draft.value))).toThrow();
    },
  );

  it.each(['weighted-quality', 'actor-collision', 'impossible-timing'] as const)(
    'independently rejects %s provenance drift',
    (mode) => {
      const draft = validObservedPair();
      if (mode === 'weighted-quality')
        (draft.baseline.receipt.metrics as Record<string, unknown>).qualityPercent = 94;
      if (mode === 'actor-collision')
        (draft.baseline.receipt.actors as Record<string, unknown>).evaluator = 'producer-1';
      if (mode === 'impossible-timing')
        (draft.baseline.receipt.metrics as Record<string, unknown>).verifiedPackageMs = 1;
      draft.baseline.receipt = receipt(draft.baseline.receipt);
      expect(() => TrainerBenchmarkSchema.parse(rehash(draft.value))).toThrow();
    },
  );
});
