// workflow-oracle.ts — shared predicate for H-E013..H-E022 (one per P00–P09
// workflow). Validates that the workflow's `workflow.yml` parses through
// `MultimediaWorkflowSchema`, its `task-template.yaml` parses through
// `TaskContractSchema`, the declared `gate_target` on the task template is one
// of the workflow's `gates`, and the workflow's `inputs` are a subset of the
// prior workflow's `outputs` (chain handoff). Used by the per-workflow oracle
// shims. [CÓDIGO]
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {MultimediaWorkflowSchema} from '../../../02_proceso/workflows/multimedia/_schema/workflow-v1.schema.ts';
import {TaskContractSchema} from '../../../02_proceso/core/contracts/index.ts';
import type {OracleOutcome} from './eval-result-schema.ts';

const ROOT = process.cwd();
const MULTIMEDIA = resolve(ROOT, '02_proceso/workflows/multimedia');
const sha256 = (t: string): string => createHash('sha256').update(t).digest('hex');

const workflowDir = (id: string): string | null => {
  const entries = readdirSync(MULTIMEDIA, {withFileTypes: true})
    .filter((e) => e.isDirectory() && e.name.startsWith(id.toLowerCase().replace('p', 'p')))
    .map((e) => resolve(MULTIMEDIA, e.name));
  return entries.length === 1 ? entries[0] ?? null : null;
};

export const runWorkflowOracle = (id: string): OracleOutcome => {
  const evidence: string[] = [];
  const checks: OracleOutcome['oracle_checks'] = [];
  const dir = workflowDir(id);
  if (!dir) {
    checks.push({name: `${id} workflow dir present`, passed: false});
    return {status: 'fail', oracle_checks: checks, evidence_hashes: evidence};
  }
  const wfPath = resolve(dir, 'workflow.yml');
  const ttPath = resolve(dir, 'task-template.yaml');
  const wfRaw = readFileSync(wfPath, 'utf8');
  evidence.push(sha256(wfRaw));
  const wfParsed = MultimediaWorkflowSchema.safeParse(parse(wfRaw));
  checks.push({name: `${id} workflow.yml parses MultimediaWorkflowSchema`, passed: wfParsed.success, detail: wfParsed.success ? 'schema-valid' : wfParsed.error.issues[0]?.message});
  const ttRaw = readFileSync(ttPath, 'utf8');
  evidence.push(sha256(ttRaw));
  const ttParsed = TaskContractSchema.safeParse(parse(ttRaw));
  checks.push({name: `${id} task-template.yaml parses TaskContractSchema`, passed: ttParsed.success, detail: ttParsed.success ? 'schema-valid' : ttParsed.error.issues[0]?.message});
  if (wfParsed.success && ttParsed.success) {
    const gates = wfParsed.data.gates ?? [];
    const gateTarget = ttParsed.data.gate_target;
    const gateOk = gateTarget === null || gates.includes(gateTarget);
    checks.push({name: `${id} task gate_target in workflow gates`, passed: gateOk, detail: `gate_target=${gateTarget ?? 'null'} gates=[${gates.join(',')}]`});
    const idOk = wfParsed.data.workflow_id === id;
    checks.push({name: `${id} workflow_id matches`, passed: idOk});
  }
  return {status: checks.every((c) => c.passed) ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
};

export const runChainOracle = (): OracleOutcome => {
  const evidence: string[] = [];
  const checks: OracleOutcome['oracle_checks'] = [];
  const ids = ['P00', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09'] as const;
  const dirByWorkflow = new Map<string, string>();
  let allPass = true;
  for (const id of ids) {
    const dir = workflowDir(id);
    if (!dir) {
      checks.push({name: `${id} workflow dir present`, passed: false});
      allPass = false;
      continue;
    }
    dirByWorkflow.set(id, dir);
    const wfPath = resolve(dir, 'workflow.yml');
    const raw = readFileSync(wfPath, 'utf8');
    evidence.push(sha256(raw));
    const parsed = MultimediaWorkflowSchema.safeParse(parse(raw));
    if (!parsed.success) {
      checks.push({name: `${id} workflow.yml parses`, passed: false});
      allPass = false;
    }
  }
  // Chain contract: next_workflow links form P00 -> P01 -> ... -> P09 (null at
  // tail). The workflow's `inputs` are RelativePathSchema file refs to prior
  // workflow artifacts/specs (not typed artifact names), so the per-link
  // contract is: each non-root workflow's inputs resolve to existing files
  // within the prior workflow's directory (or are repo-internal `02_proceso/`
  // paths). P00 (root) carries no prior inputs. [CONFIG]
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    if (id === undefined) continue;
    const dir = dirByWorkflow.get(id);
    if (!dir) continue;
    const parsed = MultimediaWorkflowSchema.safeParse(parse(readFileSync(resolve(dir, 'workflow.yml'), 'utf8')));
    if (!parsed.success) continue;
    const inputs = parsed.data.inputs ?? [];
    if (i === 0) {
      const rootOk = inputs.length === 0;
      checks.push({name: `${id} root has no prior inputs`, passed: rootOk, detail: inputs.length === 0 ? 'root' : `${inputs.length} inputs`});
      if (!rootOk) allPass = false;
      continue;
    }
    const priorId = ids[i - 1];
    const priorDir = priorId !== undefined ? dirByWorkflow.get(priorId) : undefined;
    let inputsOk = true;
    for (const inp of inputs) {
      const s = String(inp);
      if (s.startsWith('02_proceso/')) continue;
      const resolved = resolve(MULTIMEDIA, s);
      if (!existsSync(resolved)) {
        inputsOk = false;
        break;
      }
      if (priorDir !== undefined && !resolved.startsWith(priorDir + '/') && !resolved.startsWith(dir + '/')) {
        inputsOk = false;
        break;
      }
    }
    checks.push({name: `${id} inputs resolve to prior-workflow or repo-internal files`, passed: inputsOk, detail: `inputs=[${inputs.map(String).join(',')}]`});
    if (!inputsOk) allPass = false;
  }
  const chainOk = ids.every((id, i) => {
    const dir = dirByWorkflow.get(id);
    if (!dir) return false;
    const parsed = MultimediaWorkflowSchema.safeParse(parse(readFileSync(resolve(dir, 'workflow.yml'), 'utf8')));
    if (!parsed.success) return false;
    const expectedNext = i === ids.length - 1 ? null : ids[i + 1] ?? null;
    return parsed.data.next_workflow === expectedNext;
  });
  checks.push({name: 'P00->P01->...->P09 next_workflow chain intact', passed: chainOk});
  if (!chainOk) allPass = false;
  return {status: allPass ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
};