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
import {
  decideSmallestComponentV1,
  evaluateSkillRunV1,
} from '../../02_proceso/workflows/skill-systems/governance.ts';
import {buildSkillReleaseCapsuleV1} from '../../02_proceso/workflows/skill-systems/release.ts';
import {stableStringify} from '../../02_proceso/workflows/multimedia/_runner/brief-model.ts';

type Action = 'inspect' | 'scaffold' | 'validate' | 'evaluate' | 'package';
const canonical = (value: unknown): string => `${stableStringify(value)}\n`;
const sha = (value: string): string => createHash('sha256').update(value).digest('hex');

const readStdin = async (): Promise<string> => {
  process.stdin.setEncoding('utf8');
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    if (typeof chunk !== 'string') throw new Error('SSS_INPUT_ENCODING001');
    chunks.push(chunk);
  }
  return chunks.join('');
};

const inputFromArgs = async (args: string[]): Promise<unknown> => {
  const index = args.indexOf('--input');
  if (index >= 0) {
    const ref = args[index + 1];
    if (!ref || path.isAbsolute(ref) || ref.includes('..') || ref.includes('\\'))
      throw new Error('SSS_INPUT_PATH001');
    return JSON.parse(await readFile(path.resolve(ref), 'utf8'));
  }
  if (args.includes('--stdin')) {
    const body = await readStdin();
    if (body.trim()) return JSON.parse(body);
  }
  return null;
};

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
  const materialCase = SkillSystemCaseV1Schema.parse(input);
  return {
    schema_version: 'skill-suite-inspection-v1',
    status: packages.length === 8 ? 'PASS' : 'BLOCKED',
    case_id: materialCase.case_id,
    case_sha256: materialCase.content_sha256,
    packages,
  } as const;
};

const validate = (input: unknown) => {
  if (!input)
    return {
      schema_version: 'skill-validation-v1',
      status: 'UNKNOWN',
      coverage_gap: 'MATERIAL_CONTRACT_REQUIRED',
      checked_contracts: 0,
    } as const;
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

const evaluate = (input: unknown) => {
  if (input) return evaluateSkillRunV1(input);
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
  const input = await inputFromArgs(args);
  const apply = args.includes('--apply');
  if (action === 'inspect') return inspect(root, input);
  if (action === 'validate') return validate(input);
  if (action === 'evaluate') return evaluate(input);
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
  console.info(canonical(result));
  if (
    typeof result === 'object' &&
    result !== null &&
    'status' in result &&
    ['UNKNOWN', 'BLOCKED'].includes(String(result.status))
  )
    process.exitCode = 2;
}
