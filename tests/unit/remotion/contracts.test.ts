import {createHash} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import YAML from 'yaml';

import {
  beatMapDocumentSchema,
  videoSpecDocumentSchema,
} from '../../../networks/content/src/document-contracts.ts';
import {componentRegistrySchema} from '../../../renderers/remotion/src/component-registry-schema.ts';

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

describe('A07/A08 work-product contracts', () => {
  it('persists the exact four-document Motion dossier and captions', () => {
    for (const path of [
      '00-source-script.md',
      '01-video-spec.yml',
      '02-beat-map.yml',
      '03-visual-philosophy.md',
      'captions.json',
    ]) {
      expect(read(path).length).toBeGreaterThan(100);
    }
  });

  it('uses only the three governed claims and the P02 synthesis with four elements', () => {
    const spec = videoSpecDocumentSchema.parse(YAML.parse(read('01-video-spec.yml')));
    const beatMap = beatMapDocumentSchema.parse(YAML.parse(read('02-beat-map.yml')));

    expect(spec.allowed_claim_ids).toEqual(allowedClaimIds);
    expect(spec.requested_state).toBe('RENDERED_DRAFT');
    expect(spec.duration.target_frames).toBe(1231);
    expect(beatMap.creative_direction.proposalId).toBe('PROP-VS001-02-RT04');
    expect(beatMap.creative_direction.incorporatedElements).toEqual([
      'three-question-breadcrumb',
      'text-shape-pattern-reduced-motion-rights-first',
      'zero-of-four-claims-hash-custody',
      'persistent-signal-web-motion-fork',
    ]);
    expect(beatMap.timing.duration_in_frames).toBe(1231);
    expect(beatMap.timing.derivation.fixed_36_second_default).toBe(false);
  });

  it('persists every literal Prompt Maestro video-spec field without universal defaults', () => {
    const spec = videoSpecDocumentSchema.parse(YAML.parse(read('01-video-spec.yml')));
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
      [
        'width',
        'height',
        'fps',
        'codec',
        'pixel_format',
        'safe_zones_px',
        'provenance',
        'universal_default',
      ],
      'video_spec.resolution_profile',
    );
    expect(profile.width).toBe(1080);
    expect(profile.height).toBe(1920);
    expect(profile.fps).toBe(30);
    assertMaterialValue(profile.safe_zones_px, 'video_spec.resolution_profile.safe_zones_px');
    expect(profile.provenance).toBe('project profile; not a universal default');
    expect(profile.universal_default).toBe(false);
  });

  it('persists every literal Prompt Maestro field on every beat', () => {
    const beatMap = beatMapDocumentSchema.parse(YAML.parse(read('02-beat-map.yml')));
    const registry = componentRegistrySchema.parse(YAML.parse(read('04-component-registry.yml')));
    const captions = asRecord(JSON.parse(read('captions.json')) as unknown, 'captions');
    const components = registry.components;
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

    const beats = beatMap.beats;
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
        expect(componentIds.has(String(componentId)), String(componentId)).toBe(true);
      }

      const caption = captionByBeat.get(beat.beat_id);
      expect(caption, String(beat.beat_id)).toBeDefined();
      expect(beat.narration).toBe(caption?.text);
    }
    expect([...observedClaims].sort()).toStrictEqual([...allowedClaimIds].sort());
  });

  it('persists the complete component-registry contract and binds hashes to code', () => {
    const registry = componentRegistrySchema.parse(YAML.parse(read('04-component-registry.yml')));
    expect(registry.state).toBe('REGISTRY_DRAFT');
    expect(registry.approval_receipt).toBeNull();
    expectNoGrantedState(registry, 'component_registry');

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
    const components = registry.components;
    expect(components.length).toBeGreaterThan(0);
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
      for (const field of requiredComponentFields.filter((field) => field !== 'props')) {
        assertMaterialValue(
          component[field],
          `component_registry.components[${index.toString()}].${field}`,
        );
      }
      const props = asRecord(component.props, 'component.props');
      requireKeys(props, ['required', 'defaults'], 'component.props');
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

  it('rejects incomplete or extra documentation and registry fields', () => {
    const spec = videoSpecDocumentSchema.parse(YAML.parse(read('01-video-spec.yml')));
    const beatMap = beatMapDocumentSchema.parse(YAML.parse(read('02-beat-map.yml')));
    const registry = componentRegistrySchema.parse(YAML.parse(read('04-component-registry.yml')));

    const incompleteSpec = structuredClone(spec) as Record<string, unknown>;
    delete incompleteSpec.rights;
    expect(videoSpecDocumentSchema.safeParse(incompleteSpec).success).toBe(false);

    const incompleteBeatMap = structuredClone(beatMap);
    const firstBeat = incompleteBeatMap.beats[0] as unknown as Record<string, unknown>;
    delete firstBeat.accessibility;
    expect(beatMapDocumentSchema.safeParse(incompleteBeatMap).success).toBe(false);

    const incompleteRegistry = structuredClone(registry);
    const firstComponent = incompleteRegistry.components[0] as unknown as Record<string, unknown>;
    delete firstComponent.rights;
    expect(componentRegistrySchema.safeParse(incompleteRegistry).success).toBe(false);
    expect(componentRegistrySchema.safeParse({...registry, ungoverned: true}).success).toBe(false);
  });

  it('keeps Markdown approvals documented, templated and fail-closed', () => {
    const approvalsRoot = resolve(motionRoot, 'approvals');
    const approvalNames = readdirSync(approvalsRoot).sort();
    expect(approvalNames).toStrictEqual(['README.md', 'TEMPLATE.md']);

    const approvalReadme = read('approvals/README.md');
    expect(approvalReadme).toMatch(/no[_ -]approval|sin aprobaci[oó]n|not issued/iu);
    expect(approvalReadme).toContain('RENDERED_DRAFT');
    expect(approvalReadme).toMatch(/READY[\s\S]{0,120}(?:no|not|bloquead)/iu);

    const template = read('approvals/TEMPLATE.md');
    const frontmatter = template.match(/^---\n([\s\S]*?)\n---/u);
    expect(frontmatter).not.toBeNull();
    const approval = asRecord(YAML.parse(frontmatter?.[1] ?? '') as unknown, 'approval_template');
    const requiredApprovalFields = [
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
    expect(approval.decision).toBe('NOT_ISSUED');
    expect(approval.next_state).toBe('NO_STATE_CHANGE');
    expectNoGrantedState(approval, 'approval_template');
  });

  it('keeps 0/4 as a gap, persistent local badges and no performance claim', () => {
    const governedDocuments = [
      read('00-source-script.md'),
      read('03-visual-philosophy.md'),
      read('05-input-props.json'),
    ].join('\n');
    const visibleProps = read('05-input-props.json');

    expect(governedDocuments).toContain('RENDERED_DRAFT');
    expect(governedDocuments).toContain('LOCAL TEST ONLY');
    expect(governedDocuments).toMatch(/0\/4[\s\S]{0,80}(?:gap|coverage_gap)/iu);
    expect(governedDocuments).toMatch(/no (?:un )?KPI/iu);
    expect(visibleProps).not.toMatch(/\b(?:engagement|conversion|reach|ROI|viral)\b/iu);
  });
});
