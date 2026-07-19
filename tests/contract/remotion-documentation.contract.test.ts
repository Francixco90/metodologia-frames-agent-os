import {createHash} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import YAML from 'yaml';

const root = process.cwd();
const motionRoot = resolve(root, 'projects/vs-001-source-to-campaign/remotion');
const allowedClaimIds = ['CLM-VS001-001', 'CLM-VS001-002', 'CLM-VS001-003'] as const;

const read = (relativePath: string): string =>
  readFileSync(resolve(motionRoot, relativePath), 'utf8');
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a record.`);
  }
  return value as Record<string, unknown>;
};

const asArray = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value;
};

const requireKeys = (
  record: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void => {
  for (const key of keys) {
    expect(Object.hasOwn(record, key), `${label}.${key}`).toBe(true);
  }
};

const assertMaterialValue = (value: unknown, label: string): void => {
  expect(value, label).not.toBeNull();
  expect(value, label).not.toBeUndefined();
  if (typeof value === 'string') {
    expect(value.trim().length, label).toBeGreaterThan(0);
    return;
  }
  if (Array.isArray(value)) {
    expect(value.length, label).toBeGreaterThan(0);
    value.forEach((item, index) => assertMaterialValue(item, `${label}[${index}]`));
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    expect(entries.length, label).toBeGreaterThan(0);
    for (const [key, item] of entries) {
      assertMaterialValue(item, `${label}.${key}`);
    }
  }
};

const expectNoGrantedState = (record: Record<string, unknown>, label: string): void => {
  for (const [key, value] of Object.entries(record)) {
    if (/(?:state|status|decision|next_state)$/u.test(key) && typeof value === 'string') {
      expect(
        ['FINAL', 'READY', 'HUMAN_APPROVED', 'PUBLISHED'].includes(value),
        `${label}.${key}`,
      ).toBe(false);
    }
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            expectNoGrantedState(item as Record<string, unknown>, `${label}.${key}[${index}]`);
          }
        });
      } else {
        expectNoGrantedState(value as Record<string, unknown>, `${label}.${key}`);
      }
    }
  }
};

describe('Prompt Maestro audiovisual documentation contract', () => {
  it('requires every video-spec field, scoped provenance and no disguised universal defaults', () => {
    const spec = asRecord(YAML.parse(read('01-video-spec.yml')) as unknown, 'video_spec');
    const requiredFields = [
      'spec_version',
      'content_id',
      'objective',
      'audience',
      'narrative_thesis',
      'format',
      'platform',
      'script_ref',
      'duration',
      'resolution_profile',
      'central_metaphor',
      'emotional_visual_arc',
      'design_system_ref',
      'component_registry_ref',
      'accessibility',
      'captions',
      'sources',
      'claims',
      'rights',
      'assets',
      'props',
      'risks',
      'human_approval_required',
    ] as const;

    requireKeys(spec, requiredFields, 'video_spec');
    for (const field of requiredFields) {
      assertMaterialValue(spec[field], `video_spec.${field}`);
    }
    expect(spec.requested_state).toBe('RENDERED_DRAFT');
    expect(spec.human_approval_required).toBe(true);
    expect(spec.allowed_claim_ids).toStrictEqual(allowedClaimIds);
    expectNoGrantedState(spec, 'video_spec');

    const duration = asRecord(spec.duration, 'video_spec.duration');
    requireKeys(duration, ['target_frames', 'target_seconds', 'provenance'], 'video_spec.duration');
    expect(duration.target_frames).toBe(1231);
    expect(duration.target_seconds).toBe(41.033);
    assertMaterialValue(duration.provenance, 'video_spec.duration.provenance');

    const profile = asRecord(spec.resolution_profile, 'video_spec.resolution_profile');
    requireKeys(
      profile,
      ['width', 'height', 'fps', 'safe_zones_px', 'provenance', 'universal_default'],
      'video_spec.resolution_profile',
    );
    expect(profile.width).toBe(1080);
    expect(profile.height).toBe(1920);
    expect(profile.fps).toBe(30);
    expect(profile.universal_default).toBe(false);
    assertMaterialValue(profile.safe_zones_px, 'video_spec.resolution_profile.safe_zones_px');
    assertMaterialValue(profile.provenance, 'video_spec.resolution_profile.provenance');
  });

  it('requires every literal beat field and keeps narration, components and claims bound', () => {
    const beatMap = asRecord(YAML.parse(read('02-beat-map.yml')) as unknown, 'beat_map');
    const registry = asRecord(
      YAML.parse(read('04-component-registry.yml')) as unknown,
      'component_registry',
    );
    const captions = asRecord(JSON.parse(read('captions.json')) as unknown, 'captions');
    const components = asArray(registry.components, 'component_registry.components').map(
      (component, index) =>
        asRecord(component, `component_registry.components[${index.toString()}]`),
    );
    const componentIds = new Set(components.map(({component_id: componentId}) => componentId));
    const captionByBeat = new Map(
      asArray(captions.captions, 'captions.captions').map((caption, index) => {
        const record = asRecord(caption, `captions.captions[${index.toString()}]`);
        return [record.beatId, record] as const;
      }),
    );
    const requiredBeatFields = [
      'beat_id',
      'purpose',
      'duration_frames',
      'narration',
      'visible_copy',
      'visual_action',
      'components',
      'claim_ids',
      'data',
      'audio',
      'mood',
      'transition',
      'accessibility',
      'acceptance',
    ] as const;

    const beats = asArray(beatMap.beats, 'beat_map.beats');
    expect(beats).toHaveLength(7);
    const observedClaims = new Set<string>();
    for (const [index, rawBeat] of beats.entries()) {
      const beat = asRecord(rawBeat, `beat_map.beats[${index.toString()}]`);
      requireKeys(beat, requiredBeatFields, `beat_map.beats[${index.toString()}]`);
      for (const field of requiredBeatFields) {
        assertMaterialValue(beat[field], `beat_map.beats[${index.toString()}].${field}`);
      }

      const beatClaims = asArray(beat.claim_ids, `beat_map.beats[${index.toString()}].claim_ids`);
      for (const claimId of beatClaims) {
        expect(allowedClaimIds).toContain(claimId);
        observedClaims.add(String(claimId));
      }
      for (const componentId of asArray(
        beat.components,
        `beat_map.beats[${index.toString()}].components`,
      )) {
        expect(componentIds.has(componentId), String(componentId)).toBe(true);
      }

      const caption = captionByBeat.get(beat.beat_id);
      expect(caption, String(beat.beat_id)).toBeDefined();
      expect(beat.narration).toBe(caption?.text);
    }
    expect([...observedClaims].sort()).toStrictEqual([...allowedClaimIds].sort());
  });

  it('requires the complete component contract and binds every registry hash to code', () => {
    const registry = asRecord(
      YAML.parse(read('04-component-registry.yml')) as unknown,
      'component_registry',
    );
    expect(registry.state).toBe('REGISTRY_DRAFT');
    expect(registry.approval_receipt).toBeNull();
    expectNoGrantedState(registry, 'component_registry');
    expect(sha256(read('assets-manifest.yml'))).toBe(registry.asset_manifest_sha256);

    const requiredComponentFields = [
      'component_id',
      'version',
      'category',
      'renderer',
      'props',
      'compatible_formats',
      'preview',
      'restrictions',
      'rights',
      'accessibility',
      'tests',
      'risks',
      'state',
      'path',
      'sha256',
    ] as const;
    const components = asArray(registry.components, 'component_registry.components');
    expect(components.length).toBeGreaterThan(0);
    const componentIds = new Set<string>();
    for (const [index, rawComponent] of components.entries()) {
      const component = asRecord(
        rawComponent,
        `component_registry.components[${index.toString()}]`,
      );
      requireKeys(
        component,
        requiredComponentFields,
        `component_registry.components[${index.toString()}]`,
      );
      for (const field of requiredComponentFields) {
        if (field !== 'props') {
          assertMaterialValue(
            component[field],
            `component_registry.components[${index.toString()}].${field}`,
          );
        }
      }

      const componentId = String(component.component_id);
      expect(componentIds.has(componentId), componentId).toBe(false);
      componentIds.add(componentId);
      const componentProps = asRecord(
        component.props,
        `component_registry.components[${index.toString()}].props`,
      );
      requireKeys(
        componentProps,
        ['required', 'defaults'],
        `component_registry.components[${index.toString()}].props`,
      );
      expect(
        Array.isArray(componentProps.required),
        `component_registry.components[${index.toString()}].props.required`,
      ).toBe(true);
      asRecord(
        componentProps.defaults,
        `component_registry.components[${index.toString()}].props.defaults`,
      );
      expect(component.compatible_formats).toContain('9:16');
      expect(component.compatible_formats).not.toContain('16:9');
      expect(component.compatible_formats).not.toContain('1:1');
      expect(component.state).toBe('REGISTRY_DRAFT');

      const componentPath = String(component.path);
      expect(sha256(readFileSync(resolve(root, componentPath))), componentPath).toBe(
        component.sha256,
      );
    }
  });

  it('requires separate Markdown approval guidance and a fail-closed template', () => {
    const approvalsRoot = resolve(motionRoot, 'approvals');
    const approvalNames = readdirSync(approvalsRoot).sort();
    expect(approvalNames).toStrictEqual(['README.md', 'TEMPLATE.md']);

    const approvalReadme = read('approvals/README.md');
    expect(approvalReadme).toMatch(/no[_ -]approval|sin aprobaci[oó]n|not issued/iu);
    expect(approvalReadme).toContain('RENDERED_DRAFT');
    expect(approvalReadme).toMatch(/(?:no\s+`?READY|READY[\s\S]{0,120}(?:no|not|bloquead))/iu);

    const template = read('approvals/TEMPLATE.md');
    const frontmatter = template.match(/^---\n([\s\S]*?)\n---/u);
    expect(frontmatter).not.toBeNull();
    const approval = asRecord(YAML.parse(frontmatter?.[1] ?? '') as unknown, 'approval_template');
    const requiredApprovalFields = [
      'template_only',
      'approval_receipt_present',
      'artifact_id',
      'artifact_version',
      'artifact_sha256',
      'decision',
      'approver_actor_id',
      'decided_at',
      'conditions',
      'risks_accepted',
      'next_state',
    ] as const;
    requireKeys(approval, requiredApprovalFields, 'approval_template');
    for (const field of requiredApprovalFields) {
      assertMaterialValue(approval[field], `approval_template.${field}`);
    }
    expect(approval.template_only).toBe(true);
    expect(approval.approval_receipt_present).toBe(false);
    expect(['PENDING', 'BLOCKED', 'NOT_ISSUED']).toContain(approval.decision);
    expect(['NO_TRANSITION', 'NO_STATE_CHANGE']).toContain(approval.next_state);
    expectNoGrantedState(approval, 'approval_template');
  });
});
