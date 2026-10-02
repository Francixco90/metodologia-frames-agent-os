import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {materializeDecisionFunnelFixture} from '../fixtures/experience/decision-funnel-fixture.ts';
import {hashExperienceValue} from '../../../02_proceso/core/contracts/index.ts';
import {normalizeFirstTurnPromptV1} from '../../../02_proceso/workflows/core/first-turn-signals-v1.ts';
import {aulaFileHashV1 as hash} from '../../../02_proceso/workflows/multimedia/_runner/aula-work-order-v1.ts';
import {selectAulaCapabilityV1} from '../../../02_proceso/workflows/multimedia/_runner/aula-capability-v1.ts';
import {AulaBriefApprovalV1Schema} from '../../../02_proceso/workflows/multimedia/_schema/aula-approval-v1.ts';

type Runner = (input: {argv: string[]; stdin: string; cwd: string}) => Promise<{stdout: string}>;
type Execution = {
  local_execution: {
    status: string;
    materialized: boolean;
    coverageGap?: string;
    specRef?: string;
    receiptRef?: string;
  };
};
let run: Runner;
const roots: string[] = [];
beforeAll(async () => {
  const imported = (await import(
    pathToFileURL(resolve('05_verificacion/scripts/frames-assist.mjs')).href
  )) as {runFramesAssist: Runner};
  run = imported.runFramesAssist;
});
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});
const requests = [
  ['immersive-class', 'Crear una clase inmersiva para una sesión presentada'],
  ['masterclass', 'Crear una masterclass sobre conceptos'],
  ['workbook', 'Crear un workbook de práctica guiada'],
  ['lean-coffee', 'Crear Lean Coffee de cierre'],
  ['playbook', 'Crear un playbook de adopción'],
  ['playbook-immersive', 'Crear un playbook inmersivo'],
  ['index', 'Crear el índice del módulo'],
  ['module', 'Crear un kit completo para un taller'],
  ['dynamic-commercial-decks', 'Crear un deck de prospección'],
] as const;
function engineFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error('FIXTURE_ENGINE_SYMLINK');
    return entry.isDirectory()
      ? engineFiles(resolve(dir, entry.name), prefix + entry.name + '/')
      : [prefix + entry.name];
  });
}
function fixture(
  kind: string,
  request: string,
  edition: 'metodologia' | 'white-label' = 'metodologia',
) {
  const root = mkdtempSync(resolve(realpathSync(tmpdir()), 'frames-aula-chain-'));
  roots.push(root);
  cpSync(
    resolve('03_artefactos/renderers/frames-aula'),
    resolve(root, '03_artefactos/renderers/frames-aula'),
    {recursive: true},
  );
  const capability = selectAulaCapabilityV1(request, edition)!;
  mkdirSync(resolve(root, `03_artefactos/skills/${capability.skillId}`), {recursive: true});
  cpSync(
    resolve(`03_artefactos/skills/${capability.skillId}/SKILL.md`),
    resolve(root, `03_artefactos/skills/${capability.skillId}/SKILL.md`),
  );
  mkdirSync(resolve(root, '04_estado/registries/renderers'), {recursive: true});
  writeFileSync(
    resolve(root, '04_estado/registries/renderers/aula-decks-capability-v1.json'),
    JSON.stringify({
      lifecycleState: 'active',
      publicationAuthority: false,
      engineRefs: engineFiles(resolve(root, '03_artefactos/renderers/frames-aula')).map((name) => ({
        ref: `03_artefactos/renderers/frames-aula/${name}`,
        sha256: hash(resolve(root, `03_artefactos/renderers/frames-aula/${name}`)),
      })),
    }),
  );
  mkdirSync(resolve(root, '04_estado/registries/skills'), {recursive: true});
  writeFileSync(
    resolve(root, '04_estado/registries/skills/creation-v3-skill-registry.yml'),
    JSON.stringify({
      entries: [
        {
          skill_id: capability.skillId,
          current_state: 'active',
          publication_authority: false,
          content_sha256: hash(
            resolve(root, `03_artefactos/skills/${capability.skillId}/SKILL.md`),
          ),
        },
      ],
    }),
  );
  cpSync(
    resolve(`03_artefactos/renderers/frames-aula/examples/${kind}.json`),
    resolve(root, 'input.json'),
  );
  const source = JSON.parse(readFileSync(resolve(root, 'input.json'), 'utf8')) as {
    sections: {links?: {href: string}[]; assetRefs?: {id: string; kind: string}[]}[];
    pieces?: {href: string}[];
  };
  for (const piece of [
    ...(source.pieces ?? []),
    ...source.sections.flatMap((s) => s.links ?? []),
  ]) {
    const name = piece.href.split('#')[0]!;
    if (!/^[a-z][a-z0-9-]*\.html$/u.test(name)) throw new Error('FIXTURE_LINKED_FILE_UNSAFE');
    cpSync(resolve('03_artefactos/renderers/frames-aula/examples', name), resolve(root, name));
  }
  const testBanks = process.env.FRAMES_AULA_TEST_BANKS;
  if (testBanks) {
    cpSync(resolve(testBanks, edition), resolve(root, 'asset-bank'), {recursive: true});
    source.sections[0]!.assetRefs = [
      ...(source.sections[0]!.assetRefs ?? []),
      {id: 'business-offer', kind: 'icon'},
    ];
    writeFileSync(resolve(root, 'input.json'), JSON.stringify(source));
  }
  writeFileSync(
    resolve(root, 'brief.md'),
    '# Brief de evaluación original\n\nObjetivo: practicar con evidencia. [SUPUESTO]\n',
  );
  const requestHash = hashExperienceValue({prompt: normalizeFirstTurnPromptV1(request)});
  const identity = {
    decision: 'APPROVED',
    actor: 'HUMAN-SIMULATED-FIXTURE',
    basis: 'explicit_human_decision',
    requestHash,
    routeId: 'R6',
    edition,
  };
  writeFileSync(
    resolve(root, 'brief-approval.json'),
    JSON.stringify({
      ...identity,
      gate: 'EXP_BRIEF_APPROVED',
      briefSha256: hash(resolve(root, 'brief.md')),
    }),
  );
  const deck = kind === 'dynamic-commercial-decks';
  if (deck) {
    writeFileSync(
      resolve(root, 'intake.json'),
      JSON.stringify({
        audience: 'Facilitadores',
        problem: 'Practicar',
        decision: 'Revisar un prototipo',
        edition,
      }),
    );
    writeFileSync(
      resolve(root, 'intake-approval.json'),
      JSON.stringify({
        ...identity,
        gate: 'DECK_INTAKE_APPROVED',
        intakeSha256: hash(resolve(root, 'intake.json')),
      }),
    );
  }
  const decision = materializeDecisionFunnelFixture(requestHash);
  const base = {
    decision_funnel: decision.funnel,
    decision_selection: decision.selection,
    request,
    audience: 'Facilitadores',
    outcome: 'Practicar',
    source: {type: 'notes', authority: 'verified', ref: 'brief.md'},
    workspace_root: '.',
    started_at: '2026-10-01T15:00:00Z',
    completed_at: '2026-10-01T15:00:01Z',
    actor_id: 'RT-07-FIXTURE',
  };
  const c = {
    edition,
    inputRef: 'input.json',
    ...(testBanks ? {bankRef: 'asset-bank'} : {}),
    briefRef: 'brief.md',
    briefApprovalRef: 'brief-approval.json',
    ...(deck ? {intakeRef: 'intake.json', intakeApprovalRef: 'intake-approval.json'} : {}),
  };
  const invoke = async (
    stage: 'spec' | 'build',
    out: string,
    extra: Record<string, unknown> = {},
    apply = true,
  ) =>
    JSON.parse(
      (
        await run({
          argv: apply ? ['--apply'] : [],
          stdin: JSON.stringify({
            ...base,
            aula_continuation: {
              ...c,
              stage,
              outputDirectoryRef: out,
              writeSet: [`${out}/**`],
              ...(stage === 'build'
                ? {specRef: 'design/spec.json', specApprovalRef: 'spec-approval.json'}
                : {}),
              ...extra,
            },
          }),
          cwd: root,
        })
      ).stdout,
    ) as Execution;
  const approveSpec = () =>
    writeFileSync(
      resolve(root, 'spec-approval.json'),
      JSON.stringify({
        ...identity,
        gate: 'MW_SPEC_APPROVED',
        specSha256: hash(resolve(root, 'design/spec.json')),
        inputSha256: hash(resolve(root, 'input.json')),
      }),
    );
  return {root, identity, invoke, approveSpec};
}
describe('Aula natural-language continuation through Frames gates', () => {
  it.each(
    requests.flatMap(
      ([kind, request]) =>
        [
          ['metodologia', kind, request],
          ['white-label', kind, request + ' de marca blanca'],
        ] as const,
    ),
  )('%s %s reaches P05 then P06/P07 with material receipts', async (edition, kind, request) => {
    const f = fixture(kind, request, edition);
    const spec = await f.invoke('spec', 'design');
    expect(spec.local_execution.status, spec.local_execution.coverageGap).toBe('AWAITING_APPROVAL');
    expect(existsSync(resolve(f.root, 'design/spec.json'))).toBe(true);
    f.approveSpec();
    const built = await f.invoke('build', 'render');
    expect(built.local_execution.status, built.local_execution.coverageGap).toBe('RENDERED_DRAFT');
    const receipt = JSON.parse(
      readFileSync(resolve(f.root, 'render/invocation-receipt.json'), 'utf8'),
    ) as {status: string; outputs: {ref: string; sha256: string}[]};
    const material = JSON.parse(readFileSync(resolve(f.root, 'render/receipt.json'), 'utf8')) as {
      engineVersion?: string;
      assetEvidence?: {id: string; source: string}[];
    };
    if (process.env.FRAMES_AULA_TEST_BANKS) {
      expect(material.engineVersion).toBe('1.1.0');
      expect(material.assetEvidence).toContainEqual(
        expect.objectContaining({id: 'business-offer', source: 'bank'}),
      );
    }
    expect(receipt.status).toBe('PASS');
    for (const item of receipt.outputs) expect(hash(resolve(f.root, item.ref))).toBe(item.sha256);
    const review = JSON.parse(
      readFileSync(resolve(f.root, 'render/review-report.json'), 'utf8'),
    ) as {humanReviewStatus: string; publicationAuthorized: boolean};
    expect(review.humanReviewStatus).toBe('PENDING');
    expect(review.publicationAuthorized).toBe(false);
  });
  it('rejects malformed or mismatched deck intake even when its hash is approved', async () => {
    for (const change of [
      {audience: {}},
      {problem: 3},
      {decision: '   '},
      {edition: 'white-label'},
    ]) {
      const f = fixture('dynamic-commercial-decks', 'Crear un deck de prospección');
      const intake = resolve(f.root, 'intake.json');
      const data = JSON.parse(readFileSync(intake, 'utf8')) as Record<string, unknown>;
      writeFileSync(intake, JSON.stringify({...data, ...change}));
      const approval = resolve(f.root, 'intake-approval.json');
      const value = JSON.parse(readFileSync(approval, 'utf8')) as Record<string, unknown>;
      writeFileSync(approval, JSON.stringify({...value, intakeSha256: hash(intake)}));
      const result = await f.invoke('spec', 'design');
      expect(result.local_execution.status).toBe('BLOCKED');
      expect(existsSync(resolve(f.root, 'design'))).toBe(false);
    }
  });
  it('read-only continuation produces no design', async () => {
    const f = fixture('workbook', 'Crear un workbook');
    await f.invoke('spec', 'design', {}, false);
    expect(existsSync(resolve(f.root, 'design'))).toBe(false);
  });
  it('rejects stale brief, malformed actor and absent spec approval without outputs', async () => {
    const f = fixture('workbook', 'Crear un workbook');
    writeFileSync(resolve(f.root, 'brief.md'), 'Changed');
    const result = await f.invoke('spec', 'design');
    expect(result.local_execution.status).toBe('BLOCKED');
    expect(existsSync(resolve(f.root, 'design'))).toBe(false);
    expect(() =>
      AulaBriefApprovalV1Schema.parse({
        ...f.identity,
        actor: {},
        gate: 'EXP_BRIEF_APPROVED',
        briefSha256: '0'.repeat(64),
      }),
    ).toThrow();
  });
  it('rejects content change after spec approval', async () => {
    const f = fixture('workbook', 'Crear un workbook');
    await f.invoke('spec', 'design');
    f.approveSpec();
    const input = JSON.parse(readFileSync(resolve(f.root, 'input.json'), 'utf8')) as {
      title: string;
    };
    input.title = 'Changed';
    writeFileSync(resolve(f.root, 'input.json'), JSON.stringify(input));
    const result = await f.invoke('build', 'render');
    expect(result.local_execution.status).toBe('BLOCKED');
    expect(existsSync(resolve(f.root, 'render'))).toBe(false);
  });
  it('rejects edition and write-set drift before materialization', async () => {
    const f = fixture('workbook', 'Crear un workbook');
    let result = await f.invoke('spec', 'design', {edition: 'white-label'});
    expect(result.local_execution.status).toBe('BLOCKED');
    result = await f.invoke('spec', 'design', {writeSet: ['elsewhere/**']});
    expect(result.local_execution.status).toBe('BLOCKED');
    expect(existsSync(resolve(f.root, 'design'))).toBe(false);
  });
  it('requires both intake and spec for commercial decks', async () => {
    const f = fixture('dynamic-commercial-decks', 'Crear un deck comercial');
    rmSync(resolve(f.root, 'intake-approval.json'));
    const result = await f.invoke('spec', 'design');
    expect(result.local_execution.status).toBe('BLOCKED');
    expect(existsSync(resolve(f.root, 'design'))).toBe(false);
  });
  it('rejects a missing spec decision and intake/spec bypass', async () => {
    const f = fixture('dynamic-commercial-decks', 'Crear un deck comercial');
    await f.invoke('spec', 'design');
    const built = await f.invoke('build', 'render');
    expect(built.local_execution.status).toBe('BLOCKED');
    expect(existsSync(resolve(f.root, 'render'))).toBe(false);
  });
  it('rejects another request approval and unsupported route', async () => {
    const f = fixture('workbook', 'Crear un workbook');
    const approval = JSON.parse(readFileSync(resolve(f.root, 'brief-approval.json'), 'utf8')) as {
      requestHash: string;
      routeId: string;
    };
    approval.requestHash = '0'.repeat(64);
    writeFileSync(resolve(f.root, 'brief-approval.json'), JSON.stringify(approval));
    const result = await f.invoke('spec', 'design');
    expect(result.local_execution.status).toBe('BLOCKED');
    expect(existsSync(resolve(f.root, 'design'))).toBe(false);
  });
  it('rejects changed engine code against the frozen renderer authority', async () => {
    const f = fixture('workbook', 'Crear un workbook');
    await f.invoke('spec', 'design');
    f.approveSpec();
    writeFileSync(resolve(f.root, '03_artefactos/renderers/frames-aula/app.js'), 'Changed engine');
    const built = await f.invoke('build', 'render');
    expect(built.local_execution.status).toBe('BLOCKED');
    expect(existsSync(resolve(f.root, 'render'))).toBe(false);
  });
  it('rejects unsafe input references before directory creation', async () => {
    const f = fixture('workbook', 'Crear un workbook');
    const result = await f.invoke('spec', 'design', {inputRef: '../outside.json'});
    expect(result.local_execution.status).toBe('BLOCKED');
    expect(existsSync(resolve(f.root, 'design'))).toBe(false);
  });
});
