import {readFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {TrainerBenchmarkSchema} from './benchmark-contracts.ts';
import {canonicalJson, hashModel, sha256} from './common.ts';
import {privacyGate} from './compiler-authority.ts';
import {atomicWrite, portableResolve, writeJson} from './runtime-io.ts';

const evalRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../03_artefactos/projects/trainer-os/evals',
);

export const createPendingBenchmark = () => {
  const briefs = [
    ['ai-literacy', 'AI literacy for non-technical professionals'],
    ['operational-productivity', 'Operational productivity for leaders'],
    ['technical-training', 'Technical training with explicit prerequisites and risks'],
  ] as const;
  const draft = {
    schemaVersion: 'trainer-benchmark-v1',
    benchmarkId: 'trainer-os-low-model-eval',
    benchmarkSha256: '',
    scenarios: briefs.map(([scenarioId, title]) => ({
      scenarioId,
      title,
      syntheticBrief: `SYNTHETIC: ${title}`,
      input: {
        ref: 'evals/benchmark-inputs-v1.json',
        sha256: '20d2b5bb682d61db9ec496c5760ea663794ad89f2fbb7a85a7a162ca2e9ea7d3',
      },
      baseline: {status: 'not_executed', reason: 'runtime_unavailable', coverageGap: true},
      trainer: {status: 'not_executed', reason: 'runtime_unavailable', coverageGap: true},
    })),
    qualityRubric: {
      ref: 'evals/trainer-quality-rubric-v1.json',
      sha256: '8d1261f27cc6c92939d25ef0320b0267b1f72545f020875dc54e2514b4d01c31',
    },
    ablations: [
      {
        id: 'without-deterministic-compiler',
        status: 'pending',
        hypothesis: 'quality_or_determinism_may_degrade',
      },
      {
        id: 'without-typed-contracts',
        status: 'pending',
        hypothesis: 'contract_errors_may_increase',
      },
    ],
    promotion: {eligible: false, reason: 'coverage_gap'},
    tokenReductionClaim: null,
    lifecycleState: 'candidate',
    maximumState: 'RENDERED_DRAFT',
    publicationAuthority: false,
  };
  draft.benchmarkSha256 = hashModel(draft, 'benchmarkSha256');
  return TrainerBenchmarkSchema.parse(draft);
};

export const runSyntheticBenchmark = (inputRef: string, outputRef: string) => {
  const parsed = TrainerBenchmarkSchema.parse(JSON.parse(readFileSync(resolve(inputRef), 'utf8')));
  if (
    parsed.scenarios.some(
      ({baseline, trainer}) =>
        baseline.status !== 'not_executed' || trainer.status !== 'not_executed',
    )
  )
    throw new Error('TRAINER_BENCHMARK_OBSERVED_INGESTION_NOT_IMPLEMENTED');
  const root = dirname(resolve(inputRef));
  const output = resolve(root, outputRef);
  const offset = relative(root, output);
  if (!offset || offset.startsWith('..') || offset.startsWith('/'))
    throw new Error('TRAINER_BENCHMARK_OUTPUT_ESCAPE');
  writeJson(output, parsed);
  return parsed;
};

export const materializePendingBenchmark = (runPath: string) => {
  const inputPath = resolve(evalRoot, 'benchmark.pending.json');
  const parsed = TrainerBenchmarkSchema.parse(JSON.parse(readFileSync(inputPath, 'utf8')));
  if (canonicalJson(parsed) !== canonicalJson(createPendingBenchmark()))
    throw new Error('TRAINER_BENCHMARK_PENDING_AUTHORITY_DRIFT');
  const inputs = readFileSync(resolve(evalRoot, 'benchmark-inputs-v1.json'));
  const rubric = readFileSync(resolve(evalRoot, 'trainer-quality-rubric-v1.json'));
  if (parsed.scenarios.some(({input}) => input.sha256 !== sha256(inputs)))
    throw new Error('TRAINER_BENCHMARK_INPUT_AUTHORITY_DRIFT');
  if (parsed.qualityRubric.sha256 !== sha256(rubric))
    throw new Error('TRAINER_BENCHMARK_RUBRIC_AUTHORITY_DRIFT');
  const report = renderBenchmarkReport(parsed);
  privacyGate(report);
  atomicWrite(
    portableResolve(runPath, 'outputs/benchmark.pending.json'),
    `${JSON.stringify(parsed, null, 2)}\n`,
  );
  atomicWrite(portableResolve(runPath, 'outputs/benchmark-report.md'), report);
  return parsed;
};

export const renderBenchmarkReport = (benchmark = createPendingBenchmark()) => {
  const parsed = TrainerBenchmarkSchema.parse(benchmark);
  if (
    parsed.scenarios.some(
      ({baseline, trainer}) => baseline.status === 'observed' || trainer.status === 'observed',
    )
  )
    throw new Error('TRAINER_BENCHMARK_OBSERVED_REPORT_UNAVAILABLE');
  return `# Trainer OS Benchmark Report v1\n\n[METODOLOGIA] Estado: **coverage_gap / not_executed**.\n\nLos tres escenarios sintéticos están definidos, pero los runtimes Sol 5.6 medium y Luna 5.6 low no están disponibles en esta ejecución. No existen receipts observados; por tanto, no se calcula ni afirma reducción de tokens, calidad comparativa o promoción.\n\n## Escenarios\n\n${parsed.scenarios.map(({title, baseline, trainer}) => `- ${title}: baseline ${baseline.status}; Trainer ${trainer.status}.`).join('\n')}\n\n## Ablaciones — hipótesis pendientes\n\n- [INFERENCIA] Sin compilador determinista: pending; la calidad o determinismo podría degradarse.\n- [INFERENCIA] Sin contratos tipados: pending; los errores contractuales podrían aumentar.\n\nNo son resultados observados.\n\n## Gates pendientes\n\n1. Ejecutar ambos runtimes sobre inputs idénticos.\n2. Resolver artifacts y receipts del proveedor mediante un verificador de evidencia aún no implementado; el schema por sí solo no acredita medición.\n3. Evaluar objetivos solo con seis observaciones validadas.\n\nEstado máximo: RENDERED_DRAFT. Publicación: no autorizada.\n`;
};
