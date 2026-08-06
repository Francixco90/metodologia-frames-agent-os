// prepare-project/build-component-registry.ts — builds and schema-validates the
// A08 component registry. Key order byte-stable. [CÓDIGO]
import {componentRegistrySchema} from '../../src/component-registry-schema.ts';
import type {ComponentEntry} from './build-components.ts';
import type {CampaignCopy} from './validate-inputs.ts';

export const buildComponentRegistry = ({
  copy,
  components,
  assetsManifestDigest,
}: {
  readonly copy: CampaignCopy;
  readonly components: readonly ComponentEntry[];
  readonly assetsManifestDigest: string;
}) =>
  componentRegistrySchema.parse({
    schema_version: 1,
    registry_id: 'COMPONENTS-VS001-001',
    composition_id: 'MethodologiaVertical',
    state: 'REGISTRY_DRAFT',
    approval_receipt: null,
    committee_decision_ref:
      'projects/vs-001-source-to-campaign/remotion/committee/committee-decision.json',
    creative_direction: copy.creativeDirection,
    components,
    asset_manifest_sha256: assetsManifestDigest,
    forbidden_runtime_behaviors: [
      'network',
      'clock',
      'randomness',
      'timers',
      'css_animation',
      'css_transition',
      'remote_font',
    ],
  });