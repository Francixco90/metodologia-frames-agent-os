import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
// prettier-ignore
import {linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {afterEach, describe, expect, it} from 'vitest';

// prettier-ignore
import {DocumentationSurfaceV1Schema, hashExperienceValue} from '../../../02_proceso/core/contracts/index.ts';
// prettier-ignore
import {canonicalFramesMaintainJsonV1, inspectFramesMaintenanceV1 as inspectCore, planFramesMaintenanceV1 as planCore, prepareFramesMaintenanceHandoffV1 as handoffCore, routeMaintenanceIntent, type FramesMaintainBindingV1} from '../../../02_proceso/workflows/maintenance/index.ts';
// prettier-ignore
import {createFramesMaintainReadPortV1, runFramesMaintainCli} from '../../scripts/frames-maintain.ts';

const ROOT = process.cwd();
const SCRIPT = resolve(ROOT, '05_verificacion/scripts/frames-maintain.ts');
const TSX = pathToFileURL(resolve(ROOT, 'node_modules/tsx/dist/loader.mjs')).href;
const sandboxes = new Set<string>();
const sha = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');
const git = (root: string, ...args: string[]): string =>
  execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
// prettier-ignore
const inspectFramesMaintenanceV1 = (input: unknown, cwd: string) => inspectCore(input, createFramesMaintainReadPortV1(cwd));
const planFramesMaintenanceV1 = (input: unknown, cwd: string) =>
  planCore(input, createFramesMaintainReadPortV1(cwd));
const prepareFramesMaintenanceHandoffV1 = (input: unknown, cwd: string) =>
  handoffCore(input, createFramesMaintainReadPortV1(cwd));
type Fixture = ReturnType<typeof fixture>;
const fixture = () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'frames-maintain-'));
  sandboxes.add(sandbox);
  const root = join(sandbox, 'repository');
  mkdirSync(root);
  git(root, 'init', '--initial-branch=main');
  git(root, 'config', 'user.name', 'Frames Test');
  git(root, 'config', 'user.email', 'frames@example.invalid');
  writeFileSync(join(root, 'package.json'), '{"name":"fixture"}\n');
  git(root, 'add', 'package.json');
  git(root, 'commit', '-m', 'base');
  const baseCommit = git(root, 'rev-parse', 'HEAD');
  const baseTree = git(root, 'rev-parse', 'HEAD^{tree}');
  git(root, 'remote', 'add', 'origin', 'git@github.com:Acme/frames.git');
  git(root, 'update-ref', 'refs/remotes/origin/main', baseCommit);
  git(root, 'switch', '--quiet', '-c', 'codex/test-v1');
  writeFileSync(join(root, '.git/info/exclude'), 'state/\n');
  mkdirSync(join(root, 'state'));
  mkdirSync(join(root, 'src'));
  const binding: FramesMaintainBindingV1 = {
    schemaVersion: 'frames-maintain-binding-v1',
    repository: 'Acme/frames',
    branch: 'codex/test-v1',
    baseRef: 'origin/main',
    baseCommit,
    baseTree,
  };
  const routeRequest = {
    request: 'Mantener Frames',
    change_summary: 'Añadir un bootstrap local',
    target_surface: 'R9',
    expected_outcome: 'Handoff determinista',
  };
  const impactDraft = {
    schemaVersion: 'documentation-impact-plan-v1' as const,
    planId: 'DIP.TEST.001',
    changeClass: 'EXTEND' as const,
    scope: 'CANONICAL' as const,
    affectedIds: ['route:R9'],
    surfaces: DocumentationSurfaceV1Schema.options.map((surface) =>
      surface === 'TECHNICAL_REFERENCE'
        ? {surface, disposition: 'REQUIRED' as const, sourceRefs: ['src/output.ts']}
        : {
            surface,
            disposition: 'NOT_APPLICABLE' as const,
            reasonCode: 'NO_USER_VISIBLE_CHANGE' as const,
          },
    ),
  };
  const impact = {...impactDraft, canonicalSha256: hashExperienceValue(impactDraft)};
  const baseline = {
    schemaVersion: 'maintenance-baseline-v1',
    baselineId: 'BASE.TEST.001',
    capturedAt: '2026-08-30T00:00:00Z',
    workingRepository: binding.repository,
    branch: binding.branch,
    baseRef: binding.baseRef,
    baseCommit,
    baseTree,
    otherEndpoints: [],
    writePolicy: {
      versionedFiles: 2,
      targetChurnLines: 80,
      hardMaxFiles: 12,
      hardMaxChurnLines: 1200,
      externalEffects: false,
      mergeAuthorized: false,
      promotionAuthorized: false,
    },
    status: 'PLAN_MATERIALIZATION_ONLY',
  };
  const material = new Map([
    ['state/route.json', json(routeRequest)],
    ['state/baseline.json', json(baseline)],
    ['state/documentation-impact-plan.json', json(impact)],
  ]);
  for (const [ref, content] of material) writeFileSync(join(root, ref), content);
  const workOrderDraft = {
    schemaVersion: 'frames-work-order-v1' as const,
    workOrderId: 'WO.TEST.001',
    requestHash: routeMaintenanceIntent(routeRequest).request_hash,
    routeId: 'R9' as const,
    workflowId: 'M03',
    stepId: 'S01',
    skillId: 'dev-executing-plans',
    actorId: 'integration-owner-test',
    readSet: ['package.json', ...material.keys()],
    writeSet: ['package.json', 'src/output.ts'],
    inputs: [
      ...[...material].map(([ref, content]) => ({ref, sha256: sha(content)})),
      {ref: 'package.json', sha256: sha(readFileSync(join(root, 'package.json')))},
    ],
    expectedOutputs: ['package.json', 'src/output.ts'],
    tools: ['apply-patch', 'git-read-only', 'pnpm'],
    effectClass: 'LOCAL_REVERSIBLE' as const,
    budget: {targetFiles: 2, maxFiles: 12, targetTokens: 100, maxTokens: 200},
    acceptanceCriteria: ['Mantener el efecto local.'],
    stopRule: 'Detenerse ante el gate humano.',
    changeClass: 'EXTEND' as const,
    documentationImpact: impact,
  };
  const workOrder = {...workOrderDraft, canonicalSha256: hashExperienceValue(workOrderDraft)};
  const workOrderRef = 'state/work-order.json';
  writeFileSync(join(root, workOrderRef), json(workOrder));
  const inspectInput = {schemaVersion: 'frames-maintain-inspect-input-v1', binding};
  const inspection = inspectFramesMaintenanceV1(inspectInput, root);
  return {root, binding, workOrder, workOrderRef, inspectInput, inspection};
};
const rehash = (workOrder: Record<string, unknown>): Record<string, unknown> => {
  const draft = structuredClone(workOrder);
  delete draft.canonicalSha256;
  return {...draft, canonicalSha256: hashExperienceValue(draft)};
};
const planInput = (value: Fixture, workOrder: unknown = value.workOrder) => ({
  schemaVersion: 'frames-maintain-plan-input-v1',
  binding: value.binding,
  expectedInspectionSha256: value.inspection.canonicalSha256,
  workOrder,
});
// prettier-ignore
afterEach(() => { for (const sandbox of sandboxes) rmSync(sandbox, {recursive: true, force: true}); sandboxes.clear(); });
describe('frames:maintain B0', () => {
  it('inspects and plans deterministically without granting a gate', () => {
    const value = fixture();
    const first = planFramesMaintenanceV1(planInput(value), value.root);
    const second = planFramesMaintenanceV1(planInput(value), value.root);
    expect(value.inspection.schemaVersion).toBe('frames-maintain-inspection-v1');
    expect(canonicalFramesMaintainJsonV1(first)).toBe(canonicalFramesMaintainJsonV1(second));
    expect(first).toMatchObject({
      state: 'STOPPED_AT_GATE',
      effectClass: 'READ_ONLY',
      writes: [],
      nextGate: 'HM_CHANGE_APPROVED',
      gateStatus: 'REQUIRED',
    });
    expect(first.workOrderSha256).toBe(value.workOrder.canonicalSha256);
    expect(git(value.root, 'status', '--porcelain=v1')).toBe('');
  });
  // prettier-ignore
  it('rejects drift immediately after the frozen inspection', () => { const value = fixture(); const port = createFramesMaintainReadPortV1(value.root); let first = true; const read = port.inspect.bind(port); port.inspect = (binding) => { const observed = read(binding); if (first) { first = false; writeFileSync(join(value.root, 'src/output.ts'), 'drift\n'); } return observed; }; expect(() => planCore(planInput(value), port)).toThrow('FM-HASH001'); });
  it('rejects modes, residual arguments, malformed JSON and extra fields', () => {
    const value = fixture();
    for (const argv of [[], ['unknown'], ['inspect', '--apply']]) {
      expect(
        runFramesMaintainCli({argv, stdin: json(value.inspectInput), cwd: value.root}),
      ).toMatchObject({
        exitCode: 1,
        stderr: 'FM-ARG001\n',
      });
    }
    expect(runFramesMaintainCli({argv: ['inspect'], stdin: '{}{}', cwd: value.root}).stderr).toBe(
      'FM-INPUT001\n',
    );
    expect(() =>
      inspectFramesMaintenanceV1({...value.inspectInput, apply: true}, value.root),
    ).toThrow('FM-INPUT001');
  });
  it.each([
    '../escape.ts',
    'src\\escape.ts',
    'src/file.ts:ads',
    'src/*.ts',
    'src/CON',
    'src/NUL.txt',
    'src/file.',
    'src/file ',
    'src/e\u0301.ts',
    'src',
    'package.json/child.ts',
  ])('blocks a non-exact path: %s', (ref) => {
    const value = fixture();
    const changed = structuredClone(value.workOrder) as Record<string, unknown>;
    changed.writeSet = [ref];
    changed.expectedOutputs = [ref];
    changed.budget = {targetFiles: 1, maxFiles: 12, targetTokens: 100, maxTokens: 200};
    expect(() => planFramesMaintenanceV1(planInput(value, rehash(changed)), value.root)).toThrow(
      'FM-PATH001',
    );
  });
  it('blocks aliases, symlinks, stale hashes, effect drift and request drift', () => {
    const value = fixture();
    const missing = {...value.workOrder, canonicalSha256: undefined};
    expect(() => planFramesMaintenanceV1(planInput(value, missing), value.root)).toThrow(
      'FM-HASH001',
    );
    const aliases = structuredClone(value.workOrder) as Record<string, unknown>;
    aliases.writeSet = ['src/A.ts', 'src/a.ts'];
    aliases.expectedOutputs = aliases.writeSet;
    expect(() => planFramesMaintenanceV1(planInput(value, rehash(aliases)), value.root)).toThrow(
      'FM-ALIAS001',
    );
    const effect = rehash({...value.workOrder, effectClass: 'READ_ONLY'});
    expect(() => planFramesMaintenanceV1(planInput(value, effect), value.root)).toThrow(
      'FM-EFFECT001',
    );
    const request = rehash({...value.workOrder, requestHash: '0'.repeat(64)});
    expect(() => planFramesMaintenanceV1(planInput(value, request), value.root)).toThrow(
      'FM-HASH001',
    );
    const nested = structuredClone(value.workOrder) as Record<string, unknown>;
    (nested.documentationImpact as {affectedIds: string[]}).affectedIds.push('stale-doc');
    expect(() => planFramesMaintenanceV1(planInput(value, rehash(nested)), value.root)).toThrow(
      'FM-HASH001',
    );
    expect(() =>
      planFramesMaintenanceV1(
        {...planInput(value), expectedInspectionSha256: '0'.repeat(64)},
        value.root,
      ),
    ).toThrow('FM-HASH001');
    symlinkSync(join(value.root, 'package.json'), join(value.root, 'state/link.json'));
    const linked = structuredClone(value.workOrder) as Record<string, unknown>;
    linked.readSet = [...(linked.readSet as string[]), 'state/link.json'];
    linked.inputs = [
      ...(linked.inputs as Array<{ref: string; sha256: string}>),
      {ref: 'state/link.json', sha256: sha(readFileSync(join(value.root, 'package.json')))},
    ];
    expect(() => planFramesMaintenanceV1(planInput(value, rehash(linked)), value.root)).toThrow(
      'FM-PATH001',
    );
    rmSync(join(value.root, 'state/link.json'));
    linkSync(join(value.root, 'package.json'), join(value.root, 'state/hardlink.json'));
    expect(() => planFramesMaintenanceV1(planInput(value), value.root)).toThrow('FM-PATH001');
  });
  it('fails closed on repository, branch, base, tree, HEAD and detached drift', () => {
    const value = fixture();
    const inspect = (binding: FramesMaintainBindingV1) =>
      inspectFramesMaintenanceV1(
        {schemaVersion: 'frames-maintain-inspect-input-v1', binding},
        value.root,
      );
    expect(() => inspect({...value.binding, repository: 'Other/frames'})).toThrow('FM-REPO001');
    expect(() => inspect({...value.binding, branch: 'codex/other'})).toThrow('FM-BRANCH001');
    expect(() => inspect({...value.binding, baseCommit: '0'.repeat(40)})).toThrow('FM-BASE001');
    expect(() => inspect({...value.binding, baseTree: '0'.repeat(40)})).toThrow('FM-TREE001');
    writeFileSync(join(value.root, 'package.json'), '{"name":"head-drift"}\n');
    git(value.root, 'add', 'package.json');
    git(value.root, 'commit', '-m', 'head drift');
    expect(() => inspect(value.binding)).toThrow('FM-HEAD001');
    git(value.root, 'switch', '--detach', '--quiet');
    expect(() => inspect(value.binding)).toThrow('FM-BRANCH001');
  });
  it('prepares a hash-bound handoff and blocks a change outside the write set', () => {
    const value = fixture();
    writeFileSync(join(value.root, 'package.json'), '{"name":"candidate"}\n');
    writeFileSync(join(value.root, 'src/output.ts'), 'x\n'.repeat(1201));
    const inspection = inspectFramesMaintenanceV1(value.inspectInput, value.root);
    const handoffInput = {
      schemaVersion: 'frames-maintain-handoff-input-v1',
      binding: value.binding,
      expectedInspectionSha256: inspection.canonicalSha256,
      workOrderRef: value.workOrderRef,
      workOrderPhysicalSha256: sha(readFileSync(join(value.root, value.workOrderRef))),
    };
    expect(() => prepareFramesMaintenanceHandoffV1(handoffInput, value.root)).toThrow(
      'FM-EFFECT001',
    );
    writeFileSync(join(value.root, 'src/output.ts'), 'export const candidate = true;\n');
    const result = prepareFramesMaintenanceHandoffV1(handoffInput, value.root);
    expect(result).toMatchObject({
      state: 'STOPPED_AT_GATE',
      effectClass: 'READ_ONLY',
      writes: [],
      guardianVerdict: 'NOT_RECORDED',
      promotionAuthority: 'NOT_RECORDED',
      nextGate: 'HM_PROMOTION_APPROVED',
      gateStatus: 'REQUIRED',
    });
    expect(() =>
      prepareFramesMaintenanceHandoffV1(
        {...handoffInput, workOrderPhysicalSha256: '0'.repeat(64)},
        value.root,
      ),
    ).toThrow('FM-HASH001');
    writeFileSync(join(value.root, 'outside.txt'), 'outside\n');
    const drifted = inspectFramesMaintenanceV1(value.inspectInput, value.root);
    expect(() =>
      prepareFramesMaintenanceHandoffV1(
        {...handoffInput, expectedInspectionSha256: drifted.canonicalSha256},
        value.root,
      ),
    ).toThrow('FM-DIRTY001');
  });
  it('ignores hostile Git environment and emits identical bytes in fresh processes', () => {
    const value = fixture();
    const stdin = json(value.inspectInput);
    const run = (cwd: string, tz: string): string =>
      execFileSync(process.execPath, ['--import', TSX, SCRIPT, 'inspect'], {
        cwd,
        input: stdin,
        encoding: 'utf8',
        env: {
          ...process.env,
          TZ: tz,
          LANG: tz === 'UTC' ? 'es_CO.UTF-8' : 'C',
          GIT_DIR: join(value.root, 'missing'),
          GIT_WORK_TREE: join(value.root, 'missing'),
          GIT_CONFIG_COUNT: '1',
          GIT_CONFIG_KEY_0: 'core.fsmonitor',
          GIT_CONFIG_VALUE_0: 'touch should-not-exist',
        },
      });
    mkdirSync(join(value.root, 'nested'));
    expect(run(value.root, 'UTC')).toBe(run(join(value.root, 'nested'), 'America/Bogota'));
    expect(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).toContain(
      '"frames:maintain": "node --import tsx 05_verificacion/scripts/frames-maintain.ts"',
    );
  });
});
