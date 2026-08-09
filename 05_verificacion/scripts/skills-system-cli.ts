import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import type {ZodType} from 'zod';

import {
  ArchitectureDecisionV1Schema,
  CapabilityMapV1Schema,
  ComponentContractV1Schema,
  SkillChangeProposalV1Schema,
  SkillEvalCaseV1Schema,
  SkillEvalRunV1Schema,
  SkillReleaseCapsuleV1Schema,
  SkillReviewReportV1Schema,
  SkillSystemCaseV1Schema,
} from '../../02_proceso/workflows/skill-systems/contracts.ts';
import {decideSmallestComponentV1} from '../../02_proceso/workflows/skill-systems/governance.ts';
import {buildSkillReleaseCapsuleV1} from '../../02_proceso/workflows/skill-systems/release.ts';
import {canonicalCliJson, skillSystemInputFromArgs} from './skill-system-cli-io.ts';
import {
  verifySkillArchitectureGateV1,
  verifySkillCaseGateV1,
  verifySkillEvalGateV1,
  verifySkillStaticGateV1,
} from './skill-system-gates.ts';

type Action = 'inspect' | 'scaffold' | 'validate' | 'evaluate' | 'package';
const sha = (value: string): string => createHash('sha256').update(value).digest('hex');

const inspect = async (root: string, input: unknown) => {
  const suite = parse(
    await readFile(path.join(root, '02_proceso/workflows/skill-systems/skill-suite.yml'), 'utf8'),
  ) as {skills: {id: string}[]};
  const packages = await Promise.all(
    suite.skills.map(async ({id}) => {
      const packageRoot = path.join(root, '03_artefactos/skills', id);
      const refs = (await readdir(packageRoot, {recursive: true})).sort();
      return {
        id,
        refs: refs.length,
        skill_sha256: sha(await readFile(path.join(packageRoot, 'SKILL.md'), 'utf8')),
      };
    }),
  );
  if (!input)
    return {
      schema_version: 'skill-suite-inspection-v1',
      status: 'UNKNOWN',
      coverage_gap: 'SKILL_SYSTEM_CASE_REQUIRED',
      packages,
    } as const;
  return {...verifySkillCaseGateV1(root, input), packages} as const;
};

const validate = (root: string, input: unknown, gate: string | null) => {
  if (!input)
    return {
      schema_version: 'skill-validation-v1',
      status: 'UNKNOWN',
      coverage_gap: 'MATERIAL_CONTRACT_REQUIRED',
      checked_contracts: 0,
    } as const;
  if (gate === 'architecture') return verifySkillArchitectureGateV1(root, input);
  if (gate === 'static') return verifySkillStaticGateV1(root, input);
  const record = input as Record<string, unknown>;
  const schema = typeof record.schema_version === 'string' ? record.schema_version : '';
  const schemas = new Map<string, ZodType>([
    ['skill-system-case-v1', SkillSystemCaseV1Schema],
    ['capability-map-v1', CapabilityMapV1Schema],
    ['skill-architecture-decision-v1', ArchitectureDecisionV1Schema],
    ['skill-component-contract-v1', ComponentContractV1Schema],
    ['skill-eval-case-v1', SkillEvalCaseV1Schema],
    ['skill-eval-run-v1', SkillEvalRunV1Schema],
    ['skill-review-report-v1', SkillReviewReportV1Schema],
    ['skill-change-proposal-v1', SkillChangeProposalV1Schema],
    ['skill-release-capsule-v1', SkillReleaseCapsuleV1Schema],
  ]);
  const selected = schemas.get(schema);
  if (!selected) throw new Error('SSS_SCHEMA_UNKNOWN');
  selected.parse(input);
  return {schema_version: 'skill-validation-v1', status: 'PASS', validated_schema: schema};
};

