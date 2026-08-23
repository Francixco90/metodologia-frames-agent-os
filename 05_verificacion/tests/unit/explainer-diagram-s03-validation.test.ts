import {createHash} from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';
import {stableStringify} from '../../../02_proceso/workflows/multimedia/_runner/brief-model.ts';
import {verifyExplainerDiagramS03} from '../../scripts/lib/explainer-diagram-s03-validation.ts';

const REPO = path.resolve(import.meta.dirname, '../../..');
const S02 = '04_estado/tasks/TASK-loose-032/skill-system/S02';
const S03 = '04_estado/tasks/TASK-loose-032/skill-system/S03';
const SCHEMA = '02_proceso/workflows/video-os/_schema/method-explainer-execution-v1.schema.ts';
const PLAN = `${S03}/skill-eval-plan-v1.json`;
const SKILL = `${S03}/component-contract-skill-v1.json`;
const COMPILER = `${S03}/component-contract-compiler-v1.json`;
const SCHEMA_CONTRACT = `${S03}/component-contract-schema-v1.json`;
const roots: string[] = [];
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const readJson = (root: string, ref: string) =>
  JSON.parse(readFileSync(path.join(root, ref), 'utf8')) as Record<string, unknown>;
const writeJson = (root: string, ref: string, record: Record<string, unknown>) =>
  writeFileSync(path.join(root, ref), `${JSON.stringify(record, null, 2)}\n`);
const refreshContentHash = (record: Record<string, unknown>) => {
  const payload = {...record};
  delete payload.content_sha256;
  record.content_sha256 = sha(stableStringify(payload));
};
const fixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'explainer-s03-'));
  roots.push(root);
  cpSync(path.join(REPO, S02), path.join(root, S02), {recursive: true});
  cpSync(path.join(REPO, S03), path.join(root, S03), {recursive: true});
  mkdirSync(path.dirname(path.join(root, SCHEMA)), {recursive: true});
  copyFileSync(path.join(REPO, SCHEMA), path.join(root, SCHEMA));
  return root;
};
const bindChangedContract = (
  root: string,
  ref: string,
  mutate: (value: Record<string, unknown>) => void,
) => {
  const contract = readJson(root, ref);
  mutate(contract);
  refreshContentHash(contract);
  writeJson(root, ref, contract);
  const plan = readJson(root, PLAN);
  const sources = plan.source_refs as Array<{ref: string; sha256: string}>;
  sources.find((source) => source.ref === ref)!.sha256 = sha(readFileSync(path.join(root, ref)));
  refreshContentHash(plan);
  writeJson(root, PLAN, plan);
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

describe('explainer diagram S03 validation', () => {
  it('accepts the four exact hash-bound components selected by S02', () => {
    expect(verifyExplainerDiagramS03(fixture())).toEqual({
      status: 'PASS',
      component_ids: [
        'SKILL_EXPLAINER_DIAGRAM_DESIGN',
        'TOOL_EXPLAINER_DIAGRAM_VALIDATE',
        'TOOL_EXPLAINER_DIAGRAM_COMPILE',
        'SCHEMA_DIAGRAM_CONTRACT_V2',
      ],
    });
  });

  it('rejects a missing contract', () => {
    const root = fixture();
    unlinkSync(path.join(root, SCHEMA_CONTRACT));
    expect(() => verifyExplainerDiagramS03(root)).toThrow('S03_CONTRACT_SET001');
  });

  it('rejects an extra contract', () => {
    const root = fixture();
    copyFileSync(
      path.join(root, COMPILER),
      path.join(root, S03, 'component-contract-extra-v1.json'),
    );
    expect(() => verifyExplainerDiagramS03(root)).toThrow('S03_CONTRACT_SET001');
  });

  it('rejects plan content hash drift', () => {
    const root = fixture();
    const plan = readJson(root, PLAN);
    plan.baseline = 'PREVIOUS_VERSION';
    writeJson(root, PLAN, plan);
    expect(() => verifyExplainerDiagramS03(root)).toThrow('S03_PLAN_HASH001');
  });

  it('rejects a stale source hash even when the plan self-hash is current', () => {
    const root = fixture();
    const plan = readJson(root, PLAN);
    (plan.source_refs as Array<{sha256: string}>)[0]!.sha256 = '0'.repeat(64);
    refreshContentHash(plan);
    writeJson(root, PLAN, plan);
    expect(() => verifyExplainerDiagramS03(root)).toThrow('S03_SOURCE_HASH001');
  });

  it('rejects source-ref substitution', () => {
    const root = fixture();
    const plan = readJson(root, PLAN);
    (plan.source_refs as Array<{ref: string}>)[0]!.ref = `${S02}/capability-map-v1.json`;
    refreshContentHash(plan);
    writeJson(root, PLAN, plan);
    expect(() => verifyExplainerDiagramS03(root)).toThrow('S03_SOURCE_REFS001');
  });

  it('rejects authority-schema byte drift', () => {
    const root = fixture();
    writeFileSync(path.join(root, SCHEMA), `${readFileSync(path.join(root, SCHEMA), 'utf8')}\n`);
    expect(() => verifyExplainerDiagramS03(root)).toThrow('S03_SOURCE_HASH001');
  });

  it('rejects a substituted skill input even with refreshed hashes', () => {
    const root = fixture();
    bindChangedContract(root, SKILL, (contract) => {
      contract.inputs_schema_ref = 'package.json';
    });
    expect(() => verifyExplainerDiagramS03(root)).toThrow('S03_SCHEMA_BINDING001');
  });

  it('rejects an effect above the selected E1 ceiling', () => {
    const root = fixture();
    bindChangedContract(root, COMPILER, (contract) => {
      contract.effect_class = 'E2';
    });
    expect(() => verifyExplainerDiagramS03(root)).toThrow('S03_EFFECT001');
  });

  it('rejects publication authority even with refreshed hashes', () => {
    const root = fixture();
    bindChangedContract(root, SCHEMA_CONTRACT, (contract) => {
      contract.publication_authority = true;
    });
    expect(() => verifyExplainerDiagramS03(root)).toThrow('S03_PUBLICATION001');
  });
});
