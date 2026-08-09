import {describe, expect, it} from 'vitest';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  LocalExtensionManifestSchema,
  SandboxProbeSchema,
  resolveLocalExtensionCandidates,
  routeLocalExtensionIntent,
} from 'workflows/local-extensions/index.ts';

const digest = 'a'.repeat(64);
const manifest = {
  schema_version: 'frames-local-extension-v1',
  extension_id: 'local.frames.review-deck',
  version: '1.0.0',
  scope: 'PROJECT_LOCAL',
  kind: 'skill',
  lifecycle: 'READY',
  enabled: true,
  override_policy: 'never',
  description: 'Revisa una presentación local.',
  triggers: ['revisar presentación'],
  capabilities: ['review.deck'],
  inputs: [],
  outputs: ['review.md'],
  dependencies: [],
  effect_class: 'read_only',
  tools: [],
  read_set: ['inputs/deck.md'],
  write_set: [],
  routing: {priority: 'after_canonical', complements: []},
  execution: {mode: 'declarative'},
  content: [{ref: 'SKILL.md', sha256: digest}],
  documentation: ['README.md'],
  fixtures: {positive: 'fixtures/positive.json', adversarial: 'fixtures/adversarial.json'},
  budgets: {max_files: 6, max_context_files: 10},
} as const;

describe('local extension contracts', () => {
  it('accepts only additive, local and portable manifests', () => {
    expect(LocalExtensionManifestSchema.parse(manifest)).toEqual(manifest);
    expect(() =>
      LocalExtensionManifestSchema.parse({...manifest, override_policy: 'replace'}),
    ).toThrow();
    expect(() =>
      LocalExtensionManifestSchema.parse({...manifest, extension_id: 'content-os-router'}),
    ).toThrow();
    expect(() =>
      LocalExtensionManifestSchema.parse({...manifest, read_set: ['../private/source.md']}),
    ).toThrow(/portable relative reference/u);
    expect(() =>
      LocalExtensionManifestSchema.parse({...manifest, state: 'ACTIVE_LOCAL'}),
    ).toThrow();
  });

  it('requires a material sandbox probe shape for code execution', () => {
    const probe = {
      schema_version: 'frames-local-sandbox-probe-v1',
      extension_id: manifest.extension_id,
      manifest_sha256: digest,
      runner_id: 'frames-sandbox-v1',
      runner_sha256: 'b'.repeat(64),
      status: 'PASS',
      filesystem: 'CONSTRAINED',
      process: 'CONTROLLED',
      network: 'DENIED',
      deterministic_replay: 'PASS',
      write_set_check: 'PASS',
      evidence: [{ref: 'evidence/probe.json', sha256: 'c'.repeat(64)}],
    } as const;
    expect(SandboxProbeSchema.parse(probe)).toEqual(probe);
    expect(() => SandboxProbeSchema.parse({...probe, network: 'ALLOWED'})).toThrow();
    expect(() => SandboxProbeSchema.parse({...probe, evidence: ['self-asserted PASS']})).toThrow();
  });

  it('does not select arbitrarily when multiple local extensions match', () => {
    const record = (extension_id: string) => ({
      extension_id,
      scope: 'PROJECT_LOCAL' as const,
      source_root: '/private/local',
      manifest_ref: `${extension_id}/extension.json`,
      manifest_sha256: digest,
      state: 'ACTIVE_LOCAL' as const,
      reason_codes: [],
      manifest: LocalExtensionManifestSchema.parse({...manifest, extension_id}),
    });
    const result = resolveLocalExtensionCandidates({
      discovery: {
        schema_version: 'frames-local-extension-discovery-v1',
        project_root: '/private/local',
        records: [record('local.frames.review-a'), record('local.frames.review-b')],
      },
      canonical: [],
      signals: ['revisar presentación'],
    });
    expect(result).toMatchObject({decision: 'AMBIGUOUS'});
    expect(result.selected_local).toBeUndefined();
  });

  it('routes ordinary language to R8 without writing before brief approval', async () => {
    const input = {
      request: 'Crea una skill local para revisar mis presentaciones en este proyecto.',
    };
    const first = routeLocalExtensionIntent(input);
    const second = routeLocalExtensionIntent(input);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      route_id: 'R8',
      extension_kind: 'skill',
      scope: 'PROJECT_LOCAL',
      stage_path: ['L00', 'L01', 'L02', 'L03', 'L04', 'L05'],
      next_gate: 'LX_BRIEF_APPROVED',
      write_policy: 'read_only_until_brief_approved',
      blocking_questions: [],
      state: 'READY_FOR_BRIEF_APPROVAL',
    });
    expect(first.request_hash).toMatch(/^[a-f0-9]{64}$/u);
    const {dispatchIntent} = (await import(
      pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
    )) as {dispatchIntent: (value: {request: string}) => {adapter: string}};
    const dispatch = dispatchIntent(input);
    expect(dispatch.adapter).toBe('workflows/local-extensions/intent-router.ts');
    expect(existsSync(`02_proceso/${dispatch.adapter}`)).toBe(true);
  });
});