const evaluate = (root: string, input: unknown) => {
  if (input) return verifySkillEvalGateV1(root, input);
  return {
    schema_version: 'skill-eval-summary-v1',
    status: 'UNKNOWN',
    verdict: 'UNKNOWN',
    denominator: 0,
    coverage_gap: 'MATERIAL_EVAL_RUN_REQUIRED',
  } as const;
};

const scaffold = (input: unknown, apply: boolean) => {
  const request = typeof input === 'object' && input ? (input as Record<string, unknown>) : {};
  const decision = decideSmallestComponentV1({
    repeatable: request.repeatable === true,
    needsSpecializedJudgment: request.needs_specialized_judgment === true,
    instructionSufficient: request.instruction_sufficient === true,
    referenceSufficient: request.reference_sufficient === true,
    toolSufficient: request.tool_sufficient === true,
  });
  if (apply) throw new Error('SSS_SCAFFOLD_GATE_AND_WORK_ORDER_REQUIRED');
  return {schema_version: 'skill-scaffold-plan-v1', mode: 'DRY_RUN', decision, writes: []};
};

const packageCandidate = (root: string, apply: boolean, input: unknown) => {
  if (apply) throw new Error('SSS_PACKAGE_GATE_AND_WORK_ORDER_REQUIRED');
  if (!input)
    return {
      schema_version: 'skill-package-plan-v1',
      status: 'UNKNOWN',
      mode: 'DRY_RUN',
      coverage_gap: 'MATERIAL_RELEASE_CAPSULE_REQUIRED',
      writes: [],
    } as const;
  const capsule = buildSkillReleaseCapsuleV1(input, root);
  return {
    schema_version: 'skill-package-plan-v1',
    status: 'PASS',
    mode: 'DRY_RUN',
    release_id: capsule.release_id,
    writes: [],
  } as const;
};

export function runSkillSystemCli(
  action: 'inspect',
  args: string[],
  root?: string,
): ReturnType<typeof inspect>;
export function runSkillSystemCli(
  action: 'scaffold',
  args: string[],
  root?: string,
): Promise<ReturnType<typeof scaffold>>;
export function runSkillSystemCli(
  action: 'validate',
  args: string[],
  root?: string,
): Promise<ReturnType<typeof validate>>;
export function runSkillSystemCli(
  action: 'evaluate',
  args: string[],
  root?: string,
): Promise<ReturnType<typeof evaluate>>;
export function runSkillSystemCli(
  action: 'package',
  args: string[],
  root?: string,
): Promise<ReturnType<typeof packageCandidate>>;
export function runSkillSystemCli(action: Action, args: string[], root?: string): Promise<unknown>;
export async function runSkillSystemCli(action: Action, args: string[], root = process.cwd()) {
  const input = await skillSystemInputFromArgs(args);
  const apply = args.includes('--apply');
  const gateIndex = args.indexOf('--gate');
  const gate = gateIndex >= 0 ? (args[gateIndex + 1] ?? null) : null;
  if (action === 'inspect') return inspect(root, input);
  if (action === 'validate') return validate(root, input, gate);
  if (action === 'evaluate') return evaluate(root, input);
  if (action === 'scaffold') return scaffold(input, apply);
  return packageCandidate(root, apply, input);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const action = process.argv[2] as Action | undefined;
  if (!action || !['inspect', 'scaffold', 'validate', 'evaluate', 'package'].includes(action))
    throw new Error('SSS_ACTION_REQUIRED');
  const cliArgs = process.argv.slice(3);
  if (!process.stdin.isTTY && !cliArgs.includes('--input')) cliArgs.push('--stdin');
  const result = await runSkillSystemCli(action, cliArgs);
  console.info(canonicalCliJson(result));
  if (
    typeof result === 'object' &&
    result !== null &&
    (('status' in result && ['UNKNOWN', 'BLOCKED', 'REVISE'].includes(String(result.status))) ||
      ('verdict' in result && ['UNKNOWN', 'BLOCKED', 'REVISE'].includes(String(result.verdict))))
  )
    process.exitCode = 2;
}
