// prepare-project/build-assets-manifest.ts — builds the A08 assets manifest
// (binary font assets, procedural first-party elements, font policy, coverage
// gaps). Key order byte-stable. [CÓDIGO]
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {fontAssets} from './font-assets.ts';
import type {CampaignCopy} from './validate-inputs.ts';
import type {ComponentEntry, Sha256} from './build-components.ts';

export const buildAssetsManifest = ({
  copy,
  components,
  root,
  sha256,
}: {
  readonly copy: CampaignCopy;
  readonly components: readonly ComponentEntry[];
  readonly root: string;
  readonly sha256: Sha256;
}) => ({
  schema_version: 1,
  manifest_id: 'ASSETS-VS001-001',
  project_id: copy.projectId,
  status: 'PROVISIONALLY_CLEARED_FOR_LOCAL_TEST_ONLY',
  policy: {
    network_allowed: false,
    remote_assets_allowed: false,
    remote_fonts_allowed: false,
    symlinks_allowed: false,
    audio_mode: 'silent-first',
  },
  binary_assets: fontAssets.map((asset) => ({
    ...asset,
    original_filename: asset.path.split('/').at(-1),
    acquisition_origin: {
      source_package: 'claude-cowork/anthropic-skills@1.0.0',
      package_asset_path: `skills/canvas-design/canvas-fonts/${asset.path.split('/').at(-1)}`,
      upstream_release_or_commit: 'unresolved',
      evaluated_at: copy.deterministicTimestamp,
    },
    sha256: sha256(readFileSync(resolve(root, asset.path))),
    mime: 'font/ttf',
    license: 'SIL Open Font License 1.1',
    license_sha256: sha256(readFileSync(resolve(root, asset.license_path))),
    rights_basis: 'OFL-1.1 bundled with the unmodified font binary',
    allowed_scope: 'embedded_and_redistributed_with_license',
    verdict: 'allowed_local_test_with_origin_gap',
  })),
  procedural_first_party_elements: components
    .filter(({path}) => path.includes('/components/') || path.endsWith('/theme.ts'))
    .map(({component_id, path, sha256: digest}) => ({
      asset_id: `PROC-${component_id?.toUpperCase() ?? 'UNKNOWN'}`,
      path,
      sha256: digest,
      mime: path.endsWith('.tsx') ? 'text/tsx' : 'text/typescript',
      rights_holder: 'MetodologIA',
      rights_basis: 'locally_authored_first_party_code',
      allowed_scope: 'local_contract_testing_only',
      verdict: 'allowed_local_test_only',
    })),
  font_policy: {
    loaded_font_assets: fontAssets.map(({asset_id, family, path, weight}) => ({
      asset_id,
      family,
      path,
      weight,
    })),
    css_stack: '"MetodologIA Work Sans" for sans and "MetodologIA JetBrains Mono" for monospace',
    network_fetch: false,
    loader:
      'Four explicit FontFace loads plus status and FontFaceSet checks; component-scoped delayRender, 30000ms timeout, zero retries, cancelRender on error',
    determinism_scope: 'hash_bound_fonts_same_pinned_chromium_profile',
  },
  audio_assets: [],
  coverage_gaps: [
    'audio_rights_receipt_absent_silent_first',
    'cross_host_chromium_pixel_equivalence_unverified',
    'font_binary_origin_version_unresolved',
    'authoritative_linux_network_namespace_offline_render_unexecuted',
    'external_distribution_not_authorized',
  ],
});
