/**
 * Pure, fail-closed pre-advance assertion for multimedia runs. [CONFIG]
 * Every declared check must produce PASS; UNKNOWN is represented as failure.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {evaluateRuntimeChecks} from './quality-gate-runtime.ts';
import {evaluateStaticChecks} from './quality-gate-static.ts';
import type {
  QualityGateCheckResult,
  QualityGateContext,
  QualityGateResult,
} from './quality-gate-types.ts';

export type {
  QualityGateCheckResult,
  QualityGateContext,
  QualityGateResult,
} from './quality-gate-types.ts';

type GateYaml = {
  schema_version: string;
  gate_id: string;
  checks: Array<{id: string; name: string; predicate: string; block_on: string}>;
};

const GATE_YAML_PATH = resolve(process.cwd(), '02_proceso/governance/multimedia-quality-gate.yml');
let gateYamlCache: GateYaml | null = null;

const loadGateYaml = (): GateYaml => {
  gateYamlCache ??= parse(readFileSync(GATE_YAML_PATH, 'utf8')) as GateYaml;
  return gateYamlCache;
};

export const evaluateQualityGate = (ctx: QualityGateContext): QualityGateResult => {
  const metadata = new Map(loadGateYaml().checks.map((check) => [check.id, check.name]));
  const checks: QualityGateCheckResult[] = [];
  const failures: string[] = [];
  const add = (id: string, passed: boolean, detail?: string): void => {
    const name = metadata.get(id) ?? id;
    const result = detail === undefined ? {id, name, passed} : {id, name, passed, detail};
    checks.push(result);
    if (!passed) failures.push(detail ? `${id}: ${name} — ${detail}` : `${id}: ${name}`);
  };
  evaluateStaticChecks(ctx, add);
  evaluateRuntimeChecks(ctx, add);
  return {passed: checks.every((check) => check.passed), checks, failures};
};
